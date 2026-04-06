namespace ClubManagement.API.DTOs
{
    public class PostDTO
    {
        public int PostID { get; set; }
        public string ? Title { get; set; } // tiêu đề 
        public string Content { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // Trạng Thái 
        public string Category { get; set; } = string.Empty; // Danh mục 
        public DateTime? CreatedDate { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public string ? AuthorName { get; set; }
        public List <string > ? Images { get; set; }

    }
}
