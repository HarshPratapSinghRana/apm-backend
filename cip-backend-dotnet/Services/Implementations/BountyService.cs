using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Services.Implementations;

public class BountyService : IBountyService
{
    private static readonly ConcurrentDictionary<string, Bounty> _bounties = new(StringComparer.OrdinalIgnoreCase);

    static BountyService()
    {
        // Seed 8 comprehensive bounties matching Engineering Commons architectural flow & pipeline stages
        var seed = new List<Bounty>
        {
            new Bounty
            {
                Id = "bty-1",
                Title = "Review accessibility-fix agent",
                Category = "Review",
                Credits = 120,
                Points = 60,
                Status = "Open",
                Stage = BountyStages.InReview,
                RelatedArtifactId = "accessibility-fix",
                DueInDays = 2,
                AutoReleasesHours = 18,
                Description = "Review the WCAG compliance changes and line-level accessibility checks in accessibility-fix.",
                CreatedAt = DateTime.UtcNow.AddHours(-2),
                Submissions = new List<BountySubmission>
                {
                    new BountySubmission
                    {
                        SubmittedByEmail = "producer@company.com",
                        SolutionCode = "---\nname: accessibility-fix\nversion: 1.0.0\ntype: agent\ndescription: WCAG 2.1 AA accessibility remediation agent for web interfaces\n---\n\nexport class AccessibilityFixAgent {\n  public auditElement(html: string) {\n    return { passed: true, violations: [] };\n  }\n}",
                        CommitSha = "a12f7b",
                        Notes = "WCAG 2.1 AA validator implementation with aria-label linting.",
                        SubmittedAt = DateTime.UtcNow.AddHours(-2)
                    }
                }
            },
            new Bounty
            {
                Id = "bty-2",
                Title = "Build enterprise-reviewer v2 skill",
                Category = "Code gen",
                Credits = 300,
                Points = 150,
                Status = "Open",
                Stage = BountyStages.Open,
                RelatedArtifactId = "enterprise-reviewer",
                DueInDays = 3,
                AutoReleasesHours = 24,
                Description = "Implement multi-file refactoring, AST linting, and automated code review rules for enterprise-reviewer.",
                CreatedAt = DateTime.UtcNow.AddHours(-5)
            },
            new Bounty
            {
                Id = "bty-3",
                Title = "Write test suite for cip-consumer-poc",
                Category = "Testing",
                Credits = 80,
                Points = 40,
                Status = "Claimed",
                Stage = BountyStages.InTesting,
                ClaimedByEmail = "developer@company.com",
                ClaimedAt = DateTime.UtcNow.AddHours(-3),
                DueInDays = 2,
                AutoReleasesHours = 18,
                RelatedArtifactId = "cip-consumer-poc",
                Description = "Author end-to-end and unit test coverage for the cip-consumer proof of concept.",
                CreatedAt = DateTime.UtcNow.AddHours(-8),
                Submissions = new List<BountySubmission>
                {
                    new BountySubmission
                    {
                        SubmittedByEmail = "developer@company.com",
                        SolutionCode = "---\nname: cip-consumer-poc\nversion: 1.0.0\ntype: cippackage\ndescription: Proof of concept consumer test suite for Engineering Commons\n---\n\npublic class CipConsumerPocTests {\n  public void TestPackageResolution() => Assert.True(true);\n}",
                        CommitSha = "9c4e21",
                        Notes = "Complete xUnit integration and mock test suite.",
                        SubmittedAt = DateTime.UtcNow.AddHours(-3)
                    }
                },
                Reviews = new List<BountyReview>
                {
                    new BountyReview
                    {
                        ReviewerEmail = "reviewer@company.com",
                        IsApproved = true,
                        Feedback = "Test structure and assertions look great.",
                        ReviewedAt = DateTime.UtcNow.AddHours(-2)
                    }
                }
            },
            new Bounty
            {
                Id = "bty-4",
                Title = "design-reviewer v1.2 refactor",
                Category = "Code gen",
                Credits = 200,
                Points = 100,
                Status = "Claimed",
                Stage = BountyStages.CodeGeneration,
                ClaimedByEmail = "producer@company.com",
                ClaimedAt = DateTime.UtcNow.AddHours(-6),
                DueInDays = 2,
                AutoReleasesHours = 18,
                RelatedArtifactId = "design-reviewer",
                Description = "Refactor agent prompt structure and improve responsive layout detection for dark/light themes.",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new Bounty
            {
                Id = "bty-5",
                Title = "accessibility-audit rule automation",
                Category = "Review",
                Credits = 150,
                Points = 75,
                Status = "Claimed",
                Stage = BountyStages.InReview,
                ClaimedByEmail = "producer@company.com",
                ClaimedAt = DateTime.UtcNow.AddHours(-12),
                DueInDays = 3,
                AutoReleasesHours = 24,
                RelatedArtifactId = "accessibility-audit",
                Description = "Automate accessibility checks, color contrast validation, and WCAG 2.1 compliance audits.",
                CreatedAt = DateTime.UtcNow.AddDays(-2),
                Submissions = new List<BountySubmission>
                {
                    new BountySubmission
                    {
                        SubmittedByEmail = "producer@company.com",
                        SolutionCode = "---\nname: accessibility-audit\nversion: 1.2.0\ntype: skill\ndescription: Automated accessibility rules and WCAG 2.1 AA audit suite\n---\n\nexport class AccessibilityAuditRunner {\n  public static isCompliant(ratio: number) { return ratio >= 4.5; }\n}",
                        CommitSha = "c48f12",
                        Notes = "Headless browser accessibility runner with WCAG contrast calculators.",
                        SubmittedAt = DateTime.UtcNow.AddHours(-11)
                    }
                }
            },
            new Bounty
            {
                Id = "bty-6",
                Title = "brand-new-agent test harness",
                Category = "Testing",
                Credits = 100,
                Points = 50,
                Status = "Claimed",
                Stage = BountyStages.InTesting,
                ClaimedByEmail = "producer@company.com",
                ClaimedAt = DateTime.UtcNow.AddHours(-20),
                DueInDays = 1,
                AutoReleasesHours = 12,
                RelatedArtifactId = "brand-new-agent-xyz",
                Description = "Create test fixtures and end-to-end integration tests for brand-new-agent.",
                CreatedAt = DateTime.UtcNow.AddDays(-3),
                Submissions = new List<BountySubmission>
                {
                    new BountySubmission
                    {
                        SubmittedByEmail = "producer@company.com",
                        SolutionCode = "---\nname: brand-new-agent-xyz\nversion: 1.0.0\ntype: agent\ndescription: Agent test harness and end-to-end fixtures\n---\n\nexport class AgentTestRunner {\n  public static executeSuite() { return { passed: 10, failed: 0 }; }\n}",
                        CommitSha = "d87e33",
                        Notes = "End-to-end integration test runner.",
                        SubmittedAt = DateTime.UtcNow.AddHours(-18)
                    }
                },
                Reviews = new List<BountyReview>
                {
                    new BountyReview
                    {
                        ReviewerEmail = "reviewer@company.com",
                        IsApproved = true,
                        Feedback = "Test fixtures and assertions approved for CI execution.",
                        ReviewedAt = DateTime.UtcNow.AddHours(-16)
                    }
                }
            },
            new Bounty
            {
                Id = "bty-7",
                Title = "Implement security-scanner skill",
                Category = "Code gen",
                Credits = 250,
                Points = 125,
                Status = "Open",
                Stage = BountyStages.Open,
                RelatedArtifactId = "security-scanner",
                DueInDays = 3,
                AutoReleasesHours = 24,
                Description = "Build an automated static analysis security scanner for detecting hardcoded secrets, SQL injection vectors, and insecure regex patterns.",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new Bounty
            {
                Id = "bty-8",
                Title = "Optimized Prompt Engineering for sql-optimizer",
                Category = "Prompt",
                Credits = 180,
                Points = 90,
                Status = "Open",
                Stage = BountyStages.Open,
                RelatedArtifactId = "sql-optimizer",
                DueInDays = 2,
                AutoReleasesHours = 18,
                Description = "Design system prompts, few-shot examples, and index recommendation heuristics for database query optimization.",
                CreatedAt = DateTime.UtcNow.AddHours(-4)
            }
        };

        foreach (var b in seed)
        {
            _bounties[b.Id] = b;
        }
    }

    private readonly IReviewService _reviewService;
    private readonly IEmailNotificationService _emailService;
    private readonly INotificationService? _notificationService;
    private readonly IMarketplaceService? _marketplaceService;
    private readonly IUsageService? _usageService;
    private readonly ILogger<BountyService>? _logger;

    public BountyService(
        IReviewService reviewService, 
        IEmailNotificationService emailService,
        INotificationService? notificationService = null,
        IMarketplaceService? marketplaceService = null,
        IUsageService? usageService = null,
        ILogger<BountyService>? logger = null)
    {
        _reviewService = reviewService;
        _emailService = emailService;
        _notificationService = notificationService;
        _marketplaceService = marketplaceService;
        _usageService = usageService;
        _logger = logger;
    }

    public Task<BountyDto> CreateBountyAsync(CreateBountyRequest req, string creatorEmail)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
        {
            throw new ArgumentException("Bounty title is required.");
        }

        var bounty = new Bounty
        {
            Id = $"bty-{Guid.NewGuid().ToString().Substring(0, 8)}",
            Title = req.Title,
            Description = req.Description,
            Category = string.IsNullOrWhiteSpace(req.Category) ? "Code gen" : req.Category,
            Credits = req.Credits > 0 ? req.Credits : 100,
            Points = req.Points > 0 ? req.Points : 50,
            Status = "Open",
            Stage = BountyStages.Open,
            CreatedByEmail = creatorEmail,
            RelatedArtifactId = req.RelatedArtifactId,
            DueInDays = req.DueInDays > 0 ? req.DueInDays : 2,
            CreatedAt = DateTime.UtcNow
        };

        _bounties[bounty.Id] = bounty;

        // In-app notification
        _ = NotifyAsync(creatorEmail, NotificationType.ReviewAssigned, 
            "Bounty Created", 
            $"New bounty '{bounty.Title}' created with reward of {bounty.Credits} credits.");

        return Task.FromResult(MapToDto(bounty, creatorEmail));
    }

    public int ProcessAutoReleases()
    {
        var now = DateTime.UtcNow;
        int releasedCount = 0;
        foreach (var b in _bounties.Values)
        {
            if (b.Status == "Claimed" && b.ClaimedAt.HasValue && b.AutoReleasesHours > 0)
            {
                var autoReleaseDeadline = b.ClaimedAt.Value.AddHours(b.AutoReleasesHours);
                if (now >= autoReleaseDeadline)
                {
                    // Auto-release this bounty back to the open Bounties pool
                    b.Status = "Open";
                    var previousClaimant = b.ClaimedByEmail;
                    b.ClaimedByEmail = null;
                    b.ClaimedAt = null;
                    b.ProducerResolutionPreference = "OpenToCommunity";
                    if (b.Stage == BountyStages.CodeGeneration)
                    {
                        b.Stage = BountyStages.Open;
                    }
                    releasedCount++;

                    // If this bounty was a review, reset reviewer
                    string? reviewId = b.ReviewId ?? (b.Id.StartsWith("bty-rev-") ? b.Id.Substring("bty-rev-".Length) : null);
                    if (!string.IsNullOrEmpty(reviewId))
                    {
                        try
                        {
                            var rev = _reviewService.GetReview(reviewId);
                            if (rev != null && !string.IsNullOrEmpty(rev.ReviewerEmail))
                            {
                                rev.ReviewerEmail = null;
                                rev.Status = ReviewStatus.Submitted;
                            }
                        }
                        catch (Exception ex) { _logger?.LogDebug(ex, "Handled non-fatal exception in BountyService operation"); }
                    }

                    if (!string.IsNullOrEmpty(previousClaimant))
                    {
                        _ = NotifyAsync(previousClaimant, NotificationType.ReviewAssigned,
                            "Bounty Auto-Released",
                            $"Bounty '{b.Title}' was automatically released due to SLA inactivity and moved back to the open Bounties pool.");
                    }
                }
            }
        }
        return releasedCount;
    }

    public Task<List<BountyDto>> GetBountiesAsync(string userEmail, string? category = null, string? stage = null)
    {
        ProcessAutoReleases();
        // Dynamically discover all pending reviews that are unassigned
        try
        {
            var pendingReviews = _reviewService.GetPendingReviews();
            foreach (var rev in pendingReviews)
            {
                if (string.IsNullOrEmpty(rev.ReviewerEmail) && 
                    (rev.Status == ReviewStatus.Submitted || rev.Status == ReviewStatus.Resubmitted || rev.Status == ReviewStatus.UnderReview))
                {
                    string bountyId = $"bty-rev-{rev.Id}";
                    if (!_bounties.TryGetValue(bountyId, out var existingBty))
                    {
                        _bounties[bountyId] = new Bounty
                        {
                            Id = bountyId,
                            Title = $"Review {rev.ArtifactId}",
                            Category = "Review",
                            Credits = 120,
                            Points = 60,
                            Status = "Open",
                            Stage = BountyStages.InReview,
                            RelatedArtifactId = rev.ArtifactId,
                            ReviewId = rev.Id,
                            Description = $"Pending code review for {rev.ArtifactId} submitted by {rev.ProducerEmail}.",
                            CreatedAt = rev.SubmittedAt
                        };
                    }
                    else
                    {
                        existingBty.ReviewId = rev.Id;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogDebug(ex, "Handled non-fatal exception syncing reviews in BountyService");
        }

        var list = _bounties.Values
            .Where(b => string.IsNullOrEmpty(category) || string.Equals(b.Category, category, StringComparison.OrdinalIgnoreCase))
            .Where(b => string.IsNullOrEmpty(stage) || string.Equals(b.Stage, stage, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => MapToDto(b, userEmail))
            .ToList();

        return Task.FromResult(list);
    }

    private Bounty? FindBounty(string id)
    {
        if (string.IsNullOrWhiteSpace(id)) return null;

        if (_bounties.TryGetValue(id, out var b)) return b;

        if (id.StartsWith("bty-rev-", StringComparison.OrdinalIgnoreCase))
        {
            var revId = id.Substring("bty-rev-".Length);
            var match = _bounties.Values.FirstOrDefault(x => string.Equals(x.ReviewId, revId, StringComparison.OrdinalIgnoreCase) ||
                                                             string.Equals(x.RelatedArtifactId, revId, StringComparison.OrdinalIgnoreCase));
            if (match != null) return match;
        }

        var btyWithRev = _bounties.Values.FirstOrDefault(x => string.Equals(x.ReviewId, id, StringComparison.OrdinalIgnoreCase) ||
                                                             string.Equals(x.RelatedArtifactId, id, StringComparison.OrdinalIgnoreCase) ||
                                                             string.Equals(x.Id, $"bty-rev-{id}", StringComparison.OrdinalIgnoreCase));
        if (btyWithRev != null) return btyWithRev;

        var btyArtifact = _bounties.Values.FirstOrDefault(x => 
            (!string.IsNullOrEmpty(x.RelatedArtifactId) && (id.Contains(x.RelatedArtifactId, StringComparison.OrdinalIgnoreCase) || x.RelatedArtifactId.Contains(id, StringComparison.OrdinalIgnoreCase))) ||
            (!string.IsNullOrEmpty(x.Title) && (id.Contains(x.Title, StringComparison.OrdinalIgnoreCase) || x.Title.Contains(id, StringComparison.OrdinalIgnoreCase))));
        if (btyArtifact != null) return btyArtifact;

        return null;
    }

    public Task<BountyDetailDto?> GetBountyByIdAsync(string id, string userEmail)
    {
        ProcessAutoReleases();
        var b = FindBounty(id);
        if (b != null)
        {
            return Task.FromResult<BountyDetailDto?>(MapToDetailDto(b, userEmail));
        }
        return Task.FromResult<BountyDetailDto?>(null);
    }

    public Task<BountyDto> ClaimBountyAsync(string id, string userEmail)
    {
        ProcessAutoReleases();
        if (!string.IsNullOrEmpty(userEmail) && userEmail.Contains("consumer", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("You do not have permission for this. (Claiming bounties requires a Producer or Reviewer account).");
        }

        var b = FindBounty(id);
        if (b == null)
        {
            throw new InvalidOperationException($"Bounty '{id}' not found.");
        }

        if (b.Status == "Claimed" && !string.Equals(b.ClaimedByEmail, userEmail, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Bounty '{id}' is already claimed by another developer.");
        }

        b.Status = "Claimed";
        b.ClaimedByEmail = userEmail;
        b.ClaimedAt = DateTime.UtcNow;
        b.DueInDays = 2;
        b.AutoReleasesHours = 18;

        // Move to CodeGeneration stage if it was Open
        if (b.Stage == BountyStages.Open)
        {
            b.Stage = BountyStages.CodeGeneration;
        }

        // If this bounty corresponds to a pending review submission, assign the reviewer
        string? reviewId = b.ReviewId ?? (id.StartsWith("bty-rev-") ? id.Substring("bty-rev-".Length) : null);
        if (!string.IsNullOrEmpty(reviewId))
        {
            try
            {
                _reviewService.AssignReview(reviewId, userEmail);
            }
            catch (Exception ex) { _logger?.LogDebug(ex, "Handled non-fatal exception in BountyService operation"); }
        }

        // Send notifications
        _ = NotifyAsync(userEmail, NotificationType.ReviewAssigned, 
            "Bounty Claimed", 
            $"You have successfully claimed bounty '{b.Title}'. You are now in the Code Generation stage.");

        return Task.FromResult(MapToDto(b, userEmail));
    }

    public Task<BountyDto> ReleaseBountyAsync(string id, string userEmail)
    {
        var b = FindBounty(id);
        if (b == null)
        {
            throw new InvalidOperationException($"Bounty '{id}' not found.");
        }

        b.Status = "Open";
        b.ClaimedByEmail = null;
        b.ClaimedAt = null;

        // If it was in CodeGeneration, keep it ready for any community taker
        if (b.Stage == BountyStages.CodeGeneration)
        {
            b.ProducerResolutionPreference = "OpenToCommunity";
        }

        // If this bounty was a review, reset review assignment
        string? reviewId = b.ReviewId ?? (id.StartsWith("bty-rev-") ? id.Substring("bty-rev-".Length) : null);
        if (!string.IsNullOrEmpty(reviewId))
        {
            try
            {
                var rev = _reviewService.GetReview(reviewId);
                if (rev != null && (string.IsNullOrEmpty(rev.ReviewerEmail) || string.Equals(rev.ReviewerEmail, userEmail, StringComparison.OrdinalIgnoreCase)))
                {
                    rev.ReviewerEmail = null;
                    rev.Status = ReviewStatus.Submitted;
                }
            }
            catch (Exception ex) { _logger?.LogDebug(ex, "Handled non-fatal exception in BountyService operation"); }
        }

        _ = NotifyAsync(userEmail, NotificationType.ReviewAssigned,
            "Bounty Released",
            $"Bounty '{b.Title}' was released back to the community pool.");

        return Task.FromResult(MapToDto(b, userEmail));
    }

    /// <summary>
    /// Stage 1: Code Generation -> Submit Code -> Auto Move to Review
    /// </summary>
    public Task<BountyDetailDto> SubmitCodeAsync(string id, string userEmail, BountySubmissionRequest req)
    {
        var b = FindBounty(id);
        if (b == null)
        {
            throw new InvalidOperationException($"Bounty '{id}' not found.");
        }

        if (string.IsNullOrWhiteSpace(req.SolutionCode))
        {
            throw new ArgumentException("Solution code or artifact content is required.");
        }

        // If not claimed by anyone, assign claim to current submitter
        if (string.IsNullOrEmpty(b.ClaimedByEmail))
        {
            b.ClaimedByEmail = userEmail;
            b.ClaimedAt = DateTime.UtcNow;
            b.Status = "Claimed";
        }

        var submission = new BountySubmission
        {
            SubmittedByEmail = userEmail,
            SolutionCode = req.SolutionCode,
            CommitSha = req.CommitSha ?? Guid.NewGuid().ToString().Substring(0, 7),
            Notes = req.Notes,
            SubmittedAt = DateTime.UtcNow
        };

        b.Submissions.Add(submission);

        // Sequential transition: Code Generation -> InReview
        b.Stage = BountyStages.InReview;

        // Notify submitter and review pool
        _ = NotifyAsync(userEmail, NotificationType.ReviewAssigned,
            "Solution Submitted for Review",
            $"Your code solution for bounty '{b.Title}' was submitted and moved to the Review stage.");

        return Task.FromResult(MapToDetailDto(b, userEmail));
    }

    /// <summary>
    /// Stage 2: Review -> Validate Code -> If Approved: Auto Move to Testing; If Changes Requested: Move back to Code Generation
    /// </summary>
    public Task<BountyDetailDto> ReviewCodeAsync(string id, string reviewerEmail, BountyReviewRequest req)
    {
        var b = FindBounty(id);
        if (b == null)
        {
            throw new InvalidOperationException($"Bounty '{id}' not found.");
        }

        var review = new BountyReview
        {
            ReviewerEmail = reviewerEmail,
            IsApproved = req.IsApproved,
            Feedback = req.Feedback,
            ReviewedAt = DateTime.UtcNow
        };

        b.Reviews.Add(review);

        string submitterEmail = b.Submissions.LastOrDefault()?.SubmittedByEmail ?? b.ClaimedByEmail ?? "producer@company.com";

        // 4-Eyes Principle / Separation of Duties: Submitter cannot approve their own code submission
        if (req.IsApproved && !string.IsNullOrWhiteSpace(submitterEmail) &&
            string.Equals(submitterEmail.Trim(), reviewerEmail.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Separation of duties violation: Submitter cannot approve their own bounty submission.");
        }

        if (req.IsApproved)
        {
            // Sequential transition: Review -> InTesting (Testing Phase)
            b.Stage = BountyStages.InTesting;

            // If there's an associated review in _reviewService, mark it approved too
            string? reviewId = b.ReviewId ?? (b.Id.StartsWith("bty-rev-") ? b.Id.Substring("bty-rev-".Length) : null);
            if (!string.IsNullOrEmpty(reviewId))
            {
                try
                {
                    _ = _reviewService.ApproveAsync(reviewId, reviewerEmail, req.Feedback);
                }
                catch (Exception ex) { _logger?.LogDebug(ex, "Handled non-fatal exception in BountyService operation"); }
            }

            _ = NotifyAsync(submitterEmail, NotificationType.ReviewAssigned,
                "Bounty Review Approved",
                $"Review for bounty '{b.Title}' was approved by {reviewerEmail}. Automatically moving to the Testing stage.");
        }
        else
        {
            // Changes requested -> Return to Code Generation
            b.Stage = BountyStages.CodeGeneration;

            string? reviewId = b.ReviewId ?? (b.Id.StartsWith("bty-rev-") ? b.Id.Substring("bty-rev-".Length) : null);
            if (!string.IsNullOrEmpty(reviewId))
            {
                try
                {
                    _ = _reviewService.RequestChanges(reviewId, reviewerEmail, req.Feedback);
                }
                catch (Exception ex) { _logger?.LogDebug(ex, "Handled non-fatal exception in BountyService operation"); }
            }

            _ = NotifyAsync(submitterEmail, NotificationType.ChangesRequested,
                "Bounty Review Changes Requested",
                $"Reviewer {reviewerEmail} requested changes for '{b.Title}': {req.Feedback}. Returning to Code Generation.");
        }

        return Task.FromResult(MapToDetailDto(b, reviewerEmail));
    }

    /// <summary>
    /// Stage 3: Testing -> Run Tests -> If Pass: Mark as Completed (Close & Reward & Publish to Marketplace / ADO); If Fail: Go back to Code Generation (Feedback Loop)
    /// </summary>
    public async Task<BountyDetailDto> RunTestsAsync(string id, string testerEmail, BountyTestRunRequest req)
    {
        var b = FindBounty(id);
        if (b == null)
        {
            throw new InvalidOperationException($"Bounty '{id}' not found.");
        }

        var testRun = new BountyTestRun
        {
            TesterEmail = testerEmail,
            TestSuiteName = string.IsNullOrWhiteSpace(req.TestSuiteName) ? "Automated Test Suite" : req.TestSuiteName,
            IsPassed = req.IsPassed,
            PassedCount = req.PassedCount,
            FailedCount = req.FailedCount,
            TestLogs = req.TestLogs ?? (req.IsPassed ? "All test suites passed cleanly (100% assertions green)." : "1 or more test assertions failed."),
            ExecutedAt = DateTime.UtcNow
        };

        b.TestRuns.Add(testRun);

        string submitterEmail = b.Submissions.LastOrDefault()?.SubmittedByEmail ?? b.ClaimedByEmail ?? "producer@company.com";

        if (req.IsPassed)
        {
            // Sequential transition: Testing -> Completed (Bounty Closed & Contributor Rewarded)
            b.Stage = BountyStages.Completed;
            b.Status = "Completed";
            b.CompletedAt = DateTime.UtcNow;
            b.WinnerEmail = submitterEmail;

            // Automatically publish the artifact to Marketplace & push to Azure DevOps (ADO)
            string artId = !string.IsNullOrWhiteSpace(b.RelatedArtifactId)
                ? b.RelatedArtifactId
                : b.Title.ToLowerInvariant().Replace(" ", "-").Trim();

            string content = b.Submissions.LastOrDefault()?.SolutionCode ?? string.Empty;
            if (string.IsNullOrWhiteSpace(content) && !string.IsNullOrEmpty(b.ReviewId))
            {
                try
                {
                    var rev = _reviewService.GetReview(b.ReviewId);
                    if (rev != null && !string.IsNullOrWhiteSpace(rev.Content))
                    {
                        content = rev.Content;
                    }
                }
                catch (Exception ex) { _logger?.LogDebug(ex, "Handled non-fatal exception in BountyService operation"); }
            }

            if (string.IsNullOrWhiteSpace(content))
            {
                content = $"# {b.Title}\n\n{b.Description}\n\n```markdown\n# {artId}\nArtifact generated and published via Engineering Commons bounty automation.\n```";
            }

            if (_marketplaceService != null)
            {
                try
                {
                    await _marketplaceService.PublishArtifactAsync(artId, content);
                    b.IsPublished = true;
                    b.PublishedToMarketplaceAt = DateTime.UtcNow;
                    _logger?.LogInformation("Bounty '{BountyId}' completed: artifact '{ArtifactId}' published to Marketplace & pushed to ADO.", b.Id, artId);
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Bounty '{BountyId}' completed: marketplace publishing exception: {Message}", b.Id, ex.Message);
                }
            }

            // Update linked review status if present
            if (!string.IsNullOrEmpty(b.ReviewId))
            {
                try
                {
                    var rev = _reviewService.GetReview(b.ReviewId);
                    if (rev != null)
                    {
                        rev.Status = ReviewStatus.Published;
                        rev.IsPublished = true;
                        rev.PublishedAt = DateTime.UtcNow;
                        rev.PublishError = null;
                    }
                }
                catch (Exception ex) { _logger?.LogDebug(ex, "Handled non-fatal exception in BountyService operation"); }
            }

            // Record PUBLISH usage event
            if (_usageService != null)
            {
                try
                {
                    await _usageService.RecordUsageAsync(new UsageEvent
                    {
                        Id = Guid.NewGuid().ToString(),
                        Action = "PUBLISH",
                        ArtifactName = artId,
                        UserId = submitterEmail,
                        Source = "bounty-automation",
                        Timestamp = DateTime.UtcNow
                    });
                }
                catch (Exception ex) { _logger?.LogDebug(ex, "Handled non-fatal exception in BountyService operation"); }
            }

            _ = NotifyAsync(submitterEmail, NotificationType.ReviewApproved,
                "🎉 Bounty Completed & Rewarded - Published to Marketplace!",
                $"Congratulations! Bounty '{b.Title}' passed all validation tests and was completed. Artifact '{artId}' is now published to the Marketplace repository on Azure DevOps (ADO). {b.Credits} credits awarded and {b.Points} reputation points.");
        }
        else
        {
            // Feedback loop: Test Failure -> Returns to Code Generation
            b.Stage = BountyStages.CodeGeneration;

            _ = NotifyAsync(submitterEmail, NotificationType.ChangesRequested,
                "⚠️ Bounty Tests Failed (Feedback Loop)",
                $"Testing failed for bounty '{b.Title}' ({req.FailedCount} failed). Bounty has returned to Code Generation for issue resolution.");
        }

        return MapToDetailDto(b, testerEmail);
    }

    /// <summary>
    /// Issue Resolution / Feedback Choice: Original producer can resolve or keep it open for anyone to take
    /// </summary>
    public Task<BountyDetailDto> SetFeedbackChoiceAsync(string id, string producerEmail, string choice)
    {
        var b = FindBounty(id);
        if (b == null)
        {
            throw new InvalidOperationException($"Bounty '{id}' not found.");
        }

        bool openToCommunity = string.Equals(choice, "OpenToCommunity", StringComparison.OrdinalIgnoreCase);
        b.ProducerResolutionPreference = openToCommunity ? "OpenToCommunity" : "KeepToResolve";

        if (openToCommunity)
        {
            b.Status = "Open";
            b.ClaimedByEmail = null;
            b.ClaimedAt = null;

            _ = NotifyAsync(producerEmail, NotificationType.ReviewAssigned,
                "Bounty Opened to Community",
                $"Bounty '{b.Title}' is now open for any community developer to claim and fix.");
        }
        else
        {
            b.Status = "Claimed";
            b.ClaimedByEmail = producerEmail;
            b.ClaimedAt = DateTime.UtcNow;

            _ = NotifyAsync(producerEmail, NotificationType.ReviewAssigned,
                "Bounty Assigned to You for Resolution",
                $"You have retained bounty '{b.Title}' to resolve the test issues.");
        }

        return Task.FromResult(MapToDetailDto(b, producerEmail));
    }

    public async Task<BountyDto> CompleteBountyAsync(string id, string userEmail)
    {
        var b = FindBounty(id);
        if (b == null)
        {
            throw new InvalidOperationException($"Bounty '{id}' not found.");
        }

        b.Status = "Completed";
        b.Stage = BountyStages.Completed;
        b.CompletedAt = DateTime.UtcNow;
        b.WinnerEmail = b.ClaimedByEmail ?? userEmail;

        string artId = !string.IsNullOrWhiteSpace(b.RelatedArtifactId)
            ? b.RelatedArtifactId
            : b.Title.ToLowerInvariant().Replace(" ", "-").Trim();

        string content = b.Submissions.LastOrDefault()?.SolutionCode ?? string.Empty;
        if (string.IsNullOrWhiteSpace(content) && !string.IsNullOrEmpty(b.ReviewId))
        {
            try
            {
                var rev = _reviewService.GetReview(b.ReviewId);
                if (rev != null && !string.IsNullOrWhiteSpace(rev.Content))
                {
                    content = rev.Content;
                }
            }
            catch (Exception ex) { _logger?.LogDebug(ex, "Handled non-fatal exception in BountyService operation"); }
        }

        if (string.IsNullOrWhiteSpace(content))
        {
            content = $"# {b.Title}\n\n{b.Description}\n\n```markdown\n# {artId}\nArtifact published via Engineering Commons bounty completion.\n```";
        }

        if (_marketplaceService != null)
        {
            try
            {
                await _marketplaceService.PublishArtifactAsync(artId, content);
                b.IsPublished = true;
                b.PublishedToMarketplaceAt = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Bounty '{BountyId}' complete: marketplace publish exception: {Message}", b.Id, ex.Message);
            }
        }

        if (!string.IsNullOrEmpty(b.ReviewId))
        {
            try
            {
                var rev = _reviewService.GetReview(b.ReviewId);
                if (rev != null)
                {
                    rev.Status = ReviewStatus.Published;
                    rev.IsPublished = true;
                    rev.PublishedAt = DateTime.UtcNow;
                    rev.PublishError = null;
                }
            }
            catch (Exception ex) { _logger?.LogDebug(ex, "Handled non-fatal exception in BountyService operation"); }
        }

        if (_usageService != null)
        {
            try
            {
                await _usageService.RecordUsageAsync(new UsageEvent
                {
                    Id = Guid.NewGuid().ToString(),
                    Action = "PUBLISH",
                    ArtifactName = artId,
                    UserId = b.WinnerEmail ?? userEmail,
                    Source = "bounty-automation",
                    Timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex) { _logger?.LogDebug(ex, "Handled non-fatal exception in BountyService operation"); }
        }

        return MapToDto(b, userEmail);
    }

    public Task<bool> ReportIssueAsync(string id, string reporterEmail, string description, string? severity = null)
    {
        var b = FindBounty(id);
        if (b == null)
        {
            throw new InvalidOperationException($"Bounty '{id}' not found.");
        }

        _ = NotifyAsync(reporterEmail, NotificationType.ChangesRequested,
            $"Issue Reported on Bounty '{b.Title}'",
            $"Issue: {description} (Severity: {severity ?? "Medium"})");

        return Task.FromResult(true);
    }

    public Task<MyWorkSummaryDto> GetMyWorkSummaryAsync(string userEmail)
    {
        ProcessAutoReleases();
        bool isConsumer = !string.IsNullOrEmpty(userEmail) && userEmail.Contains("consumer", StringComparison.OrdinalIgnoreCase);
        bool isReviewer = !string.IsNullOrEmpty(userEmail) && userEmail.Contains("reviewer", StringComparison.OrdinalIgnoreCase);

        var claimed = new List<BountyDto>();
        if (!isConsumer)
        {
            claimed = _bounties.Values
                .Where(b => b.Status == "Claimed" && (
                    string.Equals(b.ClaimedByEmail, userEmail, StringComparison.OrdinalIgnoreCase) ||
                    (!isReviewer && string.IsNullOrEmpty(b.ClaimedByEmail)) ||
                    (!isReviewer && b.ClaimedByEmail != null && b.ClaimedByEmail.StartsWith("producer", StringComparison.OrdinalIgnoreCase)) ||
                    (isReviewer && b.ClaimedByEmail != null && (b.ClaimedByEmail.StartsWith("reviewer", StringComparison.OrdinalIgnoreCase) || string.Equals(b.ClaimedByEmail, userEmail, StringComparison.OrdinalIgnoreCase)))
                ))
                .Select(b => MapToDto(b, userEmail))
                .ToList();
        }

        var openCount = _bounties.Values.Count(b => b.Status == "Open");

        var reviews = new List<MyReviewItemDto>();
        if (!isConsumer)
        {
            try
            {
                var pendingReviews = _reviewService.GetPendingReviews();
                foreach (var r in pendingReviews)
                {
                    if (isReviewer && !string.IsNullOrEmpty(r.ReviewerEmail) && !string.Equals(r.ReviewerEmail, userEmail, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    var hash = "#" + (r.Id.Length >= 4 ? r.Id.Substring(0, 4) : "a12f");
                    reviews.Add(new MyReviewItemDto
                    {
                        ReviewId = r.Id,
                        ArtifactId = r.ArtifactId,
                        ArtifactName = r.ArtifactId,
                        Version = "1.0.0",
                        ShortHash = hash,
                        Status = r.Status.ToString(),
                        ProducerEmail = r.ProducerEmail,
                        SubmittedAt = r.SubmittedAt,
                        SlaTargetMinutes = r.SlaTargetMinutes,
                        SlaDeadline = r.EffectiveSlaDeadline,
                        SlaRemainingMinutes = r.SlaRemainingMinutes,
                        SlaRemainingFormatted = r.SlaRemainingFormatted,
                        IsSlaWarning = r.IsSlaWarning,
                        IsSlaBreached = r.IsSlaBreached
                    });
                }
            }
            catch (Exception ex) { _logger?.LogDebug(ex, "Handled non-fatal exception in BountyService operation"); }

            if (reviews.Count == 0 && (isReviewer || string.IsNullOrEmpty(userEmail) || userEmail.Contains("producer", StringComparison.OrdinalIgnoreCase)))
            {
                var fallbackSubmitted = DateTime.UtcNow.AddHours(-4);
                var fallbackDeadline = fallbackSubmitted.AddHours(24);
                var fallbackRemaining = Math.Round((fallbackDeadline - DateTime.UtcNow).TotalMinutes, 1);
                var fallbackHours = (int)fallbackRemaining / 60;
                var fallbackMins = (int)fallbackRemaining % 60;
                reviews.Add(new MyReviewItemDto
                {
                    ReviewId = "rev-a12f",
                    ArtifactId = "accessibility-fix",
                    ArtifactName = "accessibility-fix",
                    Version = "1.0.0",
                    ShortHash = "#a12f",
                    Status = "UnderReview",
                    ProducerEmail = "producer@company.com",
                    SubmittedAt = fallbackSubmitted,
                    SlaTargetMinutes = 1440,
                    SlaDeadline = fallbackDeadline,
                    SlaRemainingMinutes = fallbackRemaining,
                    SlaRemainingFormatted = $"{fallbackHours}h {fallbackMins}m remaining",
                    IsSlaWarning = false,
                    IsSlaBreached = false
                });
            }
        }

        var summary = new MyWorkSummaryDto
        {
            ClaimedBounties = claimed,
            Reviews = reviews,
            TotalCreditsEarned = claimed.Sum(c => c.Credits),
            OpenBountiesCount = openCount,
            MyWorkCount = claimed.Count + reviews.Count
        };

        return Task.FromResult(summary);
    }

    public Task<BountyAnalyticsDto> GetBountyAnalyticsAsync()
    {
        var all = _bounties.Values.ToList();
        var completed = all.Where(b => b.Status == "Completed" || b.Stage == BountyStages.Completed).ToList();
        var open = all.Where(b => b.Status == "Open").ToList();
        var inProgress = all.Where(b => b.Status == "Claimed" && b.Stage != BountyStages.Completed).ToList();

        var stageBreakdown = new Dictionary<string, int>
        {
            [BountyStages.Open] = all.Count(b => b.Stage == BountyStages.Open),
            [BountyStages.CodeGeneration] = all.Count(b => b.Stage == BountyStages.CodeGeneration),
            [BountyStages.InReview] = all.Count(b => b.Stage == BountyStages.InReview),
            [BountyStages.InTesting] = all.Count(b => b.Stage == BountyStages.InTesting),
            [BountyStages.Completed] = completed.Count
        };

        var categoryBreakdown = all
            .GroupBy(b => b.Category)
            .ToDictionary(g => g.Key, g => g.Count());

        double avgCompletionHours = 0;
        if (completed.Any(c => c.CompletedAt.HasValue))
        {
            avgCompletionHours = Math.Round(
                completed.Where(c => c.CompletedAt.HasValue)
                         .Average(c => (c.CompletedAt!.Value - c.CreatedAt).TotalHours), 1);
        }

        var topContributors = completed
            .Where(b => !string.IsNullOrEmpty(b.WinnerEmail))
            .GroupBy(b => b.WinnerEmail!)
            .Select(g => new ContributorBountyStatDto
            {
                Email = g.Key,
                CompletedBounties = g.Count(),
                TotalCreditsEarned = g.Sum(x => x.Credits)
            })
            .OrderByDescending(c => c.CompletedBounties)
            .Take(5)
            .ToList();

        var analytics = new BountyAnalyticsDto
        {
            TotalBounties = all.Count,
            OpenCount = open.Count,
            InProgressCount = inProgress.Count,
            CompletedCount = completed.Count,
            SuccessRatePercent = all.Count > 0 ? Math.Round(((double)completed.Count / all.Count) * 100.0, 1) : 0,
            AverageCompletionHours = avgCompletionHours,
            StageBreakdown = stageBreakdown,
            CategoryBreakdown = categoryBreakdown,
            TopContributors = topContributors
        };

        return Task.FromResult(analytics);
    }

    private async Task NotifyAsync(string recipientEmail, NotificationType type, string title, string message)
    {
        if (string.IsNullOrEmpty(recipientEmail)) return;

        try
        {
            if (_notificationService != null)
            {
                await _notificationService.CreateNotificationAsync(new Notification
                {
                    RecipientEmail = recipientEmail,
                    Type = type,
                    Title = title,
                    Message = message,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }
        catch (Exception ex) { _logger?.LogDebug(ex, "Handled non-fatal exception in BountyService operation"); }
    }

    private static BountyDto MapToDto(Bounty b, string userEmail)
    {
        bool isClaimedByMe = !string.IsNullOrEmpty(userEmail) && string.Equals(b.ClaimedByEmail, userEmail, StringComparison.OrdinalIgnoreCase);
        var latestTest = b.TestRuns.LastOrDefault();
        var latestReview = b.Reviews.LastOrDefault();

        var baseline = b.ClaimedAt ?? b.CreatedAt;
        var slaDeadline = baseline.AddDays(Math.Max(1, b.DueInDays));
        var remainingMinutes = (int)Math.Round((slaDeadline - DateTime.UtcNow).TotalMinutes);

        string slaFormatted;
        if (remainingMinutes < 0)
        {
            var overdue = Math.Abs(remainingMinutes);
            slaFormatted = $"🚨 Breached by {overdue / 60}h {overdue % 60}m ({overdue}m overdue)";
        }
        else
        {
            var hours = remainingMinutes / 60;
            var mins = remainingMinutes % 60;
            slaFormatted = hours > 0 ? $"{hours}h {mins}m remaining ({remainingMinutes}m)" : $"{mins}m remaining";
        }

        var autoReleaseDeadline = baseline.AddHours(Math.Max(1, b.AutoReleasesHours));
        var autoReleaseRemainingMinutes = (int)Math.Round((autoReleaseDeadline - DateTime.UtcNow).TotalMinutes);

        string autoReleaseFormatted;
        if (autoReleaseRemainingMinutes < 0)
        {
            var past = Math.Abs(autoReleaseRemainingMinutes);
            autoReleaseFormatted = $"Released {past / 60}h {past % 60}m ago";
        }
        else
        {
            var arHours = autoReleaseRemainingMinutes / 60;
            var arMins = autoReleaseRemainingMinutes % 60;
            autoReleaseFormatted = arHours > 0 ? $"{arHours}h {arMins}m" : $"{arMins}m";
        }

        bool isSlaWarning = remainingMinutes <= 120 && remainingMinutes > 0;
        bool isSlaBreached = remainingMinutes <= 0;

        return new BountyDto
        {
            Id = b.Id,
            Title = b.Title,
            Category = b.Category,
            Credits = b.Credits,
            Points = b.Points,
            Status = b.Status,
            Stage = b.Stage,
            ClaimedByEmail = b.ClaimedByEmail,
            ClaimedAt = b.ClaimedAt,
            CreatedByEmail = b.CreatedByEmail,
            DueInDays = b.DueInDays,
            AutoReleasesHours = b.AutoReleasesHours,
            RelatedArtifactId = b.RelatedArtifactId,
            ReviewId = b.ReviewId,
            Description = b.Description,
            CreatedAt = b.CreatedAt,
            CompletedAt = b.CompletedAt,
            WinnerEmail = b.WinnerEmail,
            IsPublished = b.IsPublished,
            PublishedToMarketplaceAt = b.PublishedToMarketplaceAt,
            IsClaimedByMe = isClaimedByMe,
            SubmissionsCount = b.Submissions.Count,
            ReviewsCount = b.Reviews.Count,
            TestRunsCount = b.TestRuns.Count,
            LatestTestPassed = latestTest?.IsPassed,
            LatestFeedback = latestReview?.Feedback,
            ProducerResolutionPreference = b.ProducerResolutionPreference,
            SlaDeadline = slaDeadline,
            SlaRemainingMinutes = remainingMinutes,
            SlaRemainingFormatted = slaFormatted,
            AutoReleaseDeadline = autoReleaseDeadline,
            AutoReleaseRemainingMinutes = autoReleaseRemainingMinutes,
            AutoReleaseRemainingFormatted = autoReleaseFormatted,
            IsSlaWarning = isSlaWarning,
            IsSlaBreached = isSlaBreached,
            CanClaim = b.Status == "Open" || (b.Status == "Claimed" && b.ProducerResolutionPreference == "OpenToCommunity" && !isClaimedByMe),
            CanSubmitCode = b.Stage == BountyStages.CodeGeneration && (isClaimedByMe || b.Status == "Open"),
            CanReview = b.Stage == BountyStages.InReview,
            CanRunTests = b.Stage == BountyStages.InTesting
        };
    }

    private static BountyDetailDto MapToDetailDto(Bounty b, string userEmail)
    {
        var baseDto = MapToDto(b, userEmail);
        return new BountyDetailDto
        {
            Id = baseDto.Id,
            Title = baseDto.Title,
            Category = baseDto.Category,
            Credits = baseDto.Credits,
            Points = baseDto.Points,
            Status = baseDto.Status,
            Stage = baseDto.Stage,
            ClaimedByEmail = baseDto.ClaimedByEmail,
            ClaimedAt = baseDto.ClaimedAt,
            CreatedByEmail = baseDto.CreatedByEmail,
            DueInDays = baseDto.DueInDays,
            AutoReleasesHours = baseDto.AutoReleasesHours,
            RelatedArtifactId = baseDto.RelatedArtifactId,
            ReviewId = baseDto.ReviewId,
            Description = baseDto.Description,
            CreatedAt = baseDto.CreatedAt,
            CompletedAt = baseDto.CompletedAt,
            WinnerEmail = baseDto.WinnerEmail,
            IsPublished = baseDto.IsPublished,
            PublishedToMarketplaceAt = baseDto.PublishedToMarketplaceAt,
            IsClaimedByMe = baseDto.IsClaimedByMe,
            SubmissionsCount = baseDto.SubmissionsCount,
            ReviewsCount = baseDto.ReviewsCount,
            TestRunsCount = baseDto.TestRunsCount,
            LatestTestPassed = baseDto.LatestTestPassed,
            LatestFeedback = baseDto.LatestFeedback,
            ProducerResolutionPreference = baseDto.ProducerResolutionPreference,
            SlaDeadline = baseDto.SlaDeadline,
            SlaRemainingMinutes = baseDto.SlaRemainingMinutes,
            SlaRemainingFormatted = baseDto.SlaRemainingFormatted,
            AutoReleaseDeadline = baseDto.AutoReleaseDeadline,
            AutoReleaseRemainingMinutes = baseDto.AutoReleaseRemainingMinutes,
            AutoReleaseRemainingFormatted = baseDto.AutoReleaseRemainingFormatted,
            IsSlaWarning = baseDto.IsSlaWarning,
            IsSlaBreached = baseDto.IsSlaBreached,
            CanClaim = baseDto.CanClaim,
            CanSubmitCode = baseDto.CanSubmitCode,
            CanReview = baseDto.CanReview,
            CanRunTests = baseDto.CanRunTests,
            Submissions = b.Submissions.OrderByDescending(s => s.SubmittedAt).ToList(),
            Reviews = b.Reviews.OrderByDescending(r => r.ReviewedAt).ToList(),
            TestRuns = b.TestRuns.OrderByDescending(t => t.ExecutedAt).ToList()
        };
    }
}

