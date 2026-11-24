using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Controllers;

[ApiController]
[Authorize]
[Route("api/reviews")]
public class ReviewsController : ControllerBase
{
    private const int DefaultSlaMinutes = 1440;
    private readonly IReviewService _reviews;
    private readonly IUsageService _usage;
    private readonly IArtifactDiffService _diffService;
    private readonly IReviewThreadService _threadService;
    private readonly IReviewCommentService _commentService;
    private readonly IBountyService? _bountyService;

    public ReviewsController(
        IReviewService reviews,
        IUsageService usage,
        IArtifactDiffService diffService,
        IReviewThreadService threadService,
        IReviewCommentService commentService,
        IBountyService? bountyService = null)
    {
        _reviews = reviews ?? throw new ArgumentNullException(nameof(reviews));
        _usage = usage ?? throw new ArgumentNullException(nameof(usage));
        _diffService = diffService ?? throw new ArgumentNullException(nameof(diffService));
        _threadService = threadService ?? throw new ArgumentNullException(nameof(threadService));
        _commentService = commentService ?? throw new ArgumentNullException(nameof(commentService));
        _bountyService = bountyService;
    }

    private static bool IsReviewerOrAdmin(string? role, string? email = null)
    {
        return UserRoles.IsReviewerOrAdmin(role);
    }

    [Authorize(Policy = "RequireReviewer")]
    [HttpGet("pending")]
    public IActionResult Pending()
    {
        var list = _reviews.GetPendingReviews().Select(r => new
        {
            r.Id,
            r.ArtifactId,
            r.ProducerEmail,
            r.SubmittedAt,
            r.Feedback,
            r.ReviewerEmail,
            status = r.Status.ToString(),
            slaTargetMinutes = r.SlaTargetMinutes,
            slaDeadline = r.EffectiveSlaDeadline,
            slaRemainingMinutes = r.SlaRemainingMinutes,
            slaStatus = r.SlaStatus,
            slaRemainingFormatted = r.SlaRemainingFormatted,
            isSlaBreached = r.IsSlaBreached,
            isSlaWarning = r.IsSlaWarning
        });
        return Ok(list);
    }

