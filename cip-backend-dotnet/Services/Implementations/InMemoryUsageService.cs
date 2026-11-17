using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Services.Implementations;

public class InMemoryUsageService : IUsageService
{
    private readonly ConcurrentBag<UsageEvent> _events = new();
    private readonly IArtifactClassifier _classifier;

    public InMemoryUsageService(IArtifactClassifier? classifier = null)
    {
        _classifier = classifier ?? new ArtifactClassifier();
        SeedDefaults();
    }

    private void SeedDefaults()
    {
        var defaults = new[]
        {
            new UsageEvent
            {
                Id = Guid.NewGuid().ToString(),
                EventType = "USE",
                Action = "USE",
                ArtifactId = "semantic-sql-optimizer",
                ArtifactName = "semantic-sql-optimizer",
                ArtifactType = "skill",
                ArtifactVersion = "1.2.0",
                UserId = "harsh.rana@maqsoftware.com",
                Source = "VS_CODE",
                Platform = "EngineeringCommons",
                Timestamp = DateTime.UtcNow.AddHours(-12)
            },
            new UsageEvent
            {
                Id = Guid.NewGuid().ToString(),
                EventType = "INSTALL",
                Action = "INSTALL",
                ArtifactId = "api-test-generator",
                ArtifactName = "api-test-generator",
                ArtifactType = "skill",
                ArtifactVersion = "2.1.0",
                UserId = "harsh.rana@maqsoftware.com",
                Source = "CLI",
                Platform = "EngineeringCommons",
                Timestamp = DateTime.UtcNow.AddHours(-24)
            },
            new UsageEvent
            {
                Id = Guid.NewGuid().ToString(),
                EventType = "USE",
                Action = "USE",
                ArtifactId = "review-and-refactor",
                ArtifactName = "review-and-refactor",
                ArtifactType = "skill",
                ArtifactVersion = "1.1.0",
                UserId = "harsh.rana@maqsoftware.com",
                Source = "VS_CODE",
                Platform = "EngineeringCommons",
                Timestamp = DateTime.UtcNow.AddHours(-6)
            }
        };

        foreach (var ev in defaults)
        {
            _events.Add(ev);
        }
    }

    public Task RecordUsageAsync(UsageEvent usageEvent)
    {
        if (usageEvent == null) throw new ArgumentNullException(nameof(usageEvent));

        var eventType = !string.IsNullOrWhiteSpace(usageEvent.EventType) 
            ? usageEvent.EventType.ToUpperInvariant() 
            : (!string.IsNullOrWhiteSpace(usageEvent.Action) ? usageEvent.Action.ToUpperInvariant() : "USE");

        usageEvent.EventType = eventType;
        usageEvent.Action = eventType;

        if (string.IsNullOrWhiteSpace(usageEvent.ArtifactId) && !string.IsNullOrWhiteSpace(usageEvent.ArtifactName))
        {
            usageEvent.ArtifactId = usageEvent.ArtifactName;
        }
        else if (string.IsNullOrWhiteSpace(usageEvent.ArtifactName) && !string.IsNullOrWhiteSpace(usageEvent.ArtifactId))
        {
            usageEvent.ArtifactName = usageEvent.ArtifactId;
        }

        if (string.IsNullOrWhiteSpace(usageEvent.ArtifactType) && !string.IsNullOrWhiteSpace(usageEvent.ArtifactName))
        {
            var cls = _classifier.Classify(usageEvent.ArtifactName);
            usageEvent.ArtifactType = cls.Type.ToString().ToLowerInvariant();
        }

        if (string.IsNullOrWhiteSpace(usageEvent.ArtifactVersion))
        {
            usageEvent.ArtifactVersion = "1.0.0";
        }

        if (string.IsNullOrWhiteSpace(usageEvent.Source))
        {
            usageEvent.Source = "VS_CODE";
        }

        if (usageEvent.Timestamp == default)
        {
            usageEvent.Timestamp = DateTime.UtcNow;
        }

        _events.Add(usageEvent);
        return Task.CompletedTask;
    }

