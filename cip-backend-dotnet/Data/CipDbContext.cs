using System;
using Microsoft.EntityFrameworkCore;
using CipBackend.Models;

namespace CipBackend.Data;

public class CipDbContext : DbContext
{
    public CipDbContext(DbContextOptions<CipDbContext> options) : base(options)
    {
    }

    public DbSet<UsageEvent> UsageEvents => Set<UsageEvent>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<ReviewThread> ReviewThreads => Set<ReviewThread>();
    public DbSet<ReviewMessage> ReviewMessages => Set<ReviewMessage>();
    public DbSet<ReviewComment> ReviewComments => Set<ReviewComment>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<ArtifactCertification> ArtifactCertifications => Set<ArtifactCertification>();
    public DbSet<UserAccessRequest> AccessRequests => Set<UserAccessRequest>();
    public DbSet<UserRoleAssignment> UserRoleAssignments => Set<UserRoleAssignment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Usage Events table mapping
        modelBuilder.Entity<UsageEvent>(entity =>
        {
            entity.ToTable("usage_events");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.UserId).HasMaxLength(256).IsRequired();
            entity.Property(e => e.UserEmail).HasMaxLength(256);
            entity.Property(e => e.ArtifactId).HasMaxLength(256);
            entity.Property(e => e.ArtifactName).HasMaxLength(256);
            entity.Property(e => e.ArtifactType).HasMaxLength(64);
            entity.Property(e => e.ArtifactVersion).HasMaxLength(64);
            entity.Property(e => e.EventType).HasMaxLength(64).HasDefaultValue("USE");
            entity.Property(e => e.Action).HasMaxLength(64).HasDefaultValue("USE");
            entity.Property(e => e.Source).HasMaxLength(64).HasDefaultValue("VS_CODE");
            entity.Property(e => e.Platform).HasMaxLength(64).HasDefaultValue("EngineeringCommons");
            entity.Property(e => e.Timestamp).IsRequired();
            entity.Property(e => e.SessionId).HasMaxLength(128);
            entity.Property(e => e.Metadata).HasMaxLength(4096);
            entity.Property(e => e.Workspace).HasMaxLength(1024);

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.ArtifactId);
            entity.HasIndex(e => e.ArtifactName);
            entity.HasIndex(e => e.ArtifactType);
            entity.HasIndex(e => e.EventType);
            entity.HasIndex(e => e.Source);
            entity.HasIndex(e => e.Platform);
            entity.HasIndex(e => e.Timestamp);
            entity.HasIndex(e => e.SessionId);
        });

        // Reviews table mapping
        modelBuilder.Entity<Review>(entity =>
        {
            entity.ToTable("reviews");
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Id).HasMaxLength(64);
            entity.Property(r => r.ArtifactId).HasMaxLength(256).IsRequired();
            entity.Property(r => r.ProducerEmail).HasMaxLength(256).IsRequired();
            entity.Property(r => r.ReviewerEmail).HasMaxLength(256);
            entity.Property(r => r.Feedback).HasMaxLength(4096);
            entity.Property(r => r.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(r => r.SubmittedAt).IsRequired();
            entity.Property(r => r.IsPrivate).HasDefaultValue(false);
            entity.Property(r => r.AllowedContributors).HasMaxLength(4096);
            entity.Property(r => r.AllowedReviewers).HasMaxLength(4096);
            entity.Property(r => r.AllowedConsumers).HasMaxLength(4096);
            entity.Property(r => r.ContentHash).HasMaxLength(128);

            entity.HasIndex(r => r.ArtifactId);
            entity.HasIndex(r => r.Status);
            entity.HasIndex(r => r.ProducerEmail);
            entity.HasIndex(r => r.IsPrivate);
        });

        // Review Threads table mapping
        modelBuilder.Entity<ReviewThread>(entity =>
        {
            entity.ToTable("review_threads");
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Id).HasMaxLength(64);
            entity.Property(t => t.ReviewId).HasMaxLength(64).IsRequired();
            entity.Property(t => t.ArtifactId).HasMaxLength(256).IsRequired();
            entity.Property(t => t.ArtifactName).HasMaxLength(256).IsRequired();
            entity.Property(t => t.Version).HasMaxLength(64).HasDefaultValue("1.0.0");
            entity.Property(t => t.ProducerEmail).HasMaxLength(256).IsRequired();
            entity.Property(t => t.ReviewerEmail).HasMaxLength(256);
            entity.Property(t => t.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(t => t.CreatedAt).IsRequired();
            entity.Property(t => t.UpdatedAt).IsRequired();

            entity.HasIndex(t => t.ReviewId);
            entity.HasIndex(t => t.ArtifactId);
            entity.HasIndex(t => t.ProducerEmail);

            entity.HasMany(t => t.Messages)
                  .WithOne()
                  .HasForeignKey(m => m.ThreadId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Review Messages table mapping
        modelBuilder.Entity<ReviewMessage>(entity =>
        {
            entity.ToTable("review_messages");
            entity.HasKey(m => m.Id);
            entity.Property(m => m.Id).HasMaxLength(64);
            entity.Property(m => m.ThreadId).HasMaxLength(64).IsRequired();
            entity.Property(m => m.AuthorEmail).HasMaxLength(256).IsRequired();
            entity.Property(m => m.AuthorRole).HasMaxLength(64).HasDefaultValue("Producer");
            entity.Property(m => m.Message).HasMaxLength(4096).IsRequired();
            entity.Property(m => m.CreatedAt).IsRequired();

            entity.HasIndex(m => m.ThreadId);
            entity.HasIndex(m => m.AuthorEmail);
        });

        // Notifications table mapping
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("notifications");
            entity.HasKey(n => n.Id);
            entity.Property(n => n.Id).HasMaxLength(64);
            entity.Property(n => n.RecipientEmail).HasMaxLength(256).IsRequired();
            entity.Property(n => n.ThreadId).HasMaxLength(64);
            entity.Property(n => n.SubmissionId).HasMaxLength(64).IsRequired();
            entity.Property(n => n.ArtifactId).HasMaxLength(256).IsRequired();
            entity.Property(n => n.ArtifactName).HasMaxLength(256).IsRequired();
            entity.Property(n => n.ArtifactVersion).HasMaxLength(64).HasDefaultValue("1.0.0");
            entity.Property(n => n.Type).HasConversion<string>().HasMaxLength(32);
            entity.Property(n => n.Title).HasMaxLength(256).IsRequired();
            entity.Property(n => n.Message).HasMaxLength(2048).IsRequired();
            entity.Property(n => n.ReferenceId).HasMaxLength(128);
            entity.Property(n => n.CreatedAt).IsRequired();

            entity.HasIndex(n => n.RecipientEmail);
            entity.HasIndex(n => n.SubmissionId);
            entity.HasIndex(n => n.ThreadId);
            entity.HasIndex(n => n.ReferenceId);
            entity.HasIndex(n => n.CreatedAt);
            entity.HasIndex(n => n.ReadAt);
        });

        // Review Comments table mapping
        modelBuilder.Entity<ReviewComment>(entity =>
        {
            entity.ToTable("review_comments");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasMaxLength(64);
            entity.Property(c => c.SubmissionId).HasMaxLength(64).IsRequired();
            entity.Property(c => c.ThreadId).HasMaxLength(64);
            entity.Property(c => c.ArtifactId).HasMaxLength(256).IsRequired();
            entity.Property(c => c.ArtifactVersion).HasMaxLength(64).HasDefaultValue("1.0.0");
            entity.Property(c => c.FilePath).HasMaxLength(1024).IsRequired();
            entity.Property(c => c.LineType).HasMaxLength(32).HasDefaultValue("Context");
            entity.Property(c => c.AuthorEmail).HasMaxLength(256).IsRequired();
            entity.Property(c => c.AuthorRole).HasMaxLength(64).HasDefaultValue("Reviewer");
            entity.Property(c => c.Comment).HasMaxLength(4096).IsRequired();
            entity.Property(c => c.ParentCommentId).HasMaxLength(64);
            entity.Property(c => c.CreatedAt).IsRequired();

            entity.HasIndex(c => c.SubmissionId);
            entity.HasIndex(c => c.FilePath);
            entity.HasIndex(c => c.ParentCommentId);
            entity.HasIndex(c => c.AuthorEmail);

            entity.HasMany(c => c.Replies)
                  .WithOne()
                  .HasForeignKey(c => c.ParentCommentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Artifact Certifications table mapping
        modelBuilder.Entity<ArtifactCertification>(entity =>
        {
            entity.ToTable("artifact_certifications");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasMaxLength(64);
            entity.Property(c => c.ArtifactId).HasMaxLength(256).IsRequired();
            entity.Property(c => c.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(c => c.CertifiedVersion).HasMaxLength(64).HasDefaultValue("1.0.0");
            entity.Property(c => c.CertifiedByEmail).HasMaxLength(256);
            entity.Property(c => c.RevokedByEmail).HasMaxLength(256);
            entity.Property(c => c.RevocationReason).HasMaxLength(2048);
            entity.Property(c => c.Reason).HasMaxLength(2048);
            entity.Property(c => c.CriteriaJson).HasMaxLength(4096);
            entity.Property(c => c.MetricsJson).HasMaxLength(4096);
            entity.Property(c => c.LastEvaluatedAt).IsRequired();

            entity.HasIndex(c => c.ArtifactId);
            entity.HasIndex(c => c.Status);
        });

        // User Access Requests table mapping
        modelBuilder.Entity<UserAccessRequest>(entity =>
        {
            entity.ToTable("user_access_requests");
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Id).HasMaxLength(64);
            entity.Property(r => r.UserEmail).HasMaxLength(256).IsRequired();
            entity.Property(r => r.RequestedRole).HasMaxLength(64).IsRequired();
            entity.Property(r => r.CurrentRole).HasMaxLength(64).IsRequired();
            entity.Property(r => r.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(r => r.Reason).HasMaxLength(2048);
            entity.Property(r => r.AdminEmail).HasMaxLength(256);
            entity.Property(r => r.AdminNotes).HasMaxLength(2048);
            entity.Property(r => r.RequestedAt).IsRequired();

            entity.HasIndex(r => r.UserEmail);
            entity.HasIndex(r => r.Status);
            entity.HasIndex(r => r.RequestedAt);
        });

        // User Roles table mapping
        modelBuilder.Entity<UserRoleAssignment>(entity =>
        {
            entity.ToTable("user_roles");
            entity.HasKey(a => a.UserEmail);
            entity.Property(a => a.UserEmail).HasMaxLength(256);
            entity.Property(a => a.Role).HasMaxLength(64).IsRequired();
            entity.Property(a => a.IsCertifiedReviewer).HasDefaultValue(false);
            entity.Property(a => a.GrantedBy).HasMaxLength(256);
            entity.Property(a => a.Notes).HasMaxLength(2048);
            entity.Property(a => a.GrantedAt).IsRequired();
            entity.Property(a => a.UpdatedAt).IsRequired();

            entity.HasIndex(a => a.Role);
        });
    }
}
