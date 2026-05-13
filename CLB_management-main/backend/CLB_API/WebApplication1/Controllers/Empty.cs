using Microsoft.AspNetCore.Mvc;

namespace ClubManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TestController : ControllerBase
    {
        [HttpGet]
        public string Get()
        {
            return "API running";
        }
    }
}