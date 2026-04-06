namespace ClubManagement.API.DTOs
{
    public class CreateActivityDTO
    {
        public string ActivityName { get; set; } = string .Empty;
        public string ? Description {  get; set; } // miêu tả 
        public string ? Location { get; set; }
        public string Status { get; set; } = "Open";
        public DateTime Time { get; set; }
        public int ? MaxParticipants { get; set; } // giới hạn tham gia
    }
}
