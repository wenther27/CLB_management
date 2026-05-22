namespace ClubManagement.API.DTOs.Members
{
    public class UpdateProfileDTO
    {
        public string ? FullName { get; set; }
        public string? Email { get; set; }
        public string? ClassName { get; set; }
        public string? Faculty { get; set; }
        public string ? Phone { get; set; }
        public DateTime? BirthDate { get; set; }
        public string? CurrentPassword { get; set; }
    }
}
