using ClubManagement.API.Data;
using ClubManagement.API.DTOs;
using ClubManagement.API.DTOs.Activityes;
using ClubManagement.API.DTOs.Users;
using ClubManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace ClubManagement.API.Service
{
    public interface IUserService
    {
        Task<PagedResultAdminDTO<UserDetailDTO>> GetAllAsync(UserQueryDTO query);
        Task<UserDetailDTO?> GetByIdAsync(int id);
        Task<UserStatsDTO> GetStatsAsync();
        Task<UserDetailDTO?> AdminUpdateAsync(int id, UpdateUserAdminDTO dto);
        Task<UserDetailDTO?> ToggleActiveAsync(int id);
        Task<bool> DeleteAsync(int id);
        Task<PagedResultAdminDTO<AuditLogDTO>> GetAuditLogsAsync(AuditLogQueryDTO query);
        Task WriteLogAsync(int userId, string action, string? tableName = null, int? recordId = null);
    }

    public class UserService : IUserService
    {
        private readonly ApplicationDbContext _context;

        public UserService(ApplicationDbContext context)
        {
            _context = context;
        }

        // ────────────────────────────────────────────────────────────────────
        // MAP TO DTO
        // FIX: MapToDTO chỉ map field cơ bản, TotalRegistrations/TotalPostsCreated
        //      phải được gán riêng sau khi query — đã đúng trong GetAllAsync/GetByIdAsync
        // ────────────────────────────────────────────────────────────────────
        private static UserDetailDTO MapToDTO(User u)
        {
            var member = u.Member;
            return new UserDetailDTO
            {
                UserID = u.UserID,
                Username = u.Username,
                Email = u.Email,
                Phone = u.Phone,
                IsActive = u.IsActive,
                RoleID = u.RoleID,
                RoleName = u.Role?.RoleName ?? "Member",
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt,

                // Member info
                MemberID = member?.MemberID,
                FullName = member?.FullName,
                ClassName = member?.ClassName,
                Faculty = member?.Faculty,
                Position = member?.Position,
                MemberStatus = member?.Status,

                // FIX: khởi tạo mặc định = 0 để frontend không bị null
                TotalRegistrations = 0,
                TotalPostsCreated = 0,
            };
        }

        // ────────────────────────────────────────────────────────────────────
        // GET ALL (filter + sort + page)
        // ────────────────────────────────────────────────────────────────────
        public async Task<PagedResultAdminDTO<UserDetailDTO>> GetAllAsync(UserQueryDTO query)
        {
            // Đảm bảo page/pageSize hợp lệ
            if (query.Page < 1) query.Page = 1;
            if (query.PageSize < 1) query.PageSize = 15;

            var q = _context.Users
                .Include(u => u.Role)
                .Include(u => u.Member)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var kw = query.Keyword.ToLower();
                q = q.Where(u =>
                    u.Username.ToLower().Contains(kw) ||
                    u.Email.ToLower().Contains(kw) ||
                    (u.Phone != null && u.Phone.Contains(kw)) ||
                    (u.Member != null && u.Member.FullName.ToLower().Contains(kw)));
            }

            if (!string.IsNullOrWhiteSpace(query.RoleName))
                q = q.Where(u => u.Role != null && u.Role.RoleName == query.RoleName);

            if (query.IsActive.HasValue)
                q = q.Where(u => u.IsActive == query.IsActive.Value);

            if (query.FromDate.HasValue)
                q = q.Where(u => u.CreatedAt >= query.FromDate.Value);

            if (query.ToDate.HasValue)
                q = q.Where(u => u.CreatedAt <= query.ToDate.Value);

            // Sorting
            q = (query.SortBy?.ToLower(), query.SortDir?.ToLower()) switch
            {
                ("username", "asc") => q.OrderBy(u => u.Username),
                ("username", _) => q.OrderByDescending(u => u.Username),
                ("email", "asc") => q.OrderBy(u => u.Email),
                ("email", _) => q.OrderByDescending(u => u.Email),
                ("createdat", "asc") => q.OrderBy(u => u.CreatedAt),
                _ => q.OrderByDescending(u => u.CreatedAt),
            };

            var total = await q.CountAsync();
            var items = await q
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            // Gắn thống kê hoạt động (1 query mỗi loại)
            var userIds = items.Select(u => u.UserID).ToList();
            var memberIds = items
                .Where(u => u.Member != null)
                .Select(u => u.Member!.MemberID)
                .ToList();

            var regCounts = memberIds.Any()
                ? await _context.Registrations
                    .Where(r => memberIds.Contains(r.MemberID))
                    .GroupBy(r => r.MemberID)
                    .Select(g => new { MemberID = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.MemberID, x => x.Count)
                : new Dictionary<int, int>();

            var postCounts = userIds.Any()
                ? await _context.Posts
                    .Where(p => p.CreateBy.HasValue && userIds.Contains(p.CreateBy.Value))
                    .GroupBy(p => p.CreateBy!.Value)
                    .Select(g => new { UserID = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.UserID, x => x.Count)
                : new Dictionary<int, int>();

            var dtos = items.Select(u =>
            {
                var dto = MapToDTO(u);
                if (u.Member != null && regCounts.TryGetValue(u.Member.MemberID, out var rc))
                    dto.TotalRegistrations = rc;
                if (postCounts.TryGetValue(u.UserID, out var pc))
                    dto.TotalPostsCreated = pc;
                return dto;
            }).ToList();

            return new PagedResultAdminDTO<UserDetailDTO>
            {
                Items = dtos,
                TotalCount = total,
                Page = query.Page,
                PageSize = query.PageSize,
            };
        }

        // ────────────────────────────────────────────────────────────────────
        // GET BY ID
        // ────────────────────────────────────────────────────────────────────
        public async Task<UserDetailDTO?> GetByIdAsync(int id)
        {
            var u = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.Member)
                .FirstOrDefaultAsync(u => u.UserID == id);
            if (u == null) return null;

            var dto = MapToDTO(u);

            if (u.Member != null)
                dto.TotalRegistrations = await _context.Registrations
                    .CountAsync(r => r.MemberID == u.Member.MemberID);

            dto.TotalPostsCreated = await _context.Posts
                .CountAsync(p => p.CreateBy == id);

            return dto;
        }

        // ────────────────────────────────────────────────────────────────────
        // STATS
        // ────────────────────────────────────────────────────────────────────
        public async Task<UserStatsDTO> GetStatsAsync()
        {
            var now = DateTime.Now;
            var som = new DateTime(now.Year, now.Month, 1);
            var sow = now.AddDays(-(int)now.DayOfWeek);

            var roles = await _context.Users
                .Include(u => u.Role)
                .Where(u => u.Role != null)
                .GroupBy(u => u.Role!.RoleName)
                .Select(g => new { Role = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Role, x => x.Count);

            return new UserStatsDTO
            {
                TotalUsers = await _context.Users.CountAsync(),
                ActiveUsers = await _context.Users.CountAsync(u => u.IsActive),
                InactiveUsers = await _context.Users.CountAsync(u => !u.IsActive),
                AdminCount = roles.GetValueOrDefault("Admin", 0),
                ExecutiveBoardCount = roles.GetValueOrDefault("ExecutiveBoard", 0),
                MemberCount = roles.GetValueOrDefault("Member", 0),
                NewThisMonth = await _context.Users.CountAsync(u => u.CreatedAt >= som),
                NewThisWeek = await _context.Users.CountAsync(u => u.CreatedAt >= sow),
            };
        }

        // ────────────────────────────────────────────────────────────────────
        // ADMIN UPDATE (role, isActive, phone)
        // ────────────────────────────────────────────────────────────────────
        public async Task<UserDetailDTO?> AdminUpdateAsync(int id, UpdateUserAdminDTO dto)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.Member)
                .FirstOrDefaultAsync(u => u.UserID == id);
            if (user == null) return null;

            if (dto.RoleID.HasValue)
            {
                var role = await _context.Roles.FindAsync(dto.RoleID.Value);
                if (role == null) return null;
                user.RoleID = dto.RoleID.Value;
            }

            if (dto.IsActive.HasValue)
                user.IsActive = dto.IsActive.Value;

            if (dto.Phone != null)
                user.Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim();

            user.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            // Reload role sau khi update để trả về đúng RoleName
            await _context.Entry(user).Reference(u => u.Role).LoadAsync();
            return MapToDTO(user);
        }

        // ────────────────────────────────────────────────────────────────────
        // TOGGLE ACTIVE
        // ────────────────────────────────────────────────────────────────────
        public async Task<UserDetailDTO?> ToggleActiveAsync(int id)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.Member)
                .FirstOrDefaultAsync(u => u.UserID == id);
            if (user == null) return null;

            user.IsActive = !user.IsActive;
            user.UpdatedAt = DateTime.Now;

            // Đồng bộ member status
            if (user.Member != null)
                user.Member.Status = user.IsActive ? "Active" : "Inactive";

            await _context.SaveChangesAsync();

            _context.AuditLogs.Add(new AuditLog
            {
                UserID = null,
                Action = user.IsActive
                    ? $"Admin kích hoạt tài khoản: {user.Username}"
                    : $"Admin vô hiệu hóa tài khoản: {user.Username}",
                TableName = "Users",
                RecordID = user.UserID,
                CreatedAt = DateTime.Now,
            });
            await _context.SaveChangesAsync();

            return MapToDTO(user);
        }

        // ────────────────────────────────────────────────────────────────────
        // DELETE (soft)
        // ────────────────────────────────────────────────────────────────────
        public async Task<bool> DeleteAsync(int id)
        {
            var user = await _context.Users
                .Include(u => u.Member)
                .FirstOrDefaultAsync(u => u.UserID == id);
            if (user == null) return false;

            user.IsActive = false;
            user.UpdatedAt = DateTime.Now;
            if (user.Member != null) user.Member.Status = "Inactive";

            await _context.SaveChangesAsync();
            return true;
        }

        // ────────────────────────────────────────────────────────────────────
        // AUDIT LOGS (filter + page)
        // ────────────────────────────────────────────────────────────────────
        public async Task<PagedResultAdminDTO<AuditLogDTO>> GetAuditLogsAsync(AuditLogQueryDTO query)
        {
            if (query.Page < 1) query.Page = 1;
            if (query.PageSize < 1) query.PageSize = 20;

            var q = _context.AuditLogs
                .Include(l => l.User)
                    .ThenInclude(u => u != null ? u.Member : null)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var kw = query.Keyword.ToLower();
                q = q.Where(l =>
                    (l.Action != null && l.Action.ToLower().Contains(kw)) ||
                    (l.TableName != null && l.TableName.ToLower().Contains(kw)) ||
                    (l.User != null && l.User.Username.ToLower().Contains(kw)));
            }

            if (!string.IsNullOrWhiteSpace(query.TableName))
                q = q.Where(l => l.TableName == query.TableName);

            if (query.UserID.HasValue)
                q = q.Where(l => l.UserID == query.UserID.Value);

            if (query.FromDate.HasValue)
                q = q.Where(l => l.CreatedAt >= query.FromDate.Value);

            if (query.ToDate.HasValue)
                q = q.Where(l => l.CreatedAt <= query.ToDate.Value);

            if (!string.IsNullOrWhiteSpace(query.Category))
            {
                var cat = query.Category.ToLower();
                q = q.Where(l => l.TableName != null && l.TableName.ToLower().Contains(cat));
            }

            var total = await q.CountAsync();
            var items = await q
                .OrderByDescending(l => l.CreatedAt)
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(l => new AuditLogDTO
                {
                    LogID = l.LogID,
                    UserID = l.UserID,
                    Username = l.User != null ? l.User.Username : "Hệ thống",
                    FullName = l.User != null && l.User.Member != null
                        ? l.User.Member.FullName : null,
                    Action = l.Action,
                    TableName = l.TableName,
                    RecordID = l.RecordID,
                    CreatedAt = l.CreatedAt,
                    Category = ResolveCategory(l.TableName),
                })
                .ToListAsync();

            return new PagedResultAdminDTO<AuditLogDTO>
            {
                Items = items,
                TotalCount = total,
                Page = query.Page,
                PageSize = query.PageSize,
            };
        }

        // ────────────────────────────────────────────────────────────────────
        // WRITE LOG
        // ────────────────────────────────────────────────────────────────────
        public async Task WriteLogAsync(int userId, string action, string? tableName = null, int? recordId = null)
        {
            _context.AuditLogs.Add(new AuditLog
            {
                UserID = userId,
                Action = action,
                TableName = tableName,
                RecordID = recordId,
                CreatedAt = DateTime.Now,
            });
            await _context.SaveChangesAsync();
        }

        // ────────────────────────────────────────────────────────────────────
        // HELPER
        // ────────────────────────────────────────────────────────────────────
        private static string ResolveCategory(string? tableName)
        {
            return tableName?.ToLower() switch
            {
                "activities" => "activity",
                "activityimages" => "activity",
                "registrations" => "activity",
                "posts" => "post",
                "postimages" => "post",
                "members" => "member",
                "users" => "user",
                "roles" => "system",
                _ => "system",
            };
        }
    }
}