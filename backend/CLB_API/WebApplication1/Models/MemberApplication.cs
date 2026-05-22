using System.ComponentModel.DataAnnotations;

namespace ClubManagement.API.Models
{
    public class MemberApplication
    {
        [Key]
        public int MemberApplicationID { get; set; }

        [Required, MaxLength(30)]
        public string StudentCode { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? ClassName { get; set; }

        [Required, MaxLength(100)]
        public string Faculty { get; set; } = string.Empty;

        [Required]
        public DateTime BirthDate { get; set; }

        [Required, MaxLength(200)]
        public string ContactEmail { get; set; } = string.Empty;

        [MaxLength(15)]
        public string? Phone { get; set; }

        [MaxLength(1000)]
        public string? Note { get; set; }

        [MaxLength(1000)]
        public string? StudentCardImageUrl { get; set; }

        [Required, MaxLength(20)]
        public string Status { get; set; } = "Pending";

        public DateTime SubmittedAt { get; set; } = DateTime.Now;
        public DateTime? ReviewedAt { get; set; }
        public int? ReviewedByUserID { get; set; }

        [MaxLength(1000)]
        public string? ReviewNote { get; set; }

        public User? ReviewedByUser { get; set; }
    }
}
