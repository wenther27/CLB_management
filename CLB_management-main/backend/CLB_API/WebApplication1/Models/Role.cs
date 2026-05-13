using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
public class Role
{
    [Key]
    public int RoleID {  get; set; }

    [Required]
    [MaxLength(50)] 
    public string RoleName { get; set; }

    [MaxLength(255)]
    public string Description { get; set; }
    
    public ICollection<User> ? Users { get; set; } = new List<User>();
}