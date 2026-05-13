using ClubManagement.API.DTOs;
using ClubManagement.API.DTOs.Activityes;
using ClubManagement.API.DTOs.Members;
using ClubManagement.API.Models;
using ClubManagement.API.Data;
using Microsoft.EntityFrameworkCore;
using System.Net.WebSockets;


namespace ClubManagement.API.Service
{
    public interface IMemberService
    {
        Task<PagedResultDTO<MemberDTO>> GetAllAsync(MemberQueryDTO query);
        Task<MemberDTO?> GetByIdAsync(int memberId);
        Task<MemberDTO?> GetByUserIdAsync(int userId);
        Task<MemberDTO?> UpdateProfileAsync(int userId, UpdateProfileDTO dto);
        Task<MemberDTO?> AdminUpdateAsync(int memberId, UpdateMemberDTO dto);
        Task<bool> DeactivateAsync(int memberId);
        Task<bool> ChangePasswordAsync(int userId, ChangePasswordDTO dto);
        Task<MemberStatsDTO> GetStatsAsync();
    }
    public class MemberService : IMemberService
    {
        private readonly ApplicationDbContext _context;
        public MemberService(ApplicationDbContext context)
        {
            _context = context;
        }
        private static MemberDTO MapToDTO(Member m) => new()
        {
            MemberID = m.MemberID,
            UserID = m.UserID,
            FullName = m.FullName,
            ClassName = m.ClassName,
            Faculty = m.Faculty,
            Position = m.Position,
            Status = m.Status,
            JoinDate = m.JoinDate,
            Username = m.User?.Username,
            Email = m.User?.Email,
            Phone = m.User?.Phone,
            RoleName = m.User?.Role?.RoleName
        };
        public async Task<PagedResultDTO<MemberDTO>> GetAllAsync(MemberQueryDTO query)
        {
            var q = _context.Members
                .Include(m => m.User).ThenInclude(u => u!.Role)
                .AsQueryable();
            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                q = q.Where(m =>
                m.FullName.Contains(query.Keyword) ||
                (m.User != null && m.User.Username.Contains(query.Keyword)) ||
                (m.User != null && m.User.Email.Contains(query.Keyword)));
            }
            if (!string.IsNullOrWhiteSpace(query.Faculty))
            {
                q = q.Where(m => m.Faculty == query.Faculty);
            }
            if (!string.IsNullOrWhiteSpace(query.Status))
            {
                q = q.Where(m => m.Status == query.Status);
            }
            var total = await q.CountAsync();
            var items = await q
                .OrderByDescending(m => m.JoinDate)
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(m => MapToDTO(m))
                .ToListAsync();
            return new PagedResultDTO<MemberDTO>
            {
                TotalCount = total,
                Items = items,
                Page = query.Page,
                PageSize = query.PageSize
            };
        }
        public async Task<MemberDTO?> GetByIdAsync(int memberId)
        {
            var m = await _context.Members
                .Include(m => m.User).ThenInclude(u => u!.Role)
                .FirstOrDefaultAsync(m => m.MemberID == memberId);
            return m == null ? null : MapToDTO(m);
        }
        public async Task<MemberDTO?> GetByUserIdAsync(int userId)
        {
            var m = await _context.Members
                .Include(m => m.User).ThenInclude(u => u!.Role)
                .FirstOrDefaultAsync(m => m.UserID == userId);
            return m == null ? null : MapToDTO(m);


        }
        public async Task <MemberDTO?> UpdateProfileAsync (int userId, UpdateProfileDTO dto)
        {
            var member = await _context.Members
                .Include(m => m.User).ThenInclude(u => u!.Role)
                .FirstOrDefaultAsync(m => m.UserID == userId);
            if (member == null) return null;
            if (dto.FullName != null) member.FullName = dto.FullName;
            if (dto.ClassName != null) member.ClassName = dto.ClassName;
            if (dto.Faculty != null) member.Faculty = dto.Faculty;
            if (dto.Phone != null && member.User != null)
            {
                member.User.Phone = dto.Phone; member.User.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return MapToDTO(member);

        }

        public async Task <MemberDTO?> AdminUpdateAsync (int memberId, UpdateMemberDTO dto)
        {
            var member = await _context.Members
                .Include(m => m.User).ThenInclude(u => u!.Role)
                .FirstAsync(m => m.MemberID == memberId);
            if (member == null) return null;
            if (dto.FullName != null) member.FullName = dto.FullName;
            if (dto.ClassName != null) member.ClassName = dto.ClassName;
            if (dto.Faculty != null) member.Faculty = dto.Faculty;
            if (dto.Position != null) member.Position = dto.Position;
            if (dto.Status != null)
            {
                member.Status = dto.Status;
                if (member.User != null)
                {
                    member.User.IsActive = dto.Status == "Active";
                }
            }
                if (dto.Phone != null && member.User !=null)
                {
                    member.User.Phone = dto.Phone;
                    member.User.UpdatedAt = DateTime.UtcNow;
                }
                await _context.SaveChangesAsync();
                return MapToDTO(member);
            
        }
       
       public async Task<bool> DeactivateAsync (int memberId)
        {
            var member = await _context.Members.Include(m => m.User)
                .FirstOrDefaultAsync(m => m.MemberID == memberId);
            if (member == null) return false;
            member.Status = "Inactive";
            if (member.User != null)
            {
               member.User.IsActive = false;
               member.User.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return true;
        }
        public async Task <bool> ChangePasswordAsync(int userId, ChangePasswordDTO dto)
        {
            if (dto.NewPassword != dto.ConfirmPassword) return false;
            var user = await _context.Users.FindAsync(userId);
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.CurrentPassword , user.PasswordHash))
            {
                return false;
            }
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();  
            return true;
        }
        public async Task<MemberStatsDTO> GetStatsAsync()
        {
            var now = DateTime.UtcNow;  
            var som = new DateTime(now.Year, now.Month , 1 ,0 , 0 , 0,  DateTimeKind.Utc);
            return new MemberStatsDTO
            {
                TotalMembers = await _context.Members.CountAsync(),
                ActiveMembers = await _context.Members.CountAsync (m => m.Status == "Active"),
                InactiveMembers = await _context.Members.CountAsync(m => m.Status != "Active"),
                NewThisMonth = await _context.Members.CountAsync(m => m.JoinDate >= som)

            };

        }
        
    }
}
