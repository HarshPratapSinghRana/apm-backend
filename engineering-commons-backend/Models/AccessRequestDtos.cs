using System;

namespace EngineeringCommons.Backend.Models;

public class CreateAccessRequestDto
{
    public string RequestedRole { get; set; } = UserRoles.Reviewer;
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

