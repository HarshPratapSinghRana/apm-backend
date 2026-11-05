#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;
using CipBackend.Models;
using CipBackend.Services.Implementations;
using CipBackend.Services.Interfaces;

namespace CipBackend.Tests;

public class BountyServiceTests
{
    private class FakeReviewService : IReviewService
    {
        private readonly Dictionary<string, Review> _store = new();

        public void Add(Review review) => _store[review.Id] = review;
        public Review SubmitChange(string artifactId, string producerEmail, string content, bool isPrivate = false, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null, int slaTargetMinutes = 1440) => throw new NotImplementedException();
        public Review AssignReview(string reviewId, string reviewerEmail)
        {
            if (_store.TryGetValue(reviewId, out var r))
            {
                r.ReviewerEmail = reviewerEmail;
                r.Status = ReviewStatus.UnderReview;
                return r;
            }
            var newRev = new Review { Id = reviewId, ReviewerEmail = reviewerEmail, Status = ReviewStatus.UnderReview };
            _store[reviewId] = newRev;
            return newRev;
        }
        public Review RequestChanges(string reviewId, string reviewerEmail, string? feedback = null) => throw new NotImplementedException();
        public Review Resubmit(string reviewId, string producerEmail, string content, bool? isPrivate = null, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null) => throw new NotImplementedException();
        public Task<Review?> ApproveAsync(string reviewId, string reviewerEmail, string? feedback = null) => throw new NotImplementedException();
        public Review? Reject(string reviewId, string reviewerEmail, string? feedback = null) => throw new NotImplementedException();
        public Review? CancelReview(string reviewId, string reviewerEmail, string? reason = null) => throw new NotImplementedException();
        public Review? GetReview(string reviewId) => _store.TryGetValue(reviewId, out var r) ? r : null;
        public IEnumerable<Review> GetAllReviews() => _store.Values.ToList();
        public IEnumerable<Review> GetPendingReviews() => _store.Values.Where(r => r.Status == ReviewStatus.Submitted || r.Status == ReviewStatus.UnderReview).ToList();
        public IEnumerable<Review> GetByProducer(string producerEmail) => _store.Values.Where(r => r.ProducerEmail == producerEmail).ToList();
        public Review UpdateSlaTarget(string reviewId, int slaTargetMinutes) => throw new NotImplementedException();
        public Task<int> CheckSlaAndSendRemindersAsync() => Task.FromResult(0);
        public SlaSummaryDto GetSlaSummary() => new();
    }

    private class FakeEmailNotificationService : IEmailNotificationService
    {
        public Task<bool> SendAccessRequestNotificationAsync(string adminEmail, string userEmail, string requestedRole, string? reason, string requestId) => Task.FromResult(true);
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

    private readonly FakeReviewService _reviewService;
    private readonly FakeEmailNotificationService _emailService;
    private readonly FakeNotificationService _notificationService;
    private readonly BountyService _bountyService;

    public BountyServiceTests()
    {
        _reviewService = new FakeReviewService();
        _emailService = new FakeEmailNotificationService();
        _notificationService = new FakeNotificationService();
        _bountyService = new BountyService(_reviewService, _emailService, _notificationService);
    }

    [Fact]
    public async Task CreateBounty_InitializesInOpenStage()
    {
        var req = new CreateBountyRequest
        {
            Title = "Implement OAuth token caching",
            Description = "Add token cache layer with expiration.",
            Category = "Code gen",
            Credits = 250,
            Points = 120,
            DueInDays = 3
        };

        var created = await _bountyService.CreateBountyAsync(req, "admin@company.com");

        Assert.NotNull(created);
        Assert.Equal("Implement OAuth token caching", created.Title);
        Assert.Equal(BountyStages.Open, created.Stage);
        Assert.Equal("Open", created.Status);
        Assert.Equal(250, created.Credits);
        Assert.Equal(120, created.Points);
        Assert.True(created.CanClaim);
        Assert.False(created.CanSubmitCode);
    }

