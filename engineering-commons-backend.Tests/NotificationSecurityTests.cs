#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using EngineeringCommons.Backend.Data;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Implementations;

namespace EngineeringCommons.Backend.Tests;

public class NotificationSecurityTests
{
    private ServiceProvider CreateServiceProvider(string dbName)
    {
        var services = new ServiceCollection();
        services.AddDbContext<EngineeringCommonsDbContext>(options =>
            options.UseInMemoryDatabase(dbName));

        return services.BuildServiceProvider();
    }

    [Fact]
    public async Task User_CanOnlyRetrieve_TheirOwnNotifications()
    {
        // 24 & 33. User can only retrieve their own notifications
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteNotificationService(scopeFactory, NullLogger<SqliteNotificationService>.Instance);

        await service.CreateNotificationAsync(new Notification
        {
            RecipientEmail = "userA@company.com",
            SubmissionId = "sub-1",
            ArtifactId = "design-reviewer",
            ArtifactName = "design-reviewer",
            Type = NotificationType.ReviewAssigned,
            Title = "Title A",
            Message = "Message for User A"
        });

        await service.CreateNotificationAsync(new Notification
        {
            RecipientEmail = "userB@company.com",
            SubmissionId = "sub-2",
            ArtifactId = "sql-agent",
            ArtifactName = "sql-agent",
            Type = NotificationType.ReviewApproved,
            Title = "Title B",
            Message = "Message for User B"
        });

        var notifsA = await service.GetUserNotificationsAsync("userA@company.com");
        var notifsB = await service.GetUserNotificationsAsync("userB@company.com");

        Assert.Single(notifsA);
        Assert.Equal("userA@company.com", notifsA.First().RecipientEmail);
        Assert.Equal("Message for User A", notifsA.First().Message);

        Assert.Single(notifsB);
        Assert.Equal("userB@company.com", notifsB.First().RecipientEmail);
        Assert.Equal("Message for User B", notifsB.First().Message);
    }

    [Fact]
    public async Task User_CannotMark_AnotherUsersNotification_AsRead()
    {
        // 25. User cannot mark another user's notification as read
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteNotificationService(scopeFactory, NullLogger<SqliteNotificationService>.Instance);

        var notifA = await service.CreateNotificationAsync(new Notification
        {
            RecipientEmail = "userA@company.com",
            SubmissionId = "sub-1",
            ArtifactId = "design-reviewer",
            ArtifactName = "design-reviewer",
            Type = NotificationType.ReviewAssigned,
            Title = "Title A",
            Message = "Message for User A"
        });

        Assert.NotNull(notifA);

        // User B attempts to mark User A's notification as read
        var success = await service.MarkAsReadAsync(notifA.Id, "userB@company.com");
        Assert.False(success);

        // Verify User A's notification is still unread
        var notifsA = await service.GetUserNotificationsAsync("userA@company.com", unreadOnly: true);
        Assert.Single(notifsA);
        Assert.False(notifsA.First().IsRead);

        // User A marks their own notification
        var ownSuccess = await service.MarkAsReadAsync(notifA.Id, "userA@company.com");
        Assert.True(ownSuccess);

        var remainingUnread = await service.GetUserNotificationsAsync("userA@company.com", unreadOnly: true);
        Assert.Empty(remainingUnread);
    }

    [Fact]
    public async Task DuplicateNotifications_WithinThreshold_AreDeduplicated()
    {
        // 34. Duplicate events do not create duplicate notifications
        var sp = CreateServiceProvider(Guid.NewGuid().ToString());
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
        var service = new SqliteNotificationService(scopeFactory, NullLogger<SqliteNotificationService>.Instance);

        var first = await service.CreateNotificationAsync(new Notification
        {
            RecipientEmail = "reviewer@company.com",
            SubmissionId = "sub-dup",
            ArtifactId = "design-reviewer",
            ArtifactName = "design-reviewer",
            Type = NotificationType.ReviewAssigned,
            Title = "New Review",
            Message = "Review assigned",
            ReferenceId = "sub-dup:ReviewAssigned:reviewer@company.com"
        });

        var duplicate = await service.CreateNotificationAsync(new Notification
        {
            RecipientEmail = "reviewer@company.com",
            SubmissionId = "sub-dup",
            ArtifactId = "design-reviewer",
            ArtifactName = "design-reviewer",
            Type = NotificationType.ReviewAssigned,
            Title = "New Review",
            Message = "Review assigned",
            ReferenceId = "sub-dup:ReviewAssigned:reviewer@company.com"
        });

        Assert.NotNull(first);
        Assert.NotNull(duplicate);
        Assert.Equal(first.Id, duplicate.Id);

        var notifs = await service.GetUserNotificationsAsync("reviewer@company.com");
        Assert.Single(notifs);
    }
}
