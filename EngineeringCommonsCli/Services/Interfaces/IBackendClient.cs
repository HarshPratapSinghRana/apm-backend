using EngineeringCommonsCli.Models;

namespace EngineeringCommonsCli.Services.Interfaces;

public interface IBackendClient
{
    Task<UserSession?> LoginAsync(string email, string password);
    Task<UserSession?> SsoLoginAsync(string token, string? email = null, string? name = null, string? role = null);
    Task<IEnumerable<ArtifactSpec>> ListArtifactsAsync(string? typeFilter = null, bool forceRefresh = false);
    Task<ArtifactSubmissionResult> SubmitArtifactAsync(ArtifactSubmission submission);
    Task<ArtifactSpec?> GetArtifactAsync(string name, bool forceRefresh = false);
    /// <summary>
    /// Download full artifact content (including files) from the backend.
    /// The backend uses its server-side PAT to fetch from GitHub on behalf of the consumer.
    /// </summary>
    Task<ArtifactDownloadResult?> DownloadArtifactAsync(string name, string? version = null);
    Task<IEnumerable<ArtifactVersionDto>> GetArtifactVersionsAsync(string artifactId, bool forceRefresh = false);
    Task<IEnumerable<PendingReviewDto>> GetPendingReviewsAsync();
    Task<ReviewDetailDto?> GetReviewDetailAsync(string reviewId);
    Task<ArtifactDiffDto?> GetReviewDiffAsync(string reviewId);
    Task<bool> ApproveReviewAsync(string reviewId, string? feedback = null);
    Task<bool> RejectReviewAsync(string reviewId, string? feedback = null);
    Task<bool> RequestChangesAsync(string reviewId, string feedback);
    Task<IEnumerable<ProducerSubmissionDto>> GetMySubmissionsAsync(bool forceRefresh = false);
    Task<IEnumerable<ReviewCommentCliDto>> GetReviewCommentsAsync(string reviewId);
    Task<ReviewCommentCliDto?> AddReviewCommentAsync(string reviewId, string filePath, string comment, int? lineNumber = null, string lineType = "Modified", string? oldContent = null, string? newContent = null);
    Task<ReviewCommentReplyCliDto?> AddCommentReplyAsync(string reviewId, string commentId, string reply);
    Task<ReviewThreadCliDto?> GetReviewThreadAsync(string reviewId);
    Task<bool> SendThreadMessageAsync(string reviewId, string message);
    Task<bool> SendUsageEventAsync(string action, string artifactName, string artifactVersion = "1.0.0", string? artifactType = null, string? metadata = null, string? sessionId = null, string? source = null, string? platform = null);
    Task<bool> UpdateVisibilityAsync(string artifactName, bool isPrivate, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null);
    Task<CertificationStatusCliDto?> GetCertificationStatusAsync(string artifactName);
    Task<CertificationEvaluationCliDto?> EvaluateCertificationAsync(string artifactName);
    Task<CertificationEvaluationCliDto?> RequestCertificationAsync(string artifactName);
    Task<CertificationRecheckResultCliDto?> RecheckCertificationAsync(string artifactName);
    Task<CertificationAuditLogResponseCliDto?> GetCertificationHistoryAsync(string artifactName);
    Task<CertificationIntegrityResultCliDto?> VerifyCertificationIntegrityAsync(string artifactName);
    Task<CertificationStatusCliDto?> CertifyArtifactAsync(string artifactName, string? version = null, string? reason = null);
    Task<CertificationStatusCliDto?> RevokeCertificationAsync(string artifactName, string reason);
    Task<IEnumerable<RecommendationResultCliDto>> GetRecommendationsAsync(string? query, List<string>? technologies = null, List<string>? dependencies = null, List<string>? fileExtensions = null);
    Task<bool> RequestAccessAsync(string role = "CONTRIBUTOR", string? reason = null);
    Task<UserRoleStatusCliDto?> GetMyAccessRequestsAsync();
    Task<IEnumerable<AccessRequestCliDto>> GetAdminAccessRequestsAsync(string? status = null);
    Task<bool> ApproveAccessRequestAsync(string requestId, string? notes = null);
    Task<bool> RejectAccessRequestAsync(string requestId, string? notes = null);
    Task<bool> RevokeAccessAsync(string targetEmail, string? notes = null);
    Task<bool> CertifyReviewerAsync(string targetEmail, string? notes = null);
    Task<IEnumerable<UserRoleRecordDto>> GetAllRolesAsync();

    // Bounty Service
    Task<IEnumerable<BountyCliDto>> GetBountiesAsync(string? status = null, string? category = null, string? stage = null, bool forceRefresh = false);
    Task<BountyDetailCliDto?> GetBountyByIdAsync(string id);
    Task<BountyCliDto?> ClaimBountyAsync(string id);
    Task<BountyCliDto?> ReleaseBountyAsync(string id);
    Task<BountyCliDto?> SubmitBountyCodeAsync(string id, string solutionCode, string? commitSha = null, string? notes = null);
    Task<BountyCliDto?> ReviewBountyCodeAsync(string id, bool isApproved, string feedback);
    Task<BountyCliDto?> RunBountyTestsAsync(string id, string testSuiteName, bool isPassed, int passedCount, int failedCount, string testLogs);
    Task<BountyCliDto?> SetBountyFeedbackChoiceAsync(string id, string choice);
    Task<BountyAnalyticsCliDto?> GetBountyAnalyticsAsync();
}

