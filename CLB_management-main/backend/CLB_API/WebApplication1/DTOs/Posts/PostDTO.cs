namespace ClubManagement.API.DTOs
{
    public class PostDTO
    {
        public int PostID { get; set; }
        public string ? Title { get; set; } // tiêu đề 
        public string Content { get; set; } = string.Empty;
        public string ? Summary { get; set;  } 
        public string Status { get; set; } = string.Empty; // Trạng Thái 
        public string Category { get; set; } = string.Empty; // Danh mục 
        public string Tags { get; set; }
        public string CoverImageUrl { get; set; }
        public int ReadTime { get; set; }
        public bool IsPinned { get; set; } // Ghim lên đầu
        public int ViewCount { get; set; }
        public DateTime? CreatedDate { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public string ? AuthorName { get; set; }
        public int ? AuthorId { get; set; }
        public List <string > ? Images { get; set; }

    }
}
