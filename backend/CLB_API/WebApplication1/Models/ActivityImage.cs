using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClubManagement.API.Models
{
    public class ActivityImage
    {
        [Key]
        public int ImageID { get; set; }

        public int ActivityID { get; set; }

        [Required ]
        public string ImageUrl { get; set; } = string.Empty;

        [ForeignKey (" ActivityID")]
        public ClubActivity ? clubActivity {  get; set; }
    }
}
