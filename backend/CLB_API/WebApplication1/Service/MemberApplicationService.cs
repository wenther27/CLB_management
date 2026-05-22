using ClubManagement.API.Data;
using ClubManagement.API.DTOs.MemberApplications;
using ClubManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace ClubManagement.API.Service
{
    public interface IMemberApplicationService
    {
        Task SendOtpAsync(CreateMemberApplicationDTO dto);
        Task<MemberApplicationDTO> SubmitAsync(CreateMemberApplicationDTO dto);
        Task<List<MemberApplicationDTO>> GetAllAsync(string? status = null);
        Task<MemberApplicationDTO?> ApproveAsync(int id, int reviewedByUserId, string? reviewNote = null);
        Task<MemberApplicationDTO?> RejectAsync(int id, int reviewedByUserId, string? reviewNote = null);
    }

    public class MemberApplicationService : IMemberApplicationService
    {
        private const string ApplicationOtpPurpose = "member-application";
        private readonly ApplicationDbContext _context;
        private readonly IOtpService _otpService;

        public MemberApplicationService(ApplicationDbContext context, IOtpService otpService)
        {
            _context = context;
            _otpService = otpService;
        }

        private void AddAuditLog(int? userId, string action, string tableName, int? recordId)
        {
            _context.AuditLogs.Add(new AuditLog
            {
                UserID = userId,
                Action = action.Length > 250 ? action[..250] : action,
                TableName = tableName,
                RecordID = recordId,
                CreatedAt = DateTime.Now
            });
        }

        public async Task SendOtpAsync(CreateMemberApplicationDTO dto)
        {
            var normalized = await ValidateSubmitAsync(dto);
            var sent = await _otpService.SendOtpAsync(normalized.Email, ApplicationOtpPurpose);
            if (!sent) throw new InvalidOperationException("Không thể gửi mã OTP. Vui lòng thử lại.");
        }

        public async Task<MemberApplicationDTO> SubmitAsync(CreateMemberApplicationDTO dto)
        {
            var normalized = await ValidateSubmitAsync(dto);

            if (string.IsNullOrWhiteSpace(dto.Otp))
                throw new InvalidOperationException("Vui lòng nhập mã OTP xác thực email");

            var isOtpValid = await _otpService.VerifyOtpAsync(normalized.Email, dto.Otp, ApplicationOtpPurpose);
            if (!isOtpValid)
                throw new InvalidOperationException("Mã OTP không đúng hoặc đã hết hạn");

            var application = new MemberApplication
            {
                StudentCode = normalized.StudentCode,
                FullName = normalized.FullName,
                ClassName = string.IsNullOrWhiteSpace(dto.ClassName) ? null : dto.ClassName.Trim(),
                Faculty = normalized.Faculty,
                BirthDate = normalized.BirthDate,
                ContactEmail = normalized.Email,
                Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim(),
                Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
                StudentCardImageUrl = string.IsNullOrWhiteSpace(dto.StudentCardImageUrl) ? null : dto.StudentCardImageUrl.Trim(),
                Status = "Pending",
                SubmittedAt = DateTime.Now
            };

            _context.MemberApplications.Add(application);
            await _context.SaveChangesAsync();
            AddAuditLog(null, $"Nộp hồ sơ thành viên: {application.FullName} ({application.StudentCode})", "MemberApplications", application.MemberApplicationID);
            await _context.SaveChangesAsync();

            return Map(application);
        }

        private async Task<(string StudentCode, string FullName, string Faculty, DateTime BirthDate, string Email)> ValidateSubmitAsync(CreateMemberApplicationDTO dto)
        {
            var studentCode = NormalizeStudentCode(dto.StudentCode);
            var fullName = dto.FullName?.Trim() ?? string.Empty;
            var faculty = dto.Faculty?.Trim() ?? string.Empty;
            var email = dto.ContactEmail?.Trim().ToLowerInvariant() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(studentCode)) throw new InvalidOperationException("Vui lòng nhập MSSV");
            if (string.IsNullOrWhiteSpace(fullName)) throw new InvalidOperationException("Vui lòng nhập họ và tên");
            if (string.IsNullOrWhiteSpace(faculty)) throw new InvalidOperationException("Vui lòng chọn khoa");
            if (!dto.BirthDate.HasValue) throw new InvalidOperationException("Vui lòng nhập ngày sinh");
            if (string.IsNullOrWhiteSpace(email) || !email.Contains('@')) throw new InvalidOperationException("Email liên hệ không hợp lệ");
            if (string.IsNullOrWhiteSpace(dto.StudentCardImageUrl)) throw new InvalidOperationException("Vui lòng tải ảnh thẻ sinh viên");

            var existedUser = await _context.Users.AnyAsync(u => u.Email.ToLower() == email);
            var existedStudentCode = await _context.Members.AnyAsync(m => m.StudentCode == studentCode);
            if (existedUser || existedStudentCode) throw new InvalidOperationException("MSSV hoặc email này đã có tài khoản trong hệ thống");

            var existedMember = await _context.Members.AnyAsync(m => m.ContactEmail != null && m.ContactEmail.ToLower() == email);
            if (existedMember) throw new InvalidOperationException("Email này đã được dùng cho thành viên khác");

            var existedApplication = await _context.MemberApplications.AnyAsync(a =>
                (a.StudentCode == studentCode || a.ContactEmail.ToLower() == email) && a.Status != "Rejected");
            if (existedApplication) throw new InvalidOperationException("Hồ sơ với MSSV hoặc email này đang chờ duyệt hoặc đã được duyệt");

            return (studentCode, fullName, faculty, dto.BirthDate.Value.Date, email);
        }

        public async Task<List<MemberApplicationDTO>> GetAllAsync(string? status = null)
        {
            var query = _context.MemberApplications
                .Include(a => a.ReviewedByUser)
                    .ThenInclude(u => u!.Member)
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
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var application = await _context.MemberApplications
                .Include(a => a.ReviewedByUser)
                .ThenInclude(u => u!.Member)
                .FirstOrDefaultAsync(a => a.MemberApplicationID == id);
            if (application == null) return null;
            if (application.Status == "Approved") return Map(application);
            if (application.Status != "Pending") throw new InvalidOperationException("Hồ sơ này đã được xử lý");

            var memberRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Member");
            var defaultPassword = application.BirthDate.ToString("ddMMyyyy");
            var email = application.ContactEmail.Trim().ToLowerInvariant();
            var studentCode = NormalizeStudentCode(application.StudentCode);

            var existingUser = await _context.Users
                .Include(u => u.Member)
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email);

            var existingMember = await _context.Members
                .Include(m => m.User)
                .FirstOrDefaultAsync(m => m.StudentCode == studentCode);

            if (existingUser?.Member != null && existingUser.Member.StudentCode != studentCode)
                throw new InvalidOperationException("Email này đã được dùng cho thành viên khác");

            if (existingUser != null && existingMember != null &&
                existingMember.UserID.HasValue && existingMember.UserID.Value != existingUser.UserID)
                throw new InvalidOperationException("MSSV và email đang thuộc hai tài khoản khác nhau");

            var user = existingUser ?? new User
            {
                Email = application.ContactEmail,
                RoleID = memberRole?.RoleID ?? 3,
                IsActive = true,
                CreatedAt = DateTime.Now,
                CreatedDate = DateTime.Now
            };

            user.Email = application.ContactEmail;
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(defaultPassword);
            user.Phone = application.Phone;
            user.RoleID = memberRole?.RoleID ?? user.RoleID;
            user.IsActive = true;
            user.UpdatedAt = DateTime.Now;

            if (existingUser == null)
            {
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
            }

            var member = existingMember ?? new Member
            {
                UserID = user.UserID,
                Position = "Thành viên",
                Status = "Active",
                JoinDate = DateTime.Now
            };

            member.UserID = user.UserID;
            member.StudentCode = studentCode;
            member.FullName = application.FullName;
            member.ClassName = application.ClassName;
            member.Faculty = application.Faculty;
            member.BirthDate = application.BirthDate;
            member.ContactEmail = application.ContactEmail;
            member.Position ??= "Thành viên";
            member.Status = "Active";

            if (existingMember == null)
            {
                _context.Members.Add(member);
            }

            application.Status = "Approved";
            application.ReviewedAt = DateTime.Now;
            application.ReviewedByUserID = reviewedByUserId;
            application.ReviewNote = reviewNote?.Trim();

            await _context.SaveChangesAsync();
            AddAuditLog(reviewedByUserId, $"Duyệt hồ sơ thành viên: {application.FullName} ({application.StudentCode})", "Members", member.MemberID);
            await _context.SaveChangesAsync();
            await _otpService.SendMemberApprovedEmailAsync(
                application.ContactEmail,
                application.FullName,
                application.StudentCode,
                defaultPassword);

            await transaction.CommitAsync();
            await _context.Entry(application).Reference(a => a.ReviewedByUser).LoadAsync();
            return Map(application);
        }

        public async Task<MemberApplicationDTO?> RejectAsync(int id, int reviewedByUserId, string? reviewNote = null)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var application = await _context.MemberApplications
                .Include(a => a.ReviewedByUser)
                .ThenInclude(u => u!.Member)
                .FirstOrDefaultAsync(a => a.MemberApplicationID == id);
            if (application == null) return null;
            if (application.Status != "Pending") throw new InvalidOperationException("Hồ sơ này đã được xử lý");

            application.Status = "Rejected";
            application.ReviewedAt = DateTime.Now;
            application.ReviewedByUserID = reviewedByUserId;
            application.ReviewNote = reviewNote?.Trim();
            AddAuditLog(reviewedByUserId, $"Từ chối hồ sơ thành viên: {application.FullName} ({application.StudentCode})", "MemberApplications", application.MemberApplicationID);
            await _context.SaveChangesAsync();
            await _otpService.SendMemberRejectedEmailAsync(
                application.ContactEmail,
                application.FullName,
                application.StudentCode,
                application.ReviewNote);

            await transaction.CommitAsync();
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
            StudentCardImageUrl = a.StudentCardImageUrl,
            Status = a.Status,
            SubmittedAt = a.SubmittedAt,
            ReviewedAt = a.ReviewedAt,
            ReviewedBy = a.ReviewedByUser == null ? null : (!string.IsNullOrWhiteSpace(a.ReviewedByUser.Member?.FullName) ? a.ReviewedByUser.Member.FullName : (!string.IsNullOrWhiteSpace(a.ReviewedByUser.Member?.StudentCode) ? a.ReviewedByUser.Member.StudentCode : a.ReviewedByUser.Email)),
            ReviewNote = a.ReviewNote
        };
    }
}
