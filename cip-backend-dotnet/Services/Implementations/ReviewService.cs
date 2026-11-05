using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CipBackend.Events;
using CipBackend.Models;
using CipBackend.Services.Interfaces;

namespace CipBackend.Services.Implementations;

public class ReviewService : IReviewService
{
    private readonly IReviewRepository _repo;
    private readonly IMarketplaceService _marketplace;
    private readonly IDomainEventPublisher _eventPublisher;
    private readonly INotificationService? _notifications;

    public ReviewService(
        IReviewRepository repo,
        IMarketplaceService marketplace,
        IDomainEventPublisher eventPublisher,
        INotificationService? notifications = null)
    {
        _repo = repo;
        _marketplace = marketplace;
        _eventPublisher = eventPublisher;
        _notifications = notifications;
    }

    public Review SubmitChange(string artifactId, string producerEmail, string content, bool isPrivate = false, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null, int slaTargetMinutes = 1440)
    {
        // Check if there is an existing active submission to update or create a new one
        var existing = _repo.List()
            .FirstOrDefault(r => r.ArtifactId == artifactId && r.ProducerEmail == producerEmail &&
                                (r.Status == ReviewStatus.Draft || r.Status == ReviewStatus.ChangesRequested));

        if (existing != null)
        {
            return Resubmit(existing.Id, producerEmail, content, isPrivate, allowedContributors, allowedReviewers, allowedConsumers);
        }

        // If an existing private review/artifact exists and incoming permissions are not explicitly passed, inherit them
        var prior = _repo.List().FirstOrDefault(r => r.ArtifactId == artifactId && r.IsPrivate);
        if (prior != null)
        {
            isPrivate = isPrivate || prior.IsPrivate;
            allowedContributors ??= prior.AllowedContributors;
            allowedReviewers ??= prior.AllowedReviewers;
            allowedConsumers ??= prior.AllowedConsumers;
        }

        var targetMins = slaTargetMinutes > 0 ? slaTargetMinutes : 1440;
        var now = DateTime.UtcNow;

        var r = new Review
        {
            ArtifactId = artifactId,
            ProducerEmail = producerEmail,
            Content = content,
            ContentHash = ComputeSha256(content),
            Status = ReviewStatus.Submitted,
            SubmittedAt = now,
            SlaTargetMinutes = targetMins,
            SlaDeadline = now.AddMinutes(targetMins),
            IsPrivate = isPrivate,
            AllowedContributors = allowedContributors,
            AllowedReviewers = allowedReviewers,
            AllowedConsumers = allowedConsumers
        };
        _repo.Add(r);

        var version = ExtractVersion(content);
        string targetReviewer = "reviewer@company.com";
        if (!string.IsNullOrWhiteSpace(allowedReviewers))
        {
            var revs = allowedReviewers.Split(new[] { ',', ';', ' ' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (revs.Length > 0) targetReviewer = revs[0];
        }

        // Publish ReviewAssigned event for reviewers
        _eventPublisher.PublishAsync(new ReviewAssignedEvent
        {
            SubmissionId = r.Id,
            ArtifactId = r.ArtifactId,
            ArtifactName = r.ArtifactId,
            Version = version,
            ProducerEmail = producerEmail,
            ReviewerEmail = targetReviewer
        }).GetAwaiter().GetResult();

        return r;
    }

    public Review AssignReview(string reviewId, string reviewerEmail)
    {
        var r = _repo.Get(reviewId);
        if (r == null) throw new InvalidOperationException($"Review '{reviewId}' not found.");

        if (r.Status != ReviewStatus.Submitted && r.Status != ReviewStatus.Resubmitted && r.Status != ReviewStatus.UnderReview)
        {
            throw new InvalidOperationException($"Cannot assign review in status '{r.Status}'. Valid transitions are from Submitted, Resubmitted, or UnderReview.");
        }

        r.ReviewerEmail = reviewerEmail;
        r.Status = ReviewStatus.UnderReview;
        _repo.Add(r);

        var version = ExtractVersion(r.Content);
        _eventPublisher.PublishAsync(new ReviewAssignedEvent
        {
            SubmissionId = r.Id,
            ArtifactId = r.ArtifactId,
            ArtifactName = r.ArtifactId,
            Version = version,
            ProducerEmail = r.ProducerEmail,
            ReviewerEmail = reviewerEmail
        }).GetAwaiter().GetResult();

        return r;
    }

    public Review RequestChanges(string reviewId, string reviewerEmail, string? feedback = null)
    {
        var r = _repo.Get(reviewId);
        if (r == null) throw new InvalidOperationException($"Review '{reviewId}' not found.");

        if (!string.IsNullOrWhiteSpace(r.ProducerEmail) && string.Equals(r.ProducerEmail, reviewerEmail, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Separation of duties violation: The artifact producer cannot review or request changes on their own submission.");
        }

        if (r.Status != ReviewStatus.UnderReview && r.Status != ReviewStatus.Submitted && r.Status != ReviewStatus.Resubmitted)
        {
            throw new InvalidOperationException($"Cannot request changes on review in status '{r.Status}'. Review must be UnderReview.");
        }

        // If private and designated reviewers exist, enforce reviewer whitelist
        if (r.IsPrivate && !string.IsNullOrWhiteSpace(r.AllowedReviewers))
        {
            var revs = r.AllowedReviewers.Split(new[] { ',', ';', ' ' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (!revs.Any(rev => rev.Equals(reviewerEmail, StringComparison.OrdinalIgnoreCase)))
            {
                throw new UnauthorizedAccessException($"Reviewer '{reviewerEmail}' is not designated to review this private artifact. Designated reviewers: {r.AllowedReviewers}");
            }
        }

        r.Status = ReviewStatus.ChangesRequested;
        r.ReviewerEmail = reviewerEmail;
        r.Feedback = feedback;
        r.DecisionAt = DateTime.UtcNow;
        _repo.Add(r);

        var version = ExtractVersion(r.Content);
        _eventPublisher.PublishAsync(new ChangesRequestedEvent
        {
            SubmissionId = r.Id,
            ArtifactId = r.ArtifactId,
            ArtifactName = r.ArtifactId,
            Version = version,
            ProducerEmail = r.ProducerEmail,
            ReviewerEmail = reviewerEmail,
            Feedback = feedback
        }).GetAwaiter().GetResult();

        return r;
    }

    public Review Resubmit(string reviewId, string producerEmail, string content, bool? isPrivate = null, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null)
    {
        var r = _repo.Get(reviewId);
        if (r == null) throw new InvalidOperationException($"Review '{reviewId}' not found.");

        if (r.ProducerEmail != producerEmail)
        {
            bool isAllowed = false;
            if (!string.IsNullOrEmpty(r.AllowedContributors))
            {
                var contribs = r.AllowedContributors.Split(new[] { ',', ';', ' ' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                isAllowed = contribs.Any(c => c.Equals(producerEmail, StringComparison.OrdinalIgnoreCase));
            }
            if (!isAllowed)
            {
                throw new UnauthorizedAccessException("Only the original producer or an allowed contributor can resubmit this review.");
            }
        }

        if (r.Status != ReviewStatus.ChangesRequested && r.Status != ReviewStatus.Draft && r.Status != ReviewStatus.Submitted && r.Status != ReviewStatus.UnderReview)
        {
            throw new InvalidOperationException($"Cannot resubmit review in status '{r.Status}'. Valid statuses: ChangesRequested, Draft, Submitted, UnderReview.");
        }

        r.Content = content;
        r.ContentHash = ComputeSha256(content);
        if (isPrivate.HasValue)
        {
            r.IsPrivate = isPrivate.Value;
        }
        if (allowedContributors != null) r.AllowedContributors = allowedContributors;
        if (allowedReviewers != null) r.AllowedReviewers = allowedReviewers;
        if (allowedConsumers != null) r.AllowedConsumers = allowedConsumers;

        r.Status = ReviewStatus.Resubmitted;
        r.SubmittedAt = DateTime.UtcNow;
        r.SlaDeadline = r.SubmittedAt.AddMinutes(r.SlaTargetMinutes > 0 ? r.SlaTargetMinutes : 1440);
        r.LastSlaReminderSentAt = null;
        r.Feedback = null;
        r.DecisionAt = null;
        _repo.Add(r);

        var version = ExtractVersion(content);
        string targetReviewer = r.ReviewerEmail ?? "reviewer@company.com";
        if (!string.IsNullOrWhiteSpace(r.AllowedReviewers))
        {
            var revs = r.AllowedReviewers.Split(new[] { ',', ';', ' ' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (revs.Length > 0) targetReviewer = revs[0];
        }

        _eventPublisher.PublishAsync(new ResubmittedEvent
        {
            SubmissionId = r.Id,
            ArtifactId = r.ArtifactId,
            ArtifactName = r.ArtifactId,
            Version = version,
            ProducerEmail = r.ProducerEmail,
            ReviewerEmail = targetReviewer
        }).GetAwaiter().GetResult();

        return r;
    }

    public async Task<Review?> ApproveAsync(string reviewId, string reviewerEmail, string? feedback = null)
    {
        var r = _repo.Get(reviewId);
        if (r == null) return null;

        // 4-Eyes Principle / Separation of Duties: Producer cannot self-approve
        if (!string.IsNullOrWhiteSpace(r.ProducerEmail) && string.Equals(r.ProducerEmail, reviewerEmail, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Separation of duties violation: The artifact producer cannot approve their own submission.");
        }

        if (r.Status != ReviewStatus.UnderReview && r.Status != ReviewStatus.Submitted && r.Status != ReviewStatus.Resubmitted)
        {
            throw new InvalidOperationException($"Cannot approve review in status '{r.Status}'. Review must be UnderReview, Submitted, or Resubmitted.");
        }

        // Integrity Verification: Validate content matches submission hash
        var currentHash = ComputeSha256(r.Content);
        if (!string.IsNullOrEmpty(r.ContentHash) && !string.Equals(r.ContentHash, currentHash, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Security violation: Artifact content was modified after review submission (Hash mismatch). Approval rejected.");
        }

        // If private and designated reviewers exist, enforce reviewer whitelist
        if (r.IsPrivate && !string.IsNullOrWhiteSpace(r.AllowedReviewers))
        {
            var revs = r.AllowedReviewers.Split(new[] { ',', ';', ' ' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (!revs.Any(rev => rev.Equals(reviewerEmail, StringComparison.OrdinalIgnoreCase)))
            {
                throw new UnauthorizedAccessException($"Reviewer '{reviewerEmail}' is not designated to review this private artifact. Designated reviewers: {r.AllowedReviewers}");
            }
        }

        r.Status = ReviewStatus.Approved;
        r.ReviewerEmail = reviewerEmail;
        r.Feedback = feedback;
        r.DecisionAt = DateTime.UtcNow;

        // publish via marketplace and capture result
        try
        {
            await _marketplace.PublishArtifactAsync(r.ArtifactId, r.Content);
            r.IsPublished = true;
            r.PublishedAt = DateTime.UtcNow;
            r.PublishError = null;
            r.Status = ReviewStatus.Published;
        }
        catch (Exception ex)
        {
            r.IsPublished = false;
            r.PublishError = ex.Message;
        }
        _repo.Add(r);

        var version = ExtractVersion(r.Content);
        await _eventPublisher.PublishAsync(new ReviewApprovedEvent
        {
            SubmissionId = r.Id,
            ArtifactId = r.ArtifactId,
            ArtifactName = r.ArtifactId,
            Version = version,
            ProducerEmail = r.ProducerEmail,
            ReviewerEmail = reviewerEmail,
            Feedback = feedback
        });

        return r;
    }

    public Review? Reject(string reviewId, string reviewerEmail, string? feedback = null)
    {
        var r = _repo.Get(reviewId);
        if (r == null) return null;

        if (!string.IsNullOrWhiteSpace(r.ProducerEmail) && string.Equals(r.ProducerEmail, reviewerEmail, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Separation of duties violation: The artifact producer cannot reject their own submission.");
        }

        if (r.Status != ReviewStatus.UnderReview && r.Status != ReviewStatus.Submitted && r.Status != ReviewStatus.Resubmitted)
        {
            throw new InvalidOperationException($"Cannot reject review in status '{r.Status}'. Review must be UnderReview, Submitted, or Resubmitted.");
        }

        // If private and designated reviewers exist, enforce reviewer whitelist
        if (r.IsPrivate && !string.IsNullOrWhiteSpace(r.AllowedReviewers))
        {
            var revs = r.AllowedReviewers.Split(new[] { ',', ';', ' ' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (!revs.Any(rev => rev.Equals(reviewerEmail, StringComparison.OrdinalIgnoreCase)))
            {
                throw new UnauthorizedAccessException($"Reviewer '{reviewerEmail}' is not designated to review this private artifact. Designated reviewers: {r.AllowedReviewers}");
            }
        }

        r.Status = ReviewStatus.Rejected;
        r.ReviewerEmail = reviewerEmail;
        r.Feedback = feedback;
        r.DecisionAt = DateTime.UtcNow;
        _repo.Add(r);

        var version = ExtractVersion(r.Content);
        _eventPublisher.PublishAsync(new ReviewRejectedEvent
        {
            SubmissionId = r.Id,
            ArtifactId = r.ArtifactId,
            ArtifactName = r.ArtifactId,
            Version = version,
            ProducerEmail = r.ProducerEmail,
            ReviewerEmail = reviewerEmail,
            Feedback = feedback
        }).GetAwaiter().GetResult();

        return r;
    }

    public Review? CancelReview(string reviewId, string reviewerEmail, string? reason = null)
    {
        var r = _repo.Get(reviewId);
        if (r == null) return null;

        if (r.Status == ReviewStatus.Approved || r.Status == ReviewStatus.Published || r.Status == ReviewStatus.Cancelled)
        {
            throw new InvalidOperationException($"Cannot cancel review in status '{r.Status}'.");
        }

        r.Status = ReviewStatus.Cancelled;
        r.ReviewerEmail = reviewerEmail;
        r.Feedback = reason ?? "Review cancelled by reviewer.";
        r.DecisionAt = DateTime.UtcNow;
        _repo.Add(r);

        var version = ExtractVersion(r.Content);
        _eventPublisher.PublishAsync(new ReviewCancelledEvent
        {
            SubmissionId = r.Id,
            ArtifactId = r.ArtifactId,
            ArtifactName = r.ArtifactId,
            Version = version,
            ProducerEmail = r.ProducerEmail,
            ReviewerEmail = reviewerEmail,
            Reason = reason
        }).GetAwaiter().GetResult();

        return r;
    }

    public Review? GetReview(string reviewId) => _repo.Get(reviewId);

    public IEnumerable<Review> GetAllReviews() => _repo.List();

    public IEnumerable<Review> GetPendingReviews() => _repo.List()
        .Where(r => r.Status == ReviewStatus.Submitted || r.Status == ReviewStatus.Resubmitted || r.Status == ReviewStatus.UnderReview);

    public IEnumerable<Review> GetByProducer(string producerEmail) => _repo.List()
        .Where(r => r.ProducerEmail == producerEmail);

    public static string ComputeSha256(string content)
    {
        if (string.IsNullOrEmpty(content)) return string.Empty;
        using var sha = System.Security.Cryptography.SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(content);
        var hash = sha.ComputeHash(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public Review UpdateSlaTarget(string reviewId, int slaTargetMinutes)
    {
        var r = _repo.Get(reviewId);
        if (r == null) throw new InvalidOperationException($"Review '{reviewId}' not found.");

        r.SlaTargetMinutes = slaTargetMinutes > 0 ? slaTargetMinutes : 1440;
        r.SlaDeadline = r.SubmittedAt.AddMinutes(r.SlaTargetMinutes);
        _repo.Add(r);
        return r;
    }

    public async Task<int> CheckSlaAndSendRemindersAsync()
    {
        var active = GetPendingReviews().ToList();
        int notificationsSent = 0;

        foreach (var r in active)
        {
            var targetReviewer = !string.IsNullOrWhiteSpace(r.ReviewerEmail) 
                ? r.ReviewerEmail 
                : (!string.IsNullOrWhiteSpace(r.AllowedReviewers) ? r.AllowedReviewers.Split(new[] { ',', ';', ' ' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).FirstOrDefault() : "reviewer@company.com");

            if (string.IsNullOrWhiteSpace(targetReviewer)) targetReviewer = "reviewer@company.com";

            var version = ExtractVersion(r.Content);

            if (r.IsSlaBreached)
            {
                // Send breach alert if not sent recently (every 60m)
                if (r.LastSlaReminderSentAt == null || (DateTime.UtcNow - r.LastSlaReminderSentAt.Value).TotalMinutes >= 60)
                {
                    if (_notifications != null)
                    {
                        await _notifications.CreateNotificationAsync(new Notification
                        {
                            RecipientEmail = targetReviewer,
                            SubmissionId = r.Id,
                            ArtifactId = r.ArtifactId,
                            ArtifactName = r.ArtifactId,
                            ArtifactVersion = version,
                            Type = NotificationType.SlaBreached,
                            Title = $"🚨 SLA Breached: {r.ArtifactId}",
                            Message = $"Review for '{r.ArtifactId}' (v{version}) has breached its SLA target ({r.SlaTargetMinutes}m). Overdue by {Math.Abs(r.SlaRemainingMinutes):F0} minutes.",
                            ReferenceId = $"{r.Id}:SlaBreached:{DateTime.UtcNow:yyyyMMddHH}",
                            CreatedAt = DateTime.UtcNow
                        });
                        notificationsSent++;
                    }

                    r.LastSlaReminderSentAt = DateTime.UtcNow;
                    _repo.Add(r);
                }
            }
            else if (r.IsSlaWarning)
            {
                // Send warning reminder if not sent in last 30m
                if (r.LastSlaReminderSentAt == null || (DateTime.UtcNow - r.LastSlaReminderSentAt.Value).TotalMinutes >= 30)
                {
                    if (_notifications != null)
                    {
                        await _notifications.CreateNotificationAsync(new Notification
                        {
                            RecipientEmail = targetReviewer,
                            SubmissionId = r.Id,
                            ArtifactId = r.ArtifactId,
                            ArtifactName = r.ArtifactId,
                            ArtifactVersion = version,
                            Type = NotificationType.SlaWarning,
                            Title = $"⚠️ SLA Warning: {r.ArtifactId}",
                            Message = $"Review for '{r.ArtifactId}' (v{version}) is approaching SLA deadline ({r.SlaRemainingFormatted}). Please review promptly.",
                            ReferenceId = $"{r.Id}:SlaWarning:{DateTime.UtcNow:yyyyMMddHH}",
                            CreatedAt = DateTime.UtcNow
                        });
                        notificationsSent++;
                    }

                    r.LastSlaReminderSentAt = DateTime.UtcNow;
                    _repo.Add(r);
                }
            }
        }

        return notificationsSent;
    }

    public SlaSummaryDto GetSlaSummary()
    {
        var all = _repo.List().ToList();
        var pending = all.Where(r => r.Status == ReviewStatus.Submitted || r.Status == ReviewStatus.Resubmitted || r.Status == ReviewStatus.UnderReview).ToList();
        var completed = all.Where(r => r.Status == ReviewStatus.Approved || r.Status == ReviewStatus.Published).ToList();

        var onTrack = pending.Count(r => r.SlaStatus == "OnTrack");
        var warning = pending.Count(r => r.SlaStatus == "Warning");
        var breached = pending.Count(r => r.SlaStatus == "Breached");
        var completedOnTime = completed.Count(r => !r.IsSlaBreached);
        var completedLate = completed.Count(r => r.IsSlaBreached);

        double avgCompletionMins = completed.Any() 
            ? Math.Round(completed.Where(c => c.DecisionAt.HasValue).Average(c => (c.DecisionAt!.Value - c.SubmittedAt).TotalMinutes), 1)
            : 0;

        return new SlaSummaryDto
        {
            TotalReviews = all.Count,
            ActivePending = pending.Count,
            OnTrackCount = onTrack,
            WarningCount = warning,
            BreachedCount = breached,
            CompletedOnTimeCount = completedOnTime,
            CompletedLateCount = completedLate,
            SlaComplianceRatePercent = (completed.Count + pending.Count) > 0 
                ? Math.Round(((double)(completedOnTime + onTrack) / (completed.Count + pending.Count)) * 100.0, 1) 
                : 100.0,
            AverageReviewDurationMinutes = avgCompletionMins
        };
    }

    private static string ExtractVersion(string content)
    {
        try
        {
            using var doc = JsonDocument.Parse(content);
            if (doc.RootElement.TryGetProperty("version", out var vProp))
            {
                return vProp.GetString() ?? "1.0.0";
            }
        }
        catch { }
        return "1.0.0";
    }
}
