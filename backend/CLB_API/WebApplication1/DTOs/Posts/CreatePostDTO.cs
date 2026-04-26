namespace ClubManagement.API.DTOs
{
    public class CreatePostDTO
    {
        public string ? Title { get; set; }
        public string Content { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string? Status {  get; set; } = "Draft"; 
        public string? Summary { get; set; } // bản tóm tắt
        public string? Tags { get; set; }
        public string? CoverImageUrl { get; set; }
        public bool IsPinned { get; set; }
        public List <string>? ImageUrls { get; set; }

    }
}