    [Fact]
    public async Task ClaimBounty_TransitionsToCodeGenerationStage()
    {
        var created = await _bountyService.CreateBountyAsync(new CreateBountyRequest
        {
            Title = "GraphQL schema parser",
            Credits = 150
        }, "author@company.com");

        var claimed = await _bountyService.ClaimBountyAsync(created.Id, "developer@company.com");

        Assert.Equal("Claimed", claimed.Status);
        Assert.Equal(BountyStages.CodeGeneration, claimed.Stage);
        Assert.Equal("developer@company.com", claimed.ClaimedByEmail);
        Assert.True(claimed.IsClaimedByMe);
        Assert.True(claimed.CanSubmitCode);
    }

    [Fact]
    public async Task FullSequentialWorkflow_CodeGeneration_Review_Testing_Completed()
    {
        // 1. Create & Claim -> Code Generation
        var created = await _bountyService.CreateBountyAsync(new CreateBountyRequest
        {
            Title = "Optimize vector database index",
            Credits = 400,
            Points = 200
        }, "lead@company.com");

        await _bountyService.ClaimBountyAsync(created.Id, "dev1@company.com");

        // 2. Code Generation -> Submit Code -> Auto Moves to InReview
        var submitReq = new BountySubmissionRequest
        {
            SolutionCode = "class VectorIndexOptimizer { ... }",
            CommitSha = "c8f12a",
            Notes = "Optimized cosine similarity batching."
        };

        var inReview = await _bountyService.SubmitCodeAsync(created.Id, "dev1@company.com", submitReq);

        Assert.Equal(BountyStages.InReview, inReview.Stage);
        Assert.Single(inReview.Submissions);
        Assert.Equal("c8f12a", inReview.Submissions[0].CommitSha);
        Assert.True(inReview.CanReview);

        // 3. Review -> Validate & Approve -> Auto Moves to InTesting
        var reviewReq = new BountyReviewRequest
        {
            IsApproved = true,
            Feedback = "Code is clean and complies with performance standards."
        };

        var inTesting = await _bountyService.ReviewCodeAsync(created.Id, "reviewer1@company.com", reviewReq);

        Assert.Equal(BountyStages.InTesting, inTesting.Stage);
        Assert.Single(inTesting.Reviews);
        Assert.True(inTesting.Reviews[0].IsApproved);
        Assert.True(inTesting.CanRunTests);

        // 4. Testing -> Run Tests & Pass -> Auto Marks as Completed & Rewards Contributor
        var testReq = new BountyTestRunRequest
        {
            TestSuiteName = "Vector Performance Suite",
            IsPassed = true,
            PassedCount = 45,
            FailedCount = 0,
            TestLogs = "All 45 performance benchmarks passed cleanly."
        };

        var completed = await _bountyService.RunTestsAsync(created.Id, "tester1@company.com", testReq);

        Assert.Equal(BountyStages.Completed, completed.Stage);
        Assert.Equal("Completed", completed.Status);
        Assert.NotNull(completed.CompletedAt);
        Assert.Equal("dev1@company.com", completed.WinnerEmail);
        Assert.Single(completed.TestRuns);
        Assert.True(completed.TestRuns[0].IsPassed);

        // Verify completion notification dispatched to winner
        Assert.Contains(_notificationService.Notifications, n => 
            n.RecipientEmail == "dev1@company.com" && 
            n.Title.Contains("Completed & Rewarded"));
    }

    [Fact]
    public async Task ReviewChangesRequested_TransitionsBackToCodeGeneration()
    {
        var created = await _bountyService.CreateBountyAsync(new CreateBountyRequest
        {
            Title = "Add JWT validation middleware",
            Credits = 180
        }, "lead@company.com");

        await _bountyService.ClaimBountyAsync(created.Id, "dev2@company.com");

        // Submit code
        await _bountyService.SubmitCodeAsync(created.Id, "dev2@company.com", new BountySubmissionRequest
        {
            SolutionCode = "app.UseJwtAuth();"
        });

        // Reviewer requests changes
        var rejected = await _bountyService.ReviewCodeAsync(created.Id, "reviewer2@company.com", new BountyReviewRequest
        {
            IsApproved = false,
            Feedback = "Missing clock skew leeway validation."
        });

        Assert.Equal(BountyStages.CodeGeneration, rejected.Stage);
        Assert.False(rejected.Reviews[0].IsApproved);
        Assert.Contains("clock skew", rejected.Reviews[0].Feedback);
    }

