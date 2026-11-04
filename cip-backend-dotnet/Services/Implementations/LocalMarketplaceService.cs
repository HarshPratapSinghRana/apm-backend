using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CipBackend.Services.Interfaces;
using Microsoft.AspNetCore.Hosting;

namespace CipBackend.Services.Implementations;

public class LocalMarketplaceService : IMarketplaceService
{
    private readonly string _repoRoot;
    private readonly IArtifactClassifier _classifier;

    public LocalMarketplaceService(IWebHostEnvironment env, IArtifactClassifier? classifier = null)
    {
        // assume repo root is workspace root two levels up from backend project
        _repoRoot = Directory.GetParent(env.ContentRootPath)?.Parent?.FullName ?? env.ContentRootPath;
        _classifier = classifier ?? new ArtifactClassifier();
    }

    public Task<IEnumerable<ArtifactDto>> ListArtifactsAsync()
    {
        var list = new List<ArtifactDto>();
        // Look for consumer lockfile to determine resolved artifacts
        var lockPath = Path.Combine(_repoRoot, "cip-consumer-poc", "cip.lock.yaml");
        if (File.Exists(lockPath))
        {
            try
            {
                var text = File.ReadAllText(lockPath);
                var lines = text.Split('\n');
                string? repoUrl = null;
                string? name = null;
                string? resolvedRef = null;
                string? version = null;
                string? pkgType = null;
                foreach (var line in lines)
                {
                    var l = line.Trim();
                    if (l.StartsWith("repo_url:")) repoUrl = l.Substring("repo_url:".Length).Trim();
                    if (l.StartsWith("name:")) { if (name == null) name = l.Substring("name:".Length).Trim(); }
                    if (l.StartsWith("resolved_ref:")) resolvedRef = l.Substring("resolved_ref:".Length).Trim();
                    if (l.StartsWith("version:")) { if (version == null) version = l.Substring("version:".Length).Trim(); }
                    if (l.StartsWith("package_type:")) { if (pkgType == null) pkgType = l.Substring("package_type:".Length).Trim(); }
                }
                if (!string.IsNullOrEmpty(name) && !string.IsNullOrEmpty(repoUrl))
                {
                    var cipId = repoUrl + (string.IsNullOrEmpty(resolvedRef) ? string.Empty : $"#{resolvedRef}");
                    var cls = _classifier.Classify(name);
                    var typeStr = !string.IsNullOrEmpty(pkgType) ? pkgType : cls.Type.ToString().ToLowerInvariant();
                    list.Add(new ArtifactDto { Id = name, Name = name, Type = typeStr, Version = version ?? "1.0.0", Description = string.Empty, CipPackage = cipId });
                }
            }
            catch { }
        }
        return Task.FromResult<IEnumerable<ArtifactDto>>(list);
    }

    public Task<ArtifactDto?> GetArtifactAsync(string artifactId, string? version = null)
    {
        var list = ListArtifactsAsync().GetAwaiter().GetResult();
        var match = list.FirstOrDefault(a => a.Id.Equals(artifactId, StringComparison.OrdinalIgnoreCase));
        if (match == null) return Task.FromResult<ArtifactDto?>(null);

        if (!string.IsNullOrWhiteSpace(version) && !match.Version.Equals(version, StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult<ArtifactDto?>(null);
        }

        return Task.FromResult<ArtifactDto?>(match);
    }

    public Task<IEnumerable<ArtifactVersionDto>> GetArtifactVersionsAsync(string artifactId)
    {
        var list = ListArtifactsAsync().GetAwaiter().GetResult();
        var match = list.FirstOrDefault(a => a.Id.Equals(artifactId, StringComparison.OrdinalIgnoreCase));
        if (match == null) return Task.FromResult<IEnumerable<ArtifactVersionDto>>(Enumerable.Empty<ArtifactVersionDto>());

        var versions = new List<ArtifactVersionDto>
        {
            new() { Version = match.Version, CipPackage = match.CipPackage, IsLatest = true }
        };
        return Task.FromResult<IEnumerable<ArtifactVersionDto>>(versions);
    }

    public Task PublishArtifactAsync(string artifactId, string content)
    {
        throw new NotImplementedException();
    }

    public Task<bool> UpdateVisibilityAsync(string artifactId, bool isPrivate, string userEmail, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null)
    {
        return Task.FromResult(true);
    }
}
