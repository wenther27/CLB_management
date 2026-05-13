namespace ClubManagement.API.DTOs
{
    public class RegistrationDTO
    {
        public int RegistrationID { get; set; }
        public int MemberID { get; set; }
        public int ActivityID { get; set; }
        public string ? MemberName { get; set; }
        public string ? ActivityName { get; set; }
        public DateTime RegisterDate { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
