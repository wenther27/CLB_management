namespace ClubManagement.API.DTOs
{
    public class UserDTO
    {
        public int UserID { get; set; }
        public string? StudentCode { get; set; }
        public string? FullName { get; set; }
        public string Email { get; set; } = string.Empty;
        public string ? Phone {  get; set; } 
        public bool IsActive { get; set; }
        public DateTime createdAt { get; set; }
    }
}
