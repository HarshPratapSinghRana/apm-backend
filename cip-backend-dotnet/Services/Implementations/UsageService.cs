using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using CipBackend.Data;
using CipBackend.Models;
using CipBackend.Services.Interfaces;

namespace CipBackend.Services.Implementations;

public class UsageService : IUsageService
{
    private readonly ConcurrentBag<UsageEvent> _events = new();
    private readonly ILogger<UsageService> _logger;
    private readonly IArtifactClassifier _classifier;
    private readonly IServiceScopeFactory? _scopeFactory;

    public UsageService(ILogger<UsageService> logger, IArtifactClassifier? classifier = null, IServiceScopeFactory? scopeFactory = null)
    {
        _logger = logger;
        _classifier = classifier ?? new ArtifactClassifier();
        _scopeFactory = scopeFactory;
    }

    public async Task RecordUsageAsync(UsageEvent usageEvent)
    {
        if (usageEvent == null) throw new ArgumentNullException(nameof(usageEvent));
        
        if (string.IsNullOrWhiteSpace(usageEvent.Id))
        {
            usageEvent.Id = Guid.NewGuid().ToString();
        }

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

        if (string.IsNullOrWhiteSpace(usageEvent.Platform))
        {
            usageEvent.Platform = usageEvent.Source.Contains("COPILOT") ? "GitHubCopilot" : (usageEvent.Source.Contains("CLAUDE") ? "Claude" : "EngineeringCommons");
        }

        _events.Add(usageEvent);

        // Persist to SQLite database
        if (_scopeFactory != null)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetService<CipDbContext>();
                if (db != null && db.Database.CanConnect())
                {
                    db.UsageEvents.Add(usageEvent);
                    await db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to persist usage event to SQLite.");
            }
        }

