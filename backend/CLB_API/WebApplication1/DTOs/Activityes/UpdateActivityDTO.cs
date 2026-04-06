namespace ClubManagement.API.DTOs
{
    public class UpdateActivityDTO

    {
        public string ?  ActivityName { get; set; } 
        public string ? Description { get; set; } // mô tả
        public string ? Location { get; set; } // vị trí
        public string ? Status { get; set; } // trạng thái
        public DateTime ? Time {  get; set; }
        public int ? MaxParticipans { get; set; } // giới hạn 

    }
}
