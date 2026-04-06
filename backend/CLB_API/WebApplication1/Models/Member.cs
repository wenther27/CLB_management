using ClubManagement.API.Models;
using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
public class Member
{
    [Key]
    public int MemberID { get; set; }
    public int ? UserID { get; set; }

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

    [ForeignKey ("UserID")]
    public User ? User {  get; set; }


    public ICollection <Registrations> ?  Registrations { get; set; }


}