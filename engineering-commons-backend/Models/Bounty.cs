using System;
using System.Collections.Generic;

namespace EngineeringCommons.Backend.Models;

public static class BountyStages
{
    public const string Open = "Open";
    public const string CodeGeneration = "CodeGeneration";
    public const string InReview = "InReview";
    public const string InTesting = "InTesting";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";
}

public class BountySubmission
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SubmittedByEmail { get; set; } = string.Empty;
    public string SolutionCode { get; set; } = string.Empty;
    public string? CommitSha { get; set; }
    public string? Notes { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
}

public class BountyReview
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ReviewerEmail { get; set; } = string.Empty;
    public bool IsApproved { get; set; }
    public string Feedback { get; set; } = string.Empty;
    public DateTime ReviewedAt { get; set; } = DateTime.UtcNow;
}

public class BountyTestRun
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TesterEmail { get; set; } = string.Empty;
    public string TestSuiteName { get; set; } = "Automated Test Suite";
    public bool IsPassed { get; set; }
    public int PassedCount { get; set; }
    public int FailedCount { get; set; }
    public string TestLogs { get; set; } = string.Empty;
    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
}

public class Bounty
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = "Code gen"; // "Code gen", "Review", "Testing", "Prompt"
    public int Credits { get; set; } = 100;
    public int Points { get; set; } = 50;
    public string Status { get; set; } = "Open"; // "Open", "Claimed", "Completed", "Released"
    public string Stage { get; set; } = BountyStages.Open; // Open -> CodeGeneration -> InReview -> InTesting -> Completed
    public string? ClaimedByEmail { get; set; }
    public DateTime? ClaimedAt { get; set; }
    public string? CreatedByEmail { get; set; }
    public int DueInDays { get; set; } = 2;
    public int AutoReleasesHours { get; set; } = 18;
    public string? RelatedArtifactId { get; set; }
    public string? ReviewId { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string? WinnerEmail { get; set; }
    
    // Feedback loop preference: KeepToResolve vs OpenToCommunity
    public string ProducerResolutionPreference { get; set; } = "KeepToResolve";

    public bool IsPublished { get; set; }
    public DateTime? PublishedToMarketplaceAt { get; set; }

    // History logs
    public List<BountySubmission> Submissions { get; set; } = new();
    public List<BountyReview> Reviews { get; set; } = new();
    public List<BountyTestRun> TestRuns { get; set; } = new();
}

public class BountyDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = "Code gen";
    public int Credits { get; set; }
    public int Points { get; set; }
    public string Status { get; set; } = "Open";
    public string Stage { get; set; } = BountyStages.Open;
    public string? ClaimedByEmail { get; set; }
    public DateTime? ClaimedAt { get; set; }
    public string? CreatedByEmail { get; set; }
    public int DueInDays { get; set; } = 2;
    public int AutoReleasesHours { get; set; } = 18;
    public string? RelatedArtifactId { get; set; }
    public string? ReviewId { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? WinnerEmail { get; set; }
    public bool IsPublished { get; set; }
    public DateTime? PublishedToMarketplaceAt { get; set; }
    public bool IsClaimedByMe { get; set; }
    public int SubmissionsCount { get; set; }
    public int ReviewsCount { get; set; }
    public int TestRunsCount { get; set; }
    public bool? LatestTestPassed { get; set; }
    public string? LatestFeedback { get; set; }
    public string ProducerResolutionPreference { get; set; } = "KeepToResolve";

    // Realtime SLA and Auto-Release Tracking
    public DateTime? SlaDeadline { get; set; }
    public int SlaRemainingMinutes { get; set; }
    public string SlaRemainingFormatted { get; set; } = string.Empty;
    public DateTime? AutoReleaseDeadline { get; set; }
    public int AutoReleaseRemainingMinutes { get; set; }
    public string AutoReleaseRemainingFormatted { get; set; } = string.Empty;
    public bool IsSlaWarning { get; set; }
    public bool IsSlaBreached { get; set; }

    // Role-based capability flags for UI
    public bool CanClaim { get; set; }
    public bool CanSubmitCode { get; set; }
    public bool CanReview { get; set; }
    public bool CanRunTests { get; set; }
}

public class BountyDetailDto : BountyDto
{
    public List<BountySubmission> Submissions { get; set; } = new();
    public List<BountyReview> Reviews { get; set; } = new();
    public List<BountyTestRun> TestRuns { get; set; } = new();
}

public class CreateBountyRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = "Code gen";
    public int Credits { get; set; } = 100;
    public int Points { get; set; } = 50;
    public string? RelatedArtifactId { get; set; }
    public int DueInDays { get; set; } = 2;
}

public class BountySubmissionRequest
{
    public string SolutionCode { get; set; } = string.Empty;
    public string? CommitSha { get; set; }
    public string? Notes { get; set; }
}

public class BountyReviewRequest
{
    public bool IsApproved { get; set; }
    public string Feedback { get; set; } = string.Empty;
}

public class BountyTestRunRequest
{
    public string? TestSuiteName { get; set; }
    public bool IsPassed { get; set; }
    public int PassedCount { get; set; }
    public int FailedCount { get; set; }
    public string? TestLogs { get; set; }
}

public class BountyFeedbackChoiceRequest
{
    public string Choice { get; set; } = "KeepToResolve"; // "KeepToResolve" or "OpenToCommunity"
}

public class BountyAnalyticsDto
{
    public int TotalBounties { get; set; }
    public int OpenCount { get; set; }
    public int InProgressCount { get; set; }
    public int CompletedCount { get; set; }
    public double SuccessRatePercent { get; set; }
    public double AverageCompletionHours { get; set; }
    public Dictionary<string, int> StageBreakdown { get; set; } = new();
    public Dictionary<string, int> CategoryBreakdown { get; set; } = new();
    public List<ContributorBountyStatDto> TopContributors { get; set; } = new();
}

public class ContributorBountyStatDto
{
    public string Email { get; set; } = string.Empty;
    public int CompletedBounties { get; set; }
    public int TotalCreditsEarned { get; set; }
}

public class MyWorkSummaryDto
{
    public List<BountyDto> ClaimedBounties { get; set; } = new();
    public List<MyReviewItemDto> Reviews { get; set; } = new();
    public int TotalCreditsEarned { get; set; }
    public int OpenBountiesCount { get; set; }
    public int MyWorkCount { get; set; }
}

public class MyReviewItemDto
{
    public string ReviewId { get; set; } = string.Empty;
    public string ArtifactId { get; set; } = string.Empty;
    public string ArtifactName { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0.0";
    public string ShortHash { get; set; } = string.Empty; // e.g. "#a12f"
    public string Status { get; set; } = "UnderReview";
    public string ProducerEmail { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }

    // SLA Tracking Fields
    public int SlaTargetMinutes { get; set; } = 1440;
    public DateTime? SlaDeadline { get; set; }
    public double SlaRemainingMinutes { get; set; }
    public string SlaRemainingFormatted { get; set; } = string.Empty;
    public bool IsSlaWarning { get; set; }
    public bool IsSlaBreached { get; set; }
}
