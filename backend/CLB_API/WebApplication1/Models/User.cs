using ClubManagement.API.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics;
public class User
{
    [Key]
    public int UserID { get; set; }

    [Required]
    public int RoleID { get; set; }

    [Required]
    [MaxLength(100)]
    public  string Username { get; set; } = string.Empty;

    [Required]
    [MaxLength (100)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string PasswordHash { get; set; } = string.Empty;
    [MaxLength(15)]

    public string ? Phone {  get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt {  get; set; } = DateTime.Now;
    public DateTime? UpdatedAt { get; set; }
    [ForeignKey("RoleID")]
    public Role? Role { get; set; }
    public Member? Member { get; set; }
    public ICollection <ClubActivity> ? CreatedActivities { get; set; }
    public ICollection <Post> ? Posts { get; set; }

    public ICollection <Notification> ? Notifications { get; set; }

    public ICollection <AuditLog> ? AuditLogs { get; set; }
    public DateTime CreatedDate { get; internal set; }

    [MaxLength(500)]
    public string? AvatarUrl { get; set; }
}
