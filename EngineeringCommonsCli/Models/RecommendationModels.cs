using System.Collections.Generic;

namespace EngineeringCommonsCli.Models;

public class WorkspaceContextSummary
{
    public List<string> Technologies { get; set; } = new();
    public List<string> Dependencies { get; set; } = new();
    public List<string> FileExtensions { get; set; } = new();
    public int ScannedFileCount { get; set; }
}

public class RecommendationResultCliDto
{
    public string ArtifactId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double MatchScore { get; set; }
    public string MatchReason { get; set; } = string.Empty;
}
