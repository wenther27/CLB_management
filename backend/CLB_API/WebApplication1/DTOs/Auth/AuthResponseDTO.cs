namespace ClubManagement.API.DTOs
{
    public class AuthResponseDTO // phản hồi xác thực 
    {
        public string Token {  get; set; } = string.Empty; // mã thông báo 
        public string Username { get; set; } = string.Empty;
        public string Email {  get; set; } = string.Empty;
        public string Role {  get; set; } = string.Empty;
        public string UserID { get; set; }
    }
}
