using ClubManagement.API.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClubManagement.API.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    [Authorize(Roles = "Admin,ExecutiveBoard")]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [HttpGet("activities-by-month")]
        public async Task<IActionResult> GetActivitiesByMonth([FromQuery] int year = 0)
        {
            var result = await _dashboardService.GetActivitiesByMonthAsync(year);

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        [HttpGet("top-activities")]
        public async Task<IActionResult> GetTopActivities([FromQuery] int top = 5)
        {
            var result = await _dashboardService.GetTopActivitiesAsync(top);

            return Ok(new
            {
                success = true,
                data = result
            });
        }
    }
}