using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClubManagement.API.Models
{
    public class FundTransaction
    {
        [Key]
        public int FundTransactionID { get; set; }

        [Required, MaxLength(20)]
        public string Type { get; set; } = "Expense";

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Required, MaxLength(120)]
        public string Category { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }

        public DateTime TransactionDate { get; set; } = DateTime.Now;

        [MaxLength(500)]
        public string? ReceiptUrl { get; set; }

        [Required, MaxLength(20)]
        public string Status { get; set; } = "Pending";

        public int? ActivityID { get; set; }
        [ForeignKey(nameof(ActivityID))]
        public ClubActivity? Activity { get; set; }

        public int CreatedByUserID { get; set; }
        [ForeignKey(nameof(CreatedByUserID))]
        public User? CreatedByUser { get; set; }

        public int? ApprovedByUserID { get; set; }
        [ForeignKey(nameof(ApprovedByUserID))]
        public User? ApprovedByUser { get; set; }

        public DateTime? ApprovedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
