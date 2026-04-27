using ClubManagement.API.DTOs;
using ClubManagement.API.DTOs.Activityes;
using ClubManagement.API.DTOs.Common;
using ClubManagement.API.DTOs.Members;
using ClubManagement.API.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ClubManagement.API.Controllers
{
    [ApiController]
    [Route("api/members")]
    [Authorize]
    public class MemberController : ControllerBase
    {
        private readonly IMemberService _memberService;
        public MemberController(IMemberService memberService) => _memberService = memberService;

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
        private string GetUserRole() => User.FindFirstValue(ClaimTypes.Role) ?? "Member";

        // GET /api/members  → Admin/Board xem danh sách
        [HttpGet]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> GetAll([FromQuery] MemberQueryDTO query)
        {
            var result = await _memberService.GetAllAsync(query);
            return Ok(ApiResponse<PagedResultDTO<MemberDTO>>.Ok(result, "Lấy danh sách thành viên thành công"));
        }

        // GET /api/members/stats  → Admin xem thống kê
        [HttpGet("stats")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetStats()
        {
            var stats = await _memberService.GetStatsAsync();
            return Ok(ApiResponse<MemberStatsDTO>.Ok(stats, "Lấy thống kê thành công"));
        }

        // GET /api/members/me  → Thành viên xem profile bản thân
        [HttpGet("me")]
        public async Task<IActionResult> GetMyProfile()
        {
            var result = await _memberService.GetByUserIdAsync(GetUserId());
            if (result == null)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy thông tin thành viên"));
            return Ok(ApiResponse<MemberDTO>.Ok(result, "Lấy thông tin profile thành công"));
        }

        // GET /api/members/{id}  → Admin/Board xem chi tiết
        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _memberService.GetByIdAsync(id);
            if (result == null)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy thành viên"));
            return Ok(ApiResponse<MemberDTO>.Ok(result, "Lấy thông tin thành viên thành công"));
        }

        // PUT /api/members/me  → Thành viên tự cập nhật profile
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateProfileDTO dto)
        {
            var result = await _memberService.UpdateProfileAsync(GetUserId(), dto);
            if (result == null)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy thành viên"));
            return Ok(ApiResponse<MemberDTO>.Ok(result, "Cập nhật profile thành công"));
        }

        // PUT /api/members/{id}  → Admin cập nhật (kể cả Position, Status)
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AdminUpdate(int id, [FromBody] UpdateMemberDTO dto)
        {
            var result = await _memberService.AdminUpdateAsync(id, dto);
            if (result == null)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy thành viên"));
            return Ok(ApiResponse<MemberDTO>.Ok(result, "Cập nhật thành viên thành công"));
        }

        // PATCH /api/members/{id}/deactivate  → Admin khóa tài khoản
        [HttpPatch("{id:int}/deactivate")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Deactivate(int id)
        {
            var success = await _memberService.DeactivateAsync(id);
            if (!success)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy thành viên"));
            return Ok(ApiResponse<string>.Ok("Deactivated", "Vô hiệu hóa thành công"));
        }

        // POST /api/members/me/change-password  → Thành viên đổi mật khẩu
        [HttpPost("me/change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDTO dto)
        {
            if (dto.NewPassword != dto.ConfirmPassword)
                return BadRequest(ApiResponse<string>.Fail("Mật khẩu xác nhận không khớp"));
            if (dto.NewPassword.Length < 6)
                return BadRequest(ApiResponse<string>.Fail("Mật khẩu mới phải có ít nhất 6 ký tự"));

            var success = await _memberService.ChangePasswordAsync(GetUserId(), dto);
            if (!success)
                return BadRequest(ApiResponse<string>.Fail("Mật khẩu hiện tại không đúng"));
            return Ok(ApiResponse<string>.Ok("Changed", "Đổi mật khẩu thành công"));
        }
    }
}