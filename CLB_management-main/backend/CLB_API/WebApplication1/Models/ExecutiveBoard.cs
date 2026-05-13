using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics.CodeAnalysis;

namespace ClubManagement.API.Models
{
    public class ExecutiveBoard
    {
        [Key]
        public int BoardID { get; set; }

        public int userID { get; set; }

        [Required]
        [MaxLength(255)]
        public string Position { get; set; }

        [ForeignKey("userID")]
        public User user { get; set; }
        public ICollection<Post> posts { get; set; }
        
        public ICollection <ClubActivity> activities { get; set; }
    }
}