    [HttpGet("{reviewId}")]
    public async Task<IActionResult> GetReview(string reviewId)
    {
        var role = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role || c.Type == "roles")?.Value;
        var email = User.Identity?.Name ?? string.Empty;
        var r = _reviews.GetReview(reviewId);
        if (r == null && _bountyService != null)
        {
            var b = await _bountyService.GetBountyByIdAsync(reviewId, email);
            if (b != null)
            {
                var lastSub = b.Submissions.LastOrDefault();
                r = new Review
                {
                    Id = b.Id,
                    ArtifactId = b.RelatedArtifactId ?? b.Id,
                    ProducerEmail = lastSub?.SubmittedByEmail ?? b.ClaimedByEmail ?? "producer@company.com",
                    Content = lastSub?.SolutionCode ?? b.Description,
                    Status = b.Stage == BountyStages.Completed ? ReviewStatus.Approved : (b.Stage == BountyStages.InTesting ? ReviewStatus.Approved : ReviewStatus.UnderReview),
                    SubmittedAt = lastSub?.SubmittedAt ?? b.CreatedAt,
                    Feedback = b.Reviews.LastOrDefault()?.Feedback
                };
            }
        }
        if (r == null) return NotFound();
        if (!IsReviewerOrAdmin(role, email) && !string.Equals(r.ProducerEmail, email, StringComparison.OrdinalIgnoreCase))
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied." });
        return Ok(r);
    }

    [HttpGet("{reviewId}/diff")]
    public async Task<IActionResult> GetReviewDiff(string reviewId)
    {
        var role = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role || c.Type == "roles")?.Value;
        var email = User.Identity?.Name ?? string.Empty;
        var r = _reviews.GetReview(reviewId);
        if (r != null)
        {
            if (!IsReviewerOrAdmin(role, email) && !string.Equals(r.ProducerEmail, email, StringComparison.OrdinalIgnoreCase))
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied." });

            var diff = await _diffService.GenerateDiffAsync(r.ArtifactId, r.Content, r.Id, r.ProducerEmail, r.SubmittedAt);
            return Ok(diff);
        }

        if (_bountyService != null)
        {
            var b = await _bountyService.GetBountyByIdAsync(reviewId, email);
            if (b != null)
            {
                var lastSub = b.Submissions.LastOrDefault();
                var subCode = lastSub?.SolutionCode ?? b.Description ?? "// Bounty Solution Code";
                var submitter = lastSub?.SubmittedByEmail ?? b.ClaimedByEmail ?? "producer@company.com";
                var submittedTime = lastSub?.SubmittedAt ?? b.CreatedAt;
                var artId = b.RelatedArtifactId ?? b.Id;

                var diff = await _diffService.GenerateDiffAsync(artId, subCode, b.Id, submitter, submittedTime);
                return Ok(diff);
            }
        }

        return NotFound(new { error = $"Review '{reviewId}' not found." });
    }

    [HttpPost("{reviewId}/assign")]
    public IActionResult AssignReviewer(string reviewId, [FromBody] AssignReviewerRequest? req = null)
    {
        var role = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role || c.Type == "roles")?.Value;
        var currentEmail = User.Identity?.Name ?? string.Empty;
        if (!IsReviewerOrAdmin(role, currentEmail)) return StatusCode(StatusCodes.Status403Forbidden, new { error = "Reviewer role required." });

        var targetReviewer = string.IsNullOrWhiteSpace(req?.ReviewerEmail) ? currentEmail : req.ReviewerEmail.Trim();

        try
        {
            var r = _reviews.AssignReview(reviewId, targetReviewer);
            return Ok(new ReviewAssignmentResponseDto
            {
                Success = true,
                ReviewId = reviewId,
                ReviewerEmail = targetReviewer,
                Status = r.Status.ToString()
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{reviewId}/thread")]
    public async Task<IActionResult> GetThread(string reviewId)
    {
        var role = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role || c.Type == "roles")?.Value ?? UserRoles.Producer;
        var email = User.Identity?.Name ?? string.Empty;

        var thread = await _threadService.GetThreadAsync(reviewId, email, role);
        if (thread == null && _bountyService != null)
        {
            var b = await _bountyService.GetBountyByIdAsync(reviewId, email);
            if (b != null)
            {
                var lastSub = b.Submissions.LastOrDefault();
                thread = new ReviewThread
                {
                    Id = b.Id,
                    ReviewId = b.Id,
                    ArtifactId = b.RelatedArtifactId ?? b.Id,
                    ArtifactName = b.Title,
                    Version = "1.0.0",
                    ProducerEmail = lastSub?.SubmittedByEmail ?? b.ClaimedByEmail ?? "producer@company.com",
                    ReviewerEmail = email,
                    Status = b.Stage == BountyStages.InReview ? ThreadStatus.Open : (b.Stage == BountyStages.InTesting || b.Stage == BountyStages.Completed ? ThreadStatus.Resolved : ThreadStatus.ChangesRequested),
                    CreatedAt = b.CreatedAt,
                    UpdatedAt = DateTime.UtcNow,
                    Messages = b.Reviews.Select(rv => new ReviewMessage
                    {
                        Id = rv.Id,
                        ThreadId = b.Id,
                        AuthorEmail = rv.ReviewerEmail,
                        AuthorRole = "Reviewer",
                        Message = rv.Feedback,
                        CreatedAt = rv.ReviewedAt
                    }).ToList()
                };
            }
        }

        if (thread == null)
        {
            var review = _reviews.GetReview(reviewId);
            if (review == null) return NotFound(new { error = "Review not found." });
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied to review thread." });
        }

        return Ok(thread);
    }

    [HttpPost("{reviewId}/thread/messages")]
    public async Task<IActionResult> AddMessage(string reviewId, [FromBody] SendMessageRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Message)) return BadRequest(new { error = "Message content is required." });

        var role = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role || c.Type == "roles")?.Value ?? UserRoles.Producer;
        var email = User.Identity?.Name ?? string.Empty;

        var review = _reviews.GetReview(reviewId);
        if (review == null && _bountyService != null)
        {
            var b = await _bountyService.GetBountyByIdAsync(reviewId, email);
            if (b != null)
            {
                var msg = new ReviewMessage
                {
                    Id = Guid.NewGuid().ToString(),
                    ThreadId = b.Id,
                    AuthorEmail = email,
                    AuthorRole = IsReviewerOrAdmin(role, email) ? "Reviewer" : "Producer",
                    Message = req.Message.Trim(),
                    CreatedAt = DateTime.UtcNow
                };
                return Ok(msg);
            }
        }

        if (review == null) return NotFound(new { error = "Review not found." });

        var addedMsg = await _threadService.AddMessageAsync(reviewId, email, role, req.Message.Trim());
        if (addedMsg == null)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied to add message to review thread." });
        }

        return Ok(addedMsg);
    }

    [HttpPost("{reviewId}/thread/status")]
    public async Task<IActionResult> UpdateThreadStatus(string reviewId, [FromBody] UpdateStatusRequest req)
    {
        var role = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role || c.Type == "roles")?.Value ?? UserRoles.Producer;
        var email = User.Identity?.Name ?? string.Empty;

        if (!Enum.TryParse<ThreadStatus>(req.Status, true, out var status))
        {
            return BadRequest(new { error = "Invalid thread status. Valid values: Open, ChangesRequested, Resolved, Closed." });
        }

        var thread = await _threadService.UpdateStatusAsync(reviewId, email, role, status);
        if (thread == null) return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied to update thread status." });

        return Ok(thread);
    }

    [HttpPost("threads/{threadId}/read")]
    public async Task<IActionResult> MarkThreadAsRead(string threadId)
    {
        var email = User.Identity?.Name ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var thread = await _threadService.GetThreadAsync(threadId, email, UserRoles.Producer);
        if (thread == null)
        {
            var review = _reviews.GetReview(threadId);
            if (review == null) return NotFound(new { error = "Review thread not found." });
        }

        return Ok(new ReviewThreadCreatedResponseDto
        {
            Success = true,
            ThreadId = threadId
        });
    }

    [HttpGet("{reviewId}/comments")]
    public async Task<IActionResult> GetComments(string reviewId, [FromQuery] string? filePath = null)
    {
        var role = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role || c.Type == "roles")?.Value;
        var email = User.Identity?.Name ?? string.Empty;

        var review = _reviews.GetReview(reviewId);
        if (review == null && _bountyService != null)
        {
            var b = await _bountyService.GetBountyByIdAsync(reviewId, email);
            if (b != null)
            {
                var comments = await _commentService.GetCommentsAsync(reviewId, filePath);
                return Ok(comments);
            }
        }

        if (review == null) return NotFound(new { error = $"Review submission '{reviewId}' not found." });

        if (!IsReviewerOrAdmin(role, email) && !string.Equals(review.ProducerEmail, email, StringComparison.OrdinalIgnoreCase))
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied." });

        var commentsList = await _commentService.GetCommentsAsync(reviewId, filePath);
        return Ok(commentsList);
    }

    [HttpPost("{reviewId}/comments")]
    public async Task<IActionResult> AddComment(string reviewId, [FromBody] AddReviewCommentRequest req)
    {
        var role = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role || c.Type == "roles")?.Value ?? UserRoles.Producer;
        var email = User.Identity?.Name ?? string.Empty;

        var review = _reviews.GetReview(reviewId);
        if (review == null && _bountyService != null)
        {
            var b = await _bountyService.GetBountyByIdAsync(reviewId, email);
            if (b != null)
            {
                var comment = await _commentService.AddCommentAsync(reviewId, email, IsReviewerOrAdmin(role, email) ? "Reviewer" : "Producer", req);
                return Ok(comment);
            }
        }

        if (review == null) return NotFound(new { error = $"Review submission '{reviewId}' not found." });

        if (!IsReviewerOrAdmin(role, email) && !string.Equals(review.ProducerEmail, email, StringComparison.OrdinalIgnoreCase))
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied." });

        try
        {
            var comment = await _commentService.AddCommentAsync(reviewId, email, IsReviewerOrAdmin(role, email) ? "Reviewer" : "Producer", req);
            return Ok(comment);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{reviewId}/comments/{commentId}/replies")]
    public async Task<IActionResult> AddReply(string reviewId, string commentId, [FromBody] AddReplyRequest req)
    {
        var role = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role || c.Type == "roles")?.Value ?? UserRoles.Producer;
        var email = User.Identity?.Name ?? string.Empty;

        var review = _reviews.GetReview(reviewId);
        if (review == null && _bountyService != null)
        {
            var b = await _bountyService.GetBountyByIdAsync(reviewId, email);
            if (b != null)
            {
                var reply = await _commentService.AddReplyAsync(reviewId, commentId, email, IsReviewerOrAdmin(role, email) ? "Reviewer" : "Producer", req.Reply);
                return Ok(reply);
            }
        }

        if (review == null) return NotFound(new { error = $"Review submission '{reviewId}' not found." });

        if (!IsReviewerOrAdmin(role, email) && !string.Equals(review.ProducerEmail, email, StringComparison.OrdinalIgnoreCase))
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied." });

        try
        {
            var reply = await _commentService.AddReplyAsync(reviewId, commentId, email, IsReviewerOrAdmin(role, email) ? "Reviewer" : "Producer", req.Reply);
            return Ok(reply);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = "RequireReviewer")]
    [HttpPost("{reviewId}/request-changes")]
    public async Task<IActionResult> RequestChanges(string reviewId, [FromBody] ReviewDecisionRequest? req = null)
    {
        var email = User.Identity?.Name ?? string.Empty;

        try
        {
            var r = _reviews.RequestChanges(reviewId, email, req?.Feedback);

            if (_bountyService != null)
            {
                var targetId = r?.ArtifactId ?? reviewId;
                var bounty = await _bountyService.GetBountyByIdAsync(targetId, email);
                if (bounty == null && r != null)
                {
                    bounty = await _bountyService.GetBountyByIdAsync(reviewId, email);
                }
                if (bounty != null)
                {
                    await _bountyService.ReviewCodeAsync(bounty.Id, email, new BountyReviewRequest
                    {
                        IsApproved = false,
                        Feedback = req?.Feedback ?? "Changes requested."
                    });
                }
            }

            if (r != null)
            {
                if (!string.IsNullOrWhiteSpace(req?.Feedback))
                {
                    await _threadService.AddMessageAsync(reviewId, email, "Reviewer", req.Feedback);
                }
                return Ok(r);
            }

            if (_bountyService != null)
            {
                var b = await _bountyService.GetBountyByIdAsync(reviewId, email);
                if (b != null)
                {
                    var res = await _bountyService.ReviewCodeAsync(b.Id, email, new BountyReviewRequest
                    {
                        IsApproved = false,
                        Feedback = req?.Feedback ?? "Changes requested."
                    });
                    return Ok(new ReviewActionResponseDto
                    {
                        Success = true,
                        ReviewId = b.Id,
                        Status = "ChangesRequested",
                        Message = "Changes requested for bounty code.",
                        Bounty = res
                    });
                }
            }

            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{reviewId}/resubmit")]
    public IActionResult Resubmit(string reviewId, [FromBody] Newtonsoft.Json.Linq.JToken? rawBody)
    {
        var email = User.Identity?.Name ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var review = _reviews.GetReview(reviewId);
        if (review == null) return NotFound(new { error = "Review not found." });
        if (!string.Equals(review.ProducerEmail, email, StringComparison.OrdinalIgnoreCase))
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied: can only resubmit own reviews." });

        string content;
        if (rawBody is Newtonsoft.Json.Linq.JObject obj && obj["content"] != null)
        {
            content = obj["content"]!.ToString();
        }
        else
        {
            content = rawBody?.ToString(Newtonsoft.Json.Formatting.None) ?? string.Empty;
        }

        try
        {
            var r = _reviews.Resubmit(reviewId, email, content);
            return Ok(r);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = "RequireReviewer")]
    [HttpPost("{reviewId}/approve")]
    public async Task<IActionResult> Approve(string reviewId, [FromBody] ReviewDecisionRequest? req = null)
    {
        var email = User.Identity?.Name ?? string.Empty;

        try
        {
            var r = await _reviews.ApproveAsync(reviewId, email, req?.Feedback);

            if (_bountyService != null)
            {
                var targetId = r?.ArtifactId ?? reviewId;
                var bounty = await _bountyService.GetBountyByIdAsync(targetId, email);
                if (bounty == null && r != null)
                {
                    bounty = await _bountyService.GetBountyByIdAsync(reviewId, email);
                }
                if (bounty != null)
                {
                    await _bountyService.ReviewCodeAsync(bounty.Id, email, new BountyReviewRequest
                    {
                        IsApproved = true,
                        Feedback = req?.Feedback ?? "Approved and moved to testing phase."
                    });
                }
            }

            if (r != null)
            {
                if (!string.IsNullOrWhiteSpace(req?.Feedback))
                {
                    await _threadService.AddMessageAsync(reviewId, email, "Reviewer", req.Feedback);
                }

                await _usage.RecordUsageAsync(new UsageEvent
                {
                    UserId = email,
                    Action = "APPROVE",
                    ArtifactName = r.ArtifactId,
                    Source = "backend",
                    Timestamp = DateTime.UtcNow
                });

                return Ok(r);
            }

            if (_bountyService != null)
            {
                var b = await _bountyService.GetBountyByIdAsync(reviewId, email);
                if (b != null)
                {
                    var res = await _bountyService.ReviewCodeAsync(b.Id, email, new BountyReviewRequest
                    {
                        IsApproved = true,
                        Feedback = req?.Feedback ?? "Validated and approved."
                    });
                    return Ok(new ReviewActionResponseDto
                    {
                        Success = true,
                        ReviewId = b.Id,
                        Status = "Approved",
                        Message = "Bounty code approved and moved to testing.",
                        Bounty = res
                    });
                }
            }

            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = "RequireReviewer")]
    [HttpPost("{reviewId}/reject")]
    public async Task<IActionResult> Reject(string reviewId, [FromBody] ReviewDecisionRequest? req = null)
    {
        var email = User.Identity?.Name ?? string.Empty;

        try
        {
            var r = _reviews.Reject(reviewId, email, req?.Feedback);

            if (_bountyService != null)
            {
                var targetId = r?.ArtifactId ?? reviewId;
                var bounty = await _bountyService.GetBountyByIdAsync(targetId, email);
                if (bounty == null && r != null)
                {
                    bounty = await _bountyService.GetBountyByIdAsync(reviewId, email);
                }
                if (bounty != null)
                {
                    await _bountyService.ReviewCodeAsync(bounty.Id, email, new BountyReviewRequest
                    {
                        IsApproved = false,
                        Feedback = req?.Feedback ?? "Rejected."
                    });
                }
            }

            if (r != null)
            {
                if (!string.IsNullOrWhiteSpace(req?.Feedback))
                {
                    await _threadService.AddMessageAsync(reviewId, email, "Reviewer", req.Feedback);
                }

                await _usage.RecordUsageAsync(new UsageEvent
                {
                    UserId = email,
                    Action = "REJECT",
                    ArtifactName = r.ArtifactId,
                    Source = "backend",
                    Timestamp = DateTime.UtcNow
                });

                return Ok(r);
            }

            if (_bountyService != null)
            {
                var b = await _bountyService.GetBountyByIdAsync(reviewId, email);
                if (b != null)
                {
                    var res = await _bountyService.ReviewCodeAsync(b.Id, email, new BountyReviewRequest
                    {
                        IsApproved = false,
                        Feedback = req?.Feedback ?? "Rejected."
                    });
                    return Ok(new ReviewActionResponseDto
                    {
                        Success = true,
                        ReviewId = b.Id,
                        Status = "Rejected",
                        Message = "Bounty code rejected.",
                        Bounty = res
                    });
                }
            }

            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = "RequireReviewer")]
    [HttpPost("{reviewId}/cancel")]
    public async Task<IActionResult> Cancel(string reviewId, [FromBody] ReviewDecisionRequest? req = null)
    {
        var email = User.Identity?.Name ?? string.Empty;

        try
        {
            var r = _reviews.CancelReview(reviewId, email, req?.Feedback);
            if (r == null) return NotFound();

            return Ok(r);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = "RequireReviewer")]
    [HttpPost("{reviewId}/sla")]
    public IActionResult UpdateSla(string reviewId, [FromBody] UpdateSlaRequest req)
    {
        try
        {
            var updated = _reviews.UpdateSlaTarget(reviewId, req.SlaTargetMinutes);
            return Ok(new ReviewSlaUpdateResponseDto
            {
                Success = true,
                ReviewId = updated.Id,
                ArtifactId = updated.ArtifactId,
                SlaTargetMinutes = updated.SlaTargetMinutes,
                SlaDeadline = updated.EffectiveSlaDeadline,
                SlaRemainingMinutes = updated.SlaRemainingMinutes,
                SlaRemainingFormatted = updated.SlaRemainingFormatted,
                SlaStatus = updated.SlaStatus
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = "RequireReviewer")]
    [HttpGet("sla-summary")]
    public IActionResult GetSlaSummary()
    {
        var summary = _reviews.GetSlaSummary();
        return Ok(summary);
    }

    [Authorize(Policy = "RequireReviewer")]
    [HttpPost("sla/check-now")]
    public async Task<IActionResult> TriggerSlaCheck()
    {
        var remindersSent = await _reviews.CheckSlaAndSendRemindersAsync();
        return Ok(new ReviewSlaCheckResponseDto
        {
            Success = true,
            RemindersSent = remindersSent,
            CheckedAt = DateTime.UtcNow.ToString("o")
        });
    }
}
