using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClubManagement.API.Models
{
    public class AuditLog
    {
        [Key]
        public int LogID { get; set; }

        public int ? UserID { get; set; }
        [MaxLength(250)]
        public string ? Action { get; set; }

        [MaxLength(100)]
        public string ? TableName { get; set; }

        public int ? RecordID { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey("UserID")]
        public User ? User { get; set; }

    }
}
