using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClubManagement.API.Models
{
    public class ActivityBudget
    {
        [Key]
        public int ActivityBudgetID { get; set; }

        public int ActivityID { get; set; }
        [ForeignKey(nameof(ActivityID))]
        public ClubActivity? Activity { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal PlannedAmount { get; set; }

        [MaxLength(1000)]
        public string? Note { get; set; }

        public int CreatedByUserID { get; set; }
        [ForeignKey(nameof(CreatedByUserID))]
        public User? CreatedByUser { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }
}
