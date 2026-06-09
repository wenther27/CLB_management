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
        public DbSet<PostLike> PostLikes { get; set; }
        public DbSet<FundTransaction> FundTransactions { get; set; }
        public DbSet<ActivityBudget> ActivityBudgets { get; set; }
        public DbSet<FundCollectionPeriod> FundCollectionPeriods { get; set; }
        public DbSet<FundContribution> FundContributions { get; set; }
        public DbSet<SepayWebhookEvent> SepayWebhookEvents { get; set; }
        public DbSet<MemberApplication> MemberApplications { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

     
            modelBuilder.Entity<Registrations>()
                .HasIndex(r => new { r.MemberID, r.ActivityID })
                .IsUnique();

            modelBuilder.Entity<PostLike>()
                .HasIndex(l => new { l.PostID, l.UserID })
                .IsUnique();

            modelBuilder.Entity<ActivityBudget>()
                .HasIndex(b => b.ActivityID)
                .IsUnique();

            modelBuilder.Entity<ActivityBudget>()
                .HasOne(b => b.CreatedByUser)
                .WithMany()
                .HasForeignKey(b => b.CreatedByUserID)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<FundTransaction>()
                .HasOne(t => t.CreatedByUser)
                .WithMany()
                .HasForeignKey(t => t.CreatedByUserID)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<FundTransaction>()
                .HasOne(t => t.ApprovedByUser)
                .WithMany()
                .HasForeignKey(t => t.ApprovedByUserID)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<FundTransaction>()
                .Property(t => t.Amount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<ActivityBudget>()
                .Property(b => b.PlannedAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<FundCollectionPeriod>()
                .HasIndex(p => new { p.Year, p.Month });

            modelBuilder.Entity<FundCollectionPeriod>()
                .Property(p => p.Amount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<FundCollectionPeriod>()
                .HasOne(p => p.CreatedByUser)
                .WithMany()
                .HasForeignKey(p => p.CreatedByUserID)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<FundCollectionPeriod>()
                .HasOne(p => p.Activity)
                .WithMany()
                .HasForeignKey(p => p.ActivityID)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<FundContribution>()
                .HasIndex(c => new { c.FundCollectionPeriodID, c.MemberID })
                .IsUnique();

            modelBuilder.Entity<FundContribution>()
                .HasIndex(c => c.PaymentCode)
                .IsUnique();

            modelBuilder.Entity<FundContribution>()
                .HasIndex(c => c.SepayTransactionID)
                .IsUnique()
                .HasFilter("[SepayTransactionID] IS NOT NULL");

            modelBuilder.Entity<FundContribution>()
                .Property(c => c.ExpectedAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<FundContribution>()
                .HasOne(c => c.Member)
                .WithMany()
                .HasForeignKey(c => c.MemberID)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<FundContribution>()
                .HasOne(c => c.FundTransaction)
                .WithMany()
                .HasForeignKey(c => c.FundTransactionID)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<SepayWebhookEvent>()
                .HasIndex(e => e.SepayTransactionID)
                .IsUnique();

            modelBuilder.Entity<SepayWebhookEvent>()
                .Property(e => e.TransferAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<SepayWebhookEvent>()
                .HasOne(e => e.FundContribution)
                .WithMany()
                .HasForeignKey(e => e.FundContributionID)
                .OnDelete(DeleteBehavior.NoAction);


            modelBuilder.Entity<MemberApplication>()
                .HasIndex(a => a.StudentCode);

            modelBuilder.Entity<MemberApplication>()
                .HasIndex(a => a.ContactEmail);

            modelBuilder.Entity<MemberApplication>()
                .HasOne(a => a.ReviewedByUser)
                .WithMany()
                .HasForeignKey(a => a.ReviewedByUserID)
                .OnDelete(DeleteBehavior.NoAction);
            modelBuilder.Entity<Role>().HasData(
                new Role { RoleID = 1, RoleName = "Admin", Description = "Quảnn trị viênn hệ thống" },
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

