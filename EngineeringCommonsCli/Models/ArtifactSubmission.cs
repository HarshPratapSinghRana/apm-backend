namespace EngineeringCommonsCli.Models;

public record ArtifactSubmission(string Name, string Type, string Version, string Path);

public class ArtifactSubmissionResult
{
    public bool Success { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsDuplicate { get; set; }
    public bool IsUnchanged { get; set; }
    public string? MatchedArtifactId { get; set; }
    public string? MatchedArtifactName { get; set; }
    public string? MatchedVersion { get; set; }
    public string? SubmittedVersion { get; set; }
    public int FilesCompared { get; set; }
    public int FilesUnchanged { get; set; }
    public int FilesAdded { get; set; }
    public int FilesModified { get; set; }
    public int FilesDeleted { get; set; }
    public int FilesChanged { get; set; }
    public string? ReviewId { get; set; }
    public string? Message { get; set; }

    public ArtifactSubmissionResult() { }

    public ArtifactSubmissionResult(bool success, string status)
    {
        Success = success;
        Status = status;
    }
}
