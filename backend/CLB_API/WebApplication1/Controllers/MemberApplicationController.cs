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

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> Submit([FromBody] CreateMemberApplicationDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ApiResponse<string>.Fail("D? li?u h? s? kh?ng h?p l?"));

            try
            {
                var result = await _service.SubmitAsync(dto);
                return Ok(ApiResponse<MemberApplicationDTO>.Ok(result, "?? g?i h? s?. Vui l?ng ch? ban qu?n l? duy?t."));
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
            return Ok(ApiResponse<List<MemberApplicationDTO>>.Ok(result, "L?y danh s?ch h? s? th?nh c?ng"));
        }

        [HttpPatch("{id:int}/approve")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> Approve(int id, [FromBody] ReviewMemberApplicationDTO? dto)
        {
            try
            {
                var result = await _service.ApproveAsync(id, GetUserId(), dto?.ReviewNote);
                if (result == null) return NotFound(ApiResponse<string>.Fail("Kh?ng t?m th?y h? s?"));
                return Ok(ApiResponse<MemberApplicationDTO>.Ok(result, "?? duy?t h? s? v? t?o t?i kho?n th?nh vi?n"));
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
                if (result == null) return NotFound(ApiResponse<string>.Fail("Kh?ng t?m th?y h? s?"));
                return Ok(ApiResponse<MemberApplicationDTO>.Ok(result, "?? t? ch?i h? s?"));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }
    }
}
