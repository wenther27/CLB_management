
using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Caching.Memory;

namespace ClubManagement.API.Service
{
    public interface IOtpService
    {
        Task<bool> SendOtpAsync(string email, string purpose); // purpose: "register" | "forgot" | "member-application"
        Task SendMemberApprovedEmailAsync(string email, string fullName, string studentCode, string temporaryPassword);
        Task SendMemberRejectedEmailAsync(string email, string fullName, string studentCode, string? reason);
        Task<bool> VerifyOtpAsync(string email, string otp, string purpose);
        void InvalidateOtp(string email, string purpose);
    }

    public class OtpService : IOtpService
    {
        private readonly IMemoryCache _cache;
        private readonly IConfiguration _config;
        private readonly ILogger<OtpService> _logger;
        private readonly IWebHostEnvironment _env;

        // OTP hết hạn sau 10 phút
        private static readonly TimeSpan OtpExpiry = TimeSpan.FromMinutes(10);

        public OtpService(IMemoryCache cache, IConfiguration config, ILogger<OtpService> logger, IWebHostEnvironment env)
        {
            _cache = cache;
            _config = config;
            _logger = logger;
            _env = env;
        }

        //Tạo OTP 6 số ngẫu nhiên
        private static string GenerateOtp()
        {
            using var rng = RandomNumberGenerator.Create();
            var bytes = new byte[4];
            rng.GetBytes(bytes);
            var number = Math.Abs(BitConverter.ToInt32(bytes, 0)) % 1000000;
            return number.ToString("D6");
        }

        // Cache key 
        private static string CacheKey(string email, string purpose)
            => $"otp:{purpose}:{email.ToLower()}";

        // Gửi OTP qua Gmail SMTP 
        public async Task<bool> SendOtpAsync(string email, string purpose)
        {
            var otp = GenerateOtp();
            var key = CacheKey(email, purpose);

            // Lưu OTP vào memory cache (có thể đổi sang Redis nếu cần scale)
            _cache.Set(key, otp, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = OtpExpiry,
                SlidingExpiration = null
            });

            try
            {
                var subject = purpose switch
                {
                    "register" => "🎉 Mã xác thực đăng ký tài khoản CLB CTXH DUT",
                    "member-application" => "📩 Mã xác thực email nộp hồ sơ CLB CTXH DUT",
                    _ => "🔑 Mã đặt lại mật khẩu CLB CTXH DUT"
                };

                await SendEmailAsync(email, subject, BuildEmailHtml(otp, purpose));
                _logger.LogInformation("[OTP] Sent {Purpose} OTP to {Email}", purpose, email);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[OTP] Failed to send OTP to {Email}", email);
                _cache.Remove(key); // Xóa OTP nếu gửi thất bại
                return false;
            }
        }

        // Xác thực OTP 
        public Task<bool> VerifyOtpAsync(string email, string otp, string purpose)
        {
            var key = CacheKey(email, purpose);
            if (!_cache.TryGetValue(key, out string? storedOtp))
                return Task.FromResult(false);

            var isValid = storedOtp == otp.Trim();
            if (isValid)
                _cache.Remove(key); // OTP chỉ dùng 1 lần

            return Task.FromResult(isValid);
        }

        //  Xóa OTP (khi user đăng ký xong) 
        public void InvalidateOtp(string email, string purpose)
            => _cache.Remove(CacheKey(email, purpose));

        public async Task SendMemberApprovedEmailAsync(string email, string fullName, string studentCode, string temporaryPassword)
        {
            await SendEmailAsync(
                email,
                "Chúc mừng bạn đã trở thành thành viên CLB CTXH DUT",
                BuildMemberApprovedEmailHtml(fullName, studentCode, temporaryPassword));

            _logger.LogInformation("[MEMBER_APPLICATION] Sent approval email to {Email}", email);
        }

