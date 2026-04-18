using System.Runtime.InteropServices;
using ClubManagement.API.Data;
using ClubManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace ClubManagement.API.Service
{
    public class ActivityAutoCloseService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ActivityAutoCloseService> _logger;
        private readonly IConfiguration _config;

        public ActivityAutoCloseService(
            IServiceScopeFactory scopeFactory,
            ILogger<ActivityAutoCloseService> logger,
            IConfiguration config)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _config = config;
        }
        //lay interval tu config, mac dinh 5 phut
        private TimeSpan Interval => TimeSpan.FromMinutes(
            _config.GetValue<int>("ActivityAutoClose:IntervalMinutes", 5));
        // tinh nang tu dong mo hoat dong
        private bool EnableAutoOpen =>
            _config.GetValue<bool>("ActivityAutoClose:EnableAutoOpen", true);
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation(
                "[AutoClose] Service khởi động — interval: {Interval} phút, auto-open: {AutoOpen}",
                Interval.TotalMinutes, EnableAutoOpen);
            // Chạy ngay lần đầu khi app khởi động, không đợi hết interval
            await RunJobAsync(stoppingToken);
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(Interval, stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    // App đang shutdown — thoát vòng lặp bình thường
                    break;
                }
                await RunJobAsync(stoppingToken);
            }
            _logger.LogInformation("[AutoClose] Service đang tắt...");

        }
        private async Task RunJobAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            try
            {
                var now = DateTime.UtcNow;
                int closedCount = await AutoCloseExpiredAsync(db, now, ct);
                int openedCount = EnableAutoOpen
                    ? await AutoOpenScheduledAsync(db, now, ct) : 0;
                if (closedCount > 0 || openedCount > 0)
                {
                    _logger.LogInformation(
                       "[AutoClose] {Time: yyyy-MM-dd HH:mm} UTC - Đã khoá : {Closed}, Đã mở : {Opened}",
                        now, closedCount, openedCount);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AutoClose] Lỗi khi chạy job: {Message}", ex.Message);
            }

        }
        private static async Task<int> AutoCloseExpiredAsync(ApplicationDbContext db, DateTime now, CancellationToken ct)
        {
            var expired = await db.Activities
                   .Where(a => a.Status == "Open"
                   && a.RegistrationDeadLine.HasValue
                   && a.RegistrationDeadLine.Value <= now)
                   .ToListAsync(ct);
            if (!expired.Any()) return 0;
            var logs = new List<AuditLog>();
            foreach (var activity in expired) 
                {
                    activity.Status = "Closed";
                    logs.Add(new AuditLog
                    {
                        UserID = null,
                        Action = $"Auto-close: Hết hạn đăng ký cho hoạt động({activity.RegistrationDeadLine: yyyy-MM-dd HH:mm}UTC)",
                        TableName = "Activities",
                        RecordID = activity.ActivityID,
                        CreatedAt = now,
                    });
                }
                db.AuditLogs.AddRange(logs);
                await db.SaveChangesAsync();

                return expired.Count;
        }
        private static async Task <int> AutoOpenScheduledAsync(ApplicationDbContext db, DateTime now, CancellationToken ct)
        {
            var toOpen = await db.Activities
                .Where(a => a.Status == "Closed"
                && a.RegistrationOpenDate.HasValue
                && a.RegistrationOpenDate.Value <= now
                &&(!a.RegistrationOpenDate.HasValue || a.RegistrationDeadLine.Value > now)
                && a.time > now)
                .ToArrayAsync(ct);
            if (!toOpen.Any()) return 0;
            var logs = new List<AuditLog>();
            foreach (var activity in toOpen)
            {
                activity.Status = "Open";
                logs.Add(new AuditLog
                {
                    UserID = null,
                    Action = $"Auto-opened: đến ngày mở đăng ký ({activity.RegistrationOpenDate:yyyy-MM-dd HH:mm}UTC)",
                    RecordID = activity.ActivityID,
                    CreatedAt = now,
                });
            }
            db.AuditLogs.AddRange (logs);
            await db.SaveChangesAsync(ct);
            return toOpen.Count();
        }
    }
}

