namespace ClubManagement.API.DTOs.Members
{
    public class UpdateMemberDTO
    {
        public string ? FullName { get; set; }
        public string ? ClassName { get; set; }
        public string? Faculty {  get; set; }
        public string ? Position { get; set; }
        public string ? Status { get; set; }   
        public string ? Phone { get; set; }
        public string? Department { get; set; }
        public int? DisplayOrder { get; set; }
        public string? AvatarUrl { get; set; }
        public string? ContactEmail { get; set; }
    }
}
