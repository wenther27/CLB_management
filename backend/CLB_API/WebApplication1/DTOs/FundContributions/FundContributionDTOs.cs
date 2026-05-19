using System.ComponentModel.DataAnnotations;

namespace ClubManagement.API.DTOs.FundContributions
{
    public class FundCollectionPeriodDTO
    {
        public int FundCollectionPeriodID { get; set; }
        public int Year { get; set; }
        public int Month { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int? ActivityID { get; set; }
        public string? ActivityName { get; set; }
        public decimal Amount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? DueDate { get; set; }
        public int TotalMembers { get; set; }
        public int PaidMembers { get; set; }
        public decimal CollectedAmount { get; set; }
        public decimal RemainingAmount { get; set; }
    }

    public class CreateFundCollectionPeriodDTO
    {
        [Range(2020, 2100)]
        public int Year { get; set; }

        [Range(1, 12)]
        public int Month { get; set; }

        [MaxLength(150)]
        public string? Title { get; set; }

        [MaxLength(120)]
        public string? Category { get; set; }

        public int? ActivityID { get; set; }

        [Range(0.01, double.MaxValue)]
        public decimal Amount { get; set; }

        public DateTime? DueDate { get; set; }

        public List<int> MemberIDs { get; set; } = new();
    }

    public class UpdateFundCollectionPeriodStatusDTO
    {
        [Required]
        public string Status { get; set; } = string.Empty;
    }

    public class FundContributionDTO
    {
        public int FundContributionID { get; set; }
        public int FundCollectionPeriodID { get; set; }
        public int Year { get; set; }
        public int Month { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int? ActivityID { get; set; }
        public string? ActivityName { get; set; }
        public decimal ExpectedAmount { get; set; }
        public string PaymentCode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string PeriodStatus { get; set; } = string.Empty;
        public DateTime? DueDate { get; set; }
        public DateTime? PaidAt { get; set; }
        public string QrUrl { get; set; } = string.Empty;
    }

    public class AdminFundContributionDTO
    {
        public int FundContributionID { get; set; }
        public int MemberID { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? ClassName { get; set; }
        public string? Faculty { get; set; }
        public decimal ExpectedAmount { get; set; }
        public string PaymentCode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime? PaidAt { get; set; }
    }

    public class SepayWebhookDTO
    {
        public long Id { get; set; }
        public string? Gateway { get; set; }
        public string? TransactionDate { get; set; }
        public string? AccountNumber { get; set; }
        public string? Code { get; set; }
        public string? Content { get; set; }
        public string? TransferType { get; set; }
        public string? Description { get; set; }
        public decimal TransferAmount { get; set; }
        public string? ReferenceCode { get; set; }
    }
}
