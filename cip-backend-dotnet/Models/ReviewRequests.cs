using System;

namespace EngineeringCommons.Backend.Models;

public class ReviewDecisionRequest
{
    public string? Feedback { get; set; }
}

public class SendMessageRequest
{
    public string Message { get; set; } = string.Empty;
}

public class UpdateStatusRequest
{
    public string Status { get; set; } = "Open";
}

public class AssignReviewerRequest
{
    public string ReviewerEmail { get; set; } = string.Empty;
}

public class ResubmitRequest
{
    public string Content { get; set; } = string.Empty;
}

public class UpdateSlaRequest
{
    public int SlaTargetMinutes { get; set; } = 1440;
}
