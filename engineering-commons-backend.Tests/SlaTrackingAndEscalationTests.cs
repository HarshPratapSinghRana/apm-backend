#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;
using EngineeringCommons.Backend.Events;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Implementations;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Tests;

public class SlaTrackingAndEscalationTests
{
    private class FakeReviewRepository : IReviewRepository
    {
        private readonly Dictionary<string, Review> _store = new();

        public void Add(Review review) => _store[review.Id] = review;
        public Review? Get(string id) => _store.TryGetValue(id, out var r) ? r : null;
        public IEnumerable<Review> List() => _store.Values.ToList();
    }

    private class FakeMarketplaceService : IMarketplaceService
    {
        public Task PublishArtifactAsync(string artifactId, string content) => Task.CompletedTask;
        public Task<IEnumerable<ArtifactDto>> ListArtifactsAsync() => Task.FromResult<IEnumerable<ArtifactDto>>(new List<ArtifactDto>());
        public Task<ArtifactDto?> GetArtifactAsync(string artifactId, string? version = null) => Task.FromResult<ArtifactDto?>(null);
        public Task<IEnumerable<ArtifactVersionDto>> GetArtifactVersionsAsync(string artifactId) => Task.FromResult<IEnumerable<ArtifactVersionDto>>(new List<ArtifactVersionDto>());
        public Task<bool> UpdateVisibilityAsync(string artifactId, bool isPrivate, string userEmail, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null) => Task.FromResult(true);
    }

    private class FakeEventPublisher : IDomainEventPublisher
    {
        public List<ReviewDomainEvent> PublishedEvents { get; } = new();
        public Task PublishAsync<TEvent>(TEvent domainEvent) where TEvent : ReviewDomainEvent
        {
            PublishedEvents.Add(domainEvent);
            return Task.CompletedTask;
        }
    }

    private class FakeNotificationService : INotificationService
    {
        public List<Notification> Notifications { get; } = new();

        public Task<Notification> CreateNotificationAsync(Notification notification)
        {
            if (string.IsNullOrEmpty(notification.Id))
            {
                notification.Id = Guid.NewGuid().ToString();
            }
            notification.CreatedAt = DateTime.UtcNow;
            Notifications.Add(notification);
            return Task.FromResult(notification);
        }

        public Task<Notification?> GetNotificationAsync(string id, string recipientEmail) => Task.FromResult(Notifications.FirstOrDefault(n => n.Id == id && n.RecipientEmail == recipientEmail));
        public Task<IEnumerable<Notification>> GetUserNotificationsAsync(string recipientEmail, bool unreadOnly = false) => Task.FromResult(Notifications.Where(n => n.RecipientEmail == recipientEmail));
        public Task<bool> MarkAsReadAsync(string id, string recipientEmail) => Task.FromResult(true);
        public Task<bool> DeleteNotificationAsync(string notificationId, string recipientEmail) => Task.FromResult(true);
        public Task<int> ClearNotificationsAsync(string recipientEmail) => Task.FromResult(1);
    }

    private readonly FakeReviewRepository _repo;
    private readonly FakeMarketplaceService _marketplace;
    private readonly FakeEventPublisher _publisher;
    private readonly FakeNotificationService _notificationService;
    private readonly ReviewService _service;

    public SlaTrackingAndEscalationTests()
    {
        _repo = new FakeReviewRepository();
        _marketplace = new FakeMarketplaceService();
        _publisher = new FakeEventPublisher();
        _notificationService = new FakeNotificationService();
        _service = new ReviewService(_repo, _marketplace, _publisher, _notificationService);
    }

    [Fact]
    public void SubmitChange_CalculatesDefault24HourSlaDeadline()
    {
        var before = DateTime.UtcNow;
        var review = _service.SubmitChange("test-artifact", "author@company.com", "{\"name\":\"test\"}");
        var after = DateTime.UtcNow;

        Assert.Equal(1440, review.SlaTargetMinutes);
        Assert.NotNull(review.SlaDeadline);
        Assert.True(review.SlaDeadline.Value >= before.AddHours(24) && review.SlaDeadline.Value <= after.AddHours(24));
        Assert.False(review.IsSlaBreached);
        Assert.False(review.IsSlaWarning);
        Assert.Equal("OnTrack", review.SlaStatus);
        Assert.Contains("h", review.SlaRemainingFormatted);
    }

