using ClubManagement.API.DTOs.Activityes;
using ClubManagement.API.Data;
using ClubManagement.API.DTOs;
using ClubManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace ClubManagement.API.Service
{
    public interface IActivityService
    {
        Task<PagedResultDTO<ActivityDTO>> GetAllAsync(ActivityQueryDTO query);
        Task<ActivityDTO?> GetByIdAsync(int id);
        Task<ActivityDTO?> CreateAsync(CreateActivityDTO dto, int creatorUserId);
        Task<ActivityDTO?> UpdateAsync(int id, UpdateActivityDTO dto, int requestUserId, string requestUserRole);
        Task<bool> DeleteAsync(int id, int requestUserId, string requestUserRole);
        Task<bool> CancelAsync(int id, int requestUserId, string requestUserRole);

        Task<RegistrationResponseDTO?> RegisterAsync(int activityId, int userId);
        Task<(bool Success, string? ErrorMessage)> CancelRegistrationAsync(int activityId, int userId);
        Task<bool> HasUserRegisteredAsync(int activityId, int userId);
        Task<PagedResultDTO<RegistrationResponseDTO>> GetRegistrationsAsync(int activityId, int page, int pageSize);
        Task<PagedResultDTO<RegistrationResponseDTO>> GetMyRegistrationsAsync(int userId, int page, int pageSize);
        Task<int> AutoCloseExpiredActivitiesAsync();
    }

    public class ActivityService : IActivityService
    {
        private readonly ApplicationDbContext _context;

        public ActivityService(ApplicationDbContext context)
        {
            _context = context;
        }

       

        public async Task<PagedResultDTO<ActivityDTO>> GetAllAsync(ActivityQueryDTO query)
        {
            var q = _context.Activities
                .Include(a => a.Creator)
                .Include(a => a.Registrations)
                .Include(a => a.ActivityImages)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.status))
                q = q.Where(a => a.Status == query.status);

            if (!string.IsNullOrWhiteSpace(query.Keyword))
                q = q.Where(a =>
                    a.ActivityName.Contains(query.Keyword) ||
                    (a.Description != null && a.Description.Contains(query.Keyword)));

            if (query.FromDate.HasValue) q = q.Where(a => a.time >= query.FromDate.Value);
            if (query.ToDate.HasValue) q = q.Where(a => a.time <= query.ToDate.Value);

            var total = await q.CountAsync();
            var items = await q
                .OrderByDescending(a => a.CreateAt)
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(a => MapToDTO(a))
                .ToListAsync();

            return new PagedResultDTO<ActivityDTO>
            {
                Items = items,
                TotalCount = total,
                Page = query.Page,
                PageSize = query.PageSize
            };
        }

        public async Task<ActivityDTO?> GetByIdAsync(int id)
        {
            var activity = await _context.Activities
                .Include(a => a.Creator)
                .Include(a => a.Registrations)
                .Include(a => a.ActivityImages)
                .FirstOrDefaultAsync(a => a.ActivityID == id);
            return activity == null ? null : MapToDTO(activity);
        }

        public async Task<ActivityDTO?> CreateAsync(CreateActivityDTO dto, int creatorUserId)
        {
            if (dto.RegistrationDeadLine.HasValue && dto.RegistrationDeadLine.Value >= dto.Time)
                throw new ArgumentException("Thời hạn đăng ký phải trước thời gian diễn ra hoạt động");

            if (dto.RegistrationOpenDate.HasValue && dto.RegistrationDeadLine.HasValue &&
                dto.RegistrationOpenDate.Value >= dto.RegistrationDeadLine.Value)
                throw new ArgumentException("Ngày mở đăng ký phải trước hạn chót đăng ký");

            var activity = new ClubActivity
            {
                ActivityName = dto.ActivityName,
                Description = dto.Description,
                Location = dto.Location,
                Status = dto.Status,
                time = dto.Time,
                RegistrationOpenDate = dto.RegistrationOpenDate,
                RegistrationDeadLine = dto.RegistrationDeadLine,
                MaxParticipants = dto.MaxParticipants,
                CreateBy = creatorUserId,
                CreateAt = DateTime.Now,   // FIX: local time
                Registrations = new List<Registrations>(),
                ExecutiveBoards = new List<ExecutiveBoard>(),
                ActivityImages = dto.ImageUrls?.Select(url => new ActivityImage
                {
                    ImageUrl = url
                }).ToList() ?? new List<ActivityImage>()
            };

            _context.Activities.Add(activity);
            await _context.SaveChangesAsync();
            await _context.Entry(activity).Reference(a => a.Creator).LoadAsync();
            return MapToDTO(activity);
        }

        public async Task<ActivityDTO?> UpdateAsync(int id, UpdateActivityDTO dto,
            int requestUserId, string requestUserRole)
        {
            var activity = await _context.Activities
                .Include(a => a.Creator)
                .Include(a => a.Registrations)
                .Include(a => a.ActivityImages)
                .FirstOrDefaultAsync(a => a.ActivityID == id);
            if (activity == null) return null;

            if (requestUserRole != "Admin" && requestUserRole != "ExecutiveBoard"
                && activity.CreateBy != requestUserId) return null;

            if (dto.ActivityName != null) activity.ActivityName = dto.ActivityName;
            if (dto.Description != null) activity.Description = dto.Description;
            if (dto.Location != null) activity.Location = dto.Location;
            if (dto.Status != null) activity.Status = dto.Status;
            if (dto.Time.HasValue) activity.time = dto.Time.Value;
            if (dto.MaxParticipants.HasValue) activity.MaxParticipants = dto.MaxParticipants;

            if (dto.RegistrationOpenDate.HasValue)
                activity.RegistrationOpenDate = dto.RegistrationOpenDate == DateTime.MinValue
                    ? null : dto.RegistrationOpenDate;

            if (dto.RegistrationDeadLine.HasValue)
                activity.RegistrationDeadLine = dto.RegistrationDeadLine == DateTime.MinValue
                    ? null : dto.RegistrationDeadLine;

            if (activity.RegistrationDeadLine.HasValue && activity.RegistrationDeadLine.Value >= activity.time)
                throw new ArgumentException("Hạn chót đăng ký phải trước thời gian diễn ra hoạt động");

            if (activity.RegistrationOpenDate.HasValue && activity.RegistrationDeadLine.HasValue &&
                activity.RegistrationOpenDate.Value >= activity.RegistrationDeadLine.Value)
                throw new ArgumentException("Ngày mở đăng ký phải trước hạn chót đăng ký");

            if (dto.ImageUrls != null)
            {
                _context.ActivityImages.RemoveRange(activity.ActivityImages);
                activity.ActivityImages = dto.ImageUrls.Select(url => new ActivityImage
                {
                    ImageUrl = url,
                    ActivityID = id
                }).ToList();
            }

            await _context.SaveChangesAsync();
            return MapToDTO(activity);
        }

        public async Task<bool> DeleteAsync(int id, int requestUserId, string requestUserRole)
        {
            if (requestUserRole != "Admin" && requestUserRole != "ExecutiveBoard") return false;
            var activity = await _context.Activities.FindAsync(id);
            if (activity == null) return false;
            _context.Activities.Remove(activity);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> CancelAsync(int id, int requestUserId, string requestUserRole)
        {
            var activity = await _context.Activities.FindAsync(id);
            if (activity == null) return false;
            if (requestUserRole != "Admin" && activity.CreateBy != requestUserId) return false;
            activity.Status = "Cancelled";
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<int> AutoCloseExpiredActivitiesAsync()
        {
            var now = DateTime.Now;  

            var expired = await _context.Activities
                .Where(a => a.Status == "Open"
                    && a.RegistrationDeadLine.HasValue
                    && a.RegistrationDeadLine.Value <= now)
                .ToListAsync();

            if (!expired.Any()) return 0;
            foreach (var a in expired) a.Status = "Closed";
            await _context.SaveChangesAsync();
            return expired.Count;
        }

        public async Task<bool> HasUserRegisteredAsync(int activityId, int userId)
        {
            var member = await _context.Members.FirstOrDefaultAsync(m => m.UserID == userId);
            if (member == null) return false;
            return await _context.Registrations
                .AnyAsync(r => r.ActivityID == activityId && r.MemberID == member.MemberID);
        }

        // Dang ky hoat dong
        public async Task<RegistrationResponseDTO?> RegisterAsync(int activityId, int userId)
        {
            var now = DateTime.Now;

            var activity = await _context.Activities
                .Include(a => a.Registrations)
                .FirstOrDefaultAsync(a => a.ActivityID == activityId);

            if (activity == null || activity.Status != "Open") return null;

            // Kiem den gio mo dang ky chưa
            if (activity.RegistrationOpenDate.HasValue && now < activity.RegistrationOpenDate.Value)
                return null;

            // Xem het han dang ky chuwa
            if (activity.RegistrationDeadLine.HasValue && now > activity.RegistrationDeadLine.Value)
            {
                activity.Status = "Closed";
                await _context.SaveChangesAsync();
                return null;
            }

            var member = await _context.Members.FirstOrDefaultAsync(m => m.UserID == userId);
            if (member == null) return null;
            // 
            bool alreadyRegistered = await _context.Registrations
                .AnyAsync(r => r.ActivityID == activityId && r.MemberID == member.MemberID);
            if (alreadyRegistered) return null;

            if (activity.MaxParticipants.HasValue)
            {
                var count = await _context.Registrations
                    .CountAsync(r => r.ActivityID == activityId && r.Status == "Đã đang ký");
                if (count >= activity.MaxParticipants.Value) return null;
            }

            var registration = new Registrations
            {
                ActivityID = activityId,
                MemberID = member.MemberID,
                RegisterDate = DateTime.Now,   
                Status = "Confirmed"
            };

            _context.Registrations.Add(registration);
            await _context.SaveChangesAsync();

            return new RegistrationResponseDTO
            {
                RegistrationID = registration.RegistrationID,
                MemberID = member.MemberID,
                ActivityID = activityId,
                MemberName = member.FullName,
                ActivityName = activity.ActivityName,
                RegisterDate = registration.RegisterDate,
                Status = registration.Status
            };
        }

        // Huy dang kys
        public async Task<(bool Success, string? ErrorMessage)> CancelRegistrationAsync(
            int activityId, int userId)
        {
            var member = await _context.Members.FirstOrDefaultAsync(m => m.UserID == userId);
            if (member == null) return (false, "Không tìm thấy thành viên");

            var registration = await _context.Registrations
                .FirstOrDefaultAsync(r => r.ActivityID == activityId && r.MemberID == member.MemberID);
            if (registration == null) return (false, "Không tìm thấy đăng ký");

            var activity = await _context.Activities.FindAsync(activityId);
            if (activity == null) return (false, "Không tìm thấy hoạt động");

            
            var now = DateTime.Now;

            if (activity.Status == "Cancelled")
                return (false, "Hoạt động đã bị hủy");

            if (activity.Status == "Closed")
                return (false, "Đã chốt danh sách, không thể hủy đăng ký");

            if (activity.RegistrationDeadLine.HasValue && now > activity.RegistrationDeadLine.Value)
                return (false, "Đã hết hạn đăng ký, không thể hủy đăng ký");

            _context.Registrations.Remove(registration);
            await _context.SaveChangesAsync();
            return (true, null);
        }
        // Nhan tin dang ky
        public async Task<PagedResultDTO<RegistrationResponseDTO>> GetRegistrationsAsync(
            int activityId, int page, int pageSize)
        {
            var q = _context.Registrations
                .Include(r => r.Member)
                .Include(r => r.ClubActivity)
                .Where(r => r.ActivityID == activityId);

            var total = await q.CountAsync();
            var items = await q
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(r => new RegistrationResponseDTO
                {
                    RegistrationID = r.RegistrationID,
                    MemberID = r.MemberID,
                    MemberName = r.Member != null ? r.Member.FullName : "",
                    ActivityID = r.ActivityID,
                    ActivityName = r.ClubActivity != null ? r.ClubActivity.ActivityName : "",
                    RegisterDate = r.RegisterDate,
                    Status = r.Status
                }).ToListAsync();

            return new PagedResultDTO<RegistrationResponseDTO>
            { Items = items, TotalCount = total, Page = page, PageSize = pageSize };
        }
        // Lay thong tin dang ky cua toi
        public async Task<PagedResultDTO<RegistrationResponseDTO>> GetMyRegistrationsAsync(
            int userId, int page, int pageSize)
        {
            var member = await _context.Members.FirstOrDefaultAsync(m => m.UserID == userId);
            if (member == null) return new PagedResultDTO<RegistrationResponseDTO>();

            var q = _context.Registrations
                .Include(r => r.ClubActivity)
                .Where(r => r.MemberID == member.MemberID);

            var total = await q.CountAsync();
            var items = await q
                .OrderByDescending(r => r.RegisterDate)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(r => new RegistrationResponseDTO
                {
                    RegistrationID = r.RegistrationID,
                    MemberID = r.MemberID,
                    MemberName = member.FullName,
                    ActivityID = r.ActivityID,
                    ActivityName = r.ClubActivity != null ? r.ClubActivity.ActivityName : "",
                    RegisterDate = r.RegisterDate,
                    Status = r.Status
                }).ToListAsync();

            return new PagedResultDTO<RegistrationResponseDTO>
            { Items = items, TotalCount = total, Page = page, PageSize = pageSize };
        }

        private static ActivityDTO MapToDTO(ClubActivity a) => new()
        {
            ActivityID = a.ActivityID,
            ActivityName = a.ActivityName,
            Description = a.Description,
            Location = a.Location,
            Status = a.Status,
            Time = a.time,
            CreateAt = a.CreateAt,
            MaxParticipants = a.MaxParticipants,
            CreateBy = a.CreateBy,
            CreatorName = a.Creator?.Username ?? "",
            RegisteredCount = a.Registrations?.Count(r => r.Status == "Confirmed") ?? 0,
            Image = a.ActivityImages?.Select(i => i.ImageUrl).ToList() ?? new(),
            RegistrationOpenDate = a.RegistrationOpenDate,
            RegistrationDeadLine = a.RegistrationDeadLine
        };
    }
}