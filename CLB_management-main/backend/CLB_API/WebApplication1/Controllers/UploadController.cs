using ClubManagement.API.DTOs;
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

        // ── Helper: đảm bảo thư mục tồn tại và trả về webRoot ─────────────────
        private string EnsureWebRoot()
        {
            var webRoot = _env.WebRootPath;
            if (string.IsNullOrEmpty(webRoot))
            {
                webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                if (!Directory.Exists(webRoot))
                    Directory.CreateDirectory(webRoot);
            }
            return webRoot;
        }

        private static string? ValidateFile(IFormFile? file)
        {
            if (file == null || file.Length == 0)
                return "Vui lòng chọn file ảnh";
            if (file.Length > MaxFileSize)
                return "File quá lớn, tối đa 5MB";
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                return "Chỉ chấp nhận ảnh .jpg, .jpeg, .png, .webp, .gif";
            return null; // hợp lệ
        }

        private async Task<string> SaveFileAsync(IFormFile file, string subFolder)
        {
            var webRoot = EnsureWebRoot();
            var folder = Path.Combine(webRoot, "uploads", subFolder);
            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var fileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(folder, fileName);

            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            return $"/uploads/{subFolder}/{fileName}";
        }

        // ── POST /api/upload/image ─────────────────────────────────────────────
        // Upload ảnh thông thường (activity, post, v.v.)
        // Requires: Admin hoặc ExecutiveBoard
        [HttpPost("image")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        [ApiExplorerSettings(IgnoreApi = true)]
        public async Task<IActionResult> UploadImage([FromForm] IFormFile file)
        {
            try
            {
                var err = ValidateFile(file);
                if (err != null) return BadRequest(ApiResponse<string>.Fail(err));

                var url = await SaveFileAsync(file, "activities");
                return Ok(new { success = true, data = url, message = "Upload ảnh thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<string>.Fail($"Lỗi server: {ex.Message}"));
            }
        }

        // ── POST /api/upload/avatar ────────────────────────────────────────────
        // Upload ảnh đại diện: nhận 2 file (thumbnail + original)
        // Trả về 2 URL riêng biệt.
        //
        // Form fields:
        //   - thumbnail  : Blob JPG đã crop (vòng tròn 220×220px)
        //   - original   : File ảnh gốc (hình chữ nhật, chưa crop) — optional
        //
        // Response: { avatarUrl, originalAvatarUrl }
        [HttpPost("avatar")]
        [Authorize]   // Mọi role đã đăng nhập đều được upload avatar của mình
        public async Task<IActionResult> UploadAvatar(
            [FromForm] IFormFile thumbnail,
            [FromForm] IFormFile? original = null)
        {
            try
            {
                // --- Validate thumbnail (bắt buộc) ---
                var errThumb = ValidateFile(thumbnail);
                if (errThumb != null)
                    return BadRequest(ApiResponse<string>.Fail($"Thumbnail: {errThumb}"));

                // --- Validate original (không bắt buộc) ---
                if (original != null && original.Length > 0)
                {
                    var errOrig = ValidateFile(original);
                    if (errOrig != null)
                        return BadRequest(ApiResponse<string>.Fail($"Original: {errOrig}"));
                }

                // --- Lưu thumbnail vào /uploads/avatars/thumbs/ ---
                var avatarUrl = await SaveFileAsync(thumbnail, "avatars/thumbs");

                // --- Lưu original vào /uploads/avatars/originals/ (nếu có) ---
                string? originalAvatarUrl = null;
                if (original != null && original.Length > 0)
                    originalAvatarUrl = await SaveFileAsync(original, "avatars/originals");

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        avatarUrl,
                        originalAvatarUrl
                    },
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