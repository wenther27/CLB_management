// DTOs/Members/MemberBoardDTO.cs
namespace ClubManagement.API.DTOs.Members
{
    public class MemberBoardDTO
    {
        public int MemberID { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Position { get; set; }
        public string? Department { get; set; }
        public string? AvatarUrl { get; set; }
        public int DisplayOrder { get; set; }
        public string? Faculty { get; set; }
        public string? Email { get; set; }
        public DateTime? JoinDate { get; set; }
    }

    public class DepartmentGroupDTO
    {
        public string Department { get; set; } = string.Empty;
        public List<MemberBoardDTO> Members { get; set; } = new();
    }
}