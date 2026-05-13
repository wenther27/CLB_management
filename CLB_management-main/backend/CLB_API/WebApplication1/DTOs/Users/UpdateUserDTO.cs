namespace ClubManagement.API.DTOs
{
    public class UpdateUserDTO
    {
        public string ? Email { get; set; }
        public string ? Phone {  get; set; }
        public bool ? IsActive { get; set; }
        public int ? RoleID { get; set; }
    }
}
