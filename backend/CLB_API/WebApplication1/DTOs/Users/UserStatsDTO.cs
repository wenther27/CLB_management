namespace ClubManagement.API.DTOs.Users
{
    public class UserStatsDTO
    {
        public int TotalUsers { get; set; }
        public int ActiveUsers { get; set; }
        public int InactiveUsers { get; set; }
        public int AdminCount { get; set; }
        public int ExecutiveBoardCount { get; set; }
        public int MemberCount { get; set; }
        public int NewThisMonth { get; set; }
        public int NewThisWeek { get; set; }
    }
}
