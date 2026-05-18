using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClubManagement.API.Models
{
    public class FundCollectionPeriod
    {
        [Key]
        public int FundCollectionPeriodID { get; set; }

        public int Year { get; set; }
        public int Month { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "Open";

        public DateTime? DueDate { get; set; }

        public int CreatedByUserID { get; set; }
        [ForeignKey(nameof(CreatedByUserID))]
        public User? CreatedByUser { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public ICollection<FundContribution> Contributions { get; set; } = new List<FundContribution>();
    }
}
