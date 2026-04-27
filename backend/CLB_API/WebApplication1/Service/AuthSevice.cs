// ================================================
// AuthService.cs — UPDATED
// Thay thế toàn bộ file: WebApplication1/Service/AuthSevice.cs
// Thêm: SendRegisterOtp, VerifyOtp, ForgotPassword, ResetPassword
// ================================================

using ClubManagement.API.Data;
using ClubManagement.API.DTOs;
using ClubManagement.API.DTOs.Auth;
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

        // ── Đăng ký 2 bước (gửi OTP → xác thực) ────────────────────────────
        Task<(bool Success, string? Error)> SendRegisterOtpAsync(RegisterDTO dto);
        Task<AuthResponseDTO?> VerifyRegisterOtpAsync(VerifyRegisterOtpDTO dto);
        Task<bool> ResendOtpAsync(string email, string purpose);

        // ── Quên / đặt lại mật khẩu ─────────────────────────────────────────
        Task<(bool Success, string? Error)> ForgotPasswordAsync(string email);
        Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordDTO dto);

        string GenerateToken(User user);
    }

    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;
        private readonly IOtpService _otpService;
        private readonly IMemoryCache _pendingCache; // lưu RegisterDTO tạm thời

        public AuthService(ApplicationDbContext context, IConfiguration config,
            IOtpService otpService, IMemoryCache pendingCache)
        {
            _context = context;
            _config = config;
            _otpService = otpService;
            _pendingCache = pendingCache;
        }

        // ════════════════════════════════════════════════════════════════════
        // ĐĂNG NHẬP
        // ════════════════════════════════════════════════════════════════════
        public async Task<AuthResponseDTO?> LoginAsync(LoginDTO dto)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Username == dto.Username && u.IsActive);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return null;

            return new AuthResponseDTO
            {
                Token = GenerateToken(user),
                Username = user.Username,
                Email = user.Email,
                Role = user.Role?.RoleName ?? "Member",
                UserID = user.UserID.ToString()
            };
        }

        // ════════════════════════════════════════════════════════════════════
        // ĐĂNG KÝ — BƯỚC 1: Validate & Gửi OTP
        // ════════════════════════════════════════════════════════════════════
        public async Task<(bool Success, string? Error)> SendRegisterOtpAsync(RegisterDTO dto)
        {
            // Kiểm tra trùng lặp
            var exists = await _context.Users
                .AnyAsync(u => u.Username == dto.Username || u.Email == dto.Email);
            if (exists)
                return (false, "Tên đăng nhập hoặc Email đã tồn tại");

            // Validate cơ bản
            if (string.IsNullOrWhiteSpace(dto.Username) || dto.Username.Length < 3)
                return (false, "Tên đăng nhập phải có ít nhất 3 ký tự");

            if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
                return (false, "Mật khẩu phải có ít nhất 6 ký tự");

            if (string.IsNullOrWhiteSpace(dto.Email) || !dto.Email.Contains('@'))
                return (false, "Email không hợp lệ");

            // Lưu tạm RegisterDTO vào cache (15 phút) → dùng khi xác thực OTP
            _pendingCache.Set($"pending_register:{dto.Email.ToLower()}", dto,
                TimeSpan.FromMinutes(15));

            // Gửi OTP
            var sent = await _otpService.SendOtpAsync(dto.Email, "register");
            return sent
                ? (true, null)
                : (false, "Không thể gửi email. Vui lòng kiểm tra địa chỉ email và thử lại.");
        }

        // ════════════════════════════════════════════════════════════════════
        // ĐĂNG KÝ — BƯỚC 2: Xác thực OTP → Tạo tài khoản
        // ════════════════════════════════════════════════════════════════════
        public async Task<AuthResponseDTO?> VerifyRegisterOtpAsync(VerifyRegisterOtpDTO dto)
        {
            // Xác thực OTP
            var isValid = await _otpService.VerifyOtpAsync(dto.Email, dto.Otp, "register");
            if (!isValid) return null;

            // Lấy lại RegisterDTO đã lưu
            if (!_pendingCache.TryGetValue($"pending_register:{dto.Email.ToLower()}", out RegisterDTO? regDto)
                || regDto == null)
                return null;

            // Kiểm tra lại (phòng race condition)
            var stillExists = await _context.Users
                .AnyAsync(u => u.Username == regDto.Username || u.Email == regDto.Email);
            if (stillExists) return null;

            // Tạo user
            var memberRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Member");
            var user = new User
            {
                Username = regDto.Username,
                Email = regDto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(regDto.Password),
                Phone = regDto.Phone,
                RoleID = memberRole?.RoleID ?? 3,
                IsActive = true,
                CreatedAt = DateTime.Now,
                CreatedDate = DateTime.Now
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Tạo Member profile
            var member = new Member
            {
                UserID = user.UserID,
                FullName = regDto.FullName,
                ClassName = regDto.ClassName,
                Faculty = regDto.Faculty,
                Status = "Active",
                JoinDate = DateTime.Now
            };
            _context.Members.Add(member);
            await _context.SaveChangesAsync();

            // Xóa cache pending
            _pendingCache.Remove($"pending_register:{dto.Email.ToLower()}");

            // Load Role để generate token
            await _context.Entry(user).Reference(u => u.Role).LoadAsync();

            return new AuthResponseDTO
            {
                Token = GenerateToken(user),
                Username = user.Username,
                Email = user.Email,
                Role = user.Role?.RoleName ?? "Member",
                UserID = user.UserID.ToString()
            };
        }

        // ════════════════════════════════════════════════════════════════════
        // GỬI LẠI OTP
        // ════════════════════════════════════════════════════════════════════
        public async Task<bool> ResendOtpAsync(string email, string purpose)
        {
            if (purpose == "register")
            {
                // Kiểm tra có pending registration không
                if (!_pendingCache.TryGetValue($"pending_register:{email.ToLower()}", out _))
                    return false;
            }
            else if (purpose == "forgot")
            {
                // Kiểm tra email tồn tại
                var exists = await _context.Users.AnyAsync(u => u.Email == email && u.IsActive);
                if (!exists) return false;
            }

            return await _otpService.SendOtpAsync(email, purpose);
        }

        // ════════════════════════════════════════════════════════════════════
        // QUÊN MẬT KHẨU — Gửi OTP
        // ════════════════════════════════════════════════════════════════════
        public async Task<(bool Success, string? Error)> ForgotPasswordAsync(string email)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == email && u.IsActive);

            // Không tiết lộ email có tồn tại hay không (bảo mật)
            if (user == null)
                return (true, null); // Trả về success nhưng không gửi

            var sent = await _otpService.SendOtpAsync(email, "forgot");
            return sent
                ? (true, null)
                : (false, "Không thể gửi email. Vui lòng thử lại.");
        }

        // ════════════════════════════════════════════════════════════════════
        // ĐẶT LẠI MẬT KHẨU — Xác thực OTP → Đặt mật khẩu mới
        // ════════════════════════════════════════════════════════════════════
        public async Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
                return (false, "Mật khẩu mới phải có ít nhất 6 ký tự");

            if (dto.NewPassword != dto.ConfirmPassword)
                return (false, "Mật khẩu xác nhận không khớp");

            // Xác thực OTP
            var isValid = await _otpService.VerifyOtpAsync(dto.Email, dto.Otp, "forgot");
            if (!isValid)
                return (false, "Mã OTP không hợp lệ hoặc đã hết hạn");

            // Tìm user
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == dto.Email && u.IsActive);
            if (user == null)
                return (false, "Không tìm thấy tài khoản");

            // Cập nhật mật khẩu
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return (true, null);
        }

        // ════════════════════════════════════════════════════════════════════
        // GENERATE JWT TOKEN
        // ════════════════════════════════════════════════════════════════════
        public string GenerateToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                _config["JwtSettings:SecretKey"] ?? "DefaultSecretKey123!@#$%^&*()_+CLUBMANAGEMENT"));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
                new Claim(ClaimTypes.Name,           user.Username),
                new Claim(ClaimTypes.Email,          user.Email),
                new Claim(ClaimTypes.Role,           user.Role?.RoleName ?? "Member"),
                new Claim("RoleID",                  user.RoleID.ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _config["JwtSettings:Issuer"] ?? "https://localhost:5190",
                audience: _config["JwtSettings:Audience"] ?? "ClubManagementAPI",
                claims: claims,
                expires: DateTime.UtcNow.AddHours(
                                       double.Parse(_config["JwtSettings:ExpirationHours"] ?? "24")),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}