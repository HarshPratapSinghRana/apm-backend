namespace EngineeringCommonsCli.Models;

public record PendingReviewDto(
    string Id,
    string ArtifactId,
    string ProducerEmail,
    DateTime SubmittedAt,
    string? Feedback = null,
    string? ReviewerEmail = null,
    string? Status = "Submitted",
    int SlaTargetMinutes = 1440,
    DateTime? SlaDeadline = null,
    double SlaRemainingMinutes = 1440,
    string? SlaStatus = "OnTrack",
    string? SlaRemainingFormatted = "24h remaining",
    bool IsSlaBreached = false,
    bool IsSlaWarning = false
);

public record ArtifactVersionDto(
    string Version,
    string CipPackage,
    bool IsLatest = false,
    DateTime? PublishedAt = null
);

public record ProducerSubmissionDto(
    string Id,
    string ArtifactId,
    string Status,
    DateTime SubmittedAt,
    string? ReviewerEmail = null,
    string? Feedback = null,
    DateTime? DecisionAt = null
);

public record ReviewDetailDto(
    string Id,
    string ArtifactId,
    string ProducerEmail,
    string Content,
    int Status,
    DateTime SubmittedAt,
    string? ReviewerEmail = null,
    string? Feedback = null,
    DateTime? DecisionAt = null,
    bool IsPublished = false,
    string? PublishError = null
);

public enum ArtifactChangeType { NewArtifact, Modified, NoChanges }
public enum ChangeType { Added, Deleted, Modified, Unchanged }
public enum LineChangeType { Added, Deleted, Unchanged }

public record LineChangeDto(int? OldLineNumber, int? NewLineNumber, LineChangeType Type, string Content);

public record ArtifactFileDiffDto(
    string Path,
    ChangeType ChangeType,
    string? OldContent,
    string? NewContent,
    List<LineChangeDto> LineChanges,
    int AddedLinesCount,
    int DeletedLinesCount
);

public record ArtifactDiffDto(
    string? ReviewId,
    string ArtifactName,
    string? CurrentVersion,
    string? SubmittedVersion,
    string? ProducerEmail,
    DateTime? SubmittedAt,
    ArtifactChangeType ArtifactChangeType,
    int FilesChangedCount,
    int AddedFilesCount,
    int ModifiedFilesCount,
    int DeletedFilesCount,
    int UnchangedFilesCount,
    List<ArtifactFileDiffDto> Files
);

/// <summary>
/// Result from the backend download endpoint. Contains artifact metadata and the raw content JSON
/// which includes the files array with path/content pairs.
/// </summary>
public record ArtifactDownloadResult(
    string Id,
    string Name,
    string Type,
    string Version,
    string Description,
    string CipPackage,
    string Content
);

/// <summary>
/// Represents a single file entry within a downloaded artifact's content JSON.
/// </summary>
public record ArtifactFileEntry(string Path, string Content);

public record ReviewCommentReplyCliDto(
    string Id,
    string AuthorEmail,
    string AuthorRole,
    string Comment,
    DateTime CreatedAt
);

public record ReviewCommentCliDto(
    string Id,
    string SubmissionId,
    string ArtifactId,
    string ArtifactVersion,
    string FilePath,
    int? LineNumber,
    int? OldLineNumber,
    string LineType,
    string? OldContent,
    string? NewContent,
    string AuthorEmail,
    string AuthorRole,
    string Comment,
    DateTime CreatedAt,
    string? ParentCommentId,
    List<ReviewCommentReplyCliDto> Replies
);

public record ReviewMessageCliDto(
    string Id,
    string AuthorEmail,
    string AuthorRole,
    string Message,
    DateTime CreatedAt
);

public record ReviewThreadCliDto(
    string Id,
    string ReviewId,
    string ArtifactId,
    string ArtifactName,
    string Version,
    string ProducerEmail,
    string? ReviewerEmail,
    string Status,
    string? Feedback,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<ReviewMessageCliDto> Messages
);
