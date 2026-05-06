namespace ClubManagement.API.DTOs.Users
{
    public class UpdateUserAdminDTO
    {
        public int? RoleID { get; set; }
        public bool? IsActive { get; set; }
        public string? Phone { get; set; }
    }
}
