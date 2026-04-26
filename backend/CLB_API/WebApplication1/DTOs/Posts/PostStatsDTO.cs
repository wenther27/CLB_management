namespace ClubManagement.API.DTOs.Posts
{
    public class PostStatsDTO
    {
        public int TotalPosts { get; set; }
        public int PublishedPosts { get; set; }
        public int DraftPosts { get; set; }
        public int NewThisMonth { get; set; }
        public int TotalViews { get; set; }

    }
}
