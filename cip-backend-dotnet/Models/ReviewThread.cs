using System;
using System.Collections.Generic;

namespace CipBackend.Models;

[System.Text.Json.Serialization.JsonConverter(typeof(System.Text.Json.Serialization.JsonStringEnumConverter))]
[Newtonsoft.Json.JsonConverter(typeof(Newtonsoft.Json.Converters.StringEnumConverter))]
public enum ThreadStatus
{
    Open,
    ChangesRequested,
    Resolved,
    Closed
}

public class ReviewMessage
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ThreadId { get; set; } = string.Empty;
    public string AuthorEmail { get; set; } = string.Empty;
    public string AuthorRole { get; set; } = "Producer"; // "Reviewer" or "Producer"
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ReviewThread
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ReviewId { get; set; } = string.Empty;
    public string ArtifactId { get; set; } = string.Empty;
    public string ArtifactName { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0.0";
    public string ProducerEmail { get; set; } = string.Empty;
    public string? ReviewerEmail { get; set; }
    public ThreadStatus Status { get; set; } = ThreadStatus.Open;
    public string? Feedback { get; set; }
    public string? ReviewStatus { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<ReviewMessage> Messages { get; set; } = new();

    // SLA tracking fields
    public int SlaTargetMinutes { get; set; } = 1440;
    public DateTime? SlaDeadline { get; set; }
    public double SlaRemainingMinutes { get; set; } = 1440;
    public string SlaStatus { get; set; } = "OnTrack";
    public string SlaRemainingFormatted { get; set; } = "24h remaining";
    public bool IsSlaBreached { get; set; } = false;
    public bool IsSlaWarning { get; set; } = false;
}
