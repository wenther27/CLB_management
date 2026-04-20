using ClubManagement.API.Data;
using ClubManagement.API.DTOs;
using ClubManagement.API.DTOs.Activityes;
using ClubManagement.API.DTOs.Posts;
using ClubManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace ClubManagement.API.Service
{
    public interface IPostService
    {
        Task<PagedResultDTO<PostDTO>> GetAllAsync(PostQueryDTO query);
        Task<PostDTO?> GetByIdAsync(int id);
        Task<PostDTO?> CreateAsync(CreatePostDTO dto, int authorUserId);
        Task<PostDTO?> UpdateAsync(int id, UpdatePostDTO dto, int requestUserId, string requestUserRole);
        Task<bool> PublishAsync(int id, int requestUserId, string requestUserRole);
        Task<bool> UnpublishAsync(int id, int requestUserId, string requestUserRole);
        Task<bool> DeleteAsync(int id, int requestUserId, string requestUserRole);
        Task<PagedResultDTO<PostDTO>> GetMyPostsAsync(int userId, int page, int pageSize);
        Task<PostStatsDTO> GetStatsAsync();
        Task IncrementViewAsync(int id);
    }

    public class PostService : IPostService
    {
        private readonly ApplicationDbContext _context;

        public PostService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<PagedResultDTO<PostDTO>> GetAllAsync(PostQueryDTO query)
        {
            var q = _context.Posts
                .Include(p => p.User)
                .Include(p => p.postImages)
                .AsQueryable();

            // Chỉ Published cho public
            if (string.IsNullOrWhiteSpace(query.Status) || query.Status == "Published")
                q = q.Where(p => p.status == "Published");
            else if (query.Status == "all")
            {
                // Admin dùng "all" để xem tất cả
            }
            else
                q = q.Where(p => p.status == query.Status);

            if (!string.IsNullOrWhiteSpace(query.Category))
                q = q.Where(p => p.category == query.Category);

            if (!string.IsNullOrWhiteSpace(query.Keyword))
                q = q.Where(p => (p.Title != null && p.Title.Contains(query.Keyword))
                               || p.Content.Contains(query.Keyword));

            if (query.FromDate.HasValue)
                q = q.Where(p => p.createdDate >= query.FromDate.Value);

            if (query.ToDate.HasValue)
                q = q.Where(p => p.createdDate <= query.ToDate.Value);

            var total = await q.CountAsync();

            var items = await q
                .OrderByDescending(p => p.IsPinned)
                .ThenByDescending(p => p.createdDate)
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(p => MapToDTO(p))
                .ToListAsync();

            return new PagedResultDTO<PostDTO>
            {
                Items = items,
                TotalCount = total,
                Page = query.Page,
                PageSize = query.PageSize
            };
        }

        public async Task<PostDTO?> GetByIdAsync(int id)
        {
            var post = await _context.Posts
                .Include(p => p.User)
                .Include(p => p.postImages)
                .FirstOrDefaultAsync(p => p.PostID == id);

            return post == null ? null : MapToDTO(post);
        }

        public async Task<PostDTO?> CreateAsync(CreatePostDTO dto, int authorUserId)
        {
            var post = new Post
            {
                Title = dto.Title,
                Content = dto.Content,
                category = dto.Category,
                status = dto.Status ?? "Draft",
                createdDate = DateTime.UtcNow,
                IsPinned = dto.IsPinned,
                Summary = dto.Summary,
                Tags = dto.Tags,
                CoverImageUrl = dto.CoverImageUrl,
                ReadTime = EstimateReadTime(dto.Content),
                postImages = dto.ImageUrls?.Select(url => new PostImage { ImageUrl = url }).ToList()
                             ?? new List<PostImage>()
            };

            // Tìm CreateBy từ userId
            var user = await _context.Users.FindAsync(authorUserId);
            if (user != null)
                post.CreateBy = authorUserId;

            _context.Posts.Add(post);
            await _context.SaveChangesAsync();
            await _context.Entry(post).Reference(p => p.User).LoadAsync();
            return MapToDTO(post);
        }

        public async Task<PostDTO?> UpdateAsync(int id, UpdatePostDTO dto, int requestUserId, string requestUserRole)
        {
            var post = await _context.Posts
                .Include(p => p.User)
                .Include(p => p.postImages)
                .FirstOrDefaultAsync(p => p.PostID == id);

            if (post == null) return null;

            if (requestUserRole != "Admin" && post.CreateBy != requestUserId)
                return null;

            if (dto.Title != null) post.Title = dto.Title;
            if (dto.Content != null)
            {
                post.Content = dto.Content;
                post.ReadTime = EstimateReadTime(dto.Content);
            }
            if (dto.Category != null) post.category = dto.Category;
            if (dto.Status != null) post.status = dto.Status;
            if (dto.IsPinned.HasValue) post.IsPinned = dto.IsPinned.Value;
            if (dto.Summary != null) post.Summary = dto.Summary;
            if (dto.Tags != null) post.Tags = dto.Tags;
            if (dto.CoverImageUrl != null) post.CoverImageUrl = dto.CoverImageUrl;
            post.UpdateTime = DateTime.UtcNow;

            if (dto.ImageUrls != null)
            {
                _context.PostImages.RemoveRange(post.postImages ?? new List<PostImage>());
                post.postImages = dto.ImageUrls.Select(url => new PostImage
                {
                    ImageUrl = url,
                    PostID = id
                }).ToList();
            }

            await _context.SaveChangesAsync();
            return MapToDTO(post);
        }

        public async Task<bool> PublishAsync(int id, int requestUserId, string requestUserRole)
        {
            var post = await _context.Posts.FindAsync(id);
            if (post == null) return false;
            if (requestUserRole != "Admin" && post.CreateBy != requestUserId) return false;
            post.status = "Published";
            post.UpdateTime = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UnpublishAsync(int id, int requestUserId, string requestUserRole)
        {
            var post = await _context.Posts.FindAsync(id);
            if (post == null) return false;
            if (requestUserRole != "Admin" && post.CreateBy != requestUserId) return false;
            post.status = "Draft";
            post.UpdateTime = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id, int requestUserId, string requestUserRole)
        {
            var post = await _context.Posts.FindAsync(id);
            if (post == null) return false;
            if (requestUserRole != "Admin" && post.CreateBy != requestUserId) return false;
            _context.Posts.Remove(post);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<PagedResultDTO<PostDTO>> GetMyPostsAsync(int userId, int page, int pageSize)
        {
            var q = _context.Posts
                .Include(p => p.User)
                .Include(p => p.postImages)
                .Where(p => p.CreateBy == userId);

            var total = await q.CountAsync();
            var items = await q
                .OrderByDescending(p => p.createdDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => MapToDTO(p))
                .ToListAsync();

            return new PagedResultDTO<PostDTO>
            { Items = items, TotalCount = total, Page = page, PageSize = pageSize };
        }

        public async Task<PostStatsDTO> GetStatsAsync()
        {
            var now = DateTime.UtcNow;
            var som = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            return new PostStatsDTO
            {
                TotalPosts = await _context.Posts.CountAsync(),
                PublishedPosts = await _context.Posts.CountAsync(p => p.status == "Published"),
                DraftPosts = await _context.Posts.CountAsync(p => p.status == "Draft"),
                NewThisMonth = await _context.Posts.CountAsync(p => p.createdDate >= som),
                TotalViews = await _context.Posts.SumAsync(p => (int?)p.ViewCount) ?? 0
            };
        }

        public async Task IncrementViewAsync(int id)
        {
            var post = await _context.Posts.FindAsync(id);
            if (post != null)
            {
                post.ViewCount++;
                await _context.SaveChangesAsync();
            }
        }

        private static int EstimateReadTime(string content)
        {
            if (string.IsNullOrWhiteSpace(content)) return 1;
            var wordCount = content.Split(new[] { ' ', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries).Length;
            return Math.Max(1, (int)Math.Ceiling(wordCount / 200.0));
        }

        private static PostDTO MapToDTO(Post p) => new()
        {
            PostID = p.PostID,
            Title = p.Title,
            Content = p.Content,
            Summary = p.Summary,
            Status = p.status,
            Category = p.category,
            Tags = p.Tags,
            CoverImageUrl = p.CoverImageUrl,
            IsPinned = p.IsPinned,
            ViewCount = p.ViewCount,
            ReadTime = p.ReadTime,
            CreatedDate = p.createdDate,
            UpdatedDate = p.UpdateTime,
            AuthorName = p.User?.Username ?? "BTC",
            AuthorId = p.CreateBy ?? 0,
            Images = p.postImages?.Select(i => i.ImageUrl).ToList() ?? new List<string>()
        };
    }
}