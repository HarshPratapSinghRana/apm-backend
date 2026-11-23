using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Services.Implementations;

public class ArtifactRecommendationService : IArtifactRecommendationService
{
    private readonly IMarketplaceService _marketplace;

    public static class RecommendationWeights
    {
        public const double NameMatchWeight = 4.0;
        public const double TypeMatchWeight = 2.5;
        public const double DescriptionMatchWeight = 1.5;
        public const double TechnologyMatchWeight = 3.0;
        public const double DependencyMatchWeight = 2.0;
        public const double ExtensionMatchWeight = 3.5;
        public const double CodeReviewMatchWeight = 2.0;
        public const double MinRelevanceThreshold = 0.5;
        public const double ScoreNormalizationFactor = 10.0;
        public const double DefaultScore = 0.5;
        public const int MaxResultLimit = 20;
    }

    public ArtifactRecommendationService(IMarketplaceService marketplace)
    {
        _marketplace = marketplace;
    }

    public async Task<IEnumerable<RecommendationResult>> RecommendAsync(RecommendationRequest request, string? userEmail = null)
    {
        if (request == null) return Enumerable.Empty<RecommendationResult>();

        var artifacts = (await _marketplace.ListArtifactsAsync()).ToList();
        var results = new List<RecommendationResult>();

        // Sanitize search query against delimiter injection
        var rawQuery = request.Query ?? string.Empty;
        var sanitizedQuery = Regex.Replace(rawQuery, @"[^\w\s\-\.\#\+]", " ").ToLowerInvariant().Trim();
        var queryTokens = sanitizedQuery.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var techTokens = (request.Technologies ?? new List<string>())
            .Select(t => t.ToLowerInvariant().Trim())
            .Where(t => !string.IsNullOrEmpty(t))
            .ToHashSet();

        var depTokens = (request.Dependencies ?? new List<string>())
            .Select(d => d.ToLowerInvariant().Trim())
            .Where(d => !string.IsNullOrEmpty(d))
            .ToHashSet();

        var extTokens = (request.FileExtensions ?? new List<string>())
            .Select(e => e.ToLowerInvariant().Trim())
            .Where(e => !string.IsNullOrEmpty(e))
            .ToHashSet();

        foreach (var art in artifacts)
        {
            double score = 0.0;
            var reasons = new List<string>();

            var artName = art.Name.ToLowerInvariant();
            var artType = art.Type.ToLowerInvariant();
            var artDesc = (art.Description ?? string.Empty).ToLowerInvariant();

            // 1. Direct keyword query matching
            foreach (var token in queryTokens)
            {
                if (artName.Contains(token))
                {
                    score += RecommendationWeights.NameMatchWeight;
                    reasons.Add($"Name matches search term '{token}'");
                }
                else if (artType.Contains(token))
                {
                    score += RecommendationWeights.TypeMatchWeight;
                    reasons.Add($"Type matches search term '{token}'");
                }
                else if (artDesc.Contains(token))
                {
                    score += RecommendationWeights.DescriptionMatchWeight;
                    reasons.Add($"Description matches keyword '{token}'");
                }
            }

            // 2. Technology & Language matching
            foreach (var tech in techTokens)
            {
                if (artName.Contains(tech) || artDesc.Contains(tech))
                {
                    score += RecommendationWeights.TechnologyMatchWeight;
                    reasons.Add($"Matches project technology '{tech}'");
                }
            }

            // 3. Dependency matching (e.g., react, efcore, sql)
            foreach (var dep in depTokens)
            {
                if (artName.Contains(dep) || artDesc.Contains(dep))
                {
                    score += RecommendationWeights.DependencyMatchWeight;
                    reasons.Add($"Relevant to project dependency '{dep}'");
                }
            }

            // 4. File extension correlation (e.g., .sql -> sql transformer, .cs -> csharp reviewer)
            if (extTokens.Contains(".sql") && (artName.Contains("sql") || artDesc.Contains("sql") || artDesc.Contains("database")))
            {
                score += RecommendationWeights.ExtensionMatchWeight;
                reasons.Add("Recommended for SQL and database files found in workspace");
            }
            if ((extTokens.Contains(".cs") || extTokens.Contains(".ts") || extTokens.Contains(".js") || extTokens.Contains(".py")) && 
                (artName.Contains("review") || artType == "agent"))
            {
                score += RecommendationWeights.CodeReviewMatchWeight;
                reasons.Add("Recommended for code review in your active codebase");
            }

            if (score > RecommendationWeights.MinRelevanceThreshold || queryTokens.Length == 0)
            {
                var baseScore = score > 0.0 ? Math.Min(score / RecommendationWeights.ScoreNormalizationFactor, 1.0) : RecommendationWeights.DefaultScore;
                results.Add(new RecommendationResult
                {
                    ArtifactId = art.Id ?? art.Name,
                    Name = art.Name,
                    Type = art.Type,
                    Version = art.Version,
                    Description = art.Description ?? string.Empty,
                    MatchScore = Math.Round(baseScore, 2),
                    MatchReason = reasons.Any() ? string.Join("; ", reasons.Distinct()) : "Relevant to your workspace"
                });
            }
        }

        var maxLimit = Math.Clamp(request.MaxResults, 1, RecommendationWeights.MaxResultLimit);
        return results
            .OrderByDescending(r => r.MatchScore)
            .Take(maxLimit);
    }
}
