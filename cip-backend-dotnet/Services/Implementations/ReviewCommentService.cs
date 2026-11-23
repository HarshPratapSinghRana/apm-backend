using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using EngineeringCommons.Backend.Data;
using EngineeringCommons.Backend.Events;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Services.Implementations;

public class ReviewCommentService : IReviewCommentService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IReviewService _reviewService;
    private readonly IDomainEventPublisher _eventPublisher;
    private readonly ILogger<ReviewCommentService> _logger;

    private static readonly ConcurrentDictionary<string, List<ReviewComment>> _memoryComments = new(StringComparer.OrdinalIgnoreCase);

    public ReviewCommentService(
        IServiceProvider serviceProvider,
        IReviewService reviewService,
        IDomainEventPublisher eventPublisher,
        ILogger<ReviewCommentService> logger)
    {
        _serviceProvider = serviceProvider;
        _reviewService = reviewService;
        _eventPublisher = eventPublisher;
        _logger = logger;
    }

    public async Task<ReviewComment> AddCommentAsync(string submissionId, string authorEmail, string authorRole, AddReviewCommentRequest req)
    {
        if (req == null) throw new ArgumentNullException(nameof(req));
        if (string.IsNullOrWhiteSpace(req.Comment)) throw new ArgumentException("Comment text cannot be empty.", nameof(req));

        var review = _reviewService.GetReview(submissionId);
        if (review == null) throw new InvalidOperationException($"Review submission '{submissionId}' not found.");

        var normalizedPath = (req.FilePath ?? "general").Replace('\\', '/').TrimStart('/');
        var version = ExtractVersion(review.Content);

        var comment = new ReviewComment
        {
            SubmissionId = submissionId,
            ArtifactId = review.ArtifactId,
            ArtifactVersion = version,
            FilePath = normalizedPath,
            LineNumber = req.LineNumber,
            OldLineNumber = req.OldLineNumber,
            StartLineNumber = req.StartLineNumber ?? req.LineNumber,
            EndLineNumber = req.EndLineNumber ?? req.LineNumber,
            LineRange = req.LineRange ?? (req.StartLineNumber.HasValue && req.EndLineNumber.HasValue && req.StartLineNumber != req.EndLineNumber ? $"{req.StartLineNumber}-{req.EndLineNumber}" : (req.LineNumber?.ToString() ?? req.OldLineNumber?.ToString())),
            LineType = string.IsNullOrWhiteSpace(req.LineType) ? (req.LineNumber.HasValue ? "Modified" : "File") : req.LineType,
            OldContent = req.OldContent,
            NewContent = req.NewContent,
            AuthorEmail = authorEmail,
            AuthorRole = authorRole,
            Comment = req.Comment.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetService<CipDbContext>();
        if (db != null && db.Database.CanConnect())
        {
            try
            {
                await db.ReviewComments.AddAsync(comment);
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to persist review comment to SQLite database. Using memory cache.");
            }
        }

        _memoryComments.AddOrUpdate(
            submissionId,
            new List<ReviewComment> { comment },
            (_, list) => { lock (list) { list.Add(comment); } return list; });

        var targetRecipient = string.Equals(authorRole, "Reviewer", StringComparison.OrdinalIgnoreCase)
            ? review.ProducerEmail
            : (review.ReviewerEmail ?? "reviewer@company.com");

        await _eventPublisher.PublishAsync(new LineCommentAddedEvent
        {
            SubmissionId = submissionId,
            ArtifactId = review.ArtifactId,
            ArtifactName = review.ArtifactId,
            Version = version,
            CommentId = comment.Id,
            FilePath = normalizedPath,
            LineNumber = req.LineNumber ?? req.OldLineNumber,
            LineType = comment.LineType,
            AuthorEmail = authorEmail,
            AuthorRole = authorRole,
            TargetRecipientEmail = targetRecipient,
            Comment = comment.Comment
        });

        return comment;
    }

    public async Task<ReviewComment> AddReplyAsync(string submissionId, string commentId, string authorEmail, string authorRole, string replyText)
    {
        if (string.IsNullOrWhiteSpace(replyText)) throw new ArgumentException("Reply text cannot be empty.", nameof(replyText));

        var review = _reviewService.GetReview(submissionId);
        if (review == null) throw new InvalidOperationException($"Review submission '{submissionId}' not found.");

        ReviewComment? parent = null;
        using (var scope = _serviceProvider.CreateScope())
        {
            var db = scope.ServiceProvider.GetService<CipDbContext>();
            if (db != null && db.Database.CanConnect())
            {
                try
                {
                    parent = await db.ReviewComments.FirstOrDefaultAsync(c => c.Id == commentId && c.SubmissionId == submissionId);
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Failed querying parent comment from DB");
                }
            }
        }

        if (parent == null && _memoryComments.TryGetValue(submissionId, out var memList))
        {
            parent = memList.FirstOrDefault(c => c.Id == commentId);
        }

        if (parent == null) throw new InvalidOperationException($"Parent comment '{commentId}' not found.");

        var version = ExtractVersion(review.Content);
        var reply = new ReviewComment
        {
            SubmissionId = submissionId,
            ThreadId = parent.ThreadId,
            ArtifactId = review.ArtifactId,
            ArtifactVersion = version,
            FilePath = parent.FilePath,
            LineNumber = parent.LineNumber,
            OldLineNumber = parent.OldLineNumber,
            LineType = parent.LineType,
            AuthorEmail = authorEmail,
            AuthorRole = authorRole,
            Comment = replyText.Trim(),
            ParentCommentId = commentId,
            CreatedAt = DateTime.UtcNow
        };

        using (var scope = _serviceProvider.CreateScope())
        {
            var db = scope.ServiceProvider.GetService<CipDbContext>();
            if (db != null && db.Database.CanConnect())
            {
                try
                {
                    await db.ReviewComments.AddAsync(reply);
                    await db.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to persist review comment reply to SQLite.");
                }
            }
        }

        _memoryComments.AddOrUpdate(
            submissionId,
            new List<ReviewComment> { reply },
            (_, list) => { lock (list) { list.Add(reply); } return list; });

        if (string.Equals(authorRole, "Producer", StringComparison.OrdinalIgnoreCase))
        {
            var reviewerRecipient = review.ReviewerEmail ?? parent.AuthorEmail ?? "reviewer@company.com";
            await _eventPublisher.PublishAsync(new ProducerRepliedEvent
            {
                SubmissionId = submissionId,
                ArtifactId = review.ArtifactId,
                ArtifactName = review.ArtifactId,
                Version = version,
                MessageId = reply.Id,
                ProducerEmail = authorEmail,
                ReviewerEmail = reviewerRecipient,
                Message = reply.Comment,
                FilePath = parent.FilePath,
                LineNumber = parent.LineNumber
            });
        }
        else
        {
            await _eventPublisher.PublishAsync(new FeedbackAddedEvent
            {
                SubmissionId = submissionId,
                ArtifactId = review.ArtifactId,
                ArtifactName = review.ArtifactId,
                Version = version,
                MessageId = reply.Id,
                ReviewerEmail = authorEmail,
                ProducerEmail = review.ProducerEmail,
                Feedback = reply.Comment
            });
        }

        return reply;
    }

    public async Task<IEnumerable<ReviewComment>> GetCommentsAsync(string submissionId, string? filePath = null)
    {
        List<ReviewComment> all = new();

        using (var scope = _serviceProvider.CreateScope())
        {
            var db = scope.ServiceProvider.GetService<CipDbContext>();
            if (db != null && db.Database.CanConnect())
            {
                try
                {
                    IQueryable<ReviewComment> query = db.ReviewComments.AsNoTracking().Where(c => c.SubmissionId == submissionId);
                    if (!string.IsNullOrWhiteSpace(filePath))
                    {
                        var normalized = filePath.Replace('\\', '/').TrimStart('/');
                        query = query.Where(c => c.FilePath.ToLower() == normalized.ToLower());
                    }
                    all = await query.OrderBy(c => c.CreatedAt).ToListAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Failed querying comments from DB");
                }
            }
        }

        if (all.Count == 0 && _memoryComments.TryGetValue(submissionId, out var memList))
        {
            all = memList.ToList();
            if (!string.IsNullOrWhiteSpace(filePath))
            {
                var normalized = filePath.Replace('\\', '/').TrimStart('/');
                all = all.Where(c => string.Equals(c.FilePath, normalized, StringComparison.OrdinalIgnoreCase)).ToList();
            }
        }

        // Build parent-reply hierarchy
        var rootComments = all.Where(c => string.IsNullOrEmpty(c.ParentCommentId)).ToList();
        foreach (var root in rootComments)
        {
            root.Replies = all.Where(c => c.ParentCommentId == root.Id).OrderBy(c => c.CreatedAt).ToList();
        }

        return rootComments;
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
        catch (JsonException ex)
        {
            System.Diagnostics.Debug.WriteLine($"[ReviewCommentService] ExtractArtifactVersion parse error: {ex.Message}");
            return "1.0.0";
        }
        return "1.0.0";
    }
}

