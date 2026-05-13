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

        private TimeSpan Interval => TimeSpan.FromMinutes(
            _config.GetValue<int>("ActivityAutoClose:IntervalMinutes", 5));

        private bool EnableAutoOpen =>
            _config.GetValue<bool>("ActivityAutoClose:EnableAutoOpen", true);

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation(
                "[AutoClose] Service khởi động — interval: {Interval} phút, auto-open: {AutoOpen}",
                Interval.TotalMinutes, EnableAutoOpen);

            await RunJobAsync(stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try { await Task.Delay(Interval, stoppingToken); }
                catch (TaskCanceledException) { break; }
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
                // FIX TIMEZONE: Dùng DateTime.Now (giờ local = giờ HN)
                // vì DB lưu DateTimeKind.Unspecified (= giờ HN từ FE gửi lên).
                // DateTime.UtcNow sẽ lệch 7 tiếng → đóng sớm/muộn sai.
                var now = DateTime.Now;

                int closedCount = await AutoCloseExpiredAsync(db, now, ct);
                int openedCount = EnableAutoOpen
                    ? await AutoOpenScheduledAsync(db, now, ct) : 0;

                if (closedCount > 0 || openedCount > 0)
                {
                    _logger.LogInformation(
                        "[AutoClose] {Time:yyyy-MM-dd HH:mm} (local) — Đã khoá: {Closed}, Đã mở: {Opened}",
                        now, closedCount, openedCount);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AutoClose] Lỗi khi chạy job: {Message}", ex.Message);
            }
        }

        private static async Task<int> AutoCloseExpiredAsync(
            ApplicationDbContext db, DateTime now, CancellationToken ct)
        {
            // now = DateTime.Now (local HN), RegistrationDeadLine = Unspecified (local HN)
            // So sánh đúng, không lệch múi giờ
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
                    Action = $"Auto-close: Hết hạn đăng ký ({activity.RegistrationDeadLine:yyyy-MM-dd HH:mm})",
                    TableName = "Activities",
                    RecordID = activity.ActivityID,
                    CreatedAt = now,
                });
            }

            db.AuditLogs.AddRange(logs);
            await db.SaveChangesAsync(ct);
            return expired.Count;
        }

        private static async Task<int> AutoOpenScheduledAsync(
            ApplicationDbContext db, DateTime now, CancellationToken ct)
        {
            // now = DateTime.Now (local HN), các field = Unspecified (local HN)
            var toOpen = await db.Activities
                .Where(a => a.Status == "Closed"
                    && a.RegistrationOpenDate.HasValue
                    && a.RegistrationOpenDate.Value <= now
                    && (!a.RegistrationDeadLine.HasValue || a.RegistrationDeadLine.Value > now)
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
                    Action = $"Auto-opened: đến ngày mở đăng ký ({activity.RegistrationOpenDate:yyyy-MM-dd HH:mm})",
                    TableName = "Activities",
                    RecordID = activity.ActivityID,
                    CreatedAt = now,
                });
            }

            db.AuditLogs.AddRange(logs);
            await db.SaveChangesAsync(ct);
            return toOpen.Length;
        }
    }
}