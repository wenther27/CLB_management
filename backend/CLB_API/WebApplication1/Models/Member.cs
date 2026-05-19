using ClubManagement.API.Models;
using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
public class Member
{
    [Key]
    public int MemberID { get; set; }
    public int ? UserID { get; set; }

    [MaxLength(30)]
    public string? StudentCode { get; set; }

    [Required]
    [MaxLength (100)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength (100)]
    public string ? ClassName { get; set; }

    [MaxLength(100)]
     public string ? Faculty {  get; set; }

    [MaxLength(100)]
    public string ? Position { get; set; }

    [MaxLength(100)]
    public string? Status { get; set; } 
    
    public DateTime JoinDate { get; set; } = DateTime.Now;
    public DateTime? BirthDate { get; set; }

    [MaxLength(100)]
    public string? Department { get; set; }

    public int DisplayOrder { get; set; } = 0;

    [MaxLength(200)]
    public string? ContactEmail { get; set; }

    [MaxLength(500)]
    public string? AvatarUrl { get; set; }

    [ForeignKey ("UserID")]
    public User ? User {  get; set; }
    public ICollection <Registrations> ?  Registrations { get; set; }


}