    [Fact]
    public async Task TestFailureFeedbackLoop_ReturnsToCodeGeneration_AndAllowsCommunityTaker()
    {
        // 1. Create, Claim, Submit, Approve Review
        var created = await _bountyService.CreateBountyAsync(new CreateBountyRequest
        {
            Title = "Resilient Redis PubSub client",
            Credits = 350
        }, "lead@company.com");

        await _bountyService.ClaimBountyAsync(created.Id, "dev3@company.com");

        await _bountyService.SubmitCodeAsync(created.Id, "dev3@company.com", new BountySubmissionRequest
        {
            SolutionCode = "redis.Subscribe(...)"
        });

        await _bountyService.ReviewCodeAsync(created.Id, "reviewer@company.com", new BountyReviewRequest
        {
            IsApproved = true,
            Feedback = "LGTM"
        });

        // 2. Testing Fails -> Feedback loop triggers -> Returns to CodeGeneration
        var failedTest = await _bountyService.RunTestsAsync(created.Id, "ci-runner@company.com", new BountyTestRunRequest
        {
            TestSuiteName = "Redis Failover Test",
            IsPassed = false,
            PassedCount = 8,
            FailedCount = 2,
            TestLogs = "Connection dropped during cluster failover test."
        });

        Assert.Equal(BountyStages.CodeGeneration, failedTest.Stage);
        Assert.False(failedTest.TestRuns[0].IsPassed);
        Assert.Equal(2, failedTest.TestRuns[0].FailedCount);

        // 3. Original developer chooses to open bounty to community
        var opened = await _bountyService.SetFeedbackChoiceAsync(created.Id, "dev3@company.com", "OpenToCommunity");

        Assert.Equal("Open", opened.Status);
        Assert.Equal("OpenToCommunity", opened.ProducerResolutionPreference);
        Assert.Null(opened.ClaimedByEmail);
        Assert.True(opened.CanClaim);

        // 4. Another community developer claims and fixes the issue
        await _bountyService.ClaimBountyAsync(created.Id, "community_hero@company.com");

        await _bountyService.SubmitCodeAsync(created.Id, "community_hero@company.com", new BountySubmissionRequest
        {
            SolutionCode = "redis.WithAutoReconnect().Subscribe(...)",
            Notes = "Added reconnect backoff policy."
        });

        await _bountyService.ReviewCodeAsync(created.Id, "reviewer@company.com", new BountyReviewRequest
        {
            IsApproved = true,
            Feedback = "Failover reconnection verified."
        });

        var finalSuccess = await _bountyService.RunTestsAsync(created.Id, "ci-runner@company.com", new BountyTestRunRequest
        {
            TestSuiteName = "Redis Failover Test",
            IsPassed = true,
            PassedCount = 10,
            FailedCount = 0
        });

        Assert.Equal(BountyStages.Completed, finalSuccess.Stage);
        Assert.Equal("community_hero@company.com", finalSuccess.WinnerEmail);
    }

    [Fact]
    public async Task Analytics_ComputesStageDistributionAndMetrics()
    {
        var analytics = await _bountyService.GetBountyAnalyticsAsync();

        Assert.True(analytics.TotalBounties >= 6);
        Assert.True(analytics.StageBreakdown.ContainsKey(BountyStages.Open));
        Assert.True(analytics.StageBreakdown.ContainsKey(BountyStages.CodeGeneration));
        Assert.True(analytics.StageBreakdown.ContainsKey(BountyStages.InReview));
        Assert.True(analytics.StageBreakdown.ContainsKey(BountyStages.InTesting));
        Assert.True(analytics.StageBreakdown.ContainsKey(BountyStages.Completed));
    }
}