        public async Task SendMemberRejectedEmailAsync(string email, string fullName, string studentCode, string? reason)
        {
            await SendEmailAsync(
                email,
                "Thông báo kết quả hồ sơ thành viên CLB CTXH DUT",
                BuildMemberRejectedEmailHtml(fullName, studentCode, reason));

            _logger.LogInformation("[MEMBER_APPLICATION] Sent rejection email to {Email}", email);
        }

        // Gửi email qua Gmail SMTP
        private async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
        {
            var smtpHost = _config["Gmail:SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_config["Gmail:SmtpPort"] ?? "587");
            var senderEmail = _config["Gmail:SenderEmail"] ?? throw new InvalidOperationException("Gmail:SenderEmail not configured");
            var senderPass = _config["Gmail:AppPassword"] ?? throw new InvalidOperationException("Gmail:AppPassword not configured");
            var senderName = _config["Gmail:SenderName"] ?? "CLB CTXH DUT";

            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(senderEmail, senderPass),
                Timeout = 15000
            };

            using var message = new MailMessage
            {
                From = new MailAddress(senderEmail, senderName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };
            message.To.Add(new MailAddress(toEmail));

            await client.SendMailAsync(message);
        }

        // HTML template email OTP 
        private string BuildEmailHtml(string otp, string purpose)
        {
            var title = purpose switch
            {
                "register" => "Xác thực đăng ký tài khoản",
                "member-application" => "Xác thực email nộp hồ sơ",
                _ => "Đặt lại mật khẩu"
            };

            var desc = purpose switch
            {
                "register" => "Bạn vừa đăng ký tài khoản tại <strong>CLB Công tác Xã hội DUT</strong>. Dùng mã dưới đây để hoàn tất đăng ký:",
                "member-application" => "Bạn vừa nộp hồ sơ thành viên tại <strong>CLB Công tác Xã hội DUT</strong>. Dùng mã dưới đây để xác thực email trước khi gửi hồ sơ đến ban quản lý:",
                _ => "Chúng tôi nhận được yêu cầu đặt lại mật khẩu. Dùng mã dưới đây để tiếp tục:"
            };

            return RenderEmailTemplate("otp.html", new Dictionary<string, string>
            {
                ["Title"] = title,
                ["Description"] = desc,
                ["Otp"] = WebUtility.HtmlEncode(otp),
                ["Year"] = DateTime.Now.Year.ToString()
            });
        }

        private string BuildMemberApprovedEmailHtml(string fullName, string studentCode, string temporaryPassword)
        {
            return RenderEmailTemplate("member-approved.html", new Dictionary<string, string>
            {
                ["FullName"] = WebUtility.HtmlEncode(fullName),
                ["StudentCode"] = WebUtility.HtmlEncode(studentCode),
                ["TemporaryPassword"] = WebUtility.HtmlEncode(temporaryPassword),
                ["Year"] = DateTime.Now.Year.ToString()
            });
        }

        private string BuildMemberRejectedEmailHtml(string fullName, string studentCode, string? reason)
        {
            var safeReason = string.IsNullOrWhiteSpace(reason)
                ? "Ban quản lý chưa ghi chú lý do cụ thể. Bạn có thể liên hệ CLB để được hỗ trợ thêm."
                : WebUtility.HtmlEncode(reason.Trim());

            return RenderEmailTemplate("member-rejected.html", new Dictionary<string, string>
            {
                ["FullName"] = WebUtility.HtmlEncode(fullName),
                ["StudentCode"] = WebUtility.HtmlEncode(studentCode),
                ["Reason"] = safeReason,
                ["Year"] = DateTime.Now.Year.ToString()
            });
        }

        private string RenderEmailTemplate(string templateName, IReadOnlyDictionary<string, string> values)
        {
            var templatePath = Path.Combine(_env.ContentRootPath, "Templates", "Emails", templateName);
            if (!File.Exists(templatePath))
                throw new FileNotFoundException($"Không tìm thấy template email: {templateName}", templatePath);

            var html = File.ReadAllText(templatePath, Encoding.UTF8);
            foreach (var item in values)
                html = html.Replace($"{{{{{item.Key}}}}}", item.Value);

            return html;
        }
    }
}
