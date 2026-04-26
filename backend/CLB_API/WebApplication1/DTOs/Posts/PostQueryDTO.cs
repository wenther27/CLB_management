using Microsoft.EntityFrameworkCore.Metadata.Conventions;

namespace ClubManagement.API.DTOs.Posts
{
    public class PostQueryDTO
    {    public string ? Category { get ; set; }
        public string ? Status { get; set; }
        public string ? Keyword { get; set; }
        public DateTime ? FromDate { get; set; }
        public DateTime ? ToDate { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
