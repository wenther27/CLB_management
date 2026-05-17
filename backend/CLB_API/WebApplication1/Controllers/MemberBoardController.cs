// Controllers/MemberBoardController.cs
using ClubManagement.API.Data;
using ClubManagement.API.DTOs.Members;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClubManagement.API.Controllers
{
    [ApiController]
    [Route("api/member-board")]
    public class MemberBoardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public MemberBoardController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET /api/member-board
        // Trả về danh sách nhóm theo Department, sắp xếp theo DisplayOrder
        [HttpGet("featured")]
        public async Task<IActionResult> GetFeaturedMembers()
        {
            var members = await _context.Members
                .Include(m => m.User)
                .Where(m => m.Status == "Active")
                .Select(m => new MemberBoardDTO
                {
                    MemberID = m.MemberID,
                    FullName = m.FullName,
                    Position = m.Position,
                    Department = m.Department,
                    AvatarUrl = m.AvatarUrl ?? m.User!.AvatarUrl,
                    DisplayOrder = m.DisplayOrder,
                    Faculty = m.Faculty,
                    JoinDate = m.JoinDate,
                    ContactEmail = m.ContactEmail,
                    ActivityCount = m.Registrations!.Count(r => r.IsAttended)
                })
                .Where(m => m.ActivityCount > 0)
                .OrderByDescending(m => m.ActivityCount)
                .ThenBy(m => m.FullName)
                .Take(3)
                .ToListAsync();

            return Ok(new { success = true, data = members });
        }

        [HttpGet]
        public async Task<IActionResult> GetMemberBoard()
        {
            var members = await _context.Members
                .Include(m => m.User)
                .Where(m => m.Status == "Active"
                         && m.Department != null
                         && m.Department != "")
                .OrderBy(m => m.DisplayOrder)
                .ThenBy(m => m.FullName)
                .Select(m => new MemberBoardDTO
                {
                    MemberID = m.MemberID,
                    FullName = m.FullName,
                    Position = m.Position,
                    Department = m.Department,
                    AvatarUrl = m.AvatarUrl,
                    DisplayOrder = m.DisplayOrder,
                    Faculty = m.Faculty,
                    JoinDate = m.JoinDate,
                    ContactEmail = m.ContactEmail,
                })
                .ToListAsync();

            // Thứ tự ưu tiên department
            var departmentOrder = new List<string>
            {
                "BCN", "BTT", "BPT"
            };

            var grouped = members
                .GroupBy(m => m.Department ?? "Khác")
                .OrderBy(g => {
                    var idx = departmentOrder.IndexOf(g.Key);
                    return idx == -1 ? 999 : idx;
                })
                .Select(g => new DepartmentGroupDTO
                {
                    Department = g.Key,
                    Members = g.ToList()
                })
                .ToList();

            return Ok(new { success = true, data = grouped });
        }
    }
}
