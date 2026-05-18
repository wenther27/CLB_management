using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClubManagement.API.Models
{
    public class SepayWebhookEvent
    {
        [Key]
        public int SepayWebhookEventID { get; set; }

        public long SepayTransactionID { get; set; }

        [MaxLength(100)]
        public string? ReferenceCode { get; set; }

        [MaxLength(1000)]
        public string? Content { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TransferAmount { get; set; }

        public bool IsMatched { get; set; }
        public int? FundContributionID { get; set; }
        [ForeignKey(nameof(FundContributionID))]
        public FundContribution? FundContribution { get; set; }

        public DateTime ReceivedAt { get; set; } = DateTime.Now;
    }
}
