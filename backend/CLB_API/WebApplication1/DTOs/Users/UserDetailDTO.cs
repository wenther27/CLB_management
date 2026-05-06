namespace ClubManagement.API.DTOs.Users
{
    public class UserDetailDTO
    {
        public int UserID { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public bool IsActive { get; set; }
        public int RoleID { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // Thông tin Member liên kết (nếu có)
        public string? FullName { get; set; }
        public string? ClassName { get; set; }
        public string? Faculty { get; set; }
        public string? Position { get; set; }
        public string? MemberStatus { get; set; }
        public int? MemberID { get; set; }

        // Thống kê hoạt động
        public int TotalRegistrations { get; set; }
        public int TotalPostsCreated { get; set; }
    }
}
