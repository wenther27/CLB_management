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

        [Required, MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        [Required, MaxLength(120)]
        public string Category { get; set; } = "Đóng quỹ";

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "Open";

        public DateTime? DueDate { get; set; }

        public int? ActivityID { get; set; }
        [ForeignKey(nameof(ActivityID))]
        public ClubActivity? Activity { get; set; }

        public int CreatedByUserID { get; set; }
        [ForeignKey(nameof(CreatedByUserID))]
        public User? CreatedByUser { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public ICollection<FundContribution> Contributions { get; set; } = new List<FundContribution>();
    }
}
