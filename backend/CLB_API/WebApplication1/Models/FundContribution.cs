using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClubManagement.API.Models
{
    public class FundContribution
    {
        [Key]
        public int FundContributionID { get; set; }

        public int FundCollectionPeriodID { get; set; }
        [ForeignKey(nameof(FundCollectionPeriodID))]
        public FundCollectionPeriod? Period { get; set; }

        public int MemberID { get; set; }
        [ForeignKey(nameof(MemberID))]
        public Member? Member { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal ExpectedAmount { get; set; }

        [Required, MaxLength(25)]
        public string PaymentCode { get; set; } = string.Empty;

        [MaxLength(20)]
        public string Status { get; set; } = "Pending";

        public DateTime? PaidAt { get; set; }
        public long? SepayTransactionID { get; set; }

        [MaxLength(100)]
        public string? BankReferenceCode { get; set; }

        [MaxLength(1000)]
        public string? BankContent { get; set; }

        public int? FundTransactionID { get; set; }
        [ForeignKey(nameof(FundTransactionID))]
        public FundTransaction? FundTransaction { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
