namespace ClubManagement.API.DTOs
{
    public class MemberDTO
    {
        public int MemberID { get; set; }
        public int ?  UserID { get; set; }

        public string FullName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string ? Faculty {  get; set; }
        public string ? Posittion { get; set; } // chức vụ
        public string ? Status { get; set; }
        public DateTime joinDate { get; set; }

        public string ? Username {  get; set; }
        public string ? Email { get; set; }
    }
}
