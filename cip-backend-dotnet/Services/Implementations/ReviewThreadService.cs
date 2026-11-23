using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using EngineeringCommons.Backend.Data;
using EngineeringCommons.Backend.Events;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace EngineeringCommons.Backend.Services.Implementations;

public class ReviewThreadService : IReviewThreadService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IReviewService _reviewService;
    private readonly IDomainEventPublisher _eventPublisher;
    private readonly ILogger<ReviewThreadService> _logger;

    // In-memory fallback if DbContext is unavailable
    private static readonly ConcurrentDictionary<string, ReviewThread> _memoryThreads = new(StringComparer.OrdinalIgnoreCase);

    public ReviewThreadService(
        IServiceProvider serviceProvider,
        IReviewService reviewService,
        IDomainEventPublisher eventPublisher,
        ILogger<ReviewThreadService> logger)
    {
        _serviceProvider = serviceProvider;
        _reviewService = reviewService;
        _eventPublisher = eventPublisher;
        _logger = logger;
    }

    private bool IsAuthorized(Review review, string userEmail, string userRole)
    {
        if (userRoleIsReviewer(userRole, userEmail)) return true;
        if (!string.IsNullOrEmpty(review.ProducerEmail) && string.Equals(review.ProducerEmail, userEmail, StringComparison.OrdinalIgnoreCase)) return true;
        if (!string.IsNullOrEmpty(review.ReviewerEmail) && string.Equals(review.ReviewerEmail, userEmail, StringComparison.OrdinalIgnoreCase)) return true;
        return false;
    }

    public async Task<ReviewThread?> GetThreadAsync(string reviewId, string userEmail, string userRole)
    {
        var review = _reviewService.GetReview(reviewId);
        if (review == null) return null;

        if (!IsAuthorized(review, userEmail, userRole)) return null;

        return await EnsureThreadExistsAsync(review);
    }

    public async Task<ReviewMessage?> AddMessageAsync(string reviewId, string authorEmail, string authorRole, string message)
    {
        if (string.IsNullOrWhiteSpace(message)) return null;

        var review = _reviewService.GetReview(reviewId);
        if (review == null) return null;

        if (!IsAuthorized(review, authorEmail, authorRole)) return null;

        var thread = await EnsureThreadExistsAsync(review);
        if (thread == null) return null;

        var isReviewer = userRoleIsReviewer(authorRole, authorEmail);
        var roleLabel = isReviewer ? "Reviewer" : "Producer";

        var msg = new ReviewMessage
        {
            ThreadId = thread.Id,
            AuthorEmail = authorEmail,
            AuthorRole = roleLabel,
            Message = message,
            CreatedAt = DateTime.UtcNow
        };

        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetService<CipDbContext>();
        if (db != null && db.Database.CanConnect())
        {
            try
            {
                var dbThread = await db.ReviewThreads.Include(t => t.Messages).FirstOrDefaultAsync(t => t.Id == thread.Id);
                if (dbThread != null)
                {
                    dbThread.UpdatedAt = DateTime.UtcNow;
                    db.ReviewMessages.Add(msg);
                    await db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to persist review message to SQLite. Falling back to in-memory store.");
            }
        }

        thread.Messages.Add(msg);
        thread.UpdatedAt = DateTime.UtcNow;
        _memoryThreads[thread.Id] = thread;
        _memoryThreads[thread.ReviewId] = thread;

        // Publish domain event
        if (isReviewer)
        {
            await _eventPublisher.PublishAsync(new FeedbackAddedEvent
            {
                SubmissionId = review.Id,
                ArtifactId = review.ArtifactId,
                ArtifactName = thread.ArtifactName,
                Version = thread.Version,
                ThreadId = thread.Id,
                MessageId = msg.Id,
                ReviewerEmail = authorEmail,
                ProducerEmail = review.ProducerEmail,
                Feedback = message
            });
        }
        else
        {
            var reviewerRecipient = thread.ReviewerEmail ?? review.ReviewerEmail ?? "reviewer@company.com";
            await _eventPublisher.PublishAsync(new ProducerRepliedEvent
            {
                SubmissionId = review.Id,
                ArtifactId = review.ArtifactId,
                ArtifactName = thread.ArtifactName,
                Version = thread.Version,
                ThreadId = thread.Id,
                MessageId = msg.Id,
                ProducerEmail = authorEmail,
                ReviewerEmail = reviewerRecipient,
                Message = message
            });
        }

        return msg;
    }

    public async Task<ReviewThread?> UpdateStatusAsync(string reviewId, string userEmail, string userRole, ThreadStatus status)
    {
        var review = _reviewService.GetReview(reviewId);
        if (review == null) return null;

        if (!userRoleIsReviewer(userRole, userEmail) && !string.Equals(review.ProducerEmail, userEmail, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var thread = await EnsureThreadExistsAsync(review);
        if (thread == null) return null;

        thread.Status = status;
        thread.UpdatedAt = DateTime.UtcNow;

        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetService<CipDbContext>();
        if (db != null && db.Database.CanConnect())
        {
            try
            {
                var dbThread = await db.ReviewThreads.FirstOrDefaultAsync(t => t.Id == thread.Id);
                if (dbThread != null)
                {
                    dbThread.Status = status;
                    dbThread.UpdatedAt = DateTime.UtcNow;
                    await db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to update review thread status in SQLite.");
            }
        }

        if (status == ThreadStatus.ChangesRequested)
        {
            try
            {
                _reviewService.RequestChanges(review.Id, userEmail);
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Handled fallback in RequestChanges for review {ReviewId}", review.Id);
                await _eventPublisher.PublishAsync(new ChangesRequestedEvent
                {
                    SubmissionId = review.Id,
                    ArtifactId = review.ArtifactId,
                    ArtifactName = thread.ArtifactName,
                    Version = thread.Version,
                    ThreadId = thread.Id,
                    ReviewerEmail = userEmail,
                    ProducerEmail = review.ProducerEmail
                });
            }
        }

        return thread;
    }

    private static bool userRoleIsReviewer(string role, string? email = null)
    {
        if (!string.IsNullOrWhiteSpace(role))
        {
            var r = role.Trim().ToUpperInvariant();
            if (r == "REVIEWER" || r == "ADMIN" || r == "CERTIFIED_REVIEWER") return true;
        }
        if (!string.IsNullOrWhiteSpace(email))
        {
            var e = email.Trim().ToLowerInvariant();
            if (e == "admin@maqsoftware.com" || e.Contains("admin") || e.Contains("reviewer")) return true;
        }
        return false;
    }

    private async Task<ReviewThread?> EnsureThreadExistsAsync(Review review)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetService<CipDbContext>();

        if (db != null && db.Database.CanConnect())
        {
            try
            {
                var existing = await db.ReviewThreads
                    .Include(t => t.Messages)
                    .FirstOrDefaultAsync(t => t.ReviewId == review.Id);

                if (existing != null)
                {
                    existing.Feedback = review.Feedback;
                    existing.ReviewStatus = review.Status.ToString();
                    existing.SlaTargetMinutes = review.SlaTargetMinutes;
                    existing.SlaDeadline = review.EffectiveSlaDeadline;
                    existing.SlaRemainingMinutes = review.SlaRemainingMinutes;
                    existing.SlaStatus = review.SlaStatus;
                    existing.SlaRemainingFormatted = review.SlaRemainingFormatted;
                    existing.IsSlaBreached = review.IsSlaBreached;
                    existing.IsSlaWarning = review.IsSlaWarning;

                    if (string.IsNullOrEmpty(existing.ReviewerEmail) && !string.IsNullOrEmpty(review.ReviewerEmail))
                    {
                        existing.ReviewerEmail = review.ReviewerEmail;
                    }

                    if (!string.IsNullOrWhiteSpace(review.Feedback) && !existing.Messages.Any(m => m.Message == review.Feedback))
                    {
                        var feedbackMsg = new ReviewMessage
                        {
                            ThreadId = existing.Id,
                            AuthorEmail = review.ReviewerEmail ?? "reviewer@company.com",
                            AuthorRole = "Reviewer",
                            Message = review.Feedback,
                            CreatedAt = review.DecisionAt ?? review.SubmittedAt
                        };
                        db.ReviewMessages.Add(feedbackMsg);
                        existing.Messages.Add(feedbackMsg);
                    }

                    await db.SaveChangesAsync();
                    return existing;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error reading review thread from SQLite. Using in-memory store.");
            }
        }

        if (_memoryThreads.TryGetValue(review.Id, out var memThread))
        {
            memThread.Feedback = review.Feedback;
            memThread.ReviewStatus = review.Status.ToString();
            memThread.SlaTargetMinutes = review.SlaTargetMinutes;
            memThread.SlaDeadline = review.EffectiveSlaDeadline;
            memThread.SlaRemainingMinutes = review.SlaRemainingMinutes;
            memThread.SlaStatus = review.SlaStatus;
            memThread.SlaRemainingFormatted = review.SlaRemainingFormatted;
            memThread.IsSlaBreached = review.IsSlaBreached;
            memThread.IsSlaWarning = review.IsSlaWarning;

            if (!string.IsNullOrWhiteSpace(review.Feedback) && !memThread.Messages.Any(m => m.Message == review.Feedback))
            {
                memThread.Messages.Add(new ReviewMessage
                {
                    ThreadId = memThread.Id,
                    AuthorEmail = review.ReviewerEmail ?? "reviewer@company.com",
                    AuthorRole = "Reviewer",
                    Message = review.Feedback,
                    CreatedAt = review.DecisionAt ?? review.SubmittedAt
                });
            }
            return memThread;
        }

        var artifactName = ExtractArtifactName(review.Content) ?? review.ArtifactId;
        var version = ExtractArtifactVersion(review.Content) ?? "1.0.0";

        var newThread = new ReviewThread
        {
            ReviewId = review.Id,
            ArtifactId = review.ArtifactId,
            ArtifactName = artifactName,
            Version = version,
            ProducerEmail = review.ProducerEmail,
            ReviewerEmail = review.ReviewerEmail,
            Status = ThreadStatus.Open,
            Feedback = review.Feedback,
            ReviewStatus = review.Status.ToString(),
            SlaTargetMinutes = review.SlaTargetMinutes,
            SlaDeadline = review.EffectiveSlaDeadline,
            SlaRemainingMinutes = review.SlaRemainingMinutes,
            SlaStatus = review.SlaStatus,
            SlaRemainingFormatted = review.SlaRemainingFormatted,
            IsSlaBreached = review.IsSlaBreached,
            IsSlaWarning = review.IsSlaWarning,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (!string.IsNullOrWhiteSpace(review.Feedback))
        {
            newThread.Messages.Add(new ReviewMessage
            {
                ThreadId = newThread.Id,
                AuthorEmail = review.ReviewerEmail ?? "reviewer@company.com",
                AuthorRole = "Reviewer",
                Message = review.Feedback,
                CreatedAt = review.DecisionAt ?? review.SubmittedAt
            });
        }

        if (db != null && db.Database.CanConnect())
        {
            try
            {
                await db.ReviewThreads.AddAsync(newThread);
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to persist new review thread to SQLite.");
            }
        }

        _memoryThreads[newThread.Id] = newThread;
        _memoryThreads[newThread.ReviewId] = newThread;

        return newThread;
    }

    private static string? ExtractArtifactName(string content)
    {
        try
        {
            using var doc = JsonDocument.Parse(content);
            if (doc.RootElement.TryGetProperty("name", out var prop)) return prop.GetString();
        }
        catch (JsonException ex) 
        {
            System.Diagnostics.Debug.WriteLine($"[ReviewThreadService] ExtractArtifactName parse error: {ex.Message}");
            return null;
        }
        return null;
    }

    private static string? ExtractArtifactVersion(string content)
    {
        try
        {
            using var doc = JsonDocument.Parse(content);
            if (doc.RootElement.TryGetProperty("version", out var prop)) return prop.GetString();
        }
        catch (JsonException ex) 
        {
            System.Diagnostics.Debug.WriteLine($"[ReviewThreadService] ExtractArtifactVersion parse error: {ex.Message}");
            return null;
        }
        return null;
    }
}
