using System.Collections.Generic;
using System.Threading.Tasks;

namespace EngineeringCommons.Backend.Services.Interfaces;

public class RecommendationRequest
{
    public string? Query { get; set; }
    public List<string>? Technologies { get; set; } = new();
    public List<string>? Dependencies { get; set; } = new();
    public List<string>? FileExtensions { get; set; } = new();
    public int MaxResults { get; set; } = 5;
}

public class RecommendationResult
{
    public string ArtifactId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double MatchScore { get; set; }
    public string MatchReason { get; set; } = string.Empty;
}

public interface IArtifactRecommendationService
{
    Task<IEnumerable<RecommendationResult>> RecommendAsync(RecommendationRequest request, string? userEmail = null);
}
