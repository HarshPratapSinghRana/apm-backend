using System;
using CipBackend.Models;

namespace CipBackend.Events;

public abstract class ReviewDomainEvent
{
    public string EventId { get; set; } = Guid.NewGuid().ToString();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string SubmissionId { get; set; } = string.Empty;
    public string ArtifactId { get; set; } = string.Empty;
    public string ArtifactName { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0.0";
}

public class ReviewAssignedEvent : ReviewDomainEvent
{
    public string ReviewerEmail { get; set; } = string.Empty;
    public string ProducerEmail { get; set; } = string.Empty;
}

public class FeedbackAddedEvent : ReviewDomainEvent
{
    public string ThreadId { get; set; } = string.Empty;
    public string MessageId { get; set; } = string.Empty;
    public string ReviewerEmail { get; set; } = string.Empty;
    public string ProducerEmail { get; set; } = string.Empty;
    public string Feedback { get; set; } = string.Empty;
}

public class LineCommentAddedEvent : ReviewDomainEvent
{
    public string CommentId { get; set; } = string.Empty;
    public string? ThreadId { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public int? LineNumber { get; set; }
    public string LineType { get; set; } = "Context";
    public string AuthorEmail { get; set; } = string.Empty;
    public string AuthorRole { get; set; } = "Reviewer";
    public string TargetRecipientEmail { get; set; } = string.Empty;
    public string Comment { get; set; } = string.Empty;
}

public class ProducerRepliedEvent : ReviewDomainEvent
{
    public string ThreadId { get; set; } = string.Empty;
    public string MessageId { get; set; } = string.Empty;
    public string ProducerEmail { get; set; } = string.Empty;
    public string ReviewerEmail { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? FilePath { get; set; }
    public int? LineNumber { get; set; }
}

public class ChangesRequestedEvent : ReviewDomainEvent
{
    public string ThreadId { get; set; } = string.Empty;
    public string ReviewerEmail { get; set; } = string.Empty;
    public string ProducerEmail { get; set; } = string.Empty;
    public string? Feedback { get; set; }
}

public class ResubmittedEvent : ReviewDomainEvent
{
    public string ProducerEmail { get; set; } = string.Empty;
    public string ReviewerEmail { get; set; } = string.Empty;
}

public class ReviewApprovedEvent : ReviewDomainEvent
{
    public string ThreadId { get; set; } = string.Empty;
    public string ReviewerEmail { get; set; } = string.Empty;
    public string ProducerEmail { get; set; } = string.Empty;
    public string? Feedback { get; set; }
}

public class ReviewRejectedEvent : ReviewDomainEvent
{
    public string ThreadId { get; set; } = string.Empty;
    public string ReviewerEmail { get; set; } = string.Empty;
    public string ProducerEmail { get; set; } = string.Empty;
    public string? Feedback { get; set; }
}

public class ReviewCancelledEvent : ReviewDomainEvent
{
    public string ThreadId { get; set; } = string.Empty;
    public string ReviewerEmail { get; set; } = string.Empty;
    public string ProducerEmail { get; set; } = string.Empty;
    public string? Reason { get; set; }
}
