using System;

namespace CipBackend.Models;

public enum NotificationType
{
    ReviewAssigned,
    FeedbackAdded,
    ProducerReplied,
    ChangesRequested,
    Resubmitted,
    ReviewApproved,
    ReviewRejected,
    ReviewCompleted,
    ReviewCancelled,
    AccessRequested,
    AccessApproved,
    AccessRejected,
    AccessRevoked,
    ReviewerCertified,
    SlaWarning,
    SlaBreached
}

public class Notification
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string RecipientEmail { get; set; } = string.Empty;
    public string? ThreadId { get; set; }
    public string SubmissionId { get; set; } = string.Empty;
    public string ArtifactId { get; set; } = string.Empty;
    public string ArtifactName { get; set; } = string.Empty;
    public string ArtifactVersion { get; set; } = "1.0.0";
    public NotificationType Type { get; set; } = NotificationType.ReviewAssigned;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ReferenceId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
    public bool IsRead => ReadAt.HasValue;
}

public class NotificationDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ThreadId { get; set; }
    public string SubmissionId { get; set; } = string.Empty;
    public string ArtifactId { get; set; } = string.Empty;
    public string ArtifactName { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0.0";
    public DateTime CreatedAt { get; set; }
    public bool IsRead { get; set; }
}
