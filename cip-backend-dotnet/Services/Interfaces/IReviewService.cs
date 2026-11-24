using System.Collections.Generic;
using System.Threading.Tasks;
using EngineeringCommons.Backend.Models;

namespace EngineeringCommons.Backend.Services.Interfaces;

public interface IReviewService
{
    Review SubmitChange(SubmitChangeRequestDto request, string producerEmail) =>
        SubmitChange(
            request?.ArtifactId ?? string.Empty,
            producerEmail,
            request?.Content ?? string.Empty,
            request?.IsPrivate ?? false,
            request?.AllowedContributors,
            request?.AllowedReviewers,
            request?.AllowedConsumers,
            request?.SlaTargetMinutes > 0 ? request.SlaTargetMinutes : BountyConstants.DefaultSlaTargetMinutes);
    Review SubmitChange(string artifactId, string producerEmail, string content, bool isPrivate = false, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null, int slaTargetMinutes = BountyConstants.DefaultSlaTargetMinutes);
    Review AssignReview(string reviewId, string reviewerEmail);
    Review RequestChanges(string reviewId, string reviewerEmail, string? feedback = null);
    Review Resubmit(string reviewId, string producerEmail, string content, bool? isPrivate = null, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null);
    Task<Review?> ApproveAsync(string reviewId, string reviewerEmail, string? feedback = null);
    Review? Reject(string reviewId, string reviewerEmail, string? feedback = null);
    Review? CancelReview(string reviewId, string reviewerEmail, string? reason = null);
    Review? GetReview(string reviewId);
    IEnumerable<Review> GetAllReviews();
    IEnumerable<Review> GetPendingReviews();
    IEnumerable<Review> GetByProducer(string producerEmail);
    Review UpdateSlaTarget(string reviewId, int slaTargetMinutes);
    Task<int> CheckSlaAndSendRemindersAsync();
    SlaSummaryDto GetSlaSummary();
}

