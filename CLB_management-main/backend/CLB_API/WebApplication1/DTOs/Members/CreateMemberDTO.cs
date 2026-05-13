namespace ClubManagement.API.DTOs.Members
{
    public class CreateMemberDTO
    {
        public int ? MemberID { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string ? ClassName { get; set; }
        public string ? Faculty {  get; set; }
        public string ? Position { get; set; }
        public string ? Status { get; set; }
    }
}
