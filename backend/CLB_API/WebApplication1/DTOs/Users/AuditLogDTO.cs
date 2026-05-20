namespace ClubManagement.API.DTOs.Users
{
    public class AuditLogDTO
    {
        public int LogID { get; set; }
        public int? UserID { get; set; }
        public string? StudentCode { get; set; }
        public string? FullName { get; set; }
        public string? Action { get; set; }
        public string? TableName { get; set; }
        public int? RecordID { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? Category { get; set; } // login, activity, post, member, system
    }
}
