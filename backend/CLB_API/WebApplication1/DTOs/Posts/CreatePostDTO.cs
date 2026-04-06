namespace ClubManagement.API.DTOs
{
    public class CreatePostDTO
    {
        public string ? Title { get; set; }
        public string Content { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Status {  get; set; } = "Published"; // trạng thái công khai
    }
}
