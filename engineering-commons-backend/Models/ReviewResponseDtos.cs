using System;

namespace EngineeringCommons.Backend.Models;

public class ReviewAssignmentResponseDto
{
    public bool Success { get; set; } = true;
    public string ReviewId { get; set; } = string.Empty;
    public string? ReviewerEmail { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class ReviewActionResponseDto
{
    public bool Success { get; set; } = true;
    public string ReviewId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public object? Bounty { get; set; }
}

public class ReviewThreadCreatedResponseDto
{
    public bool Success { get; set; } = true;
    public string ThreadId { get; set; } = string.Empty;
}

public class ReviewSlaUpdateResponseDto
{
    public bool Success { get; set; } = true;
    public string ReviewId { get; set; } = string.Empty;
    public string ArtifactId { get; set; } = string.Empty;
    public int SlaTargetMinutes { get; set; }
    public DateTime? SlaDeadline { get; set; }
    public double SlaRemainingMinutes { get; set; }
    public string SlaRemainingFormatted { get; set; } = string.Empty;
    public string SlaStatus { get; set; } = string.Empty;
}

public class ReviewSlaCheckResponseDto
{
    public bool Success { get; set; } = true;
    public int RemindersSent { get; set; }
    public string CheckedAt { get; set; } = DateTime.UtcNow.ToString("o");
}

