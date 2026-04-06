
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClubManagement.API.Models
{
    public class Post
    {
        [Key]
        public int PostID { get; set; }
        [Required]
        public string Content { get; set; } = string.Empty;
        [MaxLength(100)]
        [Required]
        public string category { get; set; } = string.Empty;
        public string status { get; set; } = "Published";
        [MaxLength(50)]
        public DateTime createdDate { get; set; } = DateTime.Now;
        public DateTime ? UpdateTime { get; set; }

        [ForeignKey ("CreateBy")]
        public User ? User { get; set; }
        public ICollection <PostImage> ? postImages { get; set; }

    }
}
