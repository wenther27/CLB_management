using ClubManagement.API.DTOs.Common;
using ClubManagement.API.DTOs.MemberApplications;
using ClubManagement.API.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ClubManagement.API.Controllers
{
    [ApiController]
    [Route("api/member-applications")]
    public class MemberApplicationController : ControllerBase
    {
        private readonly IMemberApplicationService _service;

        public MemberApplicationController(IMemberApplicationService service)
        {
            _service = service;
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        [HttpPost("send-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> SendOtp([FromBody] CreateMemberApplicationDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ApiResponse<string>.Fail("Dữ liệu hồ sơ không hợp lệ"));

            try
            {
                await _service.SendOtpAsync(dto);
                return Ok(ApiResponse<string>.Ok("Mã OTP đã được gửi đến email liên hệ"));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> Submit([FromBody] CreateMemberApplicationDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ApiResponse<string>.Fail("Dữ liệu hồ sơ không hợp lệ"));

            try
            {
                var result = await _service.SubmitAsync(dto);
                return Ok(ApiResponse<MemberApplicationDTO>.Ok(result, "Đã gửi hồ sơ. Vui lòng chờ ban quản lý duyệt."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        [HttpGet]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> GetAll([FromQuery] string? status)
        {
            var result = await _service.GetAllAsync(status);
            return Ok(ApiResponse<List<MemberApplicationDTO>>.Ok(result, "Lấy danh sách hồ sơ thành công"));
        }

        [HttpPatch("{id:int}/approve")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> Approve(int id, [FromBody] ReviewMemberApplicationDTO? dto)
        {
            try
            {
                var result = await _service.ApproveAsync(id, GetUserId(), dto?.ReviewNote);
                if (result == null) return NotFound(ApiResponse<string>.Fail("Không tìm thấy hồ sơ"));
                return Ok(ApiResponse<MemberApplicationDTO>.Ok(result, "Đã duyệt hồ sơ và tạo tài khoản thành viên"));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        [HttpPatch("{id:int}/reject")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> Reject(int id, [FromBody] ReviewMemberApplicationDTO? dto)
        {
            try
            {
                var result = await _service.RejectAsync(id, GetUserId(), dto?.ReviewNote);
                if (result == null) return NotFound(ApiResponse<string>.Fail("Không tìm thấy hồ sơ"));
                return Ok(ApiResponse<MemberApplicationDTO>.Ok(result, "Đã từ chối hồ sơ"));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }
    }
}
