using ClubManagement.API.Data;
using ClubManagement.API.DTOs;
using ClubManagement.API.DTOs.Auth;
using ClubManagement.API.Models;
using ClubManagement.API.Service;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ClubManagement.API.AuthService
{
    public interface IAuthService
    {
        Task<AuthResponseDTO?> LoginAsync(LoginDTO dto);
        Task<(bool Success, string? Error)> SendRegisterOtpAsync(RegisterDTO dto);
        Task<AuthResponseDTO?> VerifyRegisterOtpAsync(VerifyRegisterOtpDTO dto);
        Task<bool> ResendOtpAsync(string email, string purpose);
        Task<(bool Success, string? Error)> ForgotPasswordAsync(string email);
        Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordDTO dto);
        string GenerateToken(User user);
    }

    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;
        private readonly IOtpService _otpService;
        private readonly IMemoryCache _pendingCache;

        public AuthService(ApplicationDbContext context, IConfiguration config,
            IOtpService otpService, IMemoryCache pendingCache)
        {
            _context = context;
            _config = config;
            _otpService = otpService;
            _pendingCache = pendingCache;
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

        public async Task<AuthResponseDTO?> LoginAsync(LoginDTO dto)
        {
            var login = (dto.Login ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(login)) return null;

            var loginLower = login.ToLowerInvariant();
            var studentCode = NormalizeStudentCode(login);

            var user = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.Member)
                .FirstOrDefaultAsync(u => u.IsActive &&
                    (u.Email.ToLower() == loginLower ||
                     (u.Member != null && u.Member.StudentCode == studentCode)));

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return null;

            AddAuditLog(user.UserID, "Đăng nhập hệ thống", "Login", user.UserID);
            await _context.SaveChangesAsync();
            return ToAuthResponse(user);
        }

        public async Task<(bool Success, string? Error)> SendRegisterOtpAsync(RegisterDTO dto)
        {
            var studentCode = NormalizeStudentCode(dto.StudentCode);
            var email = (dto.Email ?? string.Empty).Trim().ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(studentCode) || studentCode.Length < 3)
                return (false, "MSSV phải có ít nhất 3 kí tự");

            if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
                return (false, "Mật khẩu phải có ít nhất 6 kí tự");

            if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
                return (false, "Email không hợp lệ");

            var exists = await _context.Users.AnyAsync(u => u.Email.ToLower() == email)
                || await _context.Members.AnyAsync(m => m.StudentCode == studentCode);
            if (exists)
                return (false, "MSSV hoặc Email ?? tồn tại");

            dto.StudentCode = studentCode;
            dto.Email = email;
            _pendingCache.Set($"pending_register:{email}", dto, TimeSpan.FromMinutes(15));

            var sent = await _otpService.SendOtpAsync(email, "register");
            return sent
                ? (true, null)
                : (false, "Không thể gưĩ email. Vui lòng kiểm tra địa chỉ email v? th? l?i.");
        }

        public async Task<AuthResponseDTO?> VerifyRegisterOtpAsync(VerifyRegisterOtpDTO dto)
        {
            var email = (dto.Email ?? string.Empty).Trim().ToLowerInvariant();
            var isValid = await _otpService.VerifyOtpAsync(email, dto.Otp, "register");
            if (!isValid) return null;

            if (!_pendingCache.TryGetValue($"pending_register:{email}", out RegisterDTO? regDto)
                || regDto == null)
                return null;

            var studentCode = NormalizeStudentCode(regDto.StudentCode);
            var stillExists = await _context.Users.AnyAsync(u => u.Email.ToLower() == email)
                || await _context.Members.AnyAsync(m => m.StudentCode == studentCode);
            if (stillExists) return null;

            var memberRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Member");
            var user = new User
            {
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(regDto.Password),
                Phone = regDto.Phone,
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
                StudentCode = studentCode,
                FullName = regDto.FullName,
                ClassName = regDto.ClassName,
                Faculty = regDto.Faculty,
                BirthDate = regDto.BirthDate,
                ContactEmail = email,
                Status = "Active",
                JoinDate = DateTime.Now
            };
            _context.Members.Add(member);
            AddAuditLog(user.UserID, $"Đăng ký tài khoản: {member.FullName}", "Users", user.UserID);
            await _context.SaveChangesAsync();

            _pendingCache.Remove($"pending_register:{email}");
            await _context.Entry(user).Reference(u => u.Role).LoadAsync();
            await _context.Entry(user).Reference(u => u.Member).LoadAsync();

            return ToAuthResponse(user);
        }

        public async Task<bool> ResendOtpAsync(string email, string purpose)
        {
            var normalizedEmail = (email ?? string.Empty).Trim().ToLowerInvariant();
            if (purpose == "register")
            {
                if (!_pendingCache.TryGetValue($"pending_register:{normalizedEmail}", out _))
                    return false;
            }
            else if (purpose == "forgot")
            {
                var exists = await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail && u.IsActive);
                if (!exists) return false;
            }

            return await _otpService.SendOtpAsync(normalizedEmail, purpose);
        }

        public async Task<(bool Success, string? Error)> ForgotPasswordAsync(string email)
        {
            var normalizedEmail = (email ?? string.Empty).Trim().ToLowerInvariant();
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail && u.IsActive);

            if (user == null)
                return (true, null);

            var sent = await _otpService.SendOtpAsync(normalizedEmail, "forgot");
            return sent ? (true, null) : (false, "Không thể gưi email. Vui lòng thử lại.");
        }

        public async Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
                return (false, "Mật khẩu mới phải có ít nhấtt 6 kí tự");

            if (dto.NewPassword != dto.ConfirmPassword)
                return (false, "Mật khẩu xác nhận không khớp");

            var email = (dto.Email ?? string.Empty).Trim().ToLowerInvariant();
            var isValid = await _otpService.VerifyOtpAsync(email, dto.Otp, "forgot");
            if (!isValid)
                return (false, "Mã OTP không hợp lệ hoặc ?? h?t h?n");

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email && u.IsActive);
            if (user == null)
                return (false, "Không tìm thấy tài khoản");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.Now;
            AddAuditLog(user.UserID, "Đặt lại mật khẩu", "Users", user.UserID);
            await _context.SaveChangesAsync();

            return (true, null);
        }

        public string GenerateToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                _config["JwtSettings:SecretKey"] ?? "DefaultSecretKey123!@#$%^&*()_+CLUBMANAGEMENT"));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var displayName = GetDisplayName(user);
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
                new Claim(ClaimTypes.Name, displayName),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role?.RoleName ?? "Member"),
                new Claim("RoleID", user.RoleID.ToString()),
                new Claim("StudentCode", user.Member?.StudentCode ?? string.Empty)
            };

            var token = new JwtSecurityToken(
                issuer: _config["JwtSettings:Issuer"] ?? "https://localhost:5190",
                audience: _config["JwtSettings:Audience"] ?? "ClubManagementAPI",
                claims: claims,
                expires: DateTime.UtcNow.AddHours(double.Parse(_config["JwtSettings:ExpirationHours"] ?? "24")),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private AuthResponseDTO ToAuthResponse(User user) => new()
        {
            Token = GenerateToken(user),
            StudentCode = user.Member?.StudentCode,
            FullName = user.Member?.FullName,
            DisplayName = GetDisplayName(user),
            Email = user.Email,
            Role = user.Role?.RoleName ?? "Member",
            UserID = user.UserID.ToString(),
            AvatarUrl = user.Member?.AvatarUrl ?? user.AvatarUrl
        };

        private static string NormalizeStudentCode(string? value) => (value ?? string.Empty).Trim().ToUpperInvariant();

        private static string GetDisplayName(User user)
            => !string.IsNullOrWhiteSpace(user.Member?.FullName)
                ? user.Member.FullName
                : !string.IsNullOrWhiteSpace(user.Member?.StudentCode)
                    ? user.Member.StudentCode!
                    : user.Email;
    }
}
