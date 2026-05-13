namespace ClubManagement.API.DTOs
{
    public class CreateNotificationDTO
    {
        public string Message { get; set; } = string.Empty;
        public int ? ReceiverID { get; set; } // mã người nhận 

    }
}
