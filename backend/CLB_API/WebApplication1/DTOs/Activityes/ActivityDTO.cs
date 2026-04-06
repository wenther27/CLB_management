namespace ClubManagement.API.DTOs.Activityes
{
    public class ActivityDTO
    {
        public int ActivityID { get; set; }
        public string ActivityName { get; set; } = string.Empty;
        public string ? Description { get; set; }
        public string ? Location { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime Time { get; set; }
        public int ? MaxParticipants { get; set; }
        public int CreateBy { get; set; }
        public string ? CreatorName { get; set; }
        public DateTime? CreateAt { get; set; }
        public int RegisteredCount { get; set; }
        public List <string> Image { get; set; } 

    }
}
