using ClubManagement.API.DTOs.Common;
using ClubManagement.API.DTOs.FundContributions;
using ClubManagement.API.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ClubManagement.API.Controllers
{
    [ApiController]
    [Route("api/fund-contributions")]
    public class FundContributionController : ControllerBase
    {
        private readonly IFundContributionService _service;
        private readonly ISepayTransactionSyncService _syncService;
        private readonly IConfiguration _configuration;

        public FundContributionController(
            IFundContributionService service,
            ISepayTransactionSyncService syncService,
            IConfiguration configuration)
        {
            _service = service;
            _syncService = syncService;
            _configuration = configuration;
        }

        private int GetUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        [HttpGet("periods")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> GetPeriods()
            => Ok(ApiResponse<List<FundCollectionPeriodDTO>>.Ok(await _service.GetPeriodsAsync()));

        [HttpPost("periods")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> CreatePeriod([FromBody] CreateFundCollectionPeriodDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ApiResponse<string>.Fail("Dữ liệu không hợp lệ"));
            var result = await _service.CreatePeriodAsync(dto, GetUserId());
            if (result == null) return BadRequest(ApiResponse<string>.Fail("Tháng này đã có đợt thu quỹ"));
            return Ok(ApiResponse<FundCollectionPeriodDTO>.Ok(result, "Đã mở đợt thu quỹ"));
        }

        [HttpPatch("periods/{id:int}/status")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> UpdatePeriodStatus(int id, [FromBody] UpdateFundCollectionPeriodStatusDTO dto)
        {
            var result = await _service.UpdatePeriodStatusAsync(id, dto.Status);
            if (result == null) return BadRequest(ApiResponse<string>.Fail("Không thể cập nhật trạng thái"));
            return Ok(ApiResponse<FundCollectionPeriodDTO>.Ok(result, "Đã cập nhật trạng thái"));
        }

        [HttpGet("periods/{id:int}/members")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> GetPeriodMembers(int id)
            => Ok(ApiResponse<List<AdminFundContributionDTO>>.Ok(await _service.GetPeriodContributionsAsync(id)));

        [HttpGet("me/current")]
        [Authorize]
        public async Task<IActionResult> GetMyCurrentContribution()
        {
            var result = await _service.GetMyCurrentContributionAsync(GetUserId());
            return Ok(ApiResponse<FundContributionDTO?>.Ok(result));
        }

        [HttpGet("me/history")]
        [Authorize]
        public async Task<IActionResult> GetMyContributionHistory()
            => Ok(ApiResponse<List<FundContributionDTO>>.Ok(
                await _service.GetMyContributionHistoryAsync(GetUserId())));

        [HttpPost("sepay/webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> SepayWebhook([FromBody] SepayWebhookDTO dto)
        {
            var configuredKey = _configuration["FundPayment:SepayApiKey"];
            if (!string.IsNullOrWhiteSpace(configuredKey))
            {
                var expected = $"Apikey {configuredKey}";
                if (!string.Equals(Request.Headers.Authorization, expected, StringComparison.Ordinal))
                    return Unauthorized(new { success = false });
            }

            var result = await _service.ProcessSepayWebhookAsync(dto);
            return Ok(new { success = result.Success, message = result.Message });
        }

        [HttpPost("sepay/sync")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> SyncSepayTransactions()
            => Ok(ApiResponse<SepaySyncResultDTO>.Ok(
                await _syncService.SyncRecentTransactionsAsync(),
                "Đã yêu cầu đồng bộ giao dịch SePay"));
    }
}
