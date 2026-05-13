using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClubManagement.API.Models
{
    public class PostImage
    {
        [Key]
        public int  ImageID { get; set; }
        public int  PostID { get; set; }
        [Required]
        public string ImageUrl { get; set; } = string.Empty;

        [ForeignKey ("PostID")]
        public Post ? Post {  get; set; }
    }
}