    [Fact]
    public void SubmitChange_WithCustomSla_CalculatesCorrectDeadline()
    {
        var before = DateTime.UtcNow;
        // 48 hours = 2880 mins
        var review = _service.SubmitChange("custom-artifact", "author@company.com", "{\"name\":\"custom\"}", slaTargetMinutes: 2880);
        var after = DateTime.UtcNow;

        Assert.Equal(2880, review.SlaTargetMinutes);
        Assert.NotNull(review.SlaDeadline);
        Assert.True(review.SlaDeadline.Value >= before.AddHours(48) && review.SlaDeadline.Value <= after.AddHours(48));
    }

    [Fact]
    public void Resubmit_ResetsSubmittedAtAndRecalculatesSlaDeadline()
    {
        var oldSubmittedAt = DateTime.UtcNow.AddHours(-10);
        var review = new Review
        {
            Id = "rev-resubmit",
            ArtifactId = "test-pkg",
            ProducerEmail = "author@company.com",
            Status = ReviewStatus.ChangesRequested,
            Content = "{}",
            SubmittedAt = oldSubmittedAt,
            SlaTargetMinutes = 1440,
            SlaDeadline = oldSubmittedAt.AddMinutes(1440),
            LastSlaReminderSentAt = DateTime.UtcNow.AddMinutes(-30)
        };
        _repo.Add(review);

        var updated = _service.Resubmit("rev-resubmit", "author@company.com", "{\"updated\":true}");

        Assert.Equal(ReviewStatus.Resubmitted, updated.Status);
        Assert.True(updated.SubmittedAt > oldSubmittedAt);
        Assert.True(updated.SlaDeadline > oldSubmittedAt.AddMinutes(1440));
        Assert.Null(updated.LastSlaReminderSentAt);
    }

    [Fact]
    public void UpdateSlaTarget_UpdatesTargetAndRecalculatesDeadline()
    {
        var submittedAt = DateTime.UtcNow.AddHours(-2);
        var review = new Review
        {
            Id = "rev-sla-update",
            ArtifactId = "test-pkg",
            ProducerEmail = "author@company.com",
            Status = ReviewStatus.UnderReview,
            Content = "{}",
            SubmittedAt = submittedAt,
            SlaTargetMinutes = 1440,
            SlaDeadline = submittedAt.AddMinutes(1440)
        };
        _repo.Add(review);

        // Change target to 4 hours (240 mins)
        var updated = _service.UpdateSlaTarget("rev-sla-update", 240);

        Assert.Equal(240, updated.SlaTargetMinutes);
        Assert.Equal(submittedAt.AddMinutes(240), updated.SlaDeadline);
    }

    [Fact]
    public void Review_CalculatesSlaWarningAndBreachAccurately()
    {
        var now = DateTime.UtcNow;

        // 1. On track (120 mins left)
        var onTrackReview = new Review
        {
            Id = "rev-ontrack",
            Status = ReviewStatus.UnderReview,
            SubmittedAt = now.AddMinutes(-60),
            SlaTargetMinutes = 180,
            SlaDeadline = now.AddMinutes(120)
        };
        Assert.False(onTrackReview.IsSlaBreached);
        Assert.False(onTrackReview.IsSlaWarning);
        Assert.Equal("OnTrack", onTrackReview.SlaStatus);
        Assert.Contains("2h", onTrackReview.SlaRemainingFormatted);

        // 2. Warning state (45 mins left, <= 60 mins)
        var warningReview = new Review
        {
            Id = "rev-warning",
            Status = ReviewStatus.UnderReview,
            SubmittedAt = now.AddMinutes(-135),
            SlaTargetMinutes = 180,
            SlaDeadline = now.AddMinutes(45)
        };
        Assert.False(warningReview.IsSlaBreached);
        Assert.True(warningReview.IsSlaWarning);
        Assert.Equal("Warning", warningReview.SlaStatus);
        Assert.Contains("45m", warningReview.SlaRemainingFormatted);

        // 3. Breached state (-15 mins left)
        var breachedReview = new Review
        {
            Id = "rev-breached",
            Status = ReviewStatus.UnderReview,
            SubmittedAt = now.AddMinutes(-195),
            SlaTargetMinutes = 180,
            SlaDeadline = now.AddMinutes(-15)
        };
        Assert.True(breachedReview.IsSlaBreached);
        Assert.False(breachedReview.IsSlaWarning);
        Assert.Equal("Breached", breachedReview.SlaStatus);
        Assert.Contains("15m", breachedReview.SlaRemainingFormatted);
    }

