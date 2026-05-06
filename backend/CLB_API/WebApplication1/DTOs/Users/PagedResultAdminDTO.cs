namespace ClubManagement.API.DTOs
{
    public class PagedResultAdminDTO<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }

        /// <summary>
        /// Tổng số trang — frontend dùng để render pagination.
        /// Dùng computed property: tự động tính, không cần gán thủ công trong Service.
        /// </summary>
        public int TotalPages => PageSize > 0
            ? (int)Math.Ceiling((double)TotalCount / PageSize)
            : 1;
    }
}