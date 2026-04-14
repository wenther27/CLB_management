namespace ClubManagement.API.DTOs.Members
{
    public class MemberQueryDTO
    {
        public string ? Keyword { get; set; }
        public string ? Faculty { get; set; }

        public string? Status { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
