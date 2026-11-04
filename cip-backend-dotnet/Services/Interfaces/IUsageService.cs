using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CipBackend.Models;

namespace CipBackend.Services.Interfaces;

public class UsageFilterOptions
{
    public string? Period { get; set; } = "all"; // today, 7d, 30d, all
    public string? ArtifactType { get; set; } // agent, skill, plugin, mcpserver, prompt, command, all
    public string? ArtifactId { get; set; }
    public int Limit { get; set; } = 5;
}

public class TopArtifactDto
{
    public string ArtifactId { get; set; } = string.Empty;
    public string ArtifactName { get; set; } = string.Empty;
    public string ArtifactType { get; set; } = "agent";
    public int Count { get; set; }
    public int Rank { get; set; }
    public string Metric { get; set; } = "Uses";
}

public class ArtifactAnalyticsDto
{
    public string ArtifactId { get; set; } = string.Empty;
    public string ArtifactName { get; set; } = string.Empty;
    public string ArtifactType { get; set; } = "agent";
    public string CurrentVersion { get; set; } = "1.0.0";
    public int Downloads { get; set; }
    public int UniqueInstallers { get; set; }
    public int UsageCount { get; set; }
    public int UniqueUsers { get; set; }
    public double UsageRate { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public Dictionary<string, int> SourceBreakdown { get; set; } = new();
    public Dictionary<string, string> ExternalTelemetry { get; set; } = new();
}

public class UserArtifactUsageDto
{
    public string UserEmail { get; set; } = string.Empty;
    public int Downloads { get; set; }
    public int Uses { get; set; }
    public DateTime? LastActiveAt { get; set; }
}

public class UsageSummaryDto
{
    public int TotalDownloads { get; set; }
    public int TotalUses { get; set; }
    public int ActiveUsers { get; set; }
    public int ArtifactsUsed { get; set; }
    public string Period { get; set; } = "all";
    public List<TopArtifactDto> MostDownloaded { get; set; } = new();
    public List<TopArtifactDto> MostUsed { get; set; } = new();
    // Legacy support fields
    public int TotalEvents => TotalDownloads + TotalUses;
    public string MostUsedArtifact => MostUsed.Count > 0 ? MostUsed[0].ArtifactName : "None";
    public int MostUsedArtifactCount => MostUsed.Count > 0 ? MostUsed[0].Count : 0;
}

public class ArtifactUsageSummaryDto
{
    public string ArtifactName { get; set; } = string.Empty;
    public string ArtifactVersion { get; set; } = "1.0.0";
    public string Platform { get; set; } = "EngineeringCommons";
    public int UsageCount { get; set; }
    public DateTime LastUsedAt { get; set; }
}

public interface IUsageService
{
    Task RecordUsageAsync(UsageEvent usageEvent);
    Task<IEnumerable<UsageEvent>> GetUsageEventsAsync(string? userId = null);
    Task<IEnumerable<ArtifactUsageSummaryDto>> GetUsageSummaryAsync(string? userId = null);
    
    // Enterprise Analytics Methods
    Task<UsageSummaryDto> GetSummaryAsync(UsageFilterOptions filters, string? requestingUserEmail = null, string? requestingUserRole = null);
    Task<IEnumerable<ArtifactAnalyticsDto>> GetArtifactAnalyticsAsync(UsageFilterOptions filters, string? requestingUserEmail = null, string? requestingUserRole = null);
    Task<ArtifactAnalyticsDto?> GetArtifactDetailsAnalyticsAsync(string artifactId, string? requestingUserEmail = null, string? requestingUserRole = null);
    Task<IEnumerable<TopArtifactDto>> GetMostDownloadedAsync(int limit, UsageFilterOptions filters, string? requestingUserEmail = null, string? requestingUserRole = null);
    Task<IEnumerable<TopArtifactDto>> GetMostUsedAsync(int limit, UsageFilterOptions filters, string? requestingUserEmail = null, string? requestingUserRole = null);
    Task<IEnumerable<UserArtifactUsageDto>> GetUserUsageByArtifactAsync(string artifactId, string requestingUserEmail, string requestingUserRole);
}

