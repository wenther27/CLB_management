using ClubManagement.API.DTOs;
using ClubManagement.API.DTOs.Activityes;
using ClubManagement.API.DTOs.Common;
using ClubManagement.API.DTOs.Posts;
using ClubManagement.API.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ClubManagement.API.Controllers
{
    [ApiController]
    [Route("api/posts")]
    public class PostController : ControllerBase
    {
        private readonly IPostService _postService;

        public PostController(IPostService postService)
        {
            _postService = postService;
        }

        private int GetUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        private string GetUserRole() =>
            User.FindFirstValue(ClaimTypes.Role) ?? "Member";

        // GET /api/posts — ai cũng xem, filter theo category/status/keyword
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll([FromQuery] PostQueryDTO query)
        {
            var result = await _postService.GetAllAsync(query);
            return Ok(ApiResponse<PagedResultDTO<PostDTO>>.Ok(result, "Lấy danh sách bài viết thành công"));
        }

        // GET /api/posts/{id}
        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _postService.GetByIdAsync(id);
            if (result == null)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy bài viết"));
            return Ok(ApiResponse<PostDTO>.Ok(result, "Lấy bài viết thành công"));
        }

        // POST /api/posts — Admin/ExecutiveBoard tạo bài viết
        [HttpPost]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> Create([FromBody] CreatePostDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<string>.Fail("Dữ liệu không hợp lệ"));

            var result = await _postService.CreateAsync(dto, GetUserId());
            if (result == null)
                return BadRequest(ApiResponse<string>.Fail("Tạo bài viết thất bại"));

            return CreatedAtAction(nameof(GetById), new { id = result.PostID },
                ApiResponse<PostDTO>.Ok(result, "Tạo bài viết thành công"));
        }

        // PUT /api/posts/{id} — Admin/tác giả chỉnh sửa
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdatePostDTO dto)
        {
            var result = await _postService.UpdateAsync(id, dto, GetUserId(), GetUserRole());
            if (result == null)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy bài viết hoặc không có quyền"));
            return Ok(ApiResponse<PostDTO>.Ok(result, "Cập nhật bài viết thành công"));
        }

        // PATCH /api/posts/{id}/publish — Publish bài nháp
        [HttpPatch("{id:int}/publish")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> Publish(int id)
        {
            var success = await _postService.PublishAsync(id, GetUserId(), GetUserRole());
            if (!success)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy bài viết hoặc không có quyền"));
            return Ok(ApiResponse<string>.Ok("Published", "Đăng bài viết thành công"));
        }

        // PATCH /api/posts/{id}/unpublish — Ẩn bài viết
        [HttpPatch("{id:int}/unpublish")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> Unpublish(int id)
        {
            var success = await _postService.UnpublishAsync(id, GetUserId(), GetUserRole());
            if (!success)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy bài viết hoặc không có quyền"));
            return Ok(ApiResponse<string>.Ok("Unpublished", "Đã ẩn bài viết"));
        }

        // DELETE /api/posts/{id}
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _postService.DeleteAsync(id, GetUserId(), GetUserRole());
            if (!success)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy bài viết hoặc không có quyền"));
            return Ok(ApiResponse<string>.Ok("Deleted", "Xóa bài viết thành công"));
        }

        // GET /api/posts/my-posts — Tác giả xem bài của mình
        [HttpGet("my-posts")]
        [Authorize(Roles = "Admin,ExecutiveBoard")]
        public async Task<IActionResult> GetMyPosts([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _postService.GetMyPostsAsync(GetUserId(), page, pageSize);
            return Ok(ApiResponse<PagedResultDTO<PostDTO>>.Ok(result, "Lấy danh sách bài viết của tôi thành công"));
        }

        // GET /api/posts/stats — Thống kê bài viết (Admin)
        [HttpGet("stats")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetStats()
        {
            var stats = await _postService.GetStatsAsync();
            return Ok(ApiResponse<PostStatsDTO>.Ok(stats, "Lấy thống kê thành công"));
        }

        // POST /api/posts/{id}/view — Tăng lượt xem
        [HttpPost("{id:int}/view")]
        [AllowAnonymous]
        public async Task<IActionResult> IncrementView(int id)
        {
            await _postService.IncrementViewAsync(id);
            return Ok(ApiResponse<string>.Ok("OK", "OK"));
        }
    }
}