using ClubManagement.API.Data;
using ClubManagement.API.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ClubManagement.API.AuthService

{
    public interface IAuthService
    {
        Task<AuthResponseDTO?> LoginAsync(LoginDTO dto);
        Task<AuthResponseDTO?> RegisterAsync(RegisterDTO dto);
        string GenerateToken(User user);
    }
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;

        public AuthService(ApplicationDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }
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
                Role = user.Role?.RoleName ?? "User",
                UserID = user.UserID.ToString(),
                AvatarUrl = user.AvatarUrl,
            };

        }
        public async Task<AuthResponseDTO?> RegisterAsync(RegisterDTO dto)
        {
            if (await _context.Users.AnyAsync(u => u.Username == dto.Username || u.Email == dto.Email))
                return null;

            var memberRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Member");

            var user = new User
            {
                Username = dto.Username,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Phone = dto.Phone,
                RoleID = memberRole?.RoleID ?? 3,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var member = new Member
            {
                UserID = user.UserID,
                FullName = dto.FullName,
                ClassName = dto.ClassName,
                Faculty = dto.Faculty,
                Status = "Active",
                JoinDate = DateTime.UtcNow
            };
            _context.Members.Add(member);
            await _context.SaveChangesAsync();
            var role = await _context.Roles.FindAsync(user.RoleID);
            return new AuthResponseDTO
            {
                Token = GenerateToken(user),
                Username = user.Username,
                Email = user.Email,
                Role = role?.RoleName ?? "User",
                UserID = user.UserID.ToString()
            };

        }

        public string GenerateToken(User user)
        {
            // FIX: Fallback key phải giống hệt với Program.cs
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                            _config["JwtSettings:SecretKey"] ?? "DefaultSecretKey123!@#$%^&*()_+CLUBMANAGEMENT"));

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role?.RoleName ?? "Member"),
                new Claim("RoleID", user.RoleID.ToString())
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