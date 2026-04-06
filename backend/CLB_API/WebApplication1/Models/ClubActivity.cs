
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace ClubManagement.API.Models
{
    public class ClubActivity

    {

        [Key]
        public int ActivityID { get; set; }
        [Required]
        [MaxLength(250)]
        public string ActivityName { get; set; } = string.Empty;
        [MaxLength(200)]
        public string ? Description { get; set; } 
        [MaxLength(200)]
        public string ? Location { get; set; }
        [MaxLength(500)]
        public string Status { get; set; } = "Open";
        [Required]
        public DateTime time { get; set; }
        [MaxLength(50)]
        public DateTime? CreateAt { get; set; } = DateTime.Now;

        [MaxLength(50)]
        public int? MaxParticipants { get; set; }

        [MaxLength (50)]
        public int CreateBy { get; set; }
        [ForeignKey ("CreateBy")]
        public User ? Creator {  get; set; }


        public ICollection <Registrations> Registrations { get; set; }
        public ICollection <ExecutiveBoard> ExecutiveBoards { get; set; }
        public ICollection <ActivityImage> ActivityImages { get; set; }

        

    }
}
