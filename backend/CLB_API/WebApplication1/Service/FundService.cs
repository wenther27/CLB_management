using ClubManagement.API.Data;
using ClubManagement.API.DTOs.Funds;
using ClubManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace ClubManagement.API.Service
{
    public interface IFundService
    {
        Task<FundOverviewDTO> GetOverviewAsync();
        Task<List<FundTransactionDTO>> GetTransactionsAsync(string? status, string? type, int? year, int? month);
        Task<FundTransactionDTO?> CreateTransactionAsync(CreateFundTransactionDTO dto, int userId);
        Task<FundTransactionDTO?> UpdateTransactionAsync(int id, UpdateFundTransactionDTO dto, int userId);
        Task<FundTransactionDTO?> UpdateStatusAsync(int id, string status, int approverUserId);
        Task<bool> DeleteTransactionAsync(int id, int userId);
        Task<List<ActivityBudgetDTO>> GetBudgetsAsync();
        Task<ActivityBudgetDTO?> SaveBudgetAsync(SaveActivityBudgetDTO dto, int userId);
        Task<ActivityBudgetDTO?> UpdateBudgetAsync(int id, SaveActivityBudgetDTO dto, int userId);
        Task<FundReportDTO> GetReportAsync(int year, int? month);
    }

    public class FundService : IFundService
    {
        private readonly ApplicationDbContext _context;

        public FundService(ApplicationDbContext context)
        {
            _context = context;
        }

        private void AddAuditLog(int? userId, string action, string tableName, int? recordId)
        {
            _context.AuditLogs.Add(new AuditLog
            {
                UserID = userId,
                Action = action.Length > 250 ? action[..250] : action,
                TableName = tableName,
                RecordID = recordId,
                CreatedAt = DateTime.Now
            });
        }

        public async Task<FundOverviewDTO> GetOverviewAsync()
        {
            var now = DateTime.Now;
            var approved = _context.FundTransactions.Where(t => t.Status == "Approved");
            var totalIncome = await approved
                .Where(t => t.Type == "Income")
                .SumAsync(t => (decimal?)t.Amount) ?? 0;
            var totalExpense = await approved
                .Where(t => t.Type == "Expense")
                .SumAsync(t => (decimal?)t.Amount) ?? 0;

            return new FundOverviewDTO
            {
                CurrentBalance = totalIncome - totalExpense,
                TotalIncomeThisMonth = await approved
                    .Where(t => t.Type == "Income" && t.TransactionDate.Year == now.Year && t.TransactionDate.Month == now.Month)
                    .SumAsync(t => (decimal?)t.Amount) ?? 0,
                TotalExpenseThisMonth = await approved
                    .Where(t => t.Type == "Expense" && t.TransactionDate.Year == now.Year && t.TransactionDate.Month == now.Month)
                    .SumAsync(t => (decimal?)t.Amount) ?? 0,
                PendingAmount = await _context.FundTransactions
                    .Where(t => t.Status == "Pending")
                    .SumAsync(t => (decimal?)t.Amount) ?? 0,
                PendingCount = await _context.FundTransactions.CountAsync(t => t.Status == "Pending")
            };
        }

        public async Task<List<FundTransactionDTO>> GetTransactionsAsync(string? status, string? type, int? year, int? month)
        {
            var query = _context.FundTransactions
                .Include(t => t.Activity)
                .Include(t => t.CreatedByUser)
                    .ThenInclude(u => u!.Member)
                .Include(t => t.ApprovedByUser)
                    .ThenInclude(u => u!.Member)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status)) query = query.Where(t => t.Status == status);
            if (!string.IsNullOrWhiteSpace(type)) query = query.Where(t => t.Type == type);
            if (year.HasValue) query = query.Where(t => t.TransactionDate.Year == year.Value);
            if (month.HasValue) query = query.Where(t => t.TransactionDate.Month == month.Value);

            var items = await query
                .OrderByDescending(t => t.TransactionDate)
                .ThenByDescending(t => t.CreatedAt)
                .ToListAsync();
            return items.Select(MapTransaction).ToList();
        }

        public async Task<FundTransactionDTO?> CreateTransactionAsync(CreateFundTransactionDTO dto, int userId)
        {
            if (!IsValidType(dto.Type)) return null;
            if (dto.ActivityID.HasValue && !await _context.Activities.AnyAsync(a => a.ActivityID == dto.ActivityID.Value))
                return null;

            var item = new FundTransaction
            {
                Type = dto.Type,
                Amount = dto.Amount,
                Category = dto.Category.Trim(),
                Description = dto.Description?.Trim(),
                TransactionDate = dto.TransactionDate ?? DateTime.Now,
                ReceiptUrl = dto.ReceiptUrl,
                ActivityID = dto.ActivityID,
                CreatedByUserID = userId,
                Status = "Pending"
            };

            _context.FundTransactions.Add(item);
            await _context.SaveChangesAsync();
            AddAuditLog(userId, $"Tạo giao dịch quỹ: {item.Category} - {item.Amount:N0}", "FundTransactions", item.FundTransactionID);
            await _context.SaveChangesAsync();
            return await GetTransactionByIdAsync(item.FundTransactionID);
        }

        public async Task<FundTransactionDTO?> UpdateTransactionAsync(int id, UpdateFundTransactionDTO dto, int userId)
        {
            var item = await _context.FundTransactions.FindAsync(id);
            if (item == null || item.Status != "Pending" || !IsValidType(dto.Type)) return null;
            if (dto.ActivityID.HasValue && !await _context.Activities.AnyAsync(a => a.ActivityID == dto.ActivityID.Value))
                return null;

            item.Type = dto.Type;
            item.Amount = dto.Amount;
            item.Category = dto.Category.Trim();
            item.Description = dto.Description?.Trim();
            item.TransactionDate = dto.TransactionDate ?? item.TransactionDate;
            item.ReceiptUrl = dto.ReceiptUrl;
            item.ActivityID = dto.ActivityID;
            AddAuditLog(userId, $"Cập nhật giao dịch quỹ: {item.Category} - {item.Amount:N0}", "FundTransactions", item.FundTransactionID);
            await _context.SaveChangesAsync();
            return await GetTransactionByIdAsync(id);
        }

        public async Task<FundTransactionDTO?> UpdateStatusAsync(int id, string status, int approverUserId)
        {
            if (status != "Approved" && status != "Rejected") return null;
            var item = await _context.FundTransactions.FindAsync(id);
            if (item == null || item.Status != "Pending") return null;

            item.Status = status;
            item.ApprovedByUserID = approverUserId;
            item.ApprovedAt = DateTime.Now;
            var statusText = status == "Approved" ? "Duyệt" : "Từ chối";
            AddAuditLog(approverUserId, $"{statusText} giao dịch quỹ: {item.Category} - {item.Amount:N0}", "FundTransactions", item.FundTransactionID);
            await _context.SaveChangesAsync();
            return await GetTransactionByIdAsync(id);
        }

        public async Task<bool> DeleteTransactionAsync(int id, int userId)
        {
            var item = await _context.FundTransactions.FindAsync(id);
            if (item == null || item.Status != "Pending") return false;
            AddAuditLog(userId, $"Xóa giao dịch quỹ: {item.Category} - {item.Amount:N0}", "FundTransactions", item.FundTransactionID);
            _context.FundTransactions.Remove(item);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<ActivityBudgetDTO>> GetBudgetsAsync()
        {
            var budgets = await _context.ActivityBudgets
                .Include(b => b.Activity)
                .OrderByDescending(b => b.UpdatedAt)
                .ToListAsync();
            return budgets.Select(MapBudget).ToList();
        }

        public async Task<ActivityBudgetDTO?> SaveBudgetAsync(SaveActivityBudgetDTO dto, int userId)
        {
            var activity = await _context.Activities.FindAsync(dto.ActivityID);
            if (activity == null) return null;

            var existing = await _context.ActivityBudgets.FirstOrDefaultAsync(b => b.ActivityID == dto.ActivityID);
            if (existing != null) return await UpdateBudgetAsync(existing.ActivityBudgetID, dto, userId);

            var budget = new ActivityBudget
            {
                ActivityID = dto.ActivityID,
                PlannedAmount = dto.PlannedAmount,
                Note = dto.Note?.Trim(),
                CreatedByUserID = userId
            };
            _context.ActivityBudgets.Add(budget);
            await _context.SaveChangesAsync();
            AddAuditLog(userId, $"Tạo ngân sách hoạt động: {activity.ActivityName} - {budget.PlannedAmount:N0}", "FundCollectionPeriods", budget.ActivityBudgetID);
            await _context.SaveChangesAsync();
            return await GetBudgetByIdAsync(budget.ActivityBudgetID);
        }

        public async Task<ActivityBudgetDTO?> UpdateBudgetAsync(int id, SaveActivityBudgetDTO dto, int userId)
        {
            var budget = await _context.ActivityBudgets.FindAsync(id);
            if (budget == null) return null;
            if (budget.ActivityID != dto.ActivityID &&
                !await _context.Activities.AnyAsync(a => a.ActivityID == dto.ActivityID))
                return null;

            budget.ActivityID = dto.ActivityID;
            budget.PlannedAmount = dto.PlannedAmount;
            budget.Note = dto.Note?.Trim();
            budget.UpdatedAt = DateTime.Now;
            AddAuditLog(userId, $"Cập nhật ngân sách hoạt động: #{budget.ActivityID} - {budget.PlannedAmount:N0}", "FundCollectionPeriods", budget.ActivityBudgetID);
            await _context.SaveChangesAsync();
            return await GetBudgetByIdAsync(id);
        }

        public async Task<FundReportDTO> GetReportAsync(int year, int? month)
        {
            var approved = _context.FundTransactions
                .Include(t => t.Activity)
                .Include(t => t.CreatedByUser)
                    .ThenInclude(u => u!.Member)
                .Include(t => t.ApprovedByUser)
                    .ThenInclude(u => u!.Member)
                .Where(t => t.Status == "Approved" && t.TransactionDate.Year == year);

            if (month.HasValue) approved = approved.Where(t => t.TransactionDate.Month == month.Value);

            var list = await approved.ToListAsync();
            var categories = list
                .GroupBy(t => t.Category)
                .Select(g => new FundReportCategoryDTO
                {
                    Category = g.Key,
                    Income = g.Where(x => x.Type == "Income").Sum(x => x.Amount),
                    Expense = g.Where(x => x.Type == "Expense").Sum(x => x.Amount)
                })
                .OrderByDescending(x => x.Income + x.Expense)
                .ToList();

            var activities = list
                .Where(t => t.Type == "Expense" && t.ActivityID.HasValue)
                .GroupBy(t => new { t.ActivityID, ActivityName = t.Activity!.ActivityName })
                .Select(g => new FundReportActivityDTO
                {
                    ActivityID = g.Key.ActivityID!.Value,
                    ActivityName = g.Key.ActivityName,
                    Expense = g.Sum(x => x.Amount)
                })
                .OrderByDescending(x => x.Expense)
                .ToList();

            var income = list.Where(t => t.Type == "Income").Sum(t => t.Amount);
            var expense = list.Where(t => t.Type == "Expense").Sum(t => t.Amount);
            return new FundReportDTO
            {
                Year = year,
                Month = month,
                TotalIncome = income,
                TotalExpense = expense,
                NetAmount = income - expense,
                Categories = categories,
                Activities = activities,
                Transactions = list
                    .OrderByDescending(t => t.TransactionDate)
                    .ThenByDescending(t => t.CreatedAt)
                    .Select(MapTransaction)
                    .ToList()
            };
        }

        private static bool IsValidType(string type) => type == "Income" || type == "Expense";

        private async Task<FundTransactionDTO?> GetTransactionByIdAsync(int id)
        {
            var item = await _context.FundTransactions
                .Include(t => t.Activity)
                .Include(t => t.CreatedByUser)
                    .ThenInclude(u => u!.Member)
                .Include(t => t.ApprovedByUser)
                    .ThenInclude(u => u!.Member)
                .FirstOrDefaultAsync(t => t.FundTransactionID == id);
            return item == null ? null : MapTransaction(item);
        }

        private async Task<ActivityBudgetDTO?> GetBudgetByIdAsync(int id)
        {
            var budget = await _context.ActivityBudgets
                .Include(b => b.Activity)
                .FirstOrDefaultAsync(b => b.ActivityBudgetID == id);
            return budget == null ? null : MapBudget(budget);
        }

        private static FundTransactionDTO MapTransaction(FundTransaction t) => new()
        {
            FundTransactionID = t.FundTransactionID,
            Type = t.Type,
            Amount = t.Amount,
            Category = t.Category,
            Description = t.Description,
            TransactionDate = t.TransactionDate,
            ReceiptUrl = t.ReceiptUrl,
            Status = t.Status,
            ActivityID = t.ActivityID,
            ActivityName = t.Activity != null ? t.Activity.ActivityName : null,
            CreatedBy = GetDisplayName(t.CreatedByUser),
            ApprovedBy = GetDisplayName(t.ApprovedByUser),
            ApprovedAt = t.ApprovedAt,
            CreatedAt = t.CreatedAt
        };

        private static string? GetDisplayName(User? user)
            => user == null
                ? null
                : !string.IsNullOrWhiteSpace(user.Member?.FullName)
                    ? user.Member.FullName
                    : user.Email;

        private ActivityBudgetDTO MapBudget(ActivityBudget b)
        {
            var approvedExpense = _context.FundTransactions
                .Where(t => t.Status == "Approved" && t.Type == "Expense" && t.ActivityID == b.ActivityID)
                .Sum(t => (decimal?)t.Amount) ?? 0;

            return new ActivityBudgetDTO
            {
                ActivityBudgetID = b.ActivityBudgetID,
                ActivityID = b.ActivityID,
                ActivityName = b.Activity != null ? b.Activity.ActivityName : string.Empty,
                PlannedAmount = b.PlannedAmount,
                ApprovedExpense = approvedExpense,
                RemainingAmount = b.PlannedAmount - approvedExpense,
                Note = b.Note,
                UpdatedAt = b.UpdatedAt
            };
        }
    }
}
