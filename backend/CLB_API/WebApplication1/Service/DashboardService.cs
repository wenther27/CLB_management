using ClubManagement.API.Data;
using Microsoft.EntityFrameworkCore;

namespace ClubManagement.API.Service
{
    public interface IDashboardService
    {
        Task<object> GetActivitiesByMonthAsync(int year);
        Task<object> GetTopActivitiesAsync(int top);
    }

    public class DashboardService : IDashboardService
    {
        private readonly ApplicationDbContext _context;

        public DashboardService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<object> GetActivitiesByMonthAsync(int year)
        {
            var selectedYear = year == 0 ? DateTime.Now.Year : year;

            var rawData = await _context.Activities
                .Where(a => a.time.Year == selectedYear)
                .GroupBy(a => a.time.Month)
                .Select(g => new
                {
                    Month = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            return Enumerable.Range(1, 12)
                .Select(month => new
                {
                    month = $"Tháng {month}",
                    count = rawData.FirstOrDefault(x => x.Month == month)?.Count ?? 0
                })
                .ToList();
        }

        public async Task<object> GetTopActivitiesAsync(int top)
        {
            return await _context.Activities
                .Include(a => a.Registrations)
                .Select(a => new
                {
                    activityID = a.ActivityID,
                    activityName = a.ActivityName,
                    registeredCount = a.Registrations.Count(r =>
                        r.Status == "Đã đăng ký" ||
                        r.Status == "Confirmed" ||
                        r.Status == "CONFIRMED")
                })
                .OrderByDescending(x => x.registeredCount)
                .Take(top)
                .ToListAsync();
        }
    }
}