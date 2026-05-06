namespace ClubManagement.API.DTOs.Users
{
    public class WriteAuditLogDTO
    {
        public string Action { get; set; } = string.Empty;
        public string? TableName { get; set; }
        public int? RecordID { get; set; }
    }
}
