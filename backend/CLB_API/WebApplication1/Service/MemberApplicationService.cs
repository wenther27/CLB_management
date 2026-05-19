using ClubManagement.API.Data;
using ClubManagement.API.DTOs.MemberApplications;
using ClubManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace ClubManagement.API.Service
{
    public interface IMemberApplicationService
    {
        Task<MemberApplicationDTO> SubmitAsync(CreateMemberApplicationDTO dto);
        Task<List<MemberApplicationDTO>> GetAllAsync(string? status = null);
        Task<MemberApplicationDTO?> ApproveAsync(int id, int reviewedByUserId, string? reviewNote = null);
        Task<MemberApplicationDTO?> RejectAsync(int id, int reviewedByUserId, string? reviewNote = null);
    }

    public class MemberApplicationService : IMemberApplicationService
    {
        private readonly ApplicationDbContext _context;

        public MemberApplicationService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<MemberApplicationDTO> SubmitAsync(CreateMemberApplicationDTO dto)
        {
            var studentCode = NormalizeStudentCode(dto.StudentCode);
            var fullName = dto.FullName?.Trim() ?? string.Empty;
            var faculty = dto.Faculty?.Trim() ?? string.Empty;
            var email = dto.ContactEmail?.Trim().ToLowerInvariant() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(studentCode)) throw new InvalidOperationException("Vui l?ng nh?p MSSV");
            if (string.IsNullOrWhiteSpace(fullName)) throw new InvalidOperationException("Vui l?ng nh?p h? v? t?n");
            if (string.IsNullOrWhiteSpace(faculty)) throw new InvalidOperationException("Vui l?ng ch?n khoa");
            if (!dto.BirthDate.HasValue) throw new InvalidOperationException("Vui l?ng nh?p ng?y sinh");
            if (string.IsNullOrWhiteSpace(email) || !email.Contains('@')) throw new InvalidOperationException("Email li?n h? kh?ng h?p l?");

            var existedUser = await _context.Users.AnyAsync(u => u.Username == studentCode || u.Email.ToLower() == email);
            if (existedUser) throw new InvalidOperationException("MSSV ho?c email n?y ?? c? t?i kho?n trong h? th?ng");

            var existedMember = await _context.Members.AnyAsync(m => m.ContactEmail != null && m.ContactEmail.ToLower() == email);
            if (existedMember) throw new InvalidOperationException("Email n?y ?? ???c d?ng cho th?nh vi?n kh?c");

            var existedApplication = await _context.MemberApplications.AnyAsync(a =>
                (a.StudentCode == studentCode || a.ContactEmail.ToLower() == email) && a.Status != "Rejected");
            if (existedApplication) throw new InvalidOperationException("H? s? v?i MSSV ho?c email n?y ?ang ch? duy?t ho?c ?? ???c duy?t");

            var application = new MemberApplication
            {
                StudentCode = studentCode,
                FullName = fullName,
                ClassName = string.IsNullOrWhiteSpace(dto.ClassName) ? null : dto.ClassName.Trim(),
                Faculty = faculty,
                BirthDate = dto.BirthDate.Value.Date,
                ContactEmail = email,
                Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim(),
                Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
                Status = "Pending",
                SubmittedAt = DateTime.Now
            };

            _context.MemberApplications.Add(application);
            await _context.SaveChangesAsync();

            return Map(application);
        }

        public async Task<List<MemberApplicationDTO>> GetAllAsync(string? status = null)
        {
            var query = _context.MemberApplications
                .Include(a => a.ReviewedByUser)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(a => a.Status == status);
            }

            return await query
                .OrderByDescending(a => a.SubmittedAt)
                .Select(a => Map(a))
                .ToListAsync();
        }

        public async Task<MemberApplicationDTO?> ApproveAsync(int id, int reviewedByUserId, string? reviewNote = null)
        {
            var application = await _context.MemberApplications.FirstOrDefaultAsync(a => a.MemberApplicationID == id);
            if (application == null) return null;
            if (application.Status != "Pending") throw new InvalidOperationException("H? s? n?y ?? ???c x? l?");

            var existedUser = await _context.Users.AnyAsync(u =>
                u.Username == application.StudentCode || u.Email.ToLower() == application.ContactEmail.ToLower());
            if (existedUser) throw new InvalidOperationException("MSSV ho?c email n?y ?? c? t?i kho?n trong h? th?ng");

            var memberRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Member");
            var defaultPassword = application.BirthDate.ToString("ddMMyyyy");

            var user = new User
            {
                Username = application.StudentCode,
                Email = application.ContactEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(defaultPassword),
                Phone = application.Phone,
                RoleID = memberRole?.RoleID ?? 3,
                IsActive = true,
                CreatedAt = DateTime.Now,
                CreatedDate = DateTime.Now
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var member = new Member
            {
                UserID = user.UserID,
                StudentCode = application.StudentCode,
                FullName = application.FullName,
                ClassName = application.ClassName,
                Faculty = application.Faculty,
                BirthDate = application.BirthDate,
                ContactEmail = application.ContactEmail,
                Position = "Th?nh vi?n",
                Status = "Active",
                JoinDate = DateTime.Now
            };

            _context.Members.Add(member);
            application.Status = "Approved";
            application.ReviewedAt = DateTime.Now;
            application.ReviewedByUserID = reviewedByUserId;
            application.ReviewNote = reviewNote?.Trim();

            await _context.SaveChangesAsync();
            await _context.Entry(application).Reference(a => a.ReviewedByUser).LoadAsync();
            return Map(application);
        }

        public async Task<MemberApplicationDTO?> RejectAsync(int id, int reviewedByUserId, string? reviewNote = null)
        {
            var application = await _context.MemberApplications
                .Include(a => a.ReviewedByUser)
                .FirstOrDefaultAsync(a => a.MemberApplicationID == id);
            if (application == null) return null;
            if (application.Status != "Pending") throw new InvalidOperationException("H? s? n?y ?? ???c x? l?");

            application.Status = "Rejected";
            application.ReviewedAt = DateTime.Now;
            application.ReviewedByUserID = reviewedByUserId;
            application.ReviewNote = reviewNote?.Trim();
            await _context.SaveChangesAsync();
            await _context.Entry(application).Reference(a => a.ReviewedByUser).LoadAsync();
            return Map(application);
        }

        private static string NormalizeStudentCode(string? value) => (value ?? string.Empty).Trim().ToUpperInvariant();

        private static MemberApplicationDTO Map(MemberApplication a) => new()
        {
            MemberApplicationID = a.MemberApplicationID,
            StudentCode = a.StudentCode,
            FullName = a.FullName,
            ClassName = a.ClassName,
            Faculty = a.Faculty,
            BirthDate = a.BirthDate,
            ContactEmail = a.ContactEmail,
            Phone = a.Phone,
            Note = a.Note,
            Status = a.Status,
            SubmittedAt = a.SubmittedAt,
            ReviewedAt = a.ReviewedAt,
            ReviewedBy = a.ReviewedByUser?.Username,
            ReviewNote = a.ReviewNote
        };
    }
}
