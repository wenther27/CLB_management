using ClubManagement.API.Data;
using ClubManagement.API.DTOs.FundContributions;
using ClubManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace ClubManagement.API.Service
{
    public interface IFundContributionService
    {
        Task<List<FundCollectionPeriodDTO>> GetPeriodsAsync();
        Task<FundCollectionPeriodDTO?> CreatePeriodAsync(CreateFundCollectionPeriodDTO dto, int userId);
        Task<FundCollectionPeriodDTO?> UpdatePeriodStatusAsync(int id, string status);
        Task<FundContributionDTO?> GetMyCurrentContributionAsync(int userId);
        Task<List<FundContributionDTO>> GetMyContributionHistoryAsync(int userId);
        Task<List<AdminFundContributionDTO>> GetPeriodContributionsAsync(int periodId);
        Task<(bool Success, string Message)> ProcessSepayWebhookAsync(SepayWebhookDTO dto);
    }

    public class FundContributionService : IFundContributionService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public FundContributionService(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<List<FundCollectionPeriodDTO>> GetPeriodsAsync()
        {
            var periods = await _context.FundCollectionPeriods
                .Include(p => p.Contributions)
                .Include(p => p.Activity)
                .OrderByDescending(p => p.Year)
                .ThenByDescending(p => p.Month)
                .ThenByDescending(p => p.CreatedAt)
                .ToListAsync();
            return periods.Select(MapPeriod).ToList();
        }

        public async Task<FundCollectionPeriodDTO?> CreatePeriodAsync(CreateFundCollectionPeriodDTO dto, int userId)
        {
            if (dto.ActivityID.HasValue && !await _context.Activities.AnyAsync(a => a.ActivityID == dto.ActivityID.Value))
                return null;

            var selectedIds = dto.MemberIDs
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            var membersQuery = _context.Members
                .Where(m => m.Status == "Active");

            if (selectedIds.Any())
                membersQuery = membersQuery.Where(m => selectedIds.Contains(m.MemberID));

            var members = await membersQuery
                .OrderBy(m => m.FullName)
                .ToListAsync();

            if (!members.Any()) return null;

            var title = string.IsNullOrWhiteSpace(dto.Title)
                ? $"Quỹ tháng {dto.Month:D2}/{dto.Year}"
                : dto.Title.Trim();
            var category = string.IsNullOrWhiteSpace(dto.Category)
                ? "Đóng quỹ"
                : dto.Category.Trim();

            var period = new FundCollectionPeriod
            {
                Year = dto.Year,
                Month = dto.Month,
                Title = title,
                Category = category,
                ActivityID = dto.ActivityID,
                Amount = dto.Amount,
                DueDate = dto.DueDate,
                CreatedByUserID = userId
            };

            _context.FundCollectionPeriods.Add(period);
            await _context.SaveChangesAsync();

            foreach (var member in members)
            {
                _context.FundContributions.Add(new FundContribution
                {
                    FundCollectionPeriodID = period.FundCollectionPeriodID,
                    MemberID = member.MemberID,
                    ExpectedAmount = dto.Amount,
                    PaymentCode = BuildPaymentCode(dto.Year, dto.Month, period.FundCollectionPeriodID, member.MemberID),
                    Status = "Pending"
                });
            }

            await _context.SaveChangesAsync();
            return await GetPeriodByIdAsync(period.FundCollectionPeriodID);
        }

        public async Task<FundCollectionPeriodDTO?> UpdatePeriodStatusAsync(int id, string status)
        {
            if (status != "Open" && status != "Closed") return null;
            var period = await _context.FundCollectionPeriods
                .Include(p => p.Contributions)
                .Include(p => p.Activity)
                .FirstOrDefaultAsync(p => p.FundCollectionPeriodID == id);
            if (period == null) return null;
            period.Status = status;
            await _context.SaveChangesAsync();
            return MapPeriod(period);
        }

        public async Task<FundContributionDTO?> GetMyCurrentContributionAsync(int userId)
        {
            var member = await _context.Members.FirstOrDefaultAsync(m => m.UserID == userId);
            if (member == null) return null;

            var contribution = await _context.FundContributions
                .Include(c => c.Period)!
                    .ThenInclude(p => p!.Activity)
                .Where(c => c.MemberID == member.MemberID && c.Period!.Status == "Open")
                .OrderByDescending(c => c.Period!.Year)
                .ThenByDescending(c => c.Period!.Month)
                .ThenByDescending(c => c.Period!.CreatedAt)
                .FirstOrDefaultAsync();

            return contribution?.Period == null ? null : MapContribution(contribution, contribution.Period);
        }

        public async Task<List<FundContributionDTO>> GetMyContributionHistoryAsync(int userId)
        {
            var member = await _context.Members.FirstOrDefaultAsync(m => m.UserID == userId);
            if (member == null) return new List<FundContributionDTO>();

            var contributions = await _context.FundContributions
                .Include(c => c.Period)!
                    .ThenInclude(p => p!.Activity)
                .Where(c => c.MemberID == member.MemberID)
                .OrderByDescending(c => c.Period!.Year)
                .ThenByDescending(c => c.Period!.Month)
                .ThenByDescending(c => c.Period!.CreatedAt)
                .ToListAsync();

            return contributions
                .Where(c => c.Period != null)
                .Select(c => MapContribution(c, c.Period!))
                .ToList();
        }

        public async Task<List<AdminFundContributionDTO>> GetPeriodContributionsAsync(int periodId)
        {
            return await _context.FundContributions
                .Include(c => c.Member)
                .Where(c => c.FundCollectionPeriodID == periodId)
                .OrderBy(c => c.Status == "Paid" ? 0 : 1)
                .ThenBy(c => c.Member!.FullName)
                .Select(c => new AdminFundContributionDTO
                {
                    FundContributionID = c.FundContributionID,
                    MemberID = c.MemberID,
                    FullName = c.Member!.FullName,
                    ClassName = c.Member.ClassName,
                    Faculty = c.Member.Faculty,
                    ExpectedAmount = c.ExpectedAmount,
                    PaymentCode = c.PaymentCode,
                    Status = c.Status,
                    PaidAt = c.PaidAt
                })
                .ToListAsync();
        }

        public async Task<(bool Success, string Message)> ProcessSepayWebhookAsync(SepayWebhookDTO dto)
        {
            if (dto.TransferType != "in")
                return (true, "Ignored non-income transaction");

            if (await _context.SepayWebhookEvents.AnyAsync(e => e.SepayTransactionID == dto.Id))
                return (true, "Duplicate transaction");

            var paymentCode = ExtractPaymentCode(dto);
            var contribution = string.IsNullOrWhiteSpace(paymentCode)
                ? null
                : await _context.FundContributions
                    .Include(c => c.Period)
                    .Include(c => c.Member)
                    .FirstOrDefaultAsync(c => c.PaymentCode == paymentCode);

            var evt = new SepayWebhookEvent
            {
                SepayTransactionID = dto.Id,
                ReferenceCode = dto.ReferenceCode,
                Content = dto.Content,
                TransferAmount = dto.TransferAmount,
                IsMatched = contribution != null,
                FundContributionID = contribution?.FundContributionID
            };
            _context.SepayWebhookEvents.Add(evt);

            if (contribution == null)
            {
                await _context.SaveChangesAsync();
                return (true, "Transaction stored but unmatched");
            }

            if (contribution.Status == "Paid")
            {
                await _context.SaveChangesAsync();
                return (true, "Contribution already paid");
            }

            if (dto.TransferAmount < contribution.ExpectedAmount)
            {
                await _context.SaveChangesAsync();
                return (true, "Amount lower than expected");
            }

            contribution.Status = "Paid";
            contribution.PaidAt = ParseTransactionDate(dto.TransactionDate) ?? DateTime.Now;
            contribution.SepayTransactionID = dto.Id;
            contribution.BankReferenceCode = dto.ReferenceCode;
            contribution.BankContent = dto.Content;

            var userId = contribution.Member?.UserID;
            if (!userId.HasValue)
            {
                await _context.SaveChangesAsync();
                return (true, "Paid contribution has no linked user");
            }

            var period = contribution.Period!;
            var fundTransaction = new FundTransaction
            {
                Type = "Income",
                Amount = contribution.ExpectedAmount,
                Category = string.IsNullOrWhiteSpace(period.Category) ? "Đóng quỹ" : period.Category,
                ActivityID = period.ActivityID,
                Description = $"{period.Title} - {contribution.Member!.FullName}",
                TransactionDate = contribution.PaidAt ?? DateTime.Now,
                Status = "Approved",
                CreatedByUserID = userId.Value,
                ApprovedAt = contribution.PaidAt
            };
            _context.FundTransactions.Add(fundTransaction);
            contribution.FundTransaction = fundTransaction;
            await _context.SaveChangesAsync();
            return (true, "Contribution marked as paid");
        }

        private async Task<FundCollectionPeriodDTO?> GetPeriodByIdAsync(int id)
        {
            var period = await _context.FundCollectionPeriods
                .Include(p => p.Contributions)
                .Include(p => p.Activity)
                .FirstOrDefaultAsync(p => p.FundCollectionPeriodID == id);
            return period == null ? null : MapPeriod(period);
        }

        private FundCollectionPeriodDTO MapPeriod(FundCollectionPeriod p)
        {
            var paid = p.Contributions.Where(c => c.Status == "Paid").ToList();
            return new FundCollectionPeriodDTO
            {
                FundCollectionPeriodID = p.FundCollectionPeriodID,
                Year = p.Year,
                Month = p.Month,
                Title = string.IsNullOrWhiteSpace(p.Title) ? $"Quỹ tháng {p.Month:D2}/{p.Year}" : p.Title,
                Category = string.IsNullOrWhiteSpace(p.Category) ? "Đóng quỹ" : p.Category,
                ActivityID = p.ActivityID,
                ActivityName = p.Activity?.ActivityName,
                Amount = p.Amount,
                Status = p.Status,
                DueDate = p.DueDate,
                TotalMembers = p.Contributions.Count,
                PaidMembers = paid.Count,
                CollectedAmount = paid.Sum(c => c.ExpectedAmount),
                RemainingAmount = p.Contributions.Where(c => c.Status != "Paid").Sum(c => c.ExpectedAmount)
            };
        }

        private FundContributionDTO MapContribution(FundContribution c, FundCollectionPeriod p)
        {
            return new FundContributionDTO
            {
                FundContributionID = c.FundContributionID,
                FundCollectionPeriodID = p.FundCollectionPeriodID,
                Year = p.Year,
                Month = p.Month,
                Title = string.IsNullOrWhiteSpace(p.Title) ? $"Quỹ tháng {p.Month:D2}/{p.Year}" : p.Title,
                Category = string.IsNullOrWhiteSpace(p.Category) ? "Đóng quỹ" : p.Category,
                ActivityID = p.ActivityID,
                ActivityName = p.Activity?.ActivityName,
                ExpectedAmount = c.ExpectedAmount,
                PaymentCode = c.PaymentCode,
                Status = c.Status,
                PeriodStatus = p.Status,
                DueDate = p.DueDate,
                PaidAt = c.PaidAt,
                QrUrl = BuildQrUrl(c.ExpectedAmount, c.PaymentCode)
            };
        }

        private string BuildQrUrl(decimal amount, string paymentCode)
        {
            var bankId = _configuration["FundPayment:BankId"] ?? "MB";
            var accountNo = _configuration["FundPayment:AccountNo"] ?? "0778592250";
            var accountName = _configuration["FundPayment:AccountName"] ?? "DANG VAN HUNG";
            return $"https://img.vietqr.io/image/{Uri.EscapeDataString(bankId)}-{Uri.EscapeDataString(accountNo)}-compact2.png" +
                   $"?amount={(long)amount}&addInfo={Uri.EscapeDataString(paymentCode)}&accountName={Uri.EscapeDataString(accountName)}";
        }

        private static string BuildPaymentCode(int year, int month, int periodId, int memberId)
            => $"Q{year % 100:D2}{month:D2}P{periodId:D5}M{memberId:D6}";

        private static string? ExtractPaymentCode(SepayWebhookDTO dto)
        {
            if (!string.IsNullOrWhiteSpace(dto.Code)) return dto.Code.Trim();
            var content = dto.Content ?? string.Empty;
            var parts = content.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            return parts.FirstOrDefault(p => p.StartsWith("Q", StringComparison.OrdinalIgnoreCase));
        }

        private static DateTime? ParseTransactionDate(string? value)
        {
            if (DateTime.TryParseExact(value, "yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var date))
                return date;
            return null;
        }
    }
}
