using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using CipBackend.Models;
using CipBackend.Services.Interfaces;

namespace CipBackend.Events;

public class ReviewNotificationEventHandler :
    IReviewEventHandler<ReviewAssignedEvent>,
    IReviewEventHandler<FeedbackAddedEvent>,
    IReviewEventHandler<LineCommentAddedEvent>,
    IReviewEventHandler<ProducerRepliedEvent>,
    IReviewEventHandler<ChangesRequestedEvent>,
    IReviewEventHandler<ResubmittedEvent>,
    IReviewEventHandler<ReviewApprovedEvent>,
    IReviewEventHandler<ReviewRejectedEvent>,
    IReviewEventHandler<ReviewCancelledEvent>
{
    private readonly INotificationService _notifications;
    private readonly ILogger<ReviewNotificationEventHandler> _logger;
    private readonly IEmailNotificationService _emailService;

    public ReviewNotificationEventHandler(
        INotificationService notifications,
        ILogger<ReviewNotificationEventHandler> logger,
        IEmailNotificationService emailService)
    {
        _notifications = notifications;
        _logger = logger;
        _emailService = emailService;
    }

    public async Task HandleAsync(ReviewAssignedEvent e)
    {
        await _notifications.CreateNotificationAsync(new Notification
        {
            RecipientEmail = e.ReviewerEmail,
            SubmissionId = e.SubmissionId,
            ArtifactId = e.ArtifactId,
            ArtifactName = e.ArtifactName,
            ArtifactVersion = e.Version,
            Type = NotificationType.ReviewAssigned,
            Title = $"{e.ArtifactName} v{e.Version}",
            Message = $"New review assigned for '{e.ArtifactName}'. Submitted by: {e.ProducerEmail}",
            ReferenceId = $"{e.SubmissionId}:ReviewAssigned:{e.ReviewerEmail}",
            CreatedAt = e.Timestamp
        });
    }

    public async Task HandleAsync(FeedbackAddedEvent e)
    {
        var preview = !string.IsNullOrWhiteSpace(e.Feedback)
            ? (e.Feedback.Length > 60 ? $": \"{e.Feedback.Substring(0, 57)}...\"" : $": \"{e.Feedback}\"")
            : "";

        await _notifications.CreateNotificationAsync(new Notification
        {
            RecipientEmail = e.ProducerEmail,
            SubmissionId = e.SubmissionId,
            ThreadId = e.ThreadId,
            ArtifactId = e.ArtifactId,
            ArtifactName = e.ArtifactName,
            ArtifactVersion = e.Version,
            Type = NotificationType.FeedbackAdded,
            Title = $"{e.ArtifactName} v{e.Version}",
            Message = $"{e.ReviewerEmail} added feedback{preview}",
            ReferenceId = $"{e.MessageId}:FeedbackAdded",
            CreatedAt = e.Timestamp
        });
    }

    public async Task HandleAsync(LineCommentAddedEvent e)
    {
        var lineInfo = e.LineNumber.HasValue ? $"Line {e.LineNumber}" : "File Comment";
        var preview = e.Comment.Length > 60 ? e.Comment.Substring(0, 57) + "..." : e.Comment;

        await _notifications.CreateNotificationAsync(new Notification
        {
            RecipientEmail = e.TargetRecipientEmail,
            SubmissionId = e.SubmissionId,
            ThreadId = e.ThreadId,
            ArtifactId = e.ArtifactId,
            ArtifactName = e.ArtifactName,
            ArtifactVersion = e.Version,
            Type = NotificationType.FeedbackAdded,
            Title = $"{e.ArtifactName} v{e.Version}",
            Message = $"{e.AuthorEmail} commented on {e.FilePath} ({lineInfo}): \"{preview}\"",
            ReferenceId = $"{e.CommentId}:LineCommentAdded",
            CreatedAt = e.Timestamp
        });
    }

    public async Task HandleAsync(ProducerRepliedEvent e)
    {
        var location = !string.IsNullOrWhiteSpace(e.FilePath) 
            ? (e.LineNumber.HasValue ? $" on {e.FilePath}:{e.LineNumber}" : $" on {e.FilePath}") 
            : "";
        var preview = !string.IsNullOrWhiteSpace(e.Message)
            ? (e.Message.Length > 60 ? $": \"{e.Message.Substring(0, 57)}...\"" : $": \"{e.Message}\"")
            : "";

        await _notifications.CreateNotificationAsync(new Notification
        {
            RecipientEmail = e.ReviewerEmail,
            SubmissionId = e.SubmissionId,
            ThreadId = e.ThreadId,
            ArtifactId = e.ArtifactId,
            ArtifactName = e.ArtifactName,
            ArtifactVersion = e.Version,
            Type = NotificationType.ProducerReplied,
            Title = $"{e.ArtifactName} v{e.Version}",
            Message = $"{e.ProducerEmail} replied to your review thread{location}{preview}",
            ReferenceId = $"{e.MessageId}:ProducerReplied",
            CreatedAt = e.Timestamp
        });
    }

    public async Task HandleAsync(ChangesRequestedEvent e)
    {
        await _notifications.CreateNotificationAsync(new Notification
        {
            RecipientEmail = e.ProducerEmail,
            SubmissionId = e.SubmissionId,
            ThreadId = e.ThreadId,
            ArtifactId = e.ArtifactId,
            ArtifactName = e.ArtifactName,
            ArtifactVersion = e.Version,
            Type = NotificationType.ChangesRequested,
            Title = $"{e.ArtifactName} v{e.Version}",
            Message = $"Changes requested by {e.ReviewerEmail}.",
            ReferenceId = $"{e.SubmissionId}:ChangesRequested:{e.Timestamp.Ticks}",
            CreatedAt = e.Timestamp
        });
    }

    public async Task HandleAsync(ResubmittedEvent e)
    {
        await _notifications.CreateNotificationAsync(new Notification
        {
            RecipientEmail = e.ReviewerEmail,
            SubmissionId = e.SubmissionId,
            ArtifactId = e.ArtifactId,
            ArtifactName = e.ArtifactName,
            ArtifactVersion = e.Version,
            Type = NotificationType.Resubmitted,
            Title = $"{e.ArtifactName} v{e.Version}",
            Message = "The producer resubmitted the artifact for review.",
            ReferenceId = $"{e.SubmissionId}:Resubmitted:{e.ReviewerEmail}:{e.Timestamp.Ticks}",
            CreatedAt = e.Timestamp
        });
    }

    public async Task HandleAsync(ReviewApprovedEvent e)
    {
        await _notifications.CreateNotificationAsync(new Notification
        {
            RecipientEmail = e.ProducerEmail,
            SubmissionId = e.SubmissionId,
            ThreadId = e.ThreadId,
            ArtifactId = e.ArtifactId,
            ArtifactName = e.ArtifactName,
            ArtifactVersion = e.Version,
            Type = NotificationType.ReviewApproved,
            Title = $"{e.ArtifactName} v{e.Version}",
            Message = "Your artifact has been approved.",
            ReferenceId = $"{e.SubmissionId}:ReviewApproved",
            CreatedAt = e.Timestamp
        });

        // Email notification (COMMENTED OUT FOR NOW)
        /*
        try
        {
            await _emailService.SendArtifactPublishedNotificationAsync(e.ArtifactName, e.Version, e.ProducerEmail, "Company Review Board");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to dispatch marketplace published email for {Artifact}", e.ArtifactName);
        }
        */
    }

    public async Task HandleAsync(ReviewRejectedEvent e)
    {
        await _notifications.CreateNotificationAsync(new Notification
        {
            RecipientEmail = e.ProducerEmail,
            SubmissionId = e.SubmissionId,
            ThreadId = e.ThreadId,
            ArtifactId = e.ArtifactId,
            ArtifactName = e.ArtifactName,
            ArtifactVersion = e.Version,
            Type = NotificationType.ReviewRejected,
            Title = $"{e.ArtifactName} v{e.Version}",
            Message = $"Your artifact submission was rejected. Reason: {e.Feedback}",
            ReferenceId = $"{e.SubmissionId}:ReviewRejected",
            CreatedAt = e.Timestamp
        });

        // Email notification (COMMENTED OUT FOR NOW)
        /*
        try
        {
            await _emailService.SendArtifactCertificationRejectedNotificationAsync(e.ArtifactName, e.ProducerEmail, e.Feedback ?? "Changes required by reviewer", "Review Board");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to dispatch review rejected email for {Artifact}", e.ArtifactName);
        }
        */
    }

    public async Task HandleAsync(ReviewCancelledEvent e)
    {
        await _notifications.CreateNotificationAsync(new Notification
        {
            RecipientEmail = e.ProducerEmail,
            SubmissionId = e.SubmissionId,
            ThreadId = e.ThreadId,
            ArtifactId = e.ArtifactId,
            ArtifactName = e.ArtifactName,
            ArtifactVersion = e.Version,
            Type = NotificationType.ReviewCancelled,
            Title = $"{e.ArtifactName} v{e.Version}",
            Message = $"Review was cancelled by {e.ReviewerEmail}. Reason: {e.Reason ?? "Review cancelled."}",
            ReferenceId = $"{e.SubmissionId}:ReviewCancelled",
            CreatedAt = e.Timestamp
        });
    }
}
