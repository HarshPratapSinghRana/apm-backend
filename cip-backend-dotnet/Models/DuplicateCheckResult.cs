using System;

namespace CipBackend.Models;

public class DuplicateCheckResult
{
    public bool IsDuplicate { get; set; }
    public bool IsUnchanged { get; set; }
    public string? MatchedArtifactId { get; set; }
    public string? MatchedArtifactName { get; set; }
    public string? MatchedVersion { get; set; }
    public string? SubmittedVersion { get; set; }
    public string? ArtifactType { get; set; }
    public int FilesCompared { get; set; }
    public int FilesUnchanged { get; set; }
    public int FilesAdded { get; set; }
    public int FilesModified { get; set; }
    public int FilesDeleted { get; set; }
    public int FilesChanged { get; set; }
    public string? ExistingFingerprint { get; set; }
    public string? SubmittedFingerprint { get; set; }
    public string Message { get; set; } = string.Empty;
}
