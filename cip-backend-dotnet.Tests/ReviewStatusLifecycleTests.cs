#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;
using CipBackend.Events;
using CipBackend.Models;
using CipBackend.Services.Implementations;
using CipBackend.Services.Interfaces;

namespace CipBackend.Tests;

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
}
