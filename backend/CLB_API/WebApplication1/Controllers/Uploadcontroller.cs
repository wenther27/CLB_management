using ClubManagement.API.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClubManagement.API.Controllers
{
    [ApiController]
    [Route("api/upload")]
    [Authorize(Roles = "Admin,ExecutiveBoard")]
    public class UploadController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        private const long MaxFileSize = 5 * 1024 * 1024; // 5MB

        public UploadController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpPost("image")]
        [ApiExplorerSettings(IgnoreApi = true)]
        public async Task<IActionResult> UploadImage([FromForm] IFormFile file)
        {
            try
            {
                Console.WriteLine("=== UPLOAD START ===");
                Console.WriteLine($"File: {file?.FileName}, Size: {file?.Length}");

                if (file == null || file.Length == 0)
                {
                    return BadRequest(ApiResponse<string>.Fail("Vui lòng chọn file ảnh"));
                }

                if (file.Length > MaxFileSize)
                {
                    return BadRequest(ApiResponse<string>.Fail("File quá lớn, tối đa 5MB"));
                }

                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!AllowedExtensions.Contains(ext))
                {
                    return BadRequest(ApiResponse<string>.Fail("Chỉ chấp nhận ảnh .jpg, .jpeg, .png, .webp, .gif"));
                }

                // Xử lý thư mục wwwroot an toàn
                var webRoot = _env.WebRootPath;
                if (string.IsNullOrEmpty(webRoot))
                {
                    webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                    if (!Directory.Exists(webRoot))
                    {
                        Directory.CreateDirectory(webRoot);
                    }
                }

                var uploadFolder = Path.Combine(webRoot, "uploads", "activities");
                if (!Directory.Exists(uploadFolder))
                {
                    Directory.CreateDirectory(uploadFolder);
                }

                var fileName = $"{Guid.NewGuid()}{ext}";
                var filePath = Path.Combine(uploadFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var url = $"/uploads/activities/{fileName}";
                Console.WriteLine($"Upload success: {url}");

                return Ok(new
                {
                    success = true,
                    data = url,
                    message = "UPload ảnh thành công "
                });

            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR: {ex.Message}");
                Console.WriteLine($"STACK: {ex.StackTrace}");
                return StatusCode(500, ApiResponse<string>.Fail($"Lỗi server: {ex.Message}"));
            }
        }
    }
}