        _logger.LogInformation("Usage event recorded: EventType={EventType}, Artifact={Artifact}, Platform={Platform}, User={User}, Source={Source}",
            usageEvent.EventType, usageEvent.ArtifactName ?? "N/A", usageEvent.Platform, usageEvent.UserId, usageEvent.Source);
    }

    private IEnumerable<UsageEvent> GetAllEvents()
    {
        var dict = new Dictionary<string, UsageEvent>(StringComparer.OrdinalIgnoreCase);

        // 1. Read persisted events from SQLite
        if (_scopeFactory != null)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetService<CipDbContext>();
                if (db != null && db.Database.CanConnect())
                {
                    var dbEvents = db.UsageEvents.AsNoTracking().ToList();
                    foreach (var e in dbEvents)
                    {
                        if (!string.IsNullOrEmpty(e.Id))
                        {
                            dict[e.Id] = e;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to query usage events from SQLite.");
            }
        }

        // 2. Merge in-memory events
        foreach (var e in _events)
        {
            var key = !string.IsNullOrEmpty(e.Id) ? e.Id : $"{e.UserId}-{e.ArtifactName}-{e.EventType}-{e.Timestamp.Ticks}";
            dict[key] = e;
        }

        return dict.Values;
    }

    public Task<IEnumerable<UsageEvent>> GetUsageEventsAsync(string? userId = null)
    {
        var items = GetAllEvents();
        if (!string.IsNullOrEmpty(userId))
        {
            items = items.Where(e => string.Equals(e.UserId, userId, StringComparison.OrdinalIgnoreCase));
        }
        return Task.FromResult(items.OrderByDescending(e => e.Timestamp).AsEnumerable());
    }

    public Task<IEnumerable<ArtifactUsageSummaryDto>> GetUsageSummaryAsync(string? userId = null)
    {
        var items = GetAllEvents();
        if (!string.IsNullOrEmpty(userId))
        {
            items = items.Where(e => string.Equals(e.UserId, userId, StringComparison.OrdinalIgnoreCase));
        }

        var summary = items
            .Where(e => !string.IsNullOrEmpty(e.ArtifactName))
            .GroupBy(e => new
            {
                ArtifactName = e.ArtifactName ?? e.ArtifactId ?? "unknown",
                Version = e.ArtifactVersion ?? "1.0.0",
                Platform = string.IsNullOrEmpty(e.Platform) ? "EngineeringCommons" : e.Platform
            })
            .Select(g => new ArtifactUsageSummaryDto
            {
                ArtifactName = g.Key.ArtifactName,
                ArtifactVersion = g.Key.Version,
                Platform = g.Key.Platform,
                UsageCount = g.Count(),
                LastUsedAt = g.Max(e => e.Timestamp)
            })
            .OrderByDescending(s => s.UsageCount)
            .ToList();

        return Task.FromResult<IEnumerable<ArtifactUsageSummaryDto>>(summary);
    }

    public Task<UsageSummaryDto> GetSummaryAsync(UsageFilterOptions filters, string? requestingUserEmail = null, string? requestingUserRole = null)
    {
        var all = GetAllEvents();
        var events = ApplyFilters(all, filters).ToList();

        var installEvents = events.Where(IsInstallEvent).ToList();
        var useEvents = events.Where(IsUseEvent).ToList();

        var activeUsers = events.Select(e => e.UserId.ToLowerInvariant()).Distinct().Count();
        var artifactsUsed = useEvents.Select(e => (e.ArtifactId ?? e.ArtifactName ?? "").ToLowerInvariant()).Where(s => !string.IsNullOrEmpty(s)).Distinct().Count();

        var mostDownloaded = GetMostDownloadedInternal(filters.Limit, filters, all);
        var mostUsed = GetMostUsedInternal(filters.Limit, filters, all);

        return Task.FromResult(new UsageSummaryDto
        {
            TotalDownloads = installEvents.Count,
            TotalUses = useEvents.Count,
            ActiveUsers = activeUsers,
            ArtifactsUsed = artifactsUsed,
            Period = filters.Period ?? "all",
            MostDownloaded = mostDownloaded.ToList(),
            MostUsed = mostUsed.ToList()
        });
    }

    public Task<IEnumerable<ArtifactAnalyticsDto>> GetArtifactAnalyticsAsync(UsageFilterOptions filters, string? requestingUserEmail = null, string? requestingUserRole = null)
    {
        var all = GetAllEvents();
        var events = ApplyFilters(all, filters)
            .Where(e => !string.IsNullOrEmpty(e.ArtifactId) || !string.IsNullOrEmpty(e.ArtifactName))
            .ToList();

        var grouped = events.GroupBy(e => (e.ArtifactId ?? e.ArtifactName ?? "").ToLowerInvariant());
        var result = new List<ArtifactAnalyticsDto>();

        foreach (var g in grouped)
        {
            var artId = g.Key;
            var sample = g.First();
            var artName = sample.ArtifactName ?? sample.ArtifactId ?? artId;
            var artType = sample.ArtifactType ?? _classifier.Classify(artName).Type.ToString().ToLowerInvariant();

            var installs = g.Where(IsInstallEvent).ToList();
            var uses = g.Where(IsUseEvent).ToList();

            var uniqueInstallers = installs.Select(e => e.UserId.ToLowerInvariant()).Distinct().Count();
            var uniqueUsers = uses.Select(e => e.UserId.ToLowerInvariant()).Distinct().Count();
            if (uniqueUsers == 0 && uniqueInstallers > 0) uniqueUsers = uniqueInstallers;

            var usageCount = uses.Count;
            var downloads = installs.Count;
            var usageRate = uniqueUsers > 0 ? Math.Round((double)usageCount / uniqueUsers, 1) : 0.0;
            var lastUsed = g.Max(e => (DateTime?)e.Timestamp);

            var sourceBreakdown = g.GroupBy(e => NormalizeSource(e.Source)).ToDictionary(sg => sg.Key, sg => sg.Count());

            result.Add(new ArtifactAnalyticsDto
            {
                ArtifactId = artId,
                ArtifactName = artName,
                ArtifactType = artType,
                CurrentVersion = sample.ArtifactVersion ?? "1.0.0",
                Downloads = downloads,
                UniqueInstallers = uniqueInstallers,
                UsageCount = usageCount,
                UniqueUsers = uniqueUsers,
                UsageRate = usageRate,
                LastUsedAt = lastUsed,
                SourceBreakdown = sourceBreakdown,
                ExternalTelemetry = GetExternalTelemetryStatus()
            });
        }

        return Task.FromResult<IEnumerable<ArtifactAnalyticsDto>>(result.OrderByDescending(r => r.UsageCount).ThenByDescending(r => r.Downloads).ToList());
    }

    public Task<ArtifactAnalyticsDto?> GetArtifactDetailsAnalyticsAsync(string artifactId, string? requestingUserEmail = null, string? requestingUserRole = null)
    {
        var normId = artifactId.ToLowerInvariant();
        var all = GetAllEvents();
        var events = all
            .Where(e => (e.ArtifactId != null && e.ArtifactId.ToLower() == normId) ||
                        (e.ArtifactName != null && e.ArtifactName.ToLower() == normId))
            .ToList();

        var artName = artifactId;
        var artType = _classifier.Classify(artifactId).Type.ToString().ToLowerInvariant();
        var version = "1.0.0";

        if (events.Any())
        {
            var sample = events.First();
            artName = sample.ArtifactName ?? sample.ArtifactId ?? artifactId;
            if (!string.IsNullOrEmpty(sample.ArtifactType)) artType = sample.ArtifactType;
            if (!string.IsNullOrEmpty(sample.ArtifactVersion)) version = sample.ArtifactVersion;
        }

        var installs = events.Where(IsInstallEvent).ToList();
        var uses = events.Where(IsUseEvent).ToList();

        var uniqueInstallers = installs.Select(e => e.UserId.ToLowerInvariant()).Distinct().Count();
        var uniqueUsers = uses.Select(e => e.UserId.ToLowerInvariant()).Distinct().Count();
        if (uniqueUsers == 0 && uniqueInstallers > 0) uniqueUsers = uniqueInstallers;

        var usageCount = uses.Count;
        var downloads = installs.Count;
        var usageRate = uniqueUsers > 0 ? Math.Round((double)usageCount / uniqueUsers, 1) : 0.0;
        var lastUsed = events.Any() ? events.Max(e => (DateTime?)e.Timestamp) : null;

        var sourceBreakdown = events.GroupBy(e => NormalizeSource(e.Source)).ToDictionary(sg => sg.Key, sg => sg.Count());
        if (!sourceBreakdown.ContainsKey("VS Code")) sourceBreakdown["VS Code"] = 0;
        if (!sourceBreakdown.ContainsKey("CLI")) sourceBreakdown["CLI"] = 0;

        return Task.FromResult<ArtifactAnalyticsDto?>(new ArtifactAnalyticsDto
        {
            ArtifactId = artifactId,
            ArtifactName = artName,
            ArtifactType = artType,
            CurrentVersion = version,
            Downloads = downloads,
            UniqueInstallers = uniqueInstallers,
            UsageCount = usageCount,
            UniqueUsers = uniqueUsers,
            UsageRate = usageRate,
            LastUsedAt = lastUsed,
            SourceBreakdown = sourceBreakdown,
            ExternalTelemetry = GetExternalTelemetryStatus()
        });
    }

    public Task<IEnumerable<TopArtifactDto>> GetMostDownloadedAsync(int limit, UsageFilterOptions filters, string? requestingUserEmail = null, string? requestingUserRole = null)
    {
        return Task.FromResult<IEnumerable<TopArtifactDto>>(GetMostDownloadedInternal(limit, filters, GetAllEvents()));
    }

    public Task<IEnumerable<TopArtifactDto>> GetMostUsedAsync(int limit, UsageFilterOptions filters, string? requestingUserEmail = null, string? requestingUserRole = null)
    {
        return Task.FromResult<IEnumerable<TopArtifactDto>>(GetMostUsedInternal(limit, filters, GetAllEvents()));
    }

    public Task<IEnumerable<UserArtifactUsageDto>> GetUserUsageByArtifactAsync(string artifactId, string requestingUserEmail, string requestingUserRole)
    {
        var normId = artifactId.ToLowerInvariant();
        var events = GetAllEvents()
            .Where(e => (e.ArtifactId != null && e.ArtifactId.ToLower() == normId) ||
                        (e.ArtifactName != null && e.ArtifactName.ToLower() == normId))
            .ToList();

        var list = events
            .GroupBy(e => e.UserId.ToLowerInvariant())
            .Select(g => new UserArtifactUsageDto
            {
                UserEmail = g.Key,
                Downloads = g.Count(IsInstallEvent),
                Uses = g.Count(IsUseEvent),
                LastActiveAt = g.Max(e => (DateTime?)e.Timestamp)
            })
            .OrderByDescending(u => u.Uses)
            .ThenByDescending(u => u.Downloads)
            .ToList();

        return Task.FromResult<IEnumerable<UserArtifactUsageDto>>(list);
    }

    private IEnumerable<TopArtifactDto> GetMostDownloadedInternal(int limit, UsageFilterOptions filters, IEnumerable<UsageEvent>? allEvents = null)
    {
        var query = ApplyFilters(allEvents ?? GetAllEvents(), filters);
        var installEvents = query.Where(IsInstallEvent).ToList();

        var ranked = installEvents
            .GroupBy(e => new { Id = (e.ArtifactId ?? e.ArtifactName ?? "").ToLowerInvariant(), Name = e.ArtifactName ?? e.ArtifactId ?? "unknown", Type = e.ArtifactType ?? "agent" })
            .Select(g => new
            {
                ArtifactId = g.Key.Id,
                ArtifactName = g.Key.Name,
                ArtifactType = g.Key.Type,
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .Take(limit > 0 ? limit : 5)
            .ToList();

        var result = new List<TopArtifactDto>();
        for (int i = 0; i < ranked.Count; i++)
        {
            result.Add(new TopArtifactDto
            {
                ArtifactId = ranked[i].ArtifactId,
                ArtifactName = ranked[i].ArtifactName,
                ArtifactType = ranked[i].ArtifactType,
                Count = ranked[i].Count,
                Rank = i + 1,
                Metric = "Downloads"
            });
        }
        return result;
    }

    private IEnumerable<TopArtifactDto> GetMostUsedInternal(int limit, UsageFilterOptions filters, IEnumerable<UsageEvent>? allEvents = null)
    {
        var query = ApplyFilters(allEvents ?? GetAllEvents(), filters);
        var useEvents = query.Where(IsUseEvent).ToList();

        var ranked = useEvents
            .GroupBy(e => new { Id = (e.ArtifactId ?? e.ArtifactName ?? "").ToLowerInvariant(), Name = e.ArtifactName ?? e.ArtifactId ?? "unknown", Type = e.ArtifactType ?? "agent" })
            .Select(g => new
            {
                ArtifactId = g.Key.Id,
                ArtifactName = g.Key.Name,
                ArtifactType = g.Key.Type,
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .Take(limit > 0 ? limit : 5)
            .ToList();

        var result = new List<TopArtifactDto>();
        for (int i = 0; i < ranked.Count; i++)
        {
            result.Add(new TopArtifactDto
            {
                ArtifactId = ranked[i].ArtifactId,
                ArtifactName = ranked[i].ArtifactName,
                ArtifactType = ranked[i].ArtifactType,
                Count = ranked[i].Count,
                Rank = i + 1,
                Metric = "Uses"
            });
        }
        return result;
    }


    private static IEnumerable<UsageEvent> ApplyFilters(IEnumerable<UsageEvent> events, UsageFilterOptions filters)
    {
        var result = events;
        if (!string.IsNullOrEmpty(filters.Period))
        {
            var period = filters.Period.ToLowerInvariant();
            if (period == "today" || period == "1d")
            {
                var todayUtc = DateTime.UtcNow.Date;
                result = result.Where(e => e.Timestamp >= todayUtc);
            }
            else if (period == "7d" || period == "7days")
            {
                var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);
                result = result.Where(e => e.Timestamp >= sevenDaysAgo);
            }
            else if (period == "30d" || period == "30days")
            {
                var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
                result = result.Where(e => e.Timestamp >= thirtyDaysAgo);
            }
        }

        if (!string.IsNullOrEmpty(filters.ArtifactType) && filters.ArtifactType.ToLower() != "all")
        {
            var type = filters.ArtifactType.ToLowerInvariant();
            result = result.Where(e => e.ArtifactType != null && e.ArtifactType.ToLower() == type);
        }

        if (!string.IsNullOrEmpty(filters.ArtifactId))
        {
            var artId = filters.ArtifactId.ToLowerInvariant();
            result = result.Where(e => (e.ArtifactId != null && e.ArtifactId.ToLower() == artId) ||
                                       (e.ArtifactName != null && e.ArtifactName.ToLower() == artId));
        }

        return result;
    }

    private static bool IsInstallEvent(UsageEvent e)
    {
        var ev = (e.EventType ?? e.Action ?? "").ToUpperInvariant();
        return ev == "INSTALL";
    }

    private static bool IsUseEvent(UsageEvent e)
    {
        var ev = (e.EventType ?? e.Action ?? "").ToUpperInvariant();
        return ev == "USE" || ev == "INVOKE" || ev == "ACTIVATED" || ev == "USED" || ev == "INVOKED";
    }

    private static string NormalizeSource(string? source)
    {
        if (string.IsNullOrWhiteSpace(source)) return "VS Code";
        var s = source.ToUpperInvariant();
        if (s.Contains("COPILOT")) return "GitHub Copilot";
        if (s.Contains("CLAUDE") || s.Contains("ANTHROPIC")) return "Claude";
        if (s.Contains("ANTIGRAVITY") || s.Contains("GEMINI")) return "Antigravity";
        if (s.Contains("CURSOR")) return "Cursor";
        if (s.Contains("CLI")) return "CLI";
        if (s.Contains("VS_CODE") || s.Contains("VSCODE")) return "VS Code";
        return source;
    }

    private static Dictionary<string, string> GetExternalTelemetryStatus(IEnumerable<UsageEvent>? events = null)
    {
        var hasCopilot = events != null && events.Any(e => (e.Source ?? "").Contains("COPILOT", StringComparison.OrdinalIgnoreCase));
        var hasClaude = events != null && events.Any(e => (e.Source ?? "").Contains("CLAUDE", StringComparison.OrdinalIgnoreCase) || (e.Source ?? "").Contains("ANTHROPIC", StringComparison.OrdinalIgnoreCase));
        var hasAntigravity = events != null && events.Any(e => (e.Source ?? "").Contains("ANTIGRAVITY", StringComparison.OrdinalIgnoreCase) || (e.Source ?? "").Contains("GEMINI", StringComparison.OrdinalIgnoreCase));

        return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "GitHub Copilot", hasCopilot ? "Active (Observed)" : "Not Available" },
            { "Claude", hasClaude ? "Active (Observed)" : "Not Available" },
            { "Antigravity", hasAntigravity ? "Active (Observed)" : "Not Available" },
            { "Generic AI", "Not Available" }
        };
    }
}

