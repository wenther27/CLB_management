namespace ClubManagement.API.DTOs.Members
{
    public class MemberStatsDTO
    {
        public int TotalMembers { get; set; }
        public int ActiveMembers { get; set; } 
        public int InactiveMembers { get; set; }
        public int NewThisMonth { get; set; }
    }
}
