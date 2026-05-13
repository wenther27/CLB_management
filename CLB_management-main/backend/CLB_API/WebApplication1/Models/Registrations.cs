using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClubManagement.API.Models
{
    public class Registrations
    {
        [Key]
        public int RegistrationID { get; set; }

        [Required]
        public int MemberID { get; set; }
        [Required]
        public int ActivityID { get; set; }
        
        public DateTime RegisterDate { get; set; } = DateTime.Now;
        [MaxLength(100)]

        public string? Status { get; set; }

        [ForeignKey("MemberID")]
        public Member? Member { get; set; }

        [ForeignKey ( "ActivityID")]
        public ClubActivity ? ClubActivity { get; set; }

    }
}
