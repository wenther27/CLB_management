using ClubManagement.API.DTOs;
using ClubManagement.API.DTOs.Activityes;
using ClubManagement.API.DTOs.Common;
using ClubManagement.API.DTOs.Users;
using ClubManagement.API.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ClubManagement.API.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize(Roles = "Admin")]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        private int GetCurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        // GET /api/users
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] UserQueryDTO query)
        {
            var result = await _userService.GetAllAsync(query);
            return Ok(ApiResponse<PagedResultAdminDTO<UserDetailDTO>>.Ok(result, "Lấy danh sách người dùng thành công"));
        }

        // GET /api/users/stats
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var stats = await _userService.GetStatsAsync();
            return Ok(ApiResponse<UserStatsDTO>.Ok(stats, "Lấy thống kê thành công"));
        }

        // GET /api/users/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _userService.GetByIdAsync(id);
            if (result == null)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy người dùng"));
            return Ok(ApiResponse<UserDetailDTO>.Ok(result, "Lấy thông tin người dùng thành công"));
        }

        // PUT /api/users/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserAdminDTO dto)
        {
            var self = GetCurrentUserId();
            if (id == self)
                return BadRequest(ApiResponse<string>.Fail("Không thể tự sửa tài khoản của mình"));

            var result = await _userService.AdminUpdateAsync(id, dto);
            if (result == null)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy người dùng"));
            return Ok(ApiResponse<UserDetailDTO>.Ok(result, "Cập nhật người dùng thành công"));
        }

        // PATCH /api/users/{id}/toggle-active
        [HttpPatch("{id:int}/toggle-active")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            var self = GetCurrentUserId();
            if (id == self)
                return BadRequest(ApiResponse<string>.Fail("Không thể tự vô hiệu hóa tài khoản của mình"));

            var result = await _userService.ToggleActiveAsync(id);
            if (result == null)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy người dùng"));
            return Ok(ApiResponse<UserDetailDTO>.Ok(result, result.IsActive ? "Đã kích hoạt tài khoản" : "Đã vô hiệu hóa tài khoản"));
        }

        // DELETE /api/users/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var self = GetCurrentUserId();
            if (id == self)
                return BadRequest(ApiResponse<string>.Fail("Không thể tự xóa tài khoản của mình"));

            var success = await _userService.DeleteAsync(id);
            if (!success)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy người dùng"));
            return Ok(ApiResponse<string>.Ok("Deleted", "Đã vô hiệu hóa người dùng"));
        }

        // GET /api/users/audit-logs
        [HttpGet("audit-logs")]
        public async Task<IActionResult> GetAuditLogs([FromQuery] AuditLogQueryDTO query)
        {
            var result = await _userService.GetAuditLogsAsync(query);
            return Ok(ApiResponse<PagedResultAdminDTO<AuditLogDTO>>.Ok(result, "Lấy lịch sử thành công"));
        }

        // POST /api/users/audit-logs
        [HttpPost("audit-logs")]
        public async Task<IActionResult> WriteLog([FromBody] WriteAuditLogDTO dto)
        {
            await _userService.WriteLogAsync(GetCurrentUserId(), dto.Action, dto.TableName, dto.RecordID);
            return Ok(ApiResponse<string>.Ok("Logged", "Đã ghi log"));
        }
    }
}