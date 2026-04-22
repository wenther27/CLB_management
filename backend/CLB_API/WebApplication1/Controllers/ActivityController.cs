using ClubManagement.API.DTOs;
using ClubManagement.API.DTOs.Activityes;
using ClubManagement.API.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ClubManagement.API.Controllers
{
    [ApiController]
    [Route("api/activities")]
    public class ActivityController : ControllerBase
    {
        private readonly IActivityService _activityService;

        public ActivityController(IActivityService activityService)
        {
            _activityService = activityService;
        }

        private int GetUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        private string GetUserRole() =>
            User.FindFirstValue(ClaimTypes.Role) ?? "Member";

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll([FromQuery] ActivityQueryDTO query)
        {
            var result = await _activityService.GetAllAsync(query);
            return Ok(ApiResponse<PagedResultDTO<ActivityDTO>>.Ok(result, "Lấy danh sách hoạt động thành công"));
        }

        [HttpGet("{id:int}/has-registered")]
        [Authorize]
        public async Task<IActionResult> HasUserRegistered(int id)
        {
            var result = await _activityService.HasUserRegisteredAsync(id, GetUserId());
            return Ok(ApiResponse<bool>.Ok(result, "OK"));
        }

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _activityService.GetByIdAsync(id);
            if (result == null)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy hoạt động"));
            return Ok(ApiResponse<ActivityDTO>.Ok(result, "Lấy thông tin hoạt động thành công"));
        }

        [HttpPost]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> Create([FromBody] CreateActivityDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<string>.Fail("Dữ liệu không hợp lệ"));
            var result = await _activityService.CreateAsync(dto, GetUserId());
            if (result == null)
                return BadRequest(ApiResponse<string>.Fail("Tạo hoạt động thất bại"));
            return CreatedAtAction(nameof(GetById), new { id = result.ActivityID },
                ApiResponse<ActivityDTO>.Ok(result, "Tạo hoạt động thành công"));
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateActivityDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<string>.Fail("Dữ liệu không hợp lệ"));
            var result = await _activityService.UpdateAsync(id, dto, GetUserId(), GetUserRole());
            if (result == null)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy hoạt động hoặc không có quyền sửa"));
            return Ok(ApiResponse<ActivityDTO>.Ok(result, "Cập nhật hoạt động thành công"));
        }

        [HttpPatch("{id:int}/cancel")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> Cancel(int id)
        {
            var success = await _activityService.CancelAsync(id, GetUserId(), GetUserRole());
            if (!success)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy hoạt động hoặc không có quyền hủy"));
            return Ok(ApiResponse<string>.Ok("Cancelled", "Hủy hoạt động thành công"));
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _activityService.DeleteAsync(id, GetUserId(), GetUserRole());
            if (!success)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy hoạt động hoặc không có quyền xóa"));
            return Ok(ApiResponse<string>.Ok("Deleted", "Xóa hoạt động thành công"));
        }

        [HttpPost("{id:int}/register")]
        [Authorize(Roles = "Member,ExecutiveBoard,Admin")]
        public async Task<IActionResult> Register(int id)
        {
            var result = await _activityService.RegisterAsync(id, GetUserId());
            if (result == null)
                return BadRequest(ApiResponse<string>.Fail(
                    "Không thể đăng ký: hoạt động đã đóng, chưa mở, đã đăng ký rồi, hoặc đã đủ người"));
            return Ok(ApiResponse<RegistrationResponseDTO>.Ok(result, "Đăng ký tham gia thành công"));
        }

        // FIX: Trả về message lỗi cụ thể (hết hạn, đã đóng, v.v.)
        [HttpDelete("{id:int}/register")]
        [Authorize(Roles = "Member,ExecutiveBoard,Admin")]
        public async Task<IActionResult> CancelRegistration(int id)
        {
            var (success, errorMessage) = await _activityService.CancelRegistrationAsync(id, GetUserId());
            if (!success)
                return BadRequest(ApiResponse<string>.Fail(errorMessage ?? "Không thể hủy đăng ký"));
            return Ok(ApiResponse<string>.Ok("Cancelled", "Hủy đăng ký thành công"));
        }

        [HttpGet("{id:int}/registrations")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> GetRegistrations(
            int id, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var result = await _activityService.GetRegistrationsAsync(id, page, pageSize);
            return Ok(ApiResponse<PagedResultDTO<RegistrationResponseDTO>>.Ok(
                result, "Lấy danh sách đăng ký thành công"));
        }

        [HttpGet("my-registrations")]
        [Authorize]
        public async Task<IActionResult> GetMyRegistrations(
            [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _activityService.GetMyRegistrationsAsync(GetUserId(), page, pageSize);
            return Ok(ApiResponse<PagedResultDTO<RegistrationResponseDTO>>.Ok(
                result, "Lấy lịch sử đăng ký thành công"));
        }

        [HttpPost("auto-close")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> TriggerAutoClose()
        {
            var count = await _activityService.AutoCloseExpiredActivitiesAsync();
            return Ok(ApiResponse<int>.Ok(count, $"Đã tự động khoá {count} hoạt động hết hạn đăng ký"));
        }
    }
}