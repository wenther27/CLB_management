namespace ClubManagement.API.DTOs.Activityes
{
    public class ActivityQueryDTO // Danh hoạt động phân trang
    {
        public string ? status { get; set; }
        public string ? Keyword { get; set; }
        public DateTime? FromDate   { get; set; }
        public DateTime? ToDate { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
    public class PagedResultDTO <T>
    {
        public List<T> Items { get; set; } = new () ;
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    }
    public class  RegistrationResponseDTO
    {
        public int RegistrationID { get; set; }
        public int MemberID { get; set; }
        public string? StudentCode { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public string? ClassName { get; set; }
        public string? Faculty { get; set; }
        public int ActivityID { get; set; }
        public string ActivityName { get; set; } = string.Empty;
        public DateTime RegisterDate { get; set; }

        public string Status { get; set; } = string.Empty;
        public bool IsAttended { get; set; }
        public DateTime? AttendedAt { get; set; }
    }
}
