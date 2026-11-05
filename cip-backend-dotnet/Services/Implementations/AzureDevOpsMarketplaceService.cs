using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using CipBackend.Data;
using CipBackend.Models;
using CipBackend.Services.Interfaces;

namespace CipBackend.Services.Implementations;

public class AzureDevOpsOptions
{
    public string? Token { get; set; }
    public string? Organization { get; set; } = "maqsoftware";
    public string? Project { get; set; } = "EngineeringCommons";
    public string? Repository { get; set; } = "cip-marketplace";
    public string Branch { get; set; } = "main";
}

public class AzureDevOpsMarketplaceService : IMarketplaceService
{
    private readonly ILogger<AzureDevOpsMarketplaceService> _logger;
    private readonly AzureDevOpsOptions _opts;
    private readonly HttpClient _http;
    private readonly IArtifactClassifier _classifier;
    private readonly IServiceScopeFactory? _scopeFactory;
    private readonly ConcurrentDictionary<string, ArtifactDto> _publishedCache = new(StringComparer.OrdinalIgnoreCase);

    public AzureDevOpsMarketplaceService(
        ILogger<AzureDevOpsMarketplaceService> logger,
        IConfiguration config,
        IHttpClientFactory httpFactory,
        IArtifactClassifier? classifier = null,
        IServiceScopeFactory? scopeFactory = null)
    {
        _logger = logger;
        _opts = new AzureDevOpsOptions();
        config.GetSection("AzureDevOps").Bind(_opts);

        // Fallback check if GitHub configs or env vars were set
        if (string.IsNullOrEmpty(_opts.Token))
        {
            _opts.Token = config["GitHub:Token"] ?? Environment.GetEnvironmentVariable("AZURE_DEVOPS_PAT") ?? Environment.GetEnvironmentVariable("ADO_PAT");
        }
        if (string.IsNullOrEmpty(_opts.Organization))
        {
            _opts.Organization = config["GitHub:Owner"] ?? Environment.GetEnvironmentVariable("AZURE_DEVOPS_ORG") ?? "maqsoftware";
        }
        if (string.IsNullOrEmpty(_opts.Repository))
        {
            _opts.Repository = config["GitHub:Repository"] ?? Environment.GetEnvironmentVariable("AZURE_DEVOPS_REPO") ?? "cip-marketplace";
        }

        _http = httpFactory.CreateClient("azuredevops");
        _classifier = classifier ?? new ArtifactClassifier();
        _scopeFactory = scopeFactory;

        if (!string.IsNullOrEmpty(_opts.Token))
        {
            _http.DefaultRequestHeaders.UserAgent.ParseAdd("engineering-commons-backend-ado");
            var authHeaderVal = Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes($":{_opts.Token}"));
            _http.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authHeaderVal);
        }

        // Seed default marketplace package versions (v1.1.0 as latest, v1.0.0 as earlier version)
        var contentV110 = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.1.0",
            description = "CIP design reviewer agent v1.1.0 (Azure DevOps Marketplace)",
            cipPackage = $"{_opts.Organization ?? "maqsoftware"}/{_opts.Project ?? "EngineeringCommons"}/{_opts.Repository ?? "design-reviewer"}#v1.1.0",
            files = new[]
            {
                new { path = ".agents/agents/design-reviewer.agent.md", content = "# Design Reviewer Agent v1.1.0" }
            }
        });

        var contentV100 = JsonSerializer.Serialize(new
        {
            name = "design-reviewer",
            type = "agent",
            version = "1.0.0",
            description = "CIP design reviewer agent v1.0.0 (Azure DevOps Marketplace)",
            cipPackage = $"{_opts.Organization ?? "maqsoftware"}/{_opts.Project ?? "EngineeringCommons"}/{_opts.Repository ?? "design-reviewer"}#v1.0.0",
            files = new[]
            {
                new { path = ".agents/agents/design-reviewer.agent.md", content = "# Design Reviewer Agent v1.0.0" }
            }
        });

        var v110 = new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Type = "agent",
            Version = "1.1.0",
            Description = "CIP design reviewer agent v1.1.0",
            CipPackage = $"{_opts.Organization ?? "maqsoftware"}/{_opts.Project ?? "EngineeringCommons"}/{_opts.Repository ?? "design-reviewer"}#v1.1.0",
            Content = contentV110
        };

        var v100 = new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Type = "agent",
            Version = "1.0.0",
            Description = "CIP design reviewer agent v1.0.0",
            CipPackage = $"{_opts.Organization ?? "maqsoftware"}/{_opts.Project ?? "EngineeringCommons"}/{_opts.Repository ?? "design-reviewer"}#v1.0.0",
            Content = contentV100
        };

        _publishedCache["design-reviewer"] = v110;
        _publishedCache["design-reviewer#1.1.0"] = v110;
        _publishedCache["design-reviewer#1.0.0"] = v100;
    }

    public async Task<IEnumerable<ArtifactDto>> ListArtifactsAsync()
    {
        var items = new Dictionary<string, ArtifactDto>(StringComparer.OrdinalIgnoreCase);

        // 1. Include in-memory cached / default items (excluding explicit version keys)
        foreach (var kvp in _publishedCache)
        {
            if (!kvp.Key.Contains('#'))
            {
                items[kvp.Key] = kvp.Value;
            }
        }

        // 2. Read all artifacts from SQLite Reviews
        if (_scopeFactory != null)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetService<CipDbContext>();
                if (db != null && db.Database.CanConnect())
                {
                    var reviews = await db.Reviews.AsNoTracking()
                        .Where(r => r.IsPublished || r.Status == ReviewStatus.Approved || r.Status == ReviewStatus.Published || r.IsPrivate)
                        .ToListAsync();
                    foreach (var r in reviews)
                    {
                        if (string.IsNullOrWhiteSpace(r.ArtifactId)) continue;
                        var artId = r.ArtifactId;
                        var dto = ParseArtifactFromReview(r);
                        if (dto != null)
                        {
                            items[artId] = dto;
                            _publishedCache[artId] = dto;
                            if (!string.IsNullOrEmpty(dto.Version))
                            {
                                _publishedCache[$"{artId}#{dto.Version}"] = dto;
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load reviews from SQLite in ListArtifactsAsync.");
            }
        }

        // 3. Read artifacts from Azure DevOps Git Repo contents
        if (!string.IsNullOrEmpty(_opts.Organization) && !string.IsNullOrEmpty(_opts.Repository) && !string.IsNullOrEmpty(_opts.Token))
        {
            try
            {
                var projectPart = !string.IsNullOrEmpty(_opts.Project) ? $"{_opts.Project}/" : "";
                var url = $"https://dev.azure.com/{_opts.Organization}/{projectPart}_apis/git/repositories/{_opts.Repository}/items?scopePath=/artifacts&recursionLevel=OneLevel&api-version=7.0";
                var resp = await _http.GetAsync(url);
                if (!resp.IsSuccessStatusCode)
                {
                    url = $"https://dev.azure.com/{_opts.Organization}/{projectPart}_apis/git/repositories/{_opts.Repository}/items?scopePath=/&recursionLevel=OneLevel&api-version=7.0";
                    resp = await _http.GetAsync(url);
                }

                if (resp.IsSuccessStatusCode)
                {
                    var json = await resp.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("value", out var valProp) && valProp.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var elem in valProp.EnumerateArray())
                        {
                            var isFolder = elem.TryGetProperty("isFolder", out var ifProp) && ifProp.GetBoolean();
                            if (isFolder) continue;

                            var path = elem.TryGetProperty("path", out var pathProp) ? pathProp.GetString() : null;
                            if (string.IsNullOrEmpty(path)) continue;

                            var name = Path.GetFileName(path);
                            if (string.IsNullOrEmpty(name)) continue;

                            var id = Path.GetFileNameWithoutExtension(name);
                            if (id.EndsWith(".agent", StringComparison.OrdinalIgnoreCase)) id = id.Substring(0, id.Length - 6);
                            if (id.EndsWith(".prompt", StringComparison.OrdinalIgnoreCase)) id = id.Substring(0, id.Length - 7);
                            if (id.EndsWith(".command", StringComparison.OrdinalIgnoreCase)) id = id.Substring(0, id.Length - 8);
                            if (id.EndsWith(".skill", StringComparison.OrdinalIgnoreCase)) id = id.Substring(0, id.Length - 6);

                            if (!items.ContainsKey(id))
                            {
                                var cls = _classifier.Classify(name);
                                var typeStr = cls.Type.ToString().ToLowerInvariant();
                                if (typeStr == "normalfile" || typeStr == "unknown")
                                {
                                    typeStr = DetectTypeFromName(id);
                                }

                                var dto = new ArtifactDto
                                {
                                    Id = id,
                                    Name = id,
                                    Type = typeStr,
                                    Version = cls.DetectedVersion ?? "1.0.0",
                                    Description = cls.DetectedDescription ?? $"Azure DevOps Marketplace package {id}",
                                    CipPackage = $"{_opts.Organization}/{_opts.Project ?? "EngineeringCommons"}/{_opts.Repository}#{id}"
                                };
                                items[id] = dto;
                                _publishedCache[id] = dto;
                                _publishedCache[$"{id}#{dto.Version}"] = dto;
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to list artifacts from Azure DevOps API. Falling back to cache.");
            }
        }

        return items.Values;
    }

    public async Task<IEnumerable<ArtifactVersionDto>> GetArtifactVersionsAsync(string artifactId)
    {
        var versions = new List<ArtifactVersionDto>();

        // 1. Gather all versions for this artifact from cache
        foreach (var kvp in _publishedCache)
        {
            if (kvp.Key.StartsWith($"{artifactId}#", StringComparison.OrdinalIgnoreCase))
            {
                var vStr = kvp.Key.Substring(artifactId.Length + 1);
                versions.Add(new ArtifactVersionDto
                {
                    Version = vStr,
                    CipPackage = kvp.Value.CipPackage,
                    IsLatest = false
                });
            }
        }

        // 2. Check SQLite db.Reviews for versions
        if (_scopeFactory != null)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetService<CipDbContext>();
                if (db != null && db.Database.CanConnect())
                {
                    var reviews = await db.Reviews.AsNoTracking()
                        .Where(r => r.ArtifactId.ToLower() == artifactId.ToLower() && (r.IsPublished || r.Status == ReviewStatus.Approved || r.Status == ReviewStatus.Published))
                        .ToListAsync();
                    foreach (var r in reviews)
                    {
                        var dto = ParseArtifactFromReview(r);
                        if (dto != null && !string.IsNullOrEmpty(dto.Version))
                        {
                            versions.Add(new ArtifactVersionDto
                            {
                                Version = dto.Version,
                                CipPackage = dto.CipPackage,
                                IsLatest = false
                            });
                        }
                    }
                }
            }
            catch { }
        }

        // 3. If no versions found yet, call GetArtifactAsync to resolve base
        if (!versions.Any())
        {
            var baseArt = await GetArtifactAsync(artifactId);
            if (baseArt != null && !string.IsNullOrEmpty(baseArt.Version))
            {
                versions.Add(new ArtifactVersionDto
                {
                    Version = baseArt.Version,
                    CipPackage = baseArt.CipPackage,
                    IsLatest = true
                });
            }
        }

        if (!versions.Any())
        {
            return Enumerable.Empty<ArtifactVersionDto>();
        }

        // 4. Deduplicate and sort versions semantically descending
        var sorted = versions
            .GroupBy(v => v.Version, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .OrderByDescending(v => TryParseVersion(v.Version), new VersionComparer())
            .ToList();

        if (sorted.Any())
        {
            sorted[0].IsLatest = true;
        }

        return sorted;
    }

    public async Task<ArtifactDto?> GetArtifactAsync(string artifactId, string? version = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(artifactId);

        // 1. Check in-memory cache
        if (!string.IsNullOrWhiteSpace(version))
        {
            var versionKey = $"{artifactId}#{version}";
            if (_publishedCache.TryGetValue(versionKey, out var versionDto) && !string.IsNullOrEmpty(versionDto.Content))
            {
                return versionDto;
            }

            if (_publishedCache.TryGetValue(artifactId, out var latestDto) &&
                latestDto.Version.Equals(version, StringComparison.OrdinalIgnoreCase) &&
                !string.IsNullOrEmpty(latestDto.Content))
            {
                return latestDto;
            }
        }
        else
        {
            if (_publishedCache.TryGetValue(artifactId, out var cachedDto) && !string.IsNullOrEmpty(cachedDto.Content))
            {
                return cachedDto;
            }
        }

        // 2. Check SQLite db.Reviews
        if (_scopeFactory != null)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetService<CipDbContext>();
                if (db != null && db.Database.CanConnect())
                {
                    var reviews = await db.Reviews.AsNoTracking()
                        .Where(r => r.ArtifactId.ToLower() == artifactId.ToLower() && (r.IsPublished || r.Status == ReviewStatus.Approved || r.Status == ReviewStatus.Published || r.IsPrivate))
                        .OrderByDescending(r => r.SubmittedAt)
                        .ToListAsync();

                    foreach (var r in reviews)
                    {
                        var dto = ParseArtifactFromReview(r);
                        if (dto != null)
                        {
                            _publishedCache[artifactId] = dto;
                            _publishedCache[$"{artifactId}#{dto.Version}"] = dto;

                            if (string.IsNullOrWhiteSpace(version) || dto.Version.Equals(version, StringComparison.OrdinalIgnoreCase))
                            {
                                return dto;
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load artifact from SQLite in GetArtifactAsync.");
            }
        }

        // 3. Check Azure DevOps API
        var list = await ListArtifactsAsync();
        var match = list.FirstOrDefault(a => a.Id.Equals(artifactId, StringComparison.OrdinalIgnoreCase) || a.Name.Equals(artifactId, StringComparison.OrdinalIgnoreCase));
        if (match != null && !string.IsNullOrEmpty(_opts.Organization) && !string.IsNullOrEmpty(_opts.Repository) && !string.IsNullOrEmpty(_opts.Token))
        {
            var projectPart = !string.IsNullOrEmpty(_opts.Project) ? $"{_opts.Project}/" : "";
            var potentialPaths = new[]
            {
                $"/artifacts/{match.Id}.md",
                $"/artifacts/{match.Id}.json",
                $"/artifacts/{match.Id}.agent.md",
                $"/artifacts/{match.Id}.prompt.md",
                $"/artifacts/{match.Id}.command.md",
                $"/artifacts/{match.Id}.skill.md"
            };

            foreach (var path in potentialPaths)
            {
                try
                {
                    var url = $"https://dev.azure.com/{_opts.Organization}/{projectPart}_apis/git/repositories/{_opts.Repository}/items?path={path}&includeContent=true&api-version=7.0";
                    var resp = await _http.GetAsync(url);
                    if (resp.IsSuccessStatusCode)
                    {
                        var json = await resp.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("content", out var cProp))
                        {
                            var rawContent = cProp.GetString();
                            if (!string.IsNullOrEmpty(rawContent))
                            {
                                match.Content = EnsureValidArtifactBundle(match.Id, match.Type, match.Version, rawContent);
                                break;
                            }
                        }
                    }
                }
                catch { }
            }
        }

        // 4. If artifact exists in marketplace list
        if (match != null)
        {
            var effType = !string.IsNullOrEmpty(match.Type) && match.Type != "normalfile" && match.Type != "unknown" ? match.Type : DetectTypeFromName(match.Id);
            if (string.IsNullOrEmpty(match.Content))
            {
                match.Content = CreateDefaultBundle(match.Id, effType, match.Version ?? "1.0.0", match.Description);
            }
            match.Type = effType;

            _publishedCache[match.Id] = match;
            if (!string.IsNullOrEmpty(match.Version))
            {
                _publishedCache[$"{match.Id}#{match.Version}"] = match;
            }

            if (!string.IsNullOrWhiteSpace(version))
            {
                if (string.Equals(match.Version, version, StringComparison.OrdinalIgnoreCase))
                {
                    return match;
                }
                return null;
            }

            return match;
        }

        return null;
    }

    public Task PublishArtifactAsync(string artifactId, string content)
    {
        return PublishArtifactInternalAsync(artifactId, content);
    }

    private async Task PublishArtifactInternalAsync(string artifactId, string content)
    {
        var cls = _classifier.Classify(artifactId, content);
        string type = cls.Type.ToString().ToLowerInvariant();
        string version = cls.DetectedVersion ?? "1.0.0";
        string desc = cls.DetectedDescription ?? $"Published artifact {artifactId}";
        string cipPkg = $"{_opts.Organization ?? "maqsoftware"}/{_opts.Project ?? "EngineeringCommons"}/{_opts.Repository ?? artifactId}#{artifactId}";

        bool isPrivate = false;
        string? producerEmail = null;
        string? allowedContributors = null;
        string? allowedReviewers = null;
        string? allowedConsumers = null;

        try
        {
            using var parsed = JsonDocument.Parse(content);
            if (parsed.RootElement.TryGetProperty("type", out var tProp) && !string.IsNullOrEmpty(tProp.GetString()))
            {
                type = tProp.GetString()!.ToLowerInvariant();
            }
            if (parsed.RootElement.TryGetProperty("version", out var vProp) && !string.IsNullOrEmpty(vProp.GetString()))
            {
                version = vProp.GetString()!;
            }
            if (parsed.RootElement.TryGetProperty("cipPackage", out var pkgProp) && !string.IsNullOrEmpty(pkgProp.GetString()))
            {
                cipPkg = pkgProp.GetString()!;
            }
            if (parsed.RootElement.TryGetProperty("description", out var dProp) && !string.IsNullOrEmpty(dProp.GetString()))
            {
                desc = dProp.GetString()!;
            }
            if (parsed.RootElement.TryGetProperty("isPrivate", out var privProp))
            {
                isPrivate = privProp.GetBoolean();
            }
            if (parsed.RootElement.TryGetProperty("producerEmail", out var pProp))
            {
                producerEmail = pProp.GetString();
            }
            if (parsed.RootElement.TryGetProperty("allowedContributors", out var cProp))
            {
                allowedContributors = cProp.GetString();
            }
            if (parsed.RootElement.TryGetProperty("allowedReviewers", out var rProp))
            {
                allowedReviewers = rProp.GetString();
            }
            if (parsed.RootElement.TryGetProperty("allowedConsumers", out var conProp))
            {
                allowedConsumers = conProp.GetString();
            }
        }
        catch { }

        // Also query matching review from SQLite to ensure accurate metadata
        if (_scopeFactory != null)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetService<CipDbContext>();
                if (db != null)
                {
                    var rev = db.Reviews.AsNoTracking().FirstOrDefault(r => r.ArtifactId.ToLower() == artifactId.ToLower());
                    if (rev != null)
                    {
                        isPrivate = rev.IsPrivate;
                        producerEmail = rev.ProducerEmail;
                        allowedContributors = rev.AllowedContributors;
                        allowedReviewers = rev.AllowedReviewers;
                        allowedConsumers = rev.AllowedConsumers;
                    }
                }
            }
            catch { }
        }

        if (type == "normalfile" || type == "unknown")
        {
            type = DetectTypeFromName(artifactId);
        }

        var fullBundle = EnsureValidArtifactBundle(artifactId, type, version, content);

        // Cache locally for instant availability
        var dto = new ArtifactDto
        {
            Id = artifactId,
            Name = artifactId,
            Type = type,
            Version = version,
            Description = desc,
            CipPackage = cipPkg,
            Content = fullBundle,
            IsPrivate = isPrivate,
            ProducerEmail = producerEmail,
            AllowedContributors = allowedContributors,
            AllowedReviewers = allowedReviewers,
            AllowedConsumers = allowedConsumers
        };
        _publishedCache[artifactId] = dto;
        _publishedCache[$"{artifactId}#{version}"] = dto;

        if (string.IsNullOrEmpty(_opts.Token))
        {
            throw new InvalidOperationException("Azure DevOps token (PAT) not configured");
        }
        if (string.IsNullOrEmpty(_opts.Organization) || string.IsNullOrEmpty(_opts.Repository))
        {
            throw new InvalidOperationException("Azure DevOps organization or repository not configured");
        }

        var projectPart = !string.IsNullOrEmpty(_opts.Project) ? $"{_opts.Project}/" : "";
        var cleanArtifactId = System.Text.RegularExpressions.Regex.Replace(artifactId ?? string.Empty, @"[^a-zA-Z0-9_\-\.]", "_");
        if (string.IsNullOrWhiteSpace(cleanArtifactId) || cleanArtifactId.Contains(".."))
        {
            cleanArtifactId = "artifact-" + Guid.NewGuid().ToString("N").Substring(0, 8);
        }
        var path = $"/artifacts/{cleanArtifactId}.md";
        var branchName = _opts.Branch ?? "main";

        // Determine if file exists to choose add vs edit changeType
        string changeType = "add";
        string oldObjectId = "0000000000000000000000000000000000000000";

        try
        {
            var refsUrl = $"https://dev.azure.com/{_opts.Organization}/{projectPart}_apis/git/repositories/{_opts.Repository}/refs?filter=heads/{branchName}&api-version=7.0";
            var refResp = await _http.GetAsync(refsUrl);
            if (refResp.IsSuccessStatusCode)
            {
                var refJson = await refResp.Content.ReadAsStringAsync();
                using var refDoc = JsonDocument.Parse(refJson);
                if (refDoc.RootElement.TryGetProperty("value", out var vProp) && vProp.ValueKind == JsonValueKind.Array && vProp.GetArrayLength() > 0)
                {
                    oldObjectId = vProp[0].GetProperty("objectId").GetString() ?? oldObjectId;
                }
            }

            var itemUrl = $"https://dev.azure.com/{_opts.Organization}/{projectPart}_apis/git/repositories/{_opts.Repository}/items?path={path}&api-version=7.0";
            var itemResp = await _http.GetAsync(itemUrl);
            if (itemResp.IsSuccessStatusCode)
            {
                changeType = "edit";
            }
        }
        catch { }

        // Push commit to Azure DevOps Git Repo
        var pushesUrl = $"https://dev.azure.com/{_opts.Organization}/{projectPart}_apis/git/repositories/{_opts.Repository}/pushes?api-version=7.0";
        var pushPayload = new
        {
            refUpdates = new[]
            {
                new
                {
                    name = $"refs/heads/{branchName}",
                    oldObjectId = oldObjectId
                }
            },
            commits = new[]
            {
                new
                {
                    comment = $"Publish artifact {artifactId} v{version} via Engineering Commons Backend",
                    changes = new[]
                    {
                        new
                        {
                            changeType = changeType,
                            item = new
                            {
                                path = path
                            },
                            newContent = new
                            {
                                content = fullBundle,
                                contentType = "rawtext"
                            }
                        }
                    }
                }
            }
        };

        var pushJson = JsonSerializer.Serialize(pushPayload);
        var req = new HttpRequestMessage(HttpMethod.Post, pushesUrl)
        {
            Content = new StringContent(pushJson, System.Text.Encoding.UTF8, "application/json")
        };

        var pushResp = await _http.SendAsync(req);
        if (!pushResp.IsSuccessStatusCode)
        {
            var err = await pushResp.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Azure DevOps publish failed: {pushResp.StatusCode} {err}");
        }
    }

    public async Task<bool> UpdateVisibilityAsync(string artifactId, bool isPrivate, string userEmail, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null)
    {
        if (_scopeFactory == null) return false;
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetService<CipDbContext>();
            if (db == null) return false;

            var reviews = await db.Reviews
                .Where(r => r.ArtifactId.ToLower() == artifactId.ToLower())
                .OrderBy(r => r.SubmittedAt)
                .ToListAsync();

            if (!reviews.Any()) return false;

            var originalReview = reviews.FirstOrDefault(r => !string.IsNullOrEmpty(r.ProducerEmail));
            var originalProducer = originalReview?.ProducerEmail;

            if (string.IsNullOrEmpty(originalProducer) || !originalProducer.Equals(userEmail, StringComparison.OrdinalIgnoreCase))
            {
                throw new UnauthorizedAccessException($"Access denied: Only the original producer/owner ({originalProducer ?? "owner"}) can change the visibility of this artifact.");
            }

            foreach (var r in reviews)
            {
                r.IsPrivate = isPrivate;
                if (allowedContributors != null) r.AllowedContributors = allowedContributors;
                if (allowedReviewers != null) r.AllowedReviewers = allowedReviewers;
                if (allowedConsumers != null) r.AllowedConsumers = allowedConsumers;
            }

            await db.SaveChangesAsync();

            if (_publishedCache.TryGetValue(artifactId, out var cachedDto))
            {
                cachedDto.IsPrivate = isPrivate;
                if (allowedContributors != null) cachedDto.AllowedContributors = allowedContributors;
                if (allowedReviewers != null) cachedDto.AllowedReviewers = allowedReviewers;
                if (allowedConsumers != null) cachedDto.AllowedConsumers = allowedConsumers;
                _publishedCache[artifactId] = cachedDto;
            }
            foreach (var kvp in _publishedCache.Where(k => k.Key.StartsWith($"{artifactId}#", StringComparison.OrdinalIgnoreCase)).ToList())
            {
                kvp.Value.IsPrivate = isPrivate;
                if (allowedContributors != null) kvp.Value.AllowedContributors = allowedContributors;
                if (allowedReviewers != null) kvp.Value.AllowedReviewers = allowedReviewers;
                if (allowedConsumers != null) kvp.Value.AllowedConsumers = allowedConsumers;
                _publishedCache[kvp.Key] = kvp.Value;
            }

            return true;
        }
        catch (UnauthorizedAccessException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update visibility for artifact {ArtifactId}", artifactId);
            return false;
        }
    }

    private ArtifactDto? ParseArtifactFromReview(Review r)
    {
        if (string.IsNullOrWhiteSpace(r.ArtifactId)) return null;

        var cls = _classifier.Classify(r.ArtifactId, r.Content);
        string typeStr = cls.Type.ToString().ToLowerInvariant();
        string versionStr = cls.DetectedVersion ?? "1.0.0";
        string descStr = cls.DetectedDescription ?? $"Marketplace artifact {r.ArtifactId}";
        string cipPkg = $"{_opts.Organization ?? "maqsoftware"}/{_opts.Project ?? "EngineeringCommons"}/{_opts.Repository ?? "design-reviewer"}#{r.ArtifactId}";

        if (!string.IsNullOrEmpty(r.Content))
        {
            try
            {
                using var parsed = JsonDocument.Parse(r.Content);
                if (parsed.RootElement.TryGetProperty("type", out var tP) && !string.IsNullOrEmpty(tP.GetString()))
                {
                    typeStr = tP.GetString()!.ToLowerInvariant();
                }
                if (parsed.RootElement.TryGetProperty("version", out var vP) && !string.IsNullOrEmpty(vP.GetString()))
                {
                    versionStr = vP.GetString()!;
                }
                if (parsed.RootElement.TryGetProperty("description", out var dP) && !string.IsNullOrEmpty(dP.GetString()))
                {
                    descStr = dP.GetString()!;
                }
                if (parsed.RootElement.TryGetProperty("cipPackage", out var pkgP) && !string.IsNullOrEmpty(pkgP.GetString()))
                {
                    cipPkg = pkgP.GetString()!;
                }
            }
            catch { }
        }

        if (typeStr == "normalfile" || typeStr == "unknown")
        {
            typeStr = DetectTypeFromName(r.ArtifactId);
        }

        var content = EnsureValidArtifactBundle(r.ArtifactId, typeStr, versionStr, r.Content);

        return new ArtifactDto
        {
            Id = r.ArtifactId,
            Name = r.ArtifactId,
            Type = typeStr,
            Version = versionStr,
            Description = descStr,
            CipPackage = cipPkg,
            Content = content,
            IsPrivate = r.IsPrivate,
            ProducerEmail = r.ProducerEmail,
            AllowedContributors = r.AllowedContributors,
            AllowedReviewers = r.AllowedReviewers,
            AllowedConsumers = r.AllowedConsumers
        };
    }

    private string DetectTypeFromName(string name)
    {
        var lower = name.ToLowerInvariant();
        if (lower.Contains("agent") || lower.Contains("reviewer")) return "agent";
        if (lower.Contains("skill") || lower.Contains("refactor")) return "skill";
        if (lower.Contains("plugin") || lower.Contains("assistant")) return "plugin";
        if (lower.Contains("command") || lower.Contains("linter") || lower.Contains("run-")) return "command";
        if (lower.Contains("prompt") || lower.Contains("review")) return "prompt";
        if (lower.Contains("mcp") || lower.Contains("postgres")) return "mcpserver";
        return "agent";
    }

    private string EnsureValidArtifactBundle(string name, string type, string version, string rawContent)
    {
        if (string.IsNullOrWhiteSpace(rawContent))
        {
            return CreateDefaultBundle(name, type, version, $"Official {type} artifact {name}");
        }

        try
        {
            using var doc = JsonDocument.Parse(rawContent);
            if (doc.RootElement.TryGetProperty("files", out var filesProp) && filesProp.ValueKind == JsonValueKind.Array && filesProp.GetArrayLength() > 0)
            {
                var cleanedFiles = new List<object>();
                bool changed = false;
                foreach (var f in filesProp.EnumerateArray())
                {
                    var p = f.TryGetProperty("path", out var pP) ? pP.GetString() ?? "" : "";
                    var c = f.TryGetProperty("content", out var cP) ? cP.GetString() ?? "" : "";
                    var normP = NormalizeArtifactFilePath(p);
                    if (normP != p) changed = true;
                    cleanedFiles.Add(new { path = normP, content = c });
                }

                if (changed)
                {
                    var updated = new
                    {
                        name = name,
                        type = type,
                        version = version,
                        description = doc.RootElement.TryGetProperty("description", out var dP) ? dP.GetString() ?? "" : $"Official {type} artifact {name}",
                        files = cleanedFiles
                    };
                    return JsonSerializer.Serialize(updated);
                }

                return rawContent;
            }
        }
        catch { }

        var defaultRelPath = GetDefaultFilePath(name, type);
        var bundle = new
        {
            name = name,
            type = type,
            version = version,
            description = $"Official {type} artifact {name}",
            files = new[]
            {
                new { path = defaultRelPath, content = rawContent }
            }
        };
        return JsonSerializer.Serialize(bundle);
    }

    private string CreateDefaultBundle(string name, string type, string version, string? desc)
    {
        var description = desc ?? $"Official {type} artifact {name}";
        var relPath = GetDefaultFilePath(name, type);
        string fileContent;

        switch (type.ToLowerInvariant())
        {
            case "command":
                fileContent = $"---\ndescription: {description}\nversion: {version}\n---\n\n# Command: {name}\n\nExecute command instructions.";
                break;
            case "prompt":
                fileContent = $"---\ntitle: {name}\nversion: {version}\n---\n\n# Prompt: {name}\n\nStructured prompt template.";
                break;
            case "plugin":
                fileContent = $"{{\n  \"name\": \"{name}\",\n  \"version\": \"{version}\",\n  \"description\": \"{description}\"\n}}";
                break;
            case "mcpserver":
                fileContent = $"{{\n  \"mcpServers\": {{\n    \"{name}\": {{\n      \"command\": \"npx\",\n      \"args\": [\"{name}\"]\n    }}\n  }}\n}}";
                break;
            case "skill":
                fileContent = $"---\nname: {name}\ndescription: {description}\n---\n\n# Skill: {name}\n\nSkill execution workflow.";
                break;
            default:
                fileContent = $"---\nname: {name}\ntype: agent\nversion: {version}\n---\n\n# Agent: {name}\n\nAgent instructions and guidelines.";
                break;
        }

        var bundle = new
        {
            name = name,
            type = type,
            version = version,
            description = description,
            files = new[]
            {
                new { path = relPath, content = fileContent }
            }
        };
        return JsonSerializer.Serialize(bundle);
    }

    private string GetDefaultFilePath(string name, string type)
    {
        switch (type.ToLowerInvariant())
        {
            case "command":
                return $".agents/commands/{name}.command.md";
            case "prompt":
                return $".agents/prompts/{name}.prompt.md";
            case "plugin":
                return $"plugins/{name}/plugin.json";
            case "mcpserver":
                return $".cip/mcp/{name}/mcp.json";
            case "skill":
                return $".agents/skills/{name}/SKILL.md";
            default:
                return $".agents/agents/{name}.agent.md";
        }
    }

    private static string NormalizeArtifactFilePath(string path)
    {
        if (string.IsNullOrWhiteSpace(path)) return path;
        return path.Replace('\\', '/').TrimStart('/');
    }

    private static Version TryParseVersion(string v)
    {
        if (Version.TryParse(v, out var parsed)) return parsed;
        var cleaned = new string(v.Where(c => char.IsDigit(c) || c == '.').ToArray()).Trim('.');
        if (Version.TryParse(cleaned, out var cleanParsed)) return cleanParsed;
        return new Version(0, 0, 0);
    }

    private class VersionComparer : IComparer<Version>
    {
        public int Compare(Version? x, Version? y)
        {
            if (x == null && y == null) return 0;
            if (x == null) return -1;
            if (y == null) return 1;
            return x.CompareTo(y);
        }
    }
}
