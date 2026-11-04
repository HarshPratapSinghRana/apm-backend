using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using CipBackend.Events;
using CipBackend.Models;
using CipBackend.Services.Implementations;
using CipBackend.Services.Interfaces;

namespace CipBackend.Tests;

public class ReviewCommentTests
{
    private class FakeReviewService : IReviewService
    {
        private readonly Dictionary<string, Review> _reviews = new();

        public void Add(Review review) => _reviews[review.Id] = review;
        public Review SubmitChange(string artifactId, string producerEmail, string content, bool isPrivate = false, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null, int slaTargetMinutes = 1440) => throw new NotImplementedException();
        public Review AssignReview(string reviewId, string reviewerEmail) => throw new NotImplementedException();
        public Review RequestChanges(string reviewId, string reviewerEmail, string? feedback = null) => throw new NotImplementedException();
        public Review Resubmit(string reviewId, string producerEmail, string content, bool? isPrivate = null, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null) => throw new NotImplementedException();
        public Task<Review?> ApproveAsync(string reviewId, string reviewerEmail, string? feedback = null) => throw new NotImplementedException();
        public Review? Reject(string reviewId, string reviewerEmail, string? feedback = null) => throw new NotImplementedException();
        public Review? CancelReview(string reviewId, string reviewerEmail, string? reason = null) => throw new NotImplementedException();
        public Review? GetReview(string reviewId) => _reviews.TryGetValue(reviewId, out var r) ? r : null;
        public IEnumerable<Review> GetPendingReviews() => _reviews.Values.ToList();
        public IEnumerable<Review> GetByProducer(string producerEmail) => _reviews.Values.Where(r => r.ProducerEmail == producerEmail).ToList();
        public Review UpdateSlaTarget(string reviewId, int slaTargetMinutes) => throw new NotImplementedException();
        public Task<int> CheckSlaAndSendRemindersAsync() => Task.FromResult(0);
        public SlaSummaryDto GetSlaSummary() => new();
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

    private readonly FakeReviewService _reviewService;
    private readonly FakeEventPublisher _publisher;
    private readonly ReviewCommentService _commentService;

    public ReviewCommentTests()
    {
        _reviewService = new FakeReviewService();
        _publisher = new FakeEventPublisher();

        var review = new Review
        {
            Id = "sub-100",
            ArtifactId = "design-reviewer",
            ProducerEmail = "producer@company.com",
            ReviewerEmail = "reviewer@company.com",
            Status = ReviewStatus.UnderReview,
            Content = "{\"name\":\"design-reviewer\",\"version\":\"1.1.0\"}"
        };

        _reviewService.Add(review);

        var serviceProvider = new Microsoft.Extensions.DependencyInjection.ServiceCollection().BuildServiceProvider();

        _commentService = new ReviewCommentService(
            serviceProvider,
            _reviewService,
            _publisher,
            NullLogger<ReviewCommentService>.Instance);
    }

    [Fact]
    public async Task Reviewer_CanCreate_FileLevelComment()
    {
        // 1. Reviewer can create a file-level comment
        // 3. Stores correct file path
        var comment = await _commentService.AddCommentAsync("sub-100", "reviewer@company.com", "REVIEWER", new AddReviewCommentRequest
        {
            FilePath = "agents/design-reviewer.md",
            LineNumber = null,
            LineType = "File",
            Comment = "Please check the overall structure of this agent."
        });

        Assert.NotNull(comment);
        Assert.Equal("agents/design-reviewer.md", comment.FilePath);
        Assert.Null(comment.LineNumber);
        Assert.Equal("File", comment.LineType);
        Assert.Equal("reviewer@company.com", comment.AuthorEmail);

        Assert.Contains(_publisher.PublishedEvents, e =>
            e is LineCommentAddedEvent lc &&
            lc.TargetRecipientEmail == "producer@company.com" &&
            lc.FilePath == "agents/design-reviewer.md");
    }

