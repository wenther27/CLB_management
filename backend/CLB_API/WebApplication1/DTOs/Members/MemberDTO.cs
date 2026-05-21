namespace ClubManagement.API.DTOs
{
    public class MemberDTO
    {
        public int MemberID { get; set; }
        public int ?  UserID { get; set; }
        public string? StudentCode { get; set; }

        public string FullName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string ? Faculty {  get; set; }
        public string ? Position { get; set; } // chức vụ
        public string ? Status { get; set; }
        public DateTime JoinDate { get; set; }
        public DateTime? BirthDate { get; set; }

        public string ? Email { get; set; }
        public string? ContactEmail { get; set; }
        public string ? Phone { get; set; }
        public string ? RoleName { get; set; }
        public string? Department { get; set; }
        public int DisplayOrder { get; set; }
        public string? AvatarUrl { get; set; }
        public string? BoardAvatarUrl { get; set; }
    }
}
