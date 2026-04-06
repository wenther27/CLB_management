using ClubManagement.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClubManagement.API.Controllers
{
    [ApiController]
    [Route("api/upload")]
    [Authorize]
    [ApiExplorerSettings(IgnoreApi = true)]
    public class UploadController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        // Chỉ cho phép các định dạng ảnh hợp lệ
        private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp", ".gif"  };
        private const long MaxFileSize = 5 * 1024 * 1024; // 5MB

        public UploadController(IWebHostEnvironment env)
        {
            _env = env;
        }

        // ────────────────────────────────────────────────────────────────────
        // POST /api/upload/image
        // Upload một ảnh, trả về URL để dùng khi tạo hoạt động
        // ────────────────────────────────────────────────────────────────────
        [HttpPost("image")]
        public async Task<IActionResult> UploadImage ([FromForm]IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(ApiResponse<string>.Fail("Vui lòng chọn file ảnh"));

            // Kiểm tra kích thước
            if (file.Length > MaxFileSize)
                return BadRequest(ApiResponse<string>.Fail("File quá lớn, tối đa 5MB"));

            // Kiểm tra định dạng
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                return BadRequest(ApiResponse<string>.Fail("Chỉ chấp nhận ảnh .jpg, .jpeg, .png, .webp, .gif"));

            // Tạo thư mục nếu chưa có
            var uploadFolder = Path.Combine(_env.WebRootPath, "uploads", "activities");
            if (!Directory.Exists(uploadFolder))
                Directory.CreateDirectory(uploadFolder);

            // Đặt tên file độc nhất để tránh trùng
            var fileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadFolder, fileName);

            // Lưu file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Trả về URL tương đối (frontend dùng để hiển thị và gửi lên khi tạo activity)
            var url = $"/uploads/activities/{fileName}";
            return Ok(ApiResponse<string>.Ok(url, "Upload ảnh thành công"));
        }

        // ────────────────────────────────────────────────────────────────────
        // POST /api/upload/images
        // Upload nhiều ảnh cùng lúc (tối đa 5 ảnh)
        // ────────────────────────────────────────────────────────────────────
        [HttpPost("images")]
        public async Task<IActionResult> UploadImages(List<IFormFile> files)
        {
            if (files == null || !files.Any())
                return BadRequest(ApiResponse<string>.Fail("Vui lòng chọn ít nhất một ảnh"));

            if (files.Count > 5)
                return BadRequest(ApiResponse<string>.Fail("Tối đa 5 ảnh mỗi lần upload"));

            var uploadFolder = Path.Combine(_env.WebRootPath, "uploads", "activities");
            if (!Directory.Exists(uploadFolder))
                Directory.CreateDirectory(uploadFolder);

            var urls = new List<string>();

            foreach (var file in files)
            {
                if (file.Length == 0) continue;

                if (file.Length > MaxFileSize)
                    return BadRequest(ApiResponse<string>.Fail($"File '{file.FileName}' quá lớn, tối đa 5MB"));

                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!AllowedExtensions.Contains(ext))
                    return BadRequest(ApiResponse<string>.Fail($"File '{file.FileName}' không hợp lệ"));

                var fileName = $"{Guid.NewGuid()}{ext}";
                var filePath = Path.Combine(uploadFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                urls.Add($"/uploads/activities/{fileName}");
            }

            return Ok(ApiResponse<List<string>>.Ok(urls, $"Upload {urls.Count} ảnh thành công"));
        }
    }
}