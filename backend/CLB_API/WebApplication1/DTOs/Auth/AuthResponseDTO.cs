namespace ClubManagement.API.DTOs
{
    public class AuthResponseDTO // phản hồi xác thực 
    {
        public string Token {  get; set; } = string.Empty; // mã thông báo 
        public string? StudentCode { get; set; }
        public string? FullName { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string Email {  get; set; } = string.Empty;
        public string Role {  get; set; } = string.Empty;
        public string UserID { get; set; }
        public string? AvatarUrl { get; set; }
    }
}
