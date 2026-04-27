using ClubManagement.API.AuthService;
using ClubManagement.API.DTOs;
using ClubManagement.API.DTOs.Auth;
using Microsoft.AspNetCore.Mvc;
using ClubManagement.API.DTOs.Common;
namespace ClubManagement.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        // POST /api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDTO dto)
        {
            var result = await _authService.LoginAsync(dto);
            if (result == null)
                return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không đúng" });

            return Ok(result);
        }

        // POST /api/auth/send-otp  ← frontend gọi khi đăng ký
        [HttpPost("send-otp")]
        public async Task<IActionResult> SendOtp([FromBody] RegisterDTO dto)
        {
            var (success, error) = await _authService.SendRegisterOtpAsync(dto);
            if (!success)
                return BadRequest(new { message = error });

            return Ok(new { message = "OTP đã được gửi đến email của bạn" });
        }

        // POST /api/auth/verify-otp  ← frontend gọi khi xác thực OTP đăng ký
        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyRegisterOtpDTO dto)
        {
            var result = await _authService.VerifyRegisterOtpAsync(dto);
            if (result == null)
                return BadRequest(new { message = "Mã OTP không hợp lệ hoặc đã hết hạn" });

            return Ok(result);
        }

        // POST /api/auth/resend-otp  ← frontend gọi khi gửi lại OTP
        [HttpPost("resend-otp")]
        public async Task<IActionResult> ResendOtp([FromBody] ResendOtpDTO dto)
        {
            var success = await _authService.ResendOtpAsync(dto.Email, dto.Purpose);
            if (!success)
                return BadRequest(new { message = "Không thể gửi lại OTP. Vui lòng thử lại." });

            return Ok(new { message = "OTP đã được gửi lại" });
        }

        // POST /api/auth/forgot-password  ← frontend gọi khi quên mật khẩu
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDTO dto)
        {
            var (success, error) = await _authService.ForgotPasswordAsync(dto.Email);
            if (!success)
                return BadRequest(new { message = error });

            return Ok(new { message = "Nếu email tồn tại, OTP sẽ được gửi đến hộp thư của bạn" });
        }

        // POST /api/auth/reset-password  ← frontend gọi khi đặt lại mật khẩu
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDTO dto)
        {
            var (success, error) = await _authService.ResetPasswordAsync(dto);
            if (!success)
                return BadRequest(new { message = error });

            return Ok(new { message = "Mật khẩu đã được đặt lại thành công" });
        }
    }
}