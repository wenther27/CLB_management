using ClubManagement.API.AuthService;
using ClubManagement.API.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics.Contracts;
using System.Runtime.CompilerServices;

namespace ClubManagement.API.Controllers
{
    
        [ApiController]
        [Route("api/auth")]
        public class AuthController : ControllerBase
        {
            private readonly IAuthService _authService;
            public AuthController (IAuthService authService)
            {
                _authService = authService;
            }
            [HttpPost("login")]
            public async Task <IActionResult> Login ([FromBody] LoginDTO dto)
            {
                var result = await _authService.LoginAsync(dto);
                if (result == null)
                    return Unauthorized(ApiResponse<string>.Fail("Tên đăng nhập hoặc mật khẩu không đúng"));
                return Ok(ApiResponse <AuthResponseDTO>.Ok (result, "Đăng nhập thành công"));
            }
            [HttpPost("register")]
            public async Task <IActionResult> Register([FromBody] RegisterDTO dto)
            {
                var resutl = await _authService.RegisterAsync(dto);
                if (resutl == null)
                    return BadRequest(ApiResponse<string>.Fail("Tên đăng nhập hoặc Email đã tồn tại"));
                return Ok (ApiResponse<AuthResponseDTO>.Ok(resutl, "Đăng ký thành công"));
            }
        }
    }

