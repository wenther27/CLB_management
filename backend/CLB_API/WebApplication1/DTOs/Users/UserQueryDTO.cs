namespace ClubManagement.API.DTOs.Users
{
    public class UserQueryDTO
    {
        public string? Keyword { get; set; }
        public string? RoleName { get; set; }
        public bool? IsActive { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? SortBy { get; set; } = "CreatedAt";
        public string? SortDir { get; set; } = "desc";
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 15;
    }
}
