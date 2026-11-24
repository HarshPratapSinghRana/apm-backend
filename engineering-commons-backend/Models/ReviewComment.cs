using System;
using System.Collections.Generic;

namespace EngineeringCommons.Backend.Models;

public class ReviewComment
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SubmissionId { get; set; } = string.Empty;
    public string? ThreadId { get; set; }
    public string ArtifactId { get; set; } = string.Empty;
    public string ArtifactVersion { get; set; } = "1.0.0";
    public string FilePath { get; set; } = string.Empty; // Artifact-relative path e.g. "agents/design-reviewer.md"
    public int? LineNumber { get; set; } // Line number in new content (or null for file-level)
    public int? OldLineNumber { get; set; } // Line number in old content (for deleted lines)
    public int? StartLineNumber { get; set; } // Start line for multi-line comments
    public int? EndLineNumber { get; set; } // End line for multi-line comments
    public string? LineRange { get; set; } // Formatted line range e.g. "55-58"
    public string LineType { get; set; } = "Context"; // "Added", "Deleted", "Modified", "File"
    public string? OldContent { get; set; }
    public string? NewContent { get; set; }
    public string AuthorEmail { get; set; } = string.Empty;
    public string AuthorRole { get; set; } = "Reviewer"; // "Reviewer" or "Producer"
    public string Comment { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? ParentCommentId { get; set; } // For thread replies
    public List<ReviewComment> Replies { get; set; } = new();
}

public class AddReviewCommentRequest
{
    public string FilePath { get; set; } = string.Empty;
    public int? LineNumber { get; set; }
    public int? OldLineNumber { get; set; }
    public int? StartLineNumber { get; set; }
    public int? EndLineNumber { get; set; }
    public string? LineRange { get; set; }
    public string LineType { get; set; } = "Context";
    public string? OldContent { get; set; }
    public string? NewContent { get; set; }
    public string Comment { get; set; } = string.Empty;
}

public class AddReplyRequest
{
    public string Reply { get; set; } = string.Empty;
}