    [Fact]
    public async Task CheckSlaAndSendRemindersAsync_DispatchesWarningAndBreachNotifications()
    {
        var now = DateTime.UtcNow;

        // Review 1: Warning state (30m remaining) with assigned reviewer
        var r1 = new Review
        {
            Id = "rev-warn-1",
            ArtifactId = "pkg-warn",
            ProducerEmail = "producer@company.com",
            ReviewerEmail = "reviewer1@company.com",
            Status = ReviewStatus.UnderReview,
            SubmittedAt = now.AddMinutes(-210),
            SlaTargetMinutes = 240,
            SlaDeadline = now.AddMinutes(30)
        };

        // Review 2: Breached state (20m overdue) with unassigned reviewer
        var r2 = new Review
        {
            Id = "rev-breach-1",
            ArtifactId = "pkg-breach",
            ProducerEmail = "producer@company.com",
            ReviewerEmail = null,
            Status = ReviewStatus.Submitted,
            SubmittedAt = now.AddMinutes(-260),
            SlaTargetMinutes = 240,
            SlaDeadline = now.AddMinutes(-20)
        };

        // Review 3: On Track state (500m remaining)
        var r3 = new Review
        {
            Id = "rev-ontrack-1",
            ArtifactId = "pkg-ontrack",
            ProducerEmail = "producer@company.com",
            ReviewerEmail = "reviewer3@company.com",
            Status = ReviewStatus.UnderReview,
            SubmittedAt = now.AddMinutes(-100),
            SlaTargetMinutes = 600,
            SlaDeadline = now.AddMinutes(500)
        };

        _repo.Add(r1);
        _repo.Add(r2);
        _repo.Add(r3);

        var remindersSent = await _service.CheckSlaAndSendRemindersAsync();

        Assert.Equal(2, remindersSent);

        // Check warning notification was sent to reviewer1
        var warnNotif = _notificationService.Notifications.FirstOrDefault(n => n.RecipientEmail == "reviewer1@company.com");
        Assert.NotNull(warnNotif);
        Assert.Equal(NotificationType.SlaWarning, warnNotif.Type);
        Assert.Contains("SLA Warning", warnNotif.Title);
        Assert.Contains("30m", warnNotif.Message);

        // Check breach notification was sent to reviewer group / author
        var breachNotif = _notificationService.Notifications.FirstOrDefault(n => n.Type == NotificationType.SlaBreached);
        Assert.NotNull(breachNotif);
        Assert.Contains("SLA Breached", breachNotif.Title);
        Assert.Contains("20 minutes", breachNotif.Message);

        // Second run within cooldown should NOT resend
        var secondRun = await _service.CheckSlaAndSendRemindersAsync();
        Assert.Equal(0, secondRun);
    }

    [Fact]
    public void GetSlaSummary_ComputesMetricsAccurately()
    {
        var now = DateTime.UtcNow;

        _repo.Add(new Review
        {
            Id = "s1",
            Status = ReviewStatus.UnderReview,
            SubmittedAt = now.AddMinutes(-30),
            SlaDeadline = now.AddMinutes(100),
            SlaTargetMinutes = 130
        });

        _repo.Add(new Review
        {
            Id = "s2",
            Status = ReviewStatus.Submitted,
            SubmittedAt = now.AddMinutes(-100),
            SlaDeadline = now.AddMinutes(20),
            SlaTargetMinutes = 120
        });

        _repo.Add(new Review
        {
            Id = "s3",
            Status = ReviewStatus.UnderReview,
            SubmittedAt = now.AddMinutes(-200),
            SlaDeadline = now.AddMinutes(-50),
            SlaTargetMinutes = 150
        });

        _repo.Add(new Review
        {
            Id = "s4",
            Status = ReviewStatus.Approved,
            SubmittedAt = now.AddMinutes(-60),
            DecisionAt = now.AddMinutes(-10),
            SlaDeadline = now.AddMinutes(100),
            SlaTargetMinutes = 160
        });

        var summary = _service.GetSlaSummary();

        Assert.Equal(3, summary.ActivePending);
        Assert.Equal(1, summary.OnTrackCount);
        Assert.Equal(1, summary.WarningCount);
        Assert.Equal(1, summary.BreachedCount);
        Assert.Equal(50, summary.SlaComplianceRatePercent);
        Assert.Equal(50, summary.AverageReviewDurationMinutes);
    }
}
