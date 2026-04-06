using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClubManagement.API.Models
{
    public class Notification
    {
        [Key]
        public int NotificationID { get; set; }

        [Required]
        [MaxLength(500)]

        public string Message { get; set; } = string.Empty;

        public int? SenderID { get; set; }
        
        public int ? ReceiberID { get; set; }

        public bool IsRead { get; set; } = false;

        [ForeignKey("SenderID")]
        public User? Sender { get; set; }

        public DateTime SendDate { get; set; } = DateTime.Now;

   
    }
}
