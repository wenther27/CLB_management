using ClubManagement.API.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClubManagement.API.Controllers
{
    [ApiController]
    [Route("api/upload")]
    public class UploadController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        private const long MaxFileSize = 5 * 1024 * 1024; // 5MB

        public UploadController(IWebHostEnvironment env)
        {
            _env = env;
        }

        private string EnsureWebRoot()
        {
            var webRoot = _env.WebRootPath;
            if (!string.IsNullOrEmpty(webRoot)) return webRoot;

            webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            if (!Directory.Exists(webRoot))
                Directory.CreateDirectory(webRoot);
            return webRoot;
        }

        private static string? ValidateFile(IFormFile? file)
        {
            if (file == null || file.Length == 0)
                return "Vui lòng chọn file ảnh";
            if (file.Length > MaxFileSize)
                return "File quá lớn, tối đa 5MB";

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            return AllowedExtensions.Contains(ext)
                ? null
                : "Chỉ chấp nhận ảnh .jpg, .jpeg, .png, .webp, .gif";
        }

        private async Task<string> SaveFileAsync(IFormFile file, string subFolder)
        {
            var uploadFolder = Path.Combine(EnsureWebRoot(), "uploads", subFolder);
            if (!Directory.Exists(uploadFolder))
                Directory.CreateDirectory(uploadFolder);

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var fileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadFolder, fileName);

            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            return $"/uploads/{subFolder}/{fileName}";
        }

        [HttpPost("image")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        [ApiExplorerSettings(IgnoreApi = true)]
        public async Task<IActionResult> UploadImage([FromForm] IFormFile file)
        {
            try
            {
                Console.WriteLine("=== UPLOAD START ===");
                Console.WriteLine($"File: {file?.FileName}, Size: {file?.Length}");

                var error = ValidateFile(file);
                if (error != null)
                    return BadRequest(ApiResponse<string>.Fail(error));

                var url = await SaveFileAsync(file!, "activities");
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

        [HttpPost("receipt")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> UploadReceipt([FromForm] IFormFile file)
        {
            try
            {
                var error = ValidateFile(file);
                if (error != null)
                    return BadRequest(ApiResponse<string>.Fail(error));

                var url = await SaveFileAsync(file!, "fund-receipts");
                return Ok(new
                {
                    success = true,
                    data = url,
                    message = "Upload minh chứng thành công"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<string>.Fail($"Lỗi server: {ex.Message}"));
            }
        }

        [HttpPost("avatar")]
        [Authorize]
        public async Task<IActionResult> UploadAvatar([FromForm] IFormFile thumbnail)
        {
            try
            {
                var error = ValidateFile(thumbnail);
                if (error != null)
                    return BadRequest(ApiResponse<string>.Fail(error));

                var avatarUrl = await SaveFileAsync(thumbnail, "avatars/thumbs");
                return Ok(new
                {
                    success = true,
                    data = new { avatarUrl },
                    message = "Upload ảnh đại diện thành công"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<string>.Fail($"Lỗi server: {ex.Message}"));
            }
        }
    }
}
