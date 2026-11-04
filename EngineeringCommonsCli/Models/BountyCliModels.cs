using System.Text.Json.Serialization;

namespace EngineeringCommonsCli.Models;

public class BountyCliDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("credits")]
    public int Credits { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("stage")]
    public string Stage { get; set; } = string.Empty;

    [JsonPropertyName("claimedByEmail")]
    public string? ClaimedByEmail { get; set; }

    [JsonPropertyName("claimedAt")]
    public DateTime? ClaimedAt { get; set; }

    [JsonPropertyName("createdByEmail")]
    public string? CreatedByEmail { get; set; }

    [JsonPropertyName("dueInDays")]
    public int DueInDays { get; set; }

    [JsonPropertyName("autoReleasesHours")]
    public int AutoReleasesHours { get; set; }

    [JsonPropertyName("relatedArtifactId")]
    public string? RelatedArtifactId { get; set; }

    [JsonPropertyName("reviewId")]
    public string? ReviewId { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("completedAt")]
    public DateTime? CompletedAt { get; set; }

    [JsonPropertyName("winnerEmail")]
    public string? WinnerEmail { get; set; }

    [JsonPropertyName("isClaimedByMe")]
    public bool IsClaimedByMe { get; set; }

    [JsonPropertyName("submissionsCount")]
    public int SubmissionsCount { get; set; }

    [JsonPropertyName("reviewsCount")]
    public int ReviewsCount { get; set; }

    [JsonPropertyName("testRunsCount")]
    public int TestRunsCount { get; set; }

    [JsonPropertyName("latestTestPassed")]
    public bool? LatestTestPassed { get; set; }

    [JsonPropertyName("latestFeedback")]
    public string? LatestFeedback { get; set; }

    [JsonPropertyName("producerResolutionPreference")]
    public string? ProducerResolutionPreference { get; set; }

    [JsonPropertyName("canClaim")]
    public bool CanClaim { get; set; }

    [JsonPropertyName("canSubmitCode")]
    public bool CanSubmitCode { get; set; }

    [JsonPropertyName("canReview")]
    public bool CanReview { get; set; }

    [JsonPropertyName("canRunTests")]
    public bool CanRunTests { get; set; }
}

public class BountyDetailCliDto : BountyCliDto
{
    [JsonPropertyName("submissions")]
    public List<BountySubmissionCliDto> Submissions { get; set; } = new();

    [JsonPropertyName("reviews")]
    public List<BountyReviewCliDto> Reviews { get; set; } = new();

    [JsonPropertyName("testRuns")]
    public List<BountyTestRunCliDto> TestRuns { get; set; } = new();
}

public class BountySubmissionCliDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("submittedByEmail")]
    public string SubmittedByEmail { get; set; } = string.Empty;

    [JsonPropertyName("solutionCode")]
    public string SolutionCode { get; set; } = string.Empty;

    [JsonPropertyName("commitSha")]
    public string? CommitSha { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("submittedAt")]
    public DateTime SubmittedAt { get; set; }
}

public class BountyReviewCliDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("reviewerEmail")]
    public string ReviewerEmail { get; set; } = string.Empty;

    [JsonPropertyName("isApproved")]
    public bool IsApproved { get; set; }

    [JsonPropertyName("feedback")]
    public string Feedback { get; set; } = string.Empty;

    [JsonPropertyName("reviewedAt")]
    public DateTime ReviewedAt { get; set; }
}

public class BountyTestRunCliDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("testerEmail")]
    public string TesterEmail { get; set; } = string.Empty;

    [JsonPropertyName("testSuiteName")]
    public string TestSuiteName { get; set; } = string.Empty;

    [JsonPropertyName("isPassed")]
    public bool IsPassed { get; set; }

    [JsonPropertyName("passedCount")]
    public int PassedCount { get; set; }

    [JsonPropertyName("failedCount")]
    public int FailedCount { get; set; }

    [JsonPropertyName("testLogs")]
    public string TestLogs { get; set; } = string.Empty;

    [JsonPropertyName("executedAt")]
    public DateTime ExecutedAt { get; set; }
}

public class BountyAnalyticsCliDto
{
    [JsonPropertyName("totalBounties")]
    public int TotalBounties { get; set; }

    [JsonPropertyName("openBounties")]
    public int OpenBounties { get; set; }

    [JsonPropertyName("claimedBounties")]
    public int ClaimedBounties { get; set; }

    [JsonPropertyName("completedBounties")]
    public int CompletedBounties { get; set; }

    [JsonPropertyName("totalCreditsPaid")]
    public int TotalCreditsPaid { get; set; }

    [JsonPropertyName("successRatePercent")]
    public double SuccessRatePercent { get; set; }

    [JsonPropertyName("averageCompletionHours")]
    public double AverageCompletionHours { get; set; }

    [JsonPropertyName("stageDistribution")]
    public Dictionary<string, int> StageDistribution { get; set; } = new();

    [JsonPropertyName("categoryBreakdown")]
    public Dictionary<string, int> CategoryBreakdown { get; set; } = new();
}
