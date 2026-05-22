// ================================================
// OtpService.cs
// Dịch vụ gửi OTP qua Gmail SMTP
// Thêm vào: WebApplication1/Service/OtpService.cs
// ================================================

using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using Microsoft.Extensions.Caching.Memory;

namespace ClubManagement.API.Service
{
    public interface IOtpService
    {
        Task<bool> SendOtpAsync(string email, string purpose); // purpose: "register" | "forgot" | "member-application"
        Task SendMemberApprovedEmailAsync(string email, string fullName, string studentCode, string temporaryPassword);
        Task<bool> VerifyOtpAsync(string email, string otp, string purpose);
        void InvalidateOtp(string email, string purpose);
    }

    public class OtpService : IOtpService
    {
        private readonly IMemoryCache _cache;
        private readonly IConfiguration _config;
        private readonly ILogger<OtpService> _logger;

        // OTP hết hạn sau 10 phút
        private static readonly TimeSpan OtpExpiry = TimeSpan.FromMinutes(10);

        public OtpService(IMemoryCache cache, IConfiguration config, ILogger<OtpService> logger)
        {
            _cache = cache;
            _config = config;
            _logger = logger;
        }

        // ── Tạo OTP 6 số ngẫu nhiên an toàn ──────────────────────────────────
        private static string GenerateOtp()
        {
            using var rng = RandomNumberGenerator.Create();
            var bytes = new byte[4];
            rng.GetBytes(bytes);
            var number = Math.Abs(BitConverter.ToInt32(bytes, 0)) % 1000000;
            return number.ToString("D6");
        }

        // ── Cache key ─────────────────────────────────────────────────────────
        private static string CacheKey(string email, string purpose)
            => $"otp:{purpose}:{email.ToLower()}";

        // ── Gửi OTP qua Gmail SMTP ────────────────────────────────────────────
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

        // ── Xác thực OTP ──────────────────────────────────────────────────────
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

        // ── Xóa OTP (khi user đăng ký xong) ─────────────────────────────────
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

        // ── Gửi email qua Gmail SMTP ──────────────────────────────────────────
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

        // ── HTML template email OTP ───────────────────────────────────────────
        private static string BuildEmailHtml(string otp, string purpose)
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

            return $"""
            <!DOCTYPE html>
            <html lang="vi">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
              <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)">
                
                <!-- Header -->
                <div style="background:linear-gradient(135deg,#e8213a 0%,#c01830 100%);padding:36px 32px;text-align:center">
                  <div style="font-size:36px;margin-bottom:8px">❤️</div>
                  <div style="color:white;font-size:22px;font-weight:800;letter-spacing:-0.5px">CTXH<span style="opacity:0.8">DUT</span></div>
                  <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px">CLB Công tác Xã hội DUT</div>
                </div>
                
                <!-- Body -->
                <div style="padding:36px 32px">
                  <h2 style="color:#111827;font-size:20px;margin:0 0 12px;font-weight:700">{title}</h2>
                  <p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 28px">{desc}</p>
                  
                  <!-- OTP Box -->
                  <div style="background:#fef2f4;border:2px dashed #e8213a;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px">
                    <div style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Mã xác thực của bạn</div>
                    <div style="color:#e8213a;font-size:40px;font-weight:900;letter-spacing:8px;font-family:monospace">{otp}</div>
                    <div style="color:#9ca3af;font-size:12px;margin-top:10px">⏱ Mã có hiệu lực trong <strong>10 phút</strong></div>
                  </div>
                  
                  <div style="background:#f8f9fc;border-radius:8px;padding:14px 16px;margin-bottom:24px">
                    <p style="color:#374151;font-size:13px;margin:0;line-height:1.6">
                      ⚠️ <strong>Lưu ý bảo mật:</strong> Không chia sẻ mã này với bất kỳ ai. 
                      CLB CTXH DUT sẽ không bao giờ yêu cầu mã OTP qua điện thoại hoặc mạng xã hội.
                    </p>
                  </div>
                  
                  <p style="color:#9ca3af;font-size:12px;margin:0">
                    Nếu bạn không yêu cầu mã này, hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn.
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="background:#f8f9fc;border-top:1px solid #e5e7eb;padding:18px 32px;text-align:center">
                  <p style="color:#9ca3af;font-size:11px;margin:0">
                    © {DateTime.Now.Year} CLB Công tác Xã hội · Trường Đại học Bách Khoa Đà Nẵng<br>
                    54 Nguyễn Lương Bằng, Đà Nẵng
                  </p>
                </div>
              </div>
            </body>
            </html>
            """;
        }

        private static string BuildMemberApprovedEmailHtml(string fullName, string studentCode, string temporaryPassword)
        {
            return $"""
            <!DOCTYPE html>
            <html lang="vi">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
              <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)">
                <div style="background:linear-gradient(135deg,#e8213a 0%,#c01830 100%);padding:34px 32px;text-align:center">
                  <div style="color:white;font-size:23px;font-weight:800;letter-spacing:-0.5px">CTXHDUT</div>
                  <div style="color:rgba(255,255,255,0.88);font-size:13px;margin-top:6px">CLB Công tác Xã hội DUT</div>
                </div>

                <div style="padding:34px 32px">
                  <h2 style="color:#111827;font-size:22px;margin:0 0 12px;font-weight:800">Chúc mừng {fullName}!</h2>
                  <p style="color:#4b5563;font-size:14px;line-height:1.7;margin:0 0 24px">
                    Hồ sơ đăng ký thành viên của bạn đã được duyệt. Dưới đây là thông tin tài khoản để đăng nhập hệ thống CLB CTXH DUT.
                  </p>

                  <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:22px">
                    <div style="margin-bottom:14px">
                      <div style="color:#6b7280;font-size:12px;text-transform:uppercase;font-weight:700;letter-spacing:0.06em">Tên đăng nhập</div>
                      <div style="color:#111827;font-size:18px;font-weight:800;margin-top:4px">{studentCode}</div>
                    </div>
                    <div>
                      <div style="color:#6b7280;font-size:12px;text-transform:uppercase;font-weight:700;letter-spacing:0.06em">Mật khẩu tạm thời</div>
                      <div style="color:#e8213a;font-size:20px;font-weight:900;margin-top:4px;font-family:Consolas,monospace">{temporaryPassword}</div>
                    </div>
                  </div>

                  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 16px">
                    <p style="color:#9a3412;font-size:13px;line-height:1.6;margin:0">
                      Vì lý do bảo mật, bạn nên đổi mật khẩu ngay sau lần đăng nhập đầu tiên.
                    </p>
                  </div>
                </div>

                <div style="background:#f8f9fc;border-top:1px solid #e5e7eb;padding:18px 32px;text-align:center">
                  <p style="color:#9ca3af;font-size:11px;margin:0">
                    © {DateTime.Now.Year} CLB Công tác Xã hội · Trường Đại học Bách Khoa Đà Nẵng
                  </p>
                </div>
              </div>
            </body>
            </html>
            """;
        }
    }
}