    public Task<IEnumerable<UsageEvent>> GetUsageEventsAsync(string? userId = null)
    {
        var query = _events.AsEnumerable();
        if (!string.IsNullOrEmpty(userId))
        {
            var norm = userId.Trim().ToLowerInvariant();
            query = query.Where(e => (e.UserId ?? "").Trim().ToLowerInvariant() == norm);
        }
        return Task.FromResult<IEnumerable<UsageEvent>>(query.OrderByDescending(e => e.Timestamp).ToList());
    }

    public Task<IEnumerable<ArtifactUsageSummaryDto>> GetUsageSummaryAsync(string? userId = null)
    {
        var query = _events.AsEnumerable();
        if (!string.IsNullOrEmpty(userId))
        {
            var norm = userId.Trim().ToLowerInvariant();
            query = query.Where(e => (e.UserId ?? "").Trim().ToLowerInvariant() == norm);
        }

        var results = query
            .GroupBy(e => new { e.ArtifactName, e.ArtifactVersion, e.Platform })
            .Select(g => new ArtifactUsageSummaryDto
            {
                ArtifactName = g.Key.ArtifactName ?? "Unknown",
                ArtifactVersion = g.Key.ArtifactVersion ?? "1.0.0",
                Platform = g.Key.Platform ?? "EngineeringCommons",
                UsageCount = g.Count(),
                LastUsedAt = g.Max(e => e.Timestamp)
            })
            .OrderByDescending(s => s.UsageCount)
            .ToList();

        return Task.FromResult<IEnumerable<ArtifactUsageSummaryDto>>(results);
    }

    public Task<UsageSummaryDto> GetSummaryAsync(UsageFilterOptions filters, string? requestingUserEmail = null, string? requestingUserRole = null)
    {
        var events = FilterEvents(_events, filters, requestingUserEmail, requestingUserRole).ToList();

        var downloads = events.Count(e => e.EventType == "INSTALL");
        var uses = events.Count(e => e.EventType != "INSTALL");
        var activeUsers = events.Select(e => e.UserId).Distinct().Count();
        var artifactsUsed = events.Select(e => e.ArtifactId).Distinct().Count();

        var mostDownloaded = events.Where(e => e.EventType == "INSTALL")
            .GroupBy(e => new { e.ArtifactId, e.ArtifactName, e.ArtifactType })
            .Select(g => new TopArtifactDto
            {
                ArtifactId = g.Key.ArtifactId ?? "",
                ArtifactName = g.Key.ArtifactName ?? g.Key.ArtifactId ?? "",
                ArtifactType = g.Key.ArtifactType ?? "agent",
                Count = g.Count(),
                Metric = "Downloads"
            })
            .OrderByDescending(t => t.Count)
            .Take(filters.Limit)
            .ToList();

        for (int i = 0; i < mostDownloaded.Count; i++) mostDownloaded[i].Rank = i + 1;

        var mostUsed = events.Where(e => e.EventType != "INSTALL")
            .GroupBy(e => new { e.ArtifactId, e.ArtifactName, e.ArtifactType })
            .Select(g => new TopArtifactDto
            {
                ArtifactId = g.Key.ArtifactId ?? "",
                ArtifactName = g.Key.ArtifactName ?? g.Key.ArtifactId ?? "",
                ArtifactType = g.Key.ArtifactType ?? "agent",
                Count = g.Count(),
                Metric = "Uses"
            })
            .OrderByDescending(t => t.Count)
            .Take(filters.Limit)
            .ToList();

        for (int i = 0; i < mostUsed.Count; i++) mostUsed[i].Rank = i + 1;

        var summary = new UsageSummaryDto
        {
            TotalDownloads = downloads,
            TotalUses = uses,
            ActiveUsers = activeUsers,
            ArtifactsUsed = artifactsUsed,
            Period = filters.Period ?? "all",
            MostDownloaded = mostDownloaded,
            MostUsed = mostUsed
        };

        return Task.FromResult(summary);
    }

