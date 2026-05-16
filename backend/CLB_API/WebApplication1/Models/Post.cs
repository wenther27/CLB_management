
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
        public string ? Title { get; set;}
        public string ? Summary { get; set; }
        [MaxLength(500)]
        public string ?Tags { get; set; }
        public string? CoverImageUrl { get; set; }
        public bool IsPinned { get; set; } = false;
        public int ViewCount { get; set; } = 0;
        public int ReadTime { get; set; } = 1;
        public int ? CreateBy { get ; set; }
        [ForeignKey ("CreateBy")]
        public User ? User { get; set; }
        public ICollection <PostImage> ? postImages { get; set; }
        public ICollection<PostLike>? PostLikes { get; set; }

    }
}
