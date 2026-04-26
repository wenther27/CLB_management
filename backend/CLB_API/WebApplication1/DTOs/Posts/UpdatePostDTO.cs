namespace ClubManagement.API.DTOs
{
    public class UpdatePostDTO
    {
        public string ? Title { get; set; }
        public string ? Content { get; set; }
        public string ? Category { get; set; }
        public string ? Status { get; set; }
        public string ? Summary { get; set; }
        public string ? Tags { get; set; }
        public string ? CoverImageUrl { get; set; }
        public bool ? IsPinned { get; set; }
        public List<string > ? ImageUrls { get; set; }
    }
}
