namespace ClubManagement.API.DTOs
{
    public class UpdateActivityDTO

    {
        public string ?  ActivityName { get; set; } 
        public string ? Description { get; set; } // mô tả
        public string ? Location { get; set; } // vị trí
        public string ? Status { get; set; } // trạng thái
        public DateTime ? Time {  get; set; }
        public DateTime ? RegistrationOpenDate { get; set; }
        public DateTime ? RegistrationDeadLine { get; set; }
        public int ? MaxParticipants { get; set; } // giới hạn 
        public List<string>? ImageUrls { get; set; }
    }
}
