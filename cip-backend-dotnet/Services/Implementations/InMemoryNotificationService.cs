using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CipBackend.Models;
using CipBackend.Services.Interfaces;

namespace CipBackend.Services.Implementations;

public class InMemoryNotificationService : INotificationService
{
    private readonly ConcurrentDictionary<string, Notification> _notifications = new();

    public InMemoryNotificationService()
    {
        SeedDefaults();
    }

    private void SeedDefaults()
    {
        var defaults = new[]
        {
            new Notification
            {
                Id = "notif-seed-1",
                RecipientEmail = "harsh.rana@maqsoftware.com",
                SubmissionId = "seed-submission-1",
                ArtifactId = "semantic-sql-optimizer",
                ArtifactName = "semantic-sql-optimizer",
                ArtifactVersion = "1.2.0",
                Type = NotificationType.ReviewApproved,
                Title = "Artifact Certified",
                Message = "Your artifact 'semantic-sql-optimizer' has been verified and certified for enterprise production.",
                CreatedAt = DateTime.UtcNow.AddHours(-2),
                ReadAt = null
            },
            new Notification
            {
                Id = "notif-seed-2",
                RecipientEmail = "harsh.rana@maqsoftware.com",
                SubmissionId = "seed-submission-2",
                ArtifactId = "api-test-generator",
                ArtifactName = "api-test-generator",
                ArtifactVersion = "2.1.0",
                Type = NotificationType.ReviewApproved,
                Title = "api-test-generator Approved",
                Message = "Your artifact 'api-test-generator' v2.1.0 has been approved by reviewer.",
                CreatedAt = DateTime.UtcNow.AddHours(-5),
                ReadAt = null
            },
            new Notification
            {
                Id = "notif-seed-3",
                RecipientEmail = "harsh.rana@maqsoftware.com",
                SubmissionId = "seed-submission-3",
                ArtifactId = "bounty-accessibility-fix",
                ArtifactName = "bounty-accessibility-fix",
                ArtifactVersion = "1.0.0",
                Type = NotificationType.ReviewCompleted,
                Title = "Bounty Claimed",
                Message = "You claimed bounty 'Build Accessibility Audit Agent' (250 Reward Credits).",
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                ReadAt = null
            },
            new Notification
            {
                Id = "notif-seed-4",
                RecipientEmail = "harsh.rana@maqsoftware.com",
                SubmissionId = "seed-submission-4",
                ArtifactId = "review-and-refactor",
                ArtifactName = "review-and-refactor",
                ArtifactVersion = "1.1.0",
                Type = NotificationType.FeedbackAdded,
                Title = "Review Feedback",
                Message = "reviewer@company.com added feedback: 'LGTM! Verified Clean Architecture compliance.'",
                CreatedAt = DateTime.UtcNow.AddHours(-8),
                ReadAt = DateTime.UtcNow.AddHours(-7)
            },
            new Notification
            {
                Id = "notif-seed-5",
                RecipientEmail = "harsh.rana@maqsoftware.com",
                SubmissionId = "seed-submission-5",
                ArtifactId = "design-reviewer",
                ArtifactName = "design-reviewer",
                ArtifactVersion = "1.1.0",
                Type = NotificationType.AccessApproved,
                Title = "Reviewer Role Granted",
                Message = "Your request for REVIEWER role has been approved by admin.",
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                ReadAt = DateTime.UtcNow.AddHours(-20)
            },
            new Notification
            {
                Id = "notif-seed-6",
                RecipientEmail = "harsh.rana@maqsoftware.com",
                SubmissionId = "seed-submission-6",
                ArtifactId = "time-mcp",
                ArtifactName = "time-mcp",
                ArtifactVersion = "1.0.0",
                Type = NotificationType.ReviewAssigned,
                Title = "New Review Assigned",
                Message = "New review assigned for 'time-mcp' v1.0.0. SLA: 24 hours.",
                CreatedAt = DateTime.UtcNow.AddHours(-3),
                ReadAt = null
            },
            new Notification
            {
                Id = "notif-seed-7",
                RecipientEmail = "harsh.rana@maqsoftware.com",
                SubmissionId = "seed-submission-7",
                ArtifactId = "security-scan",
                ArtifactName = "security-scan",
                ArtifactVersion = "1.0.0",
                Type = NotificationType.ReviewApproved,
                Title = "security-scan Approved",
                Message = "Artifact 'security-scan' passed token security scan with 0 secrets found.",
                CreatedAt = DateTime.UtcNow.AddDays(-2),
                ReadAt = null
            }
        };

        foreach (var n in defaults)
        {
            _notifications.TryAdd(n.Id, n);
        }
    }

    public Task<Notification> CreateNotificationAsync(Notification notification)
    {
        if (string.IsNullOrWhiteSpace(notification.Id))
        {
            notification.Id = Guid.NewGuid().ToString();
        }

        if (notification.CreatedAt == default)
        {
            notification.CreatedAt = DateTime.UtcNow;
        }

        _notifications[notification.Id] = notification;
        return Task.FromResult(notification);
    }

    public Task<IEnumerable<Notification>> GetUserNotificationsAsync(string recipientEmail, bool unreadOnly = false)
    {
        var norm = (recipientEmail ?? "").Trim().ToLowerInvariant();
        var query = _notifications.Values
            .Where(n => (n.RecipientEmail ?? "").Trim().ToLowerInvariant() == norm);

        if (unreadOnly)
        {
            query = query.Where(n => n.ReadAt == null);
        }

        var results = query.OrderByDescending(n => n.CreatedAt).ToList();
        return Task.FromResult<IEnumerable<Notification>>(results);
    }

    public Task<bool> MarkAsReadAsync(string notificationId, string recipientEmail)
    {
        var norm = (recipientEmail ?? "").Trim().ToLowerInvariant();
        if (_notifications.TryGetValue(notificationId, out var notif))
        {
            if ((notif.RecipientEmail ?? "").Trim().ToLowerInvariant() == norm)
            {
                notif.ReadAt = DateTime.UtcNow;
                return Task.FromResult(true);
            }
        }
        return Task.FromResult(false);
    }

    public Task<Notification?> GetNotificationAsync(string notificationId, string recipientEmail)
    {
        var norm = (recipientEmail ?? "").Trim().ToLowerInvariant();
        if (_notifications.TryGetValue(notificationId, out var notif))
        {
            if ((notif.RecipientEmail ?? "").Trim().ToLowerInvariant() == norm)
            {
                return Task.FromResult<Notification?>(notif);
            }
        }
        return Task.FromResult<Notification?>(null);
    }

    public Task<bool> DeleteNotificationAsync(string notificationId, string recipientEmail)
    {
        var norm = (recipientEmail ?? "").Trim().ToLowerInvariant();
        if (_notifications.TryGetValue(notificationId, out var notif))
        {
            if ((notif.RecipientEmail ?? "").Trim().ToLowerInvariant() == norm)
            {
                return Task.FromResult(_notifications.TryRemove(notificationId, out _));
            }
        }
        return Task.FromResult(false);
    }

    public Task<int> ClearNotificationsAsync(string recipientEmail)
    {
        var norm = (recipientEmail ?? "").Trim().ToLowerInvariant();
        var toDelete = _notifications.Values
            .Where(n => (n.RecipientEmail ?? "").Trim().ToLowerInvariant() == norm)
            .Select(n => n.Id)
            .ToList();

        var count = 0;
        foreach (var id in toDelete)
        {
            if (_notifications.TryRemove(id, out _))
            {
                count++;
            }
        }
        return Task.FromResult(count);
    }
}
