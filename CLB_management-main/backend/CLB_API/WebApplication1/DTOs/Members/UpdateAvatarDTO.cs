namespace ClubManagement.API.DTOs.Members
{
    public class UpdateAvatarDTO
    {
        public string? AvatarUrl { get; set; }

        /// <summary>
        /// URL ảnh gốc chưa crop — nullable, dùng để chỉnh sửa lại sau này
        /// </summary>
        public string? OriginalAvatarUrl { get; set; }
    }
}