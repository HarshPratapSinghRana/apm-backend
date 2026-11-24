namespace EngineeringCommons.Backend.Models;

public enum ReviewStatus
{
    Draft,
    Submitted,
    UnderReview,
    ChangesRequested,
    Resubmitted,
    Approved,
    Rejected,
    Published,
    Cancelled
}

public class Review
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ArtifactId { get; set; } = string.Empty;
    public string ProducerEmail { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public ReviewStatus Status { get; set; } = ReviewStatus.Submitted;
    public string? ReviewerEmail { get; set; }
    public string? Feedback { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DecisionAt { get; set; }
    // Publishing state (separate from review decision)
    public bool IsPublished { get; set; } = false;
    public DateTime? PublishedAt { get; set; }
    public string? PublishError { get; set; }
    // Visibility: true = private to producer while under development; false = public to all developers
    public bool IsPrivate { get; set; } = false;
    // Granular RBAC whitelist permissions for private artifacts (comma-separated email lists)
    public string? AllowedContributors { get; set; }
    public string? AllowedReviewers { get; set; }
    public string? AllowedConsumers { get; set; }
    // Cryptographic SHA-256 content hash at submission time for immutable review verification
    public string? ContentHash { get; set; }

    // SLA (Service Level Agreement) Tracking & Escalation
    public int SlaTargetMinutes { get; set; } = 1440; // Default: 24 hours (1440 minutes)
    public DateTime? SlaDeadline { get; set; }
    public DateTime? LastSlaReminderSentAt { get; set; }

    // Calculated SLA Helpers
    public DateTime EffectiveSlaDeadline => SlaDeadline ?? SubmittedAt.AddMinutes(SlaTargetMinutes > 0 ? SlaTargetMinutes : 1440);

    public double SlaRemainingMinutes
    {
        get
        {
            var endPoint = DecisionAt ?? DateTime.UtcNow;
            return Math.Round((EffectiveSlaDeadline - endPoint).TotalMinutes, 1);
        }
    }

    public bool IsSlaBreached => SlaRemainingMinutes < 0;

    public bool IsSlaWarning => !IsSlaBreached && SlaRemainingMinutes <= Math.Min(60, SlaTargetMinutes * 0.25);

    public string SlaStatus
    {
        get
        {
            if (Status == ReviewStatus.Approved || Status == ReviewStatus.Published)
            {
                return IsSlaBreached ? "CompletedLate" : "CompletedOnTime";
            }
            if (Status == ReviewStatus.Rejected || Status == ReviewStatus.Cancelled)
            {
                return "Closed";
            }
            if (IsSlaBreached)
            {
                return "Breached";
            }
            if (IsSlaWarning)
            {
                return "Warning";
            }
            return "OnTrack";
        }
    }

    public string SlaRemainingFormatted
    {
        get
        {
            var rem = SlaRemainingMinutes;
            if (Status == ReviewStatus.Approved || Status == ReviewStatus.Published)
            {
                return IsSlaBreached ? $"Completed late (breached by {FormatMinutes(Math.Abs(rem))})" : "Completed on time";
            }
            if (Status == ReviewStatus.Rejected || Status == ReviewStatus.Cancelled)
            {
                return "Closed";
            }
            if (rem < 0)
            {
                return $"🚨 Breached by {FormatMinutes(Math.Abs(rem))}";
            }
            if (IsSlaWarning)
            {
                return $"⚠️ {FormatMinutes(rem)} remaining (Expiring soon)";
            }
            return $"{FormatMinutes(rem)} remaining";
        }
    }

    private static string FormatMinutes(double totalMinutes)
    {
        var mins = (int)Math.Round(totalMinutes);
        if (mins < 60)
        {
            return $"{mins}m";
        }
        var hours = mins / 60;
        var remainingMins = mins % 60;
        return remainingMins > 0 ? $"{hours}h {remainingMins}m" : $"{hours}h";
    }
}

public class SlaSummaryDto
{
    public int TotalReviews { get; set; }
    public int ActivePending { get; set; }
    public int OnTrackCount { get; set; }
    public int WarningCount { get; set; }
    public int BreachedCount { get; set; }
    public int CompletedOnTimeCount { get; set; }
    public int CompletedLateCount { get; set; }
    public double SlaComplianceRatePercent { get; set; }
    public double AverageReviewDurationMinutes { get; set; }
}


