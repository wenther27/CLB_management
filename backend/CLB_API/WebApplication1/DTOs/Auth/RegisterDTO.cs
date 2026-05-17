namespace ClubManagement.API.DTOs
{
    public class RegisterDTO // đăng ký DTO 
    {
        public string Username { get; set; } = string .Empty;
        public string Password { get; set; } = string.Empty;
        public string Email {  get; set; } = string.Empty;
        public string ? Phone {  get; set; } 
        public string FullName {  get; set; } = string.Empty;
        public string ? ClassName { get; set; } 
        public string ?  Faculty {  get; set; } 
        public DateTime? BirthDate { get; set; }
    }
}
