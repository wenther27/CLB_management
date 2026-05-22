using System.ComponentModel.DataAnnotations;

namespace ClubManagement.API.DTOs.MemberApplications
{
    public class CreateMemberApplicationDTO
    {
        [Required, MaxLength(30)]
        public string StudentCode { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? ClassName { get; set; }

        [Required, MaxLength(100)]
        public string Faculty { get; set; } = string.Empty;

        [Required]
        public DateTime? BirthDate { get; set; }

        [Required, EmailAddress, MaxLength(200)]
        public string ContactEmail { get; set; } = string.Empty;

        [MaxLength(15)]
        public string? Phone { get; set; }

        [MaxLength(1000)]
        public string? Note { get; set; }

        [MaxLength(6)]
        public string? Otp { get; set; }
    }

    public class SendMemberApplicationOtpDTO
    {
        [Required, MaxLength(30)]
        public string StudentCode { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? ClassName { get; set; }

        [Required, MaxLength(100)]
        public string Faculty { get; set; } = string.Empty;

        [Required]
        public DateTime? BirthDate { get; set; }

        [Required, EmailAddress, MaxLength(200)]
        public string ContactEmail { get; set; } = string.Empty;

        [MaxLength(15)]
        public string? Phone { get; set; }

        [MaxLength(1000)]
        public string? Note { get; set; }
    }

    public class MemberApplicationDTO
    {
        public int MemberApplicationID { get; set; }
        public string StudentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? ClassName { get; set; }
        public string Faculty { get; set; } = string.Empty;
        public DateTime BirthDate { get; set; }
        public string ContactEmail { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Note { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime SubmittedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewedBy { get; set; }
        public string? ReviewNote { get; set; }
    }

    public class ReviewMemberApplicationDTO
    {
        public string? ReviewNote { get; set; }
    }
}
