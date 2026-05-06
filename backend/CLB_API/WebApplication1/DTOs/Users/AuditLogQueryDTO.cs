namespace ClubManagement.API.DTOs.Users
{
    public class AuditLogQueryDTO
    {
        public string? Keyword { get; set; }
        public string? TableName { get; set; }
        public string? Category { get; set; }
        public int? UserID { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}