    [Fact]
    public async Task Reviewer_CanCreate_LineLevelComment_OnModifiedLine()
    {
        // 2. Reviewer can create line-level comment
        // 4. Comment stores correct line number
        // 7. Modified-line comments work
        var comment = await _commentService.AddCommentAsync("sub-100", "reviewer@company.com", "REVIEWER", new AddReviewCommentRequest
        {
            FilePath = "agents/design-reviewer.md",
            LineNumber = 12,
            LineType = "Modified",
            OldContent = "Check basic accessibility.",
            NewContent = "Check all WCAG accessibility requirements.",
            Comment = "Please change this error handling."
        });

        Assert.NotNull(comment);
        Assert.Equal(12, comment.LineNumber);
        Assert.Equal("Modified", comment.LineType);
        Assert.Equal("Check basic accessibility.", comment.OldContent);
        Assert.Equal("Check all WCAG accessibility requirements.", comment.NewContent);
    }

    [Fact]
    public async Task AddedLine_And_DeletedLine_Comments_PreserveMetadata()
    {
        // 5. Added-line comments work
        var addedComment = await _commentService.AddCommentAsync("sub-100", "reviewer@company.com", "REVIEWER", new AddReviewCommentRequest
        {
            FilePath = "skills/accessibility/SKILL.md",
            LineNumber = 13,
            LineType = "Added",
            NewContent = "Check keyboard navigation.",
            Comment = "Great addition!"
        });

        Assert.Equal("skills/accessibility/SKILL.md", addedComment.FilePath);
        Assert.Equal(13, addedComment.LineNumber);
        Assert.Equal("Added", addedComment.LineType);

        // 6. Deleted-line comments work
        var deletedComment = await _commentService.AddCommentAsync("sub-100", "reviewer@company.com", "REVIEWER", new AddReviewCommentRequest
        {
            FilePath = "agents/design-reviewer.md",
            OldLineNumber = 25,
            LineType = "Deleted",
            OldContent = "Legacy fallback method",
            Comment = "Why was this validation removed?"
        });

        Assert.Equal(25, deletedComment.OldLineNumber);
        Assert.Equal("Deleted", deletedComment.LineType);
        Assert.Equal("Legacy fallback method", deletedComment.OldContent);
    }

    [Fact]
    public async Task MultipleFiles_CanHaveIndependentComments()
    {
        // 8. Multiple files can have independent comments
        await _commentService.AddCommentAsync("sub-100", "reviewer@company.com", "REVIEWER", new AddReviewCommentRequest
        {
            FilePath = "agents/reviewer.md",
            LineNumber = 15,
            Comment = "Reviewer agent prompt comment"
        });

        await _commentService.AddCommentAsync("sub-100", "reviewer@company.com", "REVIEWER", new AddReviewCommentRequest
        {
            FilePath = "skills/accessibility/SKILL.md",
            LineNumber = 8,
            Comment = "Accessibility skill comment"
        });

        var reviewerComments = await _commentService.GetCommentsAsync("sub-100", "agents/reviewer.md");
        var skillComments = await _commentService.GetCommentsAsync("sub-100", "skills/accessibility/SKILL.md");

        Assert.Contains(reviewerComments, c => c.LineNumber == 15);
        Assert.Contains(skillComments, c => c.LineNumber == 8);
    }

    [Fact]
    public async Task Producer_CanViewComment_And_Reply()
    {
        // 9. Producer can view comment
        var comment = await _commentService.AddCommentAsync("sub-100", "reviewer@company.com", "REVIEWER", new AddReviewCommentRequest
        {
            FilePath = "agents/design-reviewer.md",
            LineNumber = 12,
            Comment = "Please change this error handling."
        });

        // 10. Producer can reply
        var reply = await _commentService.AddReplyAsync("sub-100", comment.Id, "producer@company.com", "PRODUCER", "Updated it. Please check again.");

        Assert.NotNull(reply);
        Assert.Equal(comment.Id, reply.ParentCommentId);
        Assert.Equal("producer@company.com", reply.AuthorEmail);

        // 11. Reviewer can view producer reply in comment tree
        var comments = await _commentService.GetCommentsAsync("sub-100", "agents/design-reviewer.md");
        var root = comments.FirstOrDefault(c => c.Id == comment.Id);
        Assert.NotNull(root);
        Assert.Single(root.Replies);
        Assert.Equal("Updated it. Please check again.", root.Replies[0].Comment);

        Assert.Contains(_publisher.PublishedEvents, e =>
            e is ProducerRepliedEvent pr &&
            pr.ReviewerEmail == "reviewer@company.com" &&
            pr.Message == "Updated it. Please check again.");
    }
}
