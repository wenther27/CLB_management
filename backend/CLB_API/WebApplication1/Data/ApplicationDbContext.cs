using ClubManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace ClubManagement.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<Role> Roles { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Member> Members { get; set; }
        public DbSet<ClubActivity> Activities { get; set; }
        public DbSet<Registrations> Registrations { get; set; }
        public DbSet<Post> Posts { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<ActivityImage> ActivityImages { get; set; }
        public DbSet<PostImage> PostImages { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

     
            modelBuilder.Entity<Registrations>()
                .HasIndex(r => new { r.MemberID, r.ActivityID })
                .IsUnique();

  
            modelBuilder.Entity<Role>().HasData(
                new Role { RoleID = 1, RoleName = "Admin", Description = "Quản trị viên hệ thống" },
                new Role { RoleID = 2, RoleName = "ExecutiveBoard", Description = "Ban chủ nhiệm" },
                new Role { RoleID = 3, RoleName = "Member", Description = "Thành viên" },
                new Role { RoleID = 4, RoleName = "Guest", Description = "Khách" }
            );
            modelBuilder.Entity<ExecutiveBoard>(entity =>
            {
                entity.HasKey(e => e.BoardID); // Giả sử có khóa chính

                entity.HasOne(e => e.user)
                      .WithMany()
                      .HasForeignKey(e => e.userID)
                      .OnDelete(DeleteBehavior.NoAction); // KHÔNG DÙNG CASCADE
            });



        }
    }
}