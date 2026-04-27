// ================================================
// AuthDTOs.cs — Các DTO mới cho OTP auth
// Thêm vào: WebApplication1/DTOs/Auth/
// ================================================

namespace ClubManagement.API.DTOs.Auth
{
    // ── Bước 2 đăng ký: Xác thực OTP ────────────────────────────────────────
    public class VerifyRegisterOtpDTO
    {
        public string Email { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
    }

    


    // ── Quên mật khẩu: Gửi OTP ───────────────────────────────────────────────
    public class ForgotPasswordDTO
    {
        public string Email { get; set; } = string.Empty;
    }

    // ── Đặt lại mật khẩu sau OTP ─────────────────────────────────────────────
    public class ResetPasswordDTO
    {
        public string Email { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}