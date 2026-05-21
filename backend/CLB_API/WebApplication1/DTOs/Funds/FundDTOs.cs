using System.ComponentModel.DataAnnotations;

namespace ClubManagement.API.DTOs.Funds
{
    public class FundOverviewDTO
    {
        public decimal CurrentBalance { get; set; }
        public decimal TotalIncomeThisMonth { get; set; }
        public decimal TotalExpenseThisMonth { get; set; }
        public decimal PendingAmount { get; set; }
        public int PendingCount { get; set; }
    }

    public class FundTransactionDTO
    {
        public int FundTransactionID { get; set; }
        public string Type { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Category { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime TransactionDate { get; set; }
        public string? ReceiptUrl { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? ActivityID { get; set; }
        public string? ActivityName { get; set; }
        public string? CreatedBy { get; set; }
        public string? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateFundTransactionDTO
    {
        [Required]
        public string Type { get; set; } = "Expense";

        [Range(0.01, double.MaxValue)]
        public decimal Amount { get; set; }

        [Required]
        public string Category { get; set; } = string.Empty;

        public string? Description { get; set; }
        public DateTime? TransactionDate { get; set; }
        public string? ReceiptUrl { get; set; }
        public int? ActivityID { get; set; }
    }

    public class UpdateFundTransactionDTO : CreateFundTransactionDTO
    {
    }

    public class UpdateFundTransactionStatusDTO
    {
        [Required]
        public string Status { get; set; } = string.Empty;
    }

    public class ActivityBudgetDTO
    {
        public int ActivityBudgetID { get; set; }
        public int ActivityID { get; set; }
        public string ActivityName { get; set; } = string.Empty;
        public decimal PlannedAmount { get; set; }
        public decimal ApprovedExpense { get; set; }
        public decimal RemainingAmount { get; set; }
        public string? Note { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class SaveActivityBudgetDTO
    {
        [Required]
        public int ActivityID { get; set; }

        [Range(0, double.MaxValue)]
        public decimal PlannedAmount { get; set; }

        public string? Note { get; set; }
    }

    public class FundReportDTO
    {
        public int Year { get; set; }
        public int? Month { get; set; }
        public decimal TotalIncome { get; set; }
        public decimal TotalExpense { get; set; }
        public decimal NetAmount { get; set; }
        public List<FundReportCategoryDTO> Categories { get; set; } = new();
        public List<FundReportActivityDTO> Activities { get; set; } = new();
        public List<FundTransactionDTO> Transactions { get; set; } = new();
    }

    public class FundReportCategoryDTO
    {
        public string Category { get; set; } = string.Empty;
        public decimal Income { get; set; }
        public decimal Expense { get; set; }
    }

    public class FundReportActivityDTO
    {
        public int ActivityID { get; set; }
        public string ActivityName { get; set; } = string.Empty;
        public decimal Expense { get; set; }
    }
}