    public Task<IEnumerable<ArtifactAnalyticsDto>> GetArtifactAnalyticsAsync(UsageFilterOptions filters, string? requestingUserEmail = null, string? requestingUserRole = null)
    {
        var events = FilterEvents(_events, filters, requestingUserEmail, requestingUserRole).ToList();

        var groups = events.GroupBy(e => e.ArtifactId ?? e.ArtifactName ?? "unknown");
        var list = new List<ArtifactAnalyticsDto>();

        foreach (var g in groups)
        {
            var artEvents = g.ToList();
            var downloads = artEvents.Count(e => e.EventType == "INSTALL");
            var uses = artEvents.Count(e => e.EventType != "INSTALL");
            var uniqueInstallers = artEvents.Where(e => e.EventType == "INSTALL").Select(e => e.UserId).Distinct().Count();
            var uniqueUsers = artEvents.Select(e => e.UserId).Distinct().Count();
            var lastUsed = artEvents.Max(e => (DateTime?)e.Timestamp);
            var first = artEvents.First();

            var sourceBreakdown = artEvents
                .GroupBy(e => e.Source ?? "VS_CODE")
                .ToDictionary(sg => sg.Key, sg => sg.Count());

            list.Add(new ArtifactAnalyticsDto
            {
                ArtifactId = g.Key,
                ArtifactName = first.ArtifactName ?? g.Key,
                ArtifactType = first.ArtifactType ?? "agent",
                CurrentVersion = first.ArtifactVersion ?? "1.0.0",
                Downloads = downloads,
                UniqueInstallers = uniqueInstallers,
                UsageCount = uses,
                UniqueUsers = uniqueUsers,
                UsageRate = uniqueInstallers > 0 ? Math.Round((double)uses / uniqueInstallers, 2) : uses,
                LastUsedAt = lastUsed,
                SourceBreakdown = sourceBreakdown
            });
        }

        return Task.FromResult<IEnumerable<ArtifactAnalyticsDto>>(list.OrderByDescending(a => a.UsageCount + a.Downloads));
    }

