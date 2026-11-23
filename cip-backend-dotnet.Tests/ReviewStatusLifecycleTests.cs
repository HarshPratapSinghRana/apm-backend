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

public class ReviewStatusLifecycleTests
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
        public List<(string ArtifactId, string Content)> Published { get; } = new();

        public Task PublishArtifactAsync(string artifactId, string content)
        {
            Published.Add((artifactId, content));
            return Task.CompletedTask;
        }

        public Task<IEnumerable<ArtifactDto>> ListArtifactsAsync() =>
            Task.FromResult<IEnumerable<ArtifactDto>>(new List<ArtifactDto>());

        public Task<ArtifactDto?> GetArtifactAsync(string artifactId, string? version = null) =>
            Task.FromResult<ArtifactDto?>(null);

        public Task<IEnumerable<ArtifactVersionDto>> GetArtifactVersionsAsync(string artifactId) =>
            Task.FromResult<IEnumerable<ArtifactVersionDto>>(new List<ArtifactVersionDto>());

        public Task<bool> UpdateVisibilityAsync(string artifactId, bool isPrivate, string userEmail, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null) =>
            Task.FromResult(true);
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

    private readonly FakeReviewRepository _repo;
    private readonly FakeMarketplaceService _marketplace;
    private readonly FakeEventPublisher _publisher;
    private readonly ReviewService _service;

    public ReviewStatusLifecycleTests()
    {
        _repo = new FakeReviewRepository();
        _marketplace = new FakeMarketplaceService();
        _publisher = new FakeEventPublisher();
        _service = new ReviewService(_repo, _marketplace, _publisher);
    }

    [Fact]
    public void SubmitReview_CreatesSubmittedStatus()
    {
        // 12. Draft / Initial -> Submitted
        var review = _service.SubmitChange("design-reviewer", "producer@company.com", "{\"name\":\"design-reviewer\",\"version\":\"1.0.0\"}");

        Assert.Equal(ReviewStatus.Submitted, review.Status);
        Assert.Equal("producer@company.com", review.ProducerEmail);
        Assert.Contains(_publisher.PublishedEvents, e => e is ReviewAssignedEvent ra && ra.SubmissionId == review.Id);
    }

    [Fact]
    public void AssignReview_TransitionsSubmitted_To_UnderReview()
    {
        // 13. Submitted -> Under Review
        var review = new Review
        {
            Id = "rev-1",
            ArtifactId = "design-reviewer",
            ProducerEmail = "producer@company.com",
            Status = ReviewStatus.Submitted,
            Content = "{\"name\":\"design-reviewer\",\"version\":\"1.0.0\"}"
        };
        _repo.Add(review);

        var updated = _service.AssignReview("rev-1", "reviewer@company.com");

        Assert.Equal(ReviewStatus.UnderReview, updated.Status);
        Assert.Equal("reviewer@company.com", updated.ReviewerEmail);
        Assert.Contains(_publisher.PublishedEvents, e => e is ReviewAssignedEvent ra && ra.ReviewerEmail == "reviewer@company.com");
    }

    [Fact]
    public void RequestChanges_TransitionsUnderReview_To_ChangesRequested()
    {
        // 14. Under Review -> Changes Requested
        var review = new Review
        {
            Id = "rev-2",
            ArtifactId = "design-reviewer",
            ProducerEmail = "producer@company.com",
            ReviewerEmail = "reviewer@company.com",
            Status = ReviewStatus.UnderReview,
            Content = "{\"name\":\"design-reviewer\",\"version\":\"1.0.0\"}"
        };
        _repo.Add(review);

        var updated = _service.RequestChanges("rev-2", "reviewer@company.com", "Please fix error handling.");

        Assert.Equal(ReviewStatus.ChangesRequested, updated.Status);
        Assert.Equal("Please fix error handling.", updated.Feedback);
        Assert.Contains(_publisher.PublishedEvents, e => e is ChangesRequestedEvent cr && cr.ProducerEmail == "producer@company.com");
    }

    [Fact]
    public void Resubmit_TransitionsChangesRequested_To_Resubmitted()
    {
        // 15. Changes Requested -> Resubmitted
        var review = new Review
        {
            Id = "rev-3",
            ArtifactId = "design-reviewer",
            ProducerEmail = "producer@company.com",
            ReviewerEmail = "reviewer@company.com",
            Status = ReviewStatus.ChangesRequested,
            Content = "{\"name\":\"design-reviewer\",\"version\":\"1.0.0\"}"
        };
        _repo.Add(review);

        var updated = _service.Resubmit("rev-3", "producer@company.com", "{\"name\":\"design-reviewer\",\"version\":\"1.1.0\"}");

        Assert.Equal(ReviewStatus.Resubmitted, updated.Status);
        Assert.Contains(_publisher.PublishedEvents, e => e is ResubmittedEvent re && re.SubmissionId == "rev-3");
    }

    [Fact]
    public void AssignReview_TransitionsResubmitted_To_UnderReview()
    {
        // 16. Resubmitted -> Under Review
        var review = new Review
        {
            Id = "rev-4",
            ArtifactId = "design-reviewer",
            ProducerEmail = "producer@company.com",
            Status = ReviewStatus.Resubmitted,
            Content = "{\"name\":\"design-reviewer\",\"version\":\"1.1.0\"}"
        };
        _repo.Add(review);

        var updated = _service.AssignReview("rev-4", "reviewer@company.com");

        Assert.Equal(ReviewStatus.UnderReview, updated.Status);
    }

    [Fact]
    public async Task ApproveAsync_TransitionsUnderReview_To_Approved_And_Published()
    {
        // 17 & 18. Under Review -> Approved -> Published
        var review = new Review
        {
            Id = "rev-5",
            ArtifactId = "design-reviewer",
            ProducerEmail = "producer@company.com",
            ReviewerEmail = "reviewer@company.com",
            Status = ReviewStatus.UnderReview,
            Content = "{\"name\":\"design-reviewer\",\"version\":\"1.1.0\"}"
        };
        _repo.Add(review);

        var updated = await _service.ApproveAsync("rev-5", "reviewer@company.com", "Looks good!");

        Assert.NotNull(updated);
        Assert.Equal(ReviewStatus.Published, updated.Status);
        Assert.True(updated.IsPublished);
        Assert.Contains(_marketplace.Published, p => p.ArtifactId == "design-reviewer");
        Assert.Contains(_publisher.PublishedEvents, e => e is ReviewApprovedEvent ra && ra.ProducerEmail == "producer@company.com");
    }

    [Fact]
    public void InvalidStatusTransitions_AreRejected()
    {
        // 19. Invalid transitions throw InvalidOperationException
        var review = new Review
        {
            Id = "rev-6",
            ArtifactId = "design-reviewer",
            ProducerEmail = "producer@company.com",
            Status = ReviewStatus.Published,
            IsPublished = true,
            Content = "{\"name\":\"design-reviewer\",\"version\":\"1.1.0\"}"
        };
        _repo.Add(review);

        // Cannot request changes on already Published review
        Assert.Throws<InvalidOperationException>(() =>
            _service.RequestChanges("rev-6", "reviewer@company.com", "Invalid change"));

        // Cannot resubmit an already Published review
        Assert.Throws<InvalidOperationException>(() =>
            _service.Resubmit("rev-6", "producer@company.com", "new content"));
    }

    [Fact]
    public void CancelReview_TransitionsActiveReview_To_Cancelled()
    {
        var review = new Review
        {
            Id = "rev-cancel-1",
            ArtifactId = "design-reviewer",
            ProducerEmail = "producer@company.com",
            Status = ReviewStatus.UnderReview,
            Content = "{\"name\":\"design-reviewer\",\"version\":\"1.1.0\"}"
        };
        _repo.Add(review);

        var updated = _service.CancelReview("rev-cancel-1", "reviewer@company.com", "No longer required.");

        Assert.NotNull(updated);
        Assert.Equal(ReviewStatus.Cancelled, updated.Status);
        Assert.Equal("No longer required.", updated.Feedback);
        Assert.Contains(_publisher.PublishedEvents, e => e is ReviewCancelledEvent rc && rc.ProducerEmail == "producer@company.com" && rc.Reason == "No longer required.");
    }

    [Fact]
    public void CancelReview_OnPublishedReview_ThrowsException()
    {
        var review = new Review
        {
            Id = "rev-cancel-2",
            ArtifactId = "design-reviewer",
            ProducerEmail = "producer@company.com",
            Status = ReviewStatus.Published,
            Content = "{\"name\":\"design-reviewer\",\"version\":\"1.1.0\"}"
        };
        _repo.Add(review);

        Assert.Throws<InvalidOperationException>(() =>
            _service.CancelReview("rev-cancel-2", "reviewer@company.com", "Cancel"));
    }

    private class FakeNotificationService : INotificationService
    {
        public List<Notification> Notifications { get; } = new();
        public Task<Notification> CreateNotificationAsync(Notification notification)
        {
            if (string.IsNullOrEmpty(notification.Id)) notification.Id = Guid.NewGuid().ToString();
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

    private class FakeEmailNotificationService : IEmailNotificationService
    {
        public Task<bool> SendAccessRequestNotificationAsync(string adminEmail, string userEmail, string requestedRole, string requestId, string? reason = null) => Task.FromResult(true);
        public Task<bool> SendAccessDecisionNotificationAsync(string userEmail, string decision, string role, string? notes) => Task.FromResult(true);
        public Task<bool> SendBountyAssignedNotificationAsync(string bountyTitle, string recipientEmail, int credits, string bountyId, int dueInDays) => Task.FromResult(true);
        public Task<bool> SendBountyIssueReportedNotificationAsync(string bountyTitle, string reporterEmail, string issueDescription, string severity, string bountyId) => Task.FromResult(true);
        public Task<bool> SendBountyResolvedNotificationAsync(string bountyTitle, string resolverEmail, int credits, string bountyId) => Task.FromResult(true);
        public Task<bool> SendArtifactCertifiedNotificationAsync(string artifactId, string version, string producerEmail, string certifiedBy, string? badge) => Task.FromResult(true);
        public Task<bool> SendArtifactCertificationRejectedNotificationAsync(string artifactId, string producerEmail, string reason, string rejectedBy) => Task.FromResult(true);
        public Task<bool> SendArtifactPublishedNotificationAsync(string artifactName, string version, string producerEmail, string approvedBy) => Task.FromResult(true);
        public Task<bool> SendAdminAlertNotificationAsync(string alertType, string message, string? details) => Task.FromResult(true);
        public Task<DispatchedEmailRecord> SendTestEmailAsync(string toEmail, string? customSubject = null, string? customBody = null) => Task.FromResult(new DispatchedEmailRecord("test", toEmail, "Sub", "Body", "PickupDirectory", true, true, null, null, DateTime.UtcNow));
        public EmailServiceStatusDto GetStatus() => new(true, "PickupDirectory", "admin@company.com", "admin@company.com", "./outbox", 0, new GraphStatusDto(false, false, "", "", "", null, false, null), new SmtpStatusDto(true, "localhost", 25, false, "admin@company.com", "PickupDirectory", "./outbox", 0, "admin@company.com"));
        public SmtpStatusDto GetSmtpStatus() => new(true, "localhost", 25, false, "admin@company.com", "PickupDirectory", "./outbox", 0, "admin@company.com");
        public IEnumerable<DispatchedEmailRecord> GetOutboxHistory(int limit = 20) => Enumerable.Empty<DispatchedEmailRecord>();
    }

    [Fact]
    public async Task ReviewNotificationEventHandler_ImplementsAndHandles_ReviewCancelledEvent()
    {
        var notifService = new FakeNotificationService();
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<ReviewNotificationEventHandler>.Instance;
        var emailService = new FakeEmailNotificationService();
        IReviewEventHandler<ReviewCancelledEvent> handler = new ReviewNotificationEventHandler(notifService, logger, emailService);

        var cancelEvent = new ReviewCancelledEvent
        {
            SubmissionId = "sub-cancel-100",
            ArtifactId = "design-reviewer",
            ArtifactName = "design-reviewer",
            Version = "1.0.0",
            ProducerEmail = "producer@company.com",
            ReviewerEmail = "reviewer@company.com",
            Reason = "No longer needed."
        };

        await handler.HandleAsync(cancelEvent);

        Assert.Single(notifService.Notifications);
        var notif = notifService.Notifications[0];
        Assert.Equal("producer@company.com", notif.RecipientEmail);
        Assert.Equal(NotificationType.ReviewCancelled, notif.Type);
        Assert.Contains("No longer needed.", notif.Message);
    }
}
