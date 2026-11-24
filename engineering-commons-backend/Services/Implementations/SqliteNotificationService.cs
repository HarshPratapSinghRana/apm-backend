using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using EngineeringCommons.Backend.Data;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Services.Implementations;

public class SqliteNotificationService : INotificationService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SqliteNotificationService> _logger;

    public SqliteNotificationService(IServiceScopeFactory scopeFactory, ILogger<SqliteNotificationService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task<Notification> CreateNotificationAsync(Notification notification)
    {
        if (notification == null) throw new ArgumentNullException(nameof(notification));

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EngineeringCommonsDbContext>();

        var normalizedEmail = notification.RecipientEmail.Trim().ToLower();

        // 1. Duplicate prevention via ReferenceId
        if (!string.IsNullOrWhiteSpace(notification.ReferenceId))
        {
            var existingRef = await db.Notifications.FirstOrDefaultAsync(n =>
                n.RecipientEmail.ToLower() == normalizedEmail &&
                n.ReferenceId == notification.ReferenceId);

            if (existingRef != null)
            {
                _logger.LogInformation("Skipped duplicate notification by ReferenceId '{ReferenceId}' for {Recipient}",
                    notification.ReferenceId, notification.RecipientEmail);
                return existingRef;
            }
        }
        else
        {
            // 2. Fallback de-duplication: Same Recipient, Submission, Type, and Message within last 60s
            var recentThreshold = DateTime.UtcNow.AddMinutes(-1);
            var existingDuplicate = await db.Notifications.FirstOrDefaultAsync(n =>
                n.RecipientEmail.ToLower() == normalizedEmail &&
                n.SubmissionId == notification.SubmissionId &&
                n.Type == notification.Type &&
                n.Message == notification.Message &&
                n.CreatedAt >= recentThreshold);

            if (existingDuplicate != null)
            {
                _logger.LogInformation("Skipped duplicate unread notification for {Recipient} (Submission: {SubmissionId}, Type: {Type})",
                    notification.RecipientEmail, notification.SubmissionId, notification.Type);
                return existingDuplicate;
            }
        }

        if (string.IsNullOrEmpty(notification.Id))
        {
            notification.Id = Guid.NewGuid().ToString();
        }
        if (notification.CreatedAt == default)
        {
            notification.CreatedAt = DateTime.UtcNow;
        }

        await db.Notifications.AddAsync(notification);
        await db.SaveChangesAsync();

        _logger.LogInformation("Created notification: Id={Id}, Type={Type}, Recipient={Recipient}, Artifact={Artifact}",
            notification.Id, notification.Type, notification.RecipientEmail, notification.ArtifactName);

        return notification;
    }

    public async Task<IEnumerable<Notification>> GetUserNotificationsAsync(string recipientEmail, bool unreadOnly = false)
    {
        if (string.IsNullOrWhiteSpace(recipientEmail)) return Enumerable.Empty<Notification>();

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EngineeringCommonsDbContext>();

        var normalizedEmail = recipientEmail.Trim().ToLower();
        IQueryable<Notification> query = db.Notifications.AsNoTracking()
            .Where(n => n.RecipientEmail.ToLower() == normalizedEmail);

        if (unreadOnly)
        {
            query = query.Where(n => n.ReadAt == null);
        }

        return await query.OrderByDescending(n => n.CreatedAt).Take(50).ToListAsync();
    }

    public async Task<bool> MarkAsReadAsync(string notificationId, string recipientEmail)
    {
        if (string.IsNullOrWhiteSpace(notificationId) || string.IsNullOrWhiteSpace(recipientEmail)) return false;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EngineeringCommonsDbContext>();

        var normalizedEmail = recipientEmail.Trim().ToLower();
        var notif = await db.Notifications.FirstOrDefaultAsync(n => n.Id == notificationId && n.RecipientEmail.ToLower() == normalizedEmail);

        if (notif == null) return false;

        notif.ReadAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        _logger.LogInformation("Marked notification as read: Id={Id}, Recipient={Recipient}", notificationId, recipientEmail);
        return true;
    }

    public async Task<Notification?> GetNotificationAsync(string notificationId, string recipientEmail)
    {
        if (string.IsNullOrWhiteSpace(notificationId) || string.IsNullOrWhiteSpace(recipientEmail)) return null;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EngineeringCommonsDbContext>();

        var normalizedEmail = recipientEmail.Trim().ToLower();
        return await db.Notifications.AsNoTracking().FirstOrDefaultAsync(n => n.Id == notificationId && n.RecipientEmail.ToLower() == normalizedEmail);
    }

    public async Task<bool> DeleteNotificationAsync(string notificationId, string recipientEmail)
    {
        if (string.IsNullOrWhiteSpace(notificationId) || string.IsNullOrWhiteSpace(recipientEmail)) return false;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EngineeringCommonsDbContext>();

        var normalizedEmail = recipientEmail.Trim().ToLower();
        var notif = await db.Notifications.FirstOrDefaultAsync(n => n.Id == notificationId && n.RecipientEmail.ToLower() == normalizedEmail);

        if (notif == null) return false;

        db.Notifications.Remove(notif);
        await db.SaveChangesAsync();

        _logger.LogInformation("Deleted notification: Id={Id}, Recipient={Recipient}", notificationId, recipientEmail);
        return true;
    }

    public async Task<int> ClearNotificationsAsync(string recipientEmail)
    {
        if (string.IsNullOrWhiteSpace(recipientEmail)) return 0;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EngineeringCommonsDbContext>();

        var normalizedEmail = recipientEmail.Trim().ToLower();
        var list = await db.Notifications.Where(n => n.RecipientEmail.ToLower() == normalizedEmail).ToListAsync();

        if (!list.Any()) return 0;

        db.Notifications.RemoveRange(list);
        await db.SaveChangesAsync();

        _logger.LogInformation("Cleared {Count} notifications for {Recipient}", list.Count, recipientEmail);
        return list.Count;
    }
}
