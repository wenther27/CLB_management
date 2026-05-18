using ClubManagement.API.DTOs.Funds;
using ClubManagement.API.DTOs.Common;
using ClubManagement.API.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ClubManagement.API.Controllers
{
    [ApiController]
    [Route("api/funds")]
    [Authorize(Roles = "Admin,ExecutiveBoard")]
    public class FundController : ControllerBase
    {
        private readonly IFundService _fundService;

        public FundController(IFundService fundService)
        {
            _fundService = fundService;
        }

        private int GetUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview()
        {
            return Ok(ApiResponse<FundOverviewDTO>.Ok(await _fundService.GetOverviewAsync(), "Lấy tổng quan quỹ thành công"));
        }

        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions([FromQuery] string? status, [FromQuery] string? type,
            [FromQuery] int? year, [FromQuery] int? month)
        {
            return Ok(ApiResponse<List<FundTransactionDTO>>.Ok(
                await _fundService.GetTransactionsAsync(status, type, year, month),
                "Lấy giao dịch quỹ thành công"));
        }

        [HttpPost("transactions")]
        public async Task<IActionResult> CreateTransaction([FromBody] CreateFundTransactionDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ApiResponse<string>.Fail("Dữ liệu không hợp lệ"));
            var item = await _fundService.CreateTransactionAsync(dto, GetUserId());
            if (item == null) return BadRequest(ApiResponse<string>.Fail("Không thể tạo giao dịch"));
            return Ok(ApiResponse<FundTransactionDTO>.Ok(item, "Đã tạo giao dịch chờ duyệt"));
        }

        [HttpPut("transactions/{id:int}")]
        public async Task<IActionResult> UpdateTransaction(int id, [FromBody] UpdateFundTransactionDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ApiResponse<string>.Fail("Dữ liệu không hợp lệ"));
            var item = await _fundService.UpdateTransactionAsync(id, dto);
            if (item == null) return NotFound(ApiResponse<string>.Fail("Chỉ có thể sửa giao dịch đang chờ duyệt"));
            return Ok(ApiResponse<FundTransactionDTO>.Ok(item, "Cập nhật giao dịch thành công"));
        }

        [HttpPatch("transactions/{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateFundTransactionStatusDTO dto)
        {
            var item = await _fundService.UpdateStatusAsync(id, dto.Status, GetUserId());
            if (item == null) return BadRequest(ApiResponse<string>.Fail("Không thể cập nhật trạng thái giao dịch"));
            return Ok(ApiResponse<FundTransactionDTO>.Ok(item, "Cập nhật trạng thái thành công"));
        }

        [HttpDelete("transactions/{id:int}")]
        public async Task<IActionResult> DeleteTransaction(int id)
        {
            var ok = await _fundService.DeleteTransactionAsync(id);
            if (!ok) return BadRequest(ApiResponse<string>.Fail("Chỉ có thể xóa giao dịch đang chờ duyệt"));
            return Ok(ApiResponse<string>.Ok("Deleted", "Đã xóa giao dịch"));
        }

        [HttpGet("budgets")]
        public async Task<IActionResult> GetBudgets()
        {
            return Ok(ApiResponse<List<ActivityBudgetDTO>>.Ok(await _fundService.GetBudgetsAsync(), "Lấy ngân sách hoạt động thành công"));
        }

        [HttpPost("budgets")]
        public async Task<IActionResult> SaveBudget([FromBody] SaveActivityBudgetDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ApiResponse<string>.Fail("Dữ liệu không hợp lệ"));
            var item = await _fundService.SaveBudgetAsync(dto, GetUserId());
            if (item == null) return BadRequest(ApiResponse<string>.Fail("Không thể lưu ngân sách"));
            return Ok(ApiResponse<ActivityBudgetDTO>.Ok(item, "Lưu ngân sách thành công"));
        }

        [HttpPut("budgets/{id:int}")]
        public async Task<IActionResult> UpdateBudget(int id, [FromBody] SaveActivityBudgetDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ApiResponse<string>.Fail("Dữ liệu không hợp lệ"));
            var item = await _fundService.UpdateBudgetAsync(id, dto);
            if (item == null) return NotFound(ApiResponse<string>.Fail("Không tìm thấy ngân sách"));
            return Ok(ApiResponse<ActivityBudgetDTO>.Ok(item, "Cập nhật ngân sách thành công"));
        }

        [HttpGet("reports")]
        public async Task<IActionResult> GetReport([FromQuery] int year, [FromQuery] int? month)
        {
            if (year <= 0) year = DateTime.Now.Year;
            return Ok(ApiResponse<FundReportDTO>.Ok(await _fundService.GetReportAsync(year, month), "Lấy báo cáo quỹ thành công"));
        }
    }
}
