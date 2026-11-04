using System;

namespace CipBackend.Models;

public enum AccessRequestStatus
{
    Pending,
    Approved,
    Rejected,
    Revoked
}

public class UserAccessRequest
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserEmail { get; set; } = string.Empty;
    public string RequestedRole { get; set; } = "REVIEWER";
    public string CurrentRole { get; set; } = "PRODUCER";
    public AccessRequestStatus Status { get; set; } = AccessRequestStatus.Pending;
    public string? Reason { get; set; }
    public string AdminEmail { get; set; } = "harsh.rana@maqsoftware.com";
    public string? AdminNotes { get; set; }
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
}

public class CreateAccessRequestDto
{
    public string RequestedRole { get; set; } = "REVIEWER";
    public string? Reason { get; set; }
}

public class ReviewAccessRequestDecisionDto
{
    public string? Notes { get; set; }
}

public class CertifyReviewerRequestDto
{
    public string TargetEmail { get; set; } = string.Empty;
    public string? ReviewerEmail { get; set; }
    public string? Notes { get; set; }
    public string EffectiveTargetEmail => !string.IsNullOrWhiteSpace(TargetEmail) ? TargetEmail : (ReviewerEmail ?? string.Empty);
}

public class RevokeAccessRequestDto
{
    public string TargetEmail { get; set; } = string.Empty;
    public string? UserEmail { get; set; }
    public string? Notes { get; set; }
    public string EffectiveTargetEmail => !string.IsNullOrWhiteSpace(TargetEmail) ? TargetEmail : (UserEmail ?? string.Empty);
}
