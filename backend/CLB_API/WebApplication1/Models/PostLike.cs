using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClubManagement.API.Models
{
    public class PostLike
    {
        [Key]
        public int PostLikeID { get; set; }

        public int PostID { get; set; }
        public int UserID { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("PostID")]
        public Post? Post { get; set; }

        [ForeignKey("UserID")]
        public User? User { get; set; }
    }
}