    public Task<ArtifactAnalyticsDto?> GetArtifactDetailsAnalyticsAsync(string artifactId, string? requestingUserEmail = null, string? requestingUserRole = null)
    {
        var filters = new UsageFilterOptions { ArtifactId = artifactId };
        var events = FilterEvents(_events, filters, requestingUserEmail, requestingUserRole)
            .Where(e => string.Equals(e.ArtifactId, artifactId, StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(e.ArtifactName, artifactId, StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (events.Count == 0) return Task.FromResult<ArtifactAnalyticsDto?>(null);

        var downloads = events.Count(e => e.EventType == "INSTALL");
        var uses = events.Count(e => e.EventType != "INSTALL");
        var uniqueInstallers = events.Where(e => e.EventType == "INSTALL").Select(e => e.UserId).Distinct().Count();
        var uniqueUsers = events.Select(e => e.UserId).Distinct().Count();
        var lastUsed = events.Max(e => (DateTime?)e.Timestamp);
        var first = events.First();

        var sourceBreakdown = events
            .GroupBy(e => e.Source ?? "VS_CODE")
            .ToDictionary(sg => sg.Key, sg => sg.Count());

        var dto = new ArtifactAnalyticsDto
        {
            ArtifactId = artifactId,
            ArtifactName = first.ArtifactName ?? artifactId,
            ArtifactType = first.ArtifactType ?? "agent",
            CurrentVersion = first.ArtifactVersion ?? "1.0.0",
            Downloads = downloads,
            UniqueInstallers = uniqueInstallers,
            UsageCount = uses,
            UniqueUsers = uniqueUsers,
            UsageRate = uniqueInstallers > 0 ? Math.Round((double)uses / uniqueInstallers, 2) : uses,
            LastUsedAt = lastUsed,
            SourceBreakdown = sourceBreakdown
        };

        return Task.FromResult<ArtifactAnalyticsDto?>(dto);
    }

    public Task<IEnumerable<TopArtifactDto>> GetMostDownloadedAsync(int limit, UsageFilterOptions filters, string? requestingUserEmail = null, string? requestingUserRole = null)
    {
        var events = FilterEvents(_events, filters, requestingUserEmail, requestingUserRole)
            .Where(e => e.EventType == "INSTALL")
            .GroupBy(e => new { e.ArtifactId, e.ArtifactName, e.ArtifactType })
            .Select(g => new TopArtifactDto
            {
                ArtifactId = g.Key.ArtifactId ?? "",
                ArtifactName = g.Key.ArtifactName ?? g.Key.ArtifactId ?? "",
                ArtifactType = g.Key.ArtifactType ?? "agent",
                Count = g.Count(),
                Metric = "Downloads"
            })
            .OrderByDescending(t => t.Count)
            .Take(limit)
            .ToList();

        for (int i = 0; i < events.Count; i++) events[i].Rank = i + 1;
        return Task.FromResult<IEnumerable<TopArtifactDto>>(events);
    }

    public Task<IEnumerable<TopArtifactDto>> GetMostUsedAsync(int limit, UsageFilterOptions filters, string? requestingUserEmail = null, string? requestingUserRole = null)
    {
        var events = FilterEvents(_events, filters, requestingUserEmail, requestingUserRole)
            .Where(e => e.EventType != "INSTALL")
            .GroupBy(e => new { e.ArtifactId, e.ArtifactName, e.ArtifactType })
            .Select(g => new TopArtifactDto
            {
                ArtifactId = g.Key.ArtifactId ?? "",
                ArtifactName = g.Key.ArtifactName ?? g.Key.ArtifactId ?? "",
                ArtifactType = g.Key.ArtifactType ?? "agent",
                Count = g.Count(),
                Metric = "Uses"
            })
            .OrderByDescending(t => t.Count)
            .Take(limit)
            .ToList();

        for (int i = 0; i < events.Count; i++) events[i].Rank = i + 1;
        return Task.FromResult<IEnumerable<TopArtifactDto>>(events);
    }

    public Task<IEnumerable<UserArtifactUsageDto>> GetUserUsageByArtifactAsync(string artifactId, string requestingUserEmail, string requestingUserRole)
    {
        var list = _events
            .Where(e => string.Equals(e.ArtifactId, artifactId, StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(e.ArtifactName, artifactId, StringComparison.OrdinalIgnoreCase))
            .GroupBy(e => e.UserId ?? "Unknown")
            .Select(g => new UserArtifactUsageDto
            {
                UserEmail = g.Key,
                Downloads = g.Count(e => e.EventType == "INSTALL"),
                Uses = g.Count(e => e.EventType != "INSTALL"),
                LastActiveAt = g.Max(e => (DateTime?)e.Timestamp)
            })
            .OrderByDescending(u => u.Uses + u.Downloads)
            .ToList();

        return Task.FromResult<IEnumerable<UserArtifactUsageDto>>(list);
    }

    private IEnumerable<UsageEvent> FilterEvents(IEnumerable<UsageEvent> events, UsageFilterOptions filters, string? requestingUserEmail, string? requestingUserRole)
    {
        var query = events;

        if (!string.IsNullOrEmpty(filters.Period))
        {
            var now = DateTime.UtcNow;
            switch (filters.Period.ToLowerInvariant())
            {
                case "today":
                    query = query.Where(e => e.Timestamp >= now.Date);
                    break;
                case "7d":
                    query = query.Where(e => e.Timestamp >= now.AddDays(-7));
                    break;
                case "30d":
                    query = query.Where(e => e.Timestamp >= now.AddDays(-30));
                    break;
            }
        }

        if (!string.IsNullOrEmpty(filters.ArtifactType) && filters.ArtifactType.ToLowerInvariant() != "all")
        {
            var typeNorm = filters.ArtifactType.ToLowerInvariant();
            query = query.Where(e => (e.ArtifactType ?? "").ToLowerInvariant() == typeNorm);
        }

        if (!string.IsNullOrEmpty(filters.ArtifactId))
        {
            var idNorm = filters.ArtifactId.ToLowerInvariant();
            query = query.Where(e => (e.ArtifactId ?? "").ToLowerInvariant() == idNorm || (e.ArtifactName ?? "").ToLowerInvariant() == idNorm);
        }

        return query;
    }
}
