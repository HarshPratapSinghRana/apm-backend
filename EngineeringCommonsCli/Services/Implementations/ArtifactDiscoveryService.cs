using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;

namespace EngineeringCommonsCli.Services.Implementations;

public class ArtifactDiscoveryService : IArtifactDiscoveryService
{
    private readonly IArtifactClassifier _classifier;
    private readonly IArtifactMetadataService _metadata;

    public ArtifactDiscoveryService(IArtifactClassifier classifier, IArtifactMetadataService metadata)
    {
        _classifier = classifier;
        _metadata = metadata;
    }

    public Task<IEnumerable<DiscoveredArtifact>> DiscoverAsync(string workspacePath)
    {
        var results = new List<DiscoveredArtifact>();
        if (string.IsNullOrEmpty(workspacePath) || !Directory.Exists(workspacePath))
            return Task.FromResult<IEnumerable<DiscoveredArtifact>>(results);

        var discoveredRootPaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // =========================================================================
        // 1. Scan Subdirectories for CIP Packages & Plugins (Hierarchical Parent Packages)
        // =========================================================================
        var subDirs = Directory.GetDirectories(workspacePath);
        foreach (var dir in subDirs)
        {
            var dirName = Path.GetFileName(dir);
            if (dirName.StartsWith(".") || dirName.Equals("node_modules", StringComparison.OrdinalIgnoreCase) ||
                dirName.Equals("bin", StringComparison.OrdinalIgnoreCase) || dirName.Equals("obj", StringComparison.OrdinalIgnoreCase) ||
                dirName.Equals("artifacts", StringComparison.OrdinalIgnoreCase))
                continue;

            var dirClass = _classifier.Classify(dir, null, true, Path.GetRelativePath(workspacePath, dir));
            if (dirClass.Type == ArtifactType.CipPackage || dirClass.Type == ArtifactType.Plugin)
            {
                var packageFiles = Directory.GetFiles(dir, "*", SearchOption.AllDirectories)
                    .Where(f => !IsSensitiveOrIgnoredFile(f))
                    .Select(f => Path.GetRelativePath(workspacePath, f).Replace('\\', '/'))
                    .ToList();

                var meta = _metadata.ExtractMetadata(dir, dirClass.Type, null, true);
                discoveredRootPaths.Add(dir);

                var packageArtifact = new DiscoveredArtifact(
                    meta.Name,
                    dirClass.Type,
                    meta.Version,
                    Path.GetRelativePath(workspacePath, dir).Replace('\\', '/'),
                    packageFiles,
                    null,
                    dirClass.Confidence,
                    dirClass.Reason,
                    true
                );
                results.Add(packageArtifact);

                // Discover child artifacts inside this package
                ScanPackageChildren(workspacePath, dir, meta.Name, results, discoveredRootPaths);
            }
        }

        // =========================================================================
        // 2. Scan Standard Artifact Directories in Workspace Root
        // =========================================================================
        // 2a. Agents (.github/agents or agents/)
        ScanDirectoryArtifacts(workspacePath, Path.Combine(".github", "agents"), results, discoveredRootPaths);
        ScanDirectoryArtifacts(workspacePath, "agents", results, discoveredRootPaths);

        // 2b. Prompts (.github/prompts or prompts/)
        ScanDirectoryArtifacts(workspacePath, Path.Combine(".github", "prompts"), results, discoveredRootPaths);
        ScanDirectoryArtifacts(workspacePath, "prompts", results, discoveredRootPaths);

        // 2c. Commands (.github/commands or commands/)
        ScanDirectoryArtifacts(workspacePath, Path.Combine(".github", "commands"), results, discoveredRootPaths);
        ScanDirectoryArtifacts(workspacePath, "commands", results, discoveredRootPaths);

        // 2d. Skills (.agents/skills, .github/skills, skills/)
        ScanSkillsDirectory(workspacePath, Path.Combine(".agents", "skills"), results, discoveredRootPaths);
        ScanSkillsDirectory(workspacePath, Path.Combine(".github", "skills"), results, discoveredRootPaths);
        ScanSkillsDirectory(workspacePath, "skills", results, discoveredRootPaths);

        // 2e. Plugins (plugins/, .github/plugins/)
        ScanPluginsDirectory(workspacePath, "plugins", results, discoveredRootPaths);
        ScanPluginsDirectory(workspacePath, Path.Combine(".github", "plugins"), results, discoveredRootPaths);

        // 2f. MCP Server configs in workspace (.mcp/, .github/mcp/, mcp.json)
        ScanMcpServers(workspacePath, results, discoveredRootPaths);

        // =========================================================================
        // 3. Scan ./artifacts subfolder if present
        // =========================================================================
        var artifactsDir = Path.Combine(workspacePath, "artifacts");
        if (Directory.Exists(artifactsDir))
        {
            foreach (var dir in Directory.GetDirectories(artifactsDir))
            {
                if (discoveredRootPaths.Add(dir))
                {
                    var name = Path.GetFileName(dir);
                    var relPath = Path.GetRelativePath(workspacePath, dir).Replace('\\', '/');
                    var classification = _classifier.Classify(dir, null, true, relPath);
                    var meta = _metadata.ExtractMetadata(dir, classification.Type, null, true);
                    var files = Directory.GetFiles(dir, "*", SearchOption.AllDirectories)
                        .Select(f => Path.GetRelativePath(workspacePath, f).Replace('\\', '/'))
                        .ToList();

                    results.Add(new DiscoveredArtifact(
                        meta.Name,
                        classification.Type,
                        meta.Version,
                        relPath,
                        files,
                        null,
                        classification.Confidence,
                        classification.Reason,
                        classification.Type != ArtifactType.NormalFile && classification.Type != ArtifactType.CipConfiguration && classification.Type != ArtifactType.Unknown
                    ));
                }
            }

            foreach (var file in Directory.GetFiles(artifactsDir, "*.*"))
            {
                if (discoveredRootPaths.Add(file))
                {
                    var relPath = Path.GetRelativePath(workspacePath, file).Replace('\\', '/');
                    var classification = _classifier.Classify(file, null, false, relPath);
                    var meta = _metadata.ExtractMetadata(file, classification.Type);

                    results.Add(new DiscoveredArtifact(
                        classification.ExtractedName ?? meta.Name,
                        classification.Type,
                        classification.ExtractedVersion ?? meta.Version,
                        relPath,
                        new[] { relPath },
                        null,
                        classification.Confidence,
                        classification.Reason,
                        classification.Type != ArtifactType.NormalFile && classification.Type != ArtifactType.CipConfiguration && classification.Type != ArtifactType.Unknown
                    ));
                }
            }
        }

        // =========================================================================
        // 4. Scan Loose Files in Workspace Root (cip.yml, README.md, package.json, etc.)
        // =========================================================================
        foreach (var file in Directory.GetFiles(workspacePath))
        {
            var fileName = Path.GetFileName(file);
            if (fileName.StartsWith(".")) continue;

            if (discoveredRootPaths.Add(file))
            {
                var relPath = Path.GetRelativePath(workspacePath, file).Replace('\\', '/');
                var classification = _classifier.Classify(file, null, false, relPath);
                var meta = _metadata.ExtractMetadata(file, classification.Type);

                results.Add(new DiscoveredArtifact(
                    classification.ExtractedName ?? meta.Name,
                    classification.Type,
                    classification.ExtractedVersion ?? meta.Version,
                    relPath,
                    new[] { relPath },
                    null,
                    classification.Confidence,
                    classification.Reason,
                    classification.Type != ArtifactType.NormalFile && classification.Type != ArtifactType.CipConfiguration && classification.Type != ArtifactType.Unknown
                ));
            }
        }

        return Task.FromResult<IEnumerable<DiscoveredArtifact>>(results);
    }

    private void ScanPackageChildren(string workspacePath, string packageDir, string packageName, List<DiscoveredArtifact> results, HashSet<string> discoveredRootPaths)
    {
        var allFiles = Directory.GetFiles(packageDir, "*", SearchOption.AllDirectories)
            .Where(f => !f.Contains("\\.git\\") && !f.Contains("/.git/") && !f.Contains("\\bin\\") && !f.Contains("\\obj\\"));

        foreach (var file in allFiles)
        {
            if (!discoveredRootPaths.Add(file)) continue;

            var relPath = Path.GetRelativePath(workspacePath, file).Replace('\\', '/');
            var classification = _classifier.Classify(file, null, false, relPath);
            var meta = _metadata.ExtractMetadata(file, classification.Type);

            results.Add(new DiscoveredArtifact(
                classification.ExtractedName ?? meta.Name,
                classification.Type,
                classification.ExtractedVersion ?? meta.Version,
                relPath,
                new[] { relPath },
                packageName,
                classification.Confidence,
                classification.Reason,
                classification.Type != ArtifactType.NormalFile && classification.Type != ArtifactType.CipConfiguration && classification.Type != ArtifactType.Unknown
            ));
        }
    }

    private void ScanDirectoryArtifacts(string workspacePath, string subDir, List<DiscoveredArtifact> results, HashSet<string> discoveredRootPaths)
    {
        var fullDir = Path.Combine(workspacePath, subDir);
        if (!Directory.Exists(fullDir)) return;

        foreach (var file in Directory.GetFiles(fullDir, "*.md", SearchOption.AllDirectories))
        {
            if (!discoveredRootPaths.Add(file)) continue;

            var relPath = Path.GetRelativePath(workspacePath, file).Replace('\\', '/');
            var classification = _classifier.Classify(file, null, false, relPath);
            var meta = _metadata.ExtractMetadata(file, classification.Type);

            results.Add(new DiscoveredArtifact(
                classification.ExtractedName ?? meta.Name,
                classification.Type,
                classification.ExtractedVersion ?? meta.Version,
                relPath,
                new[] { relPath },
                null,
                classification.Confidence,
                classification.Reason,
                classification.Type != ArtifactType.NormalFile && classification.Type != ArtifactType.CipConfiguration
            ));
        }
    }

    private void ScanSkillsDirectory(string workspacePath, string subDir, List<DiscoveredArtifact> results, HashSet<string> discoveredRootPaths)
    {
        var fullDir = Path.Combine(workspacePath, subDir);
        if (!Directory.Exists(fullDir)) return;

        // Subdirectories containing SKILL.md
        foreach (var skillSubDir in Directory.GetDirectories(fullDir))
        {
            if (!discoveredRootPaths.Add(skillSubDir)) continue;

            var relPath = Path.GetRelativePath(workspacePath, skillSubDir).Replace('\\', '/');
            var classification = _classifier.Classify(skillSubDir, null, true, relPath);
            var meta = _metadata.ExtractMetadata(skillSubDir, classification.Type, null, true);
            var skillFiles = Directory.GetFiles(skillSubDir, "*", SearchOption.AllDirectories)
                .Where(f => !IsSensitiveOrIgnoredFile(f))
                .Select(f => Path.GetRelativePath(workspacePath, f).Replace('\\', '/'))
                .ToList();

            results.Add(new DiscoveredArtifact(
                meta.Name,
                classification.Type,
                meta.Version,
                relPath,
                skillFiles,
                null,
                classification.Confidence,
                classification.Reason,
                true
            ));
        }

        // Direct markdown files under skills/
        foreach (var file in Directory.GetFiles(fullDir, "*.md").Where(f => !IsSensitiveOrIgnoredFile(f)))
        {
            if (!discoveredRootPaths.Add(file)) continue;

            var relPath = Path.GetRelativePath(workspacePath, file).Replace('\\', '/');
            var classification = _classifier.Classify(file, null, false, relPath);
            var meta = _metadata.ExtractMetadata(file, classification.Type);

            results.Add(new DiscoveredArtifact(
                classification.ExtractedName ?? meta.Name,
                classification.Type,
                classification.ExtractedVersion ?? meta.Version,
                relPath,
                new[] { relPath },
                null,
                classification.Confidence,
                classification.Reason,
                true
            ));
        }
    }

    private void ScanPluginsDirectory(string workspacePath, string subDir, List<DiscoveredArtifact> results, HashSet<string> discoveredRootPaths)
    {
        var fullDir = Path.Combine(workspacePath, subDir);
        if (!Directory.Exists(fullDir)) return;

        foreach (var pluginDir in Directory.GetDirectories(fullDir))
        {
            if (!discoveredRootPaths.Add(pluginDir)) continue;

            var relPath = Path.GetRelativePath(workspacePath, pluginDir).Replace('\\', '/');
            var classification = _classifier.Classify(pluginDir, null, true, relPath);
            var meta = _metadata.ExtractMetadata(pluginDir, classification.Type, null, true);
            var pluginFiles = Directory.GetFiles(pluginDir, "*", SearchOption.AllDirectories)
                .Where(f => !IsSensitiveOrIgnoredFile(f))
                .Select(f => Path.GetRelativePath(workspacePath, f).Replace('\\', '/'))
                .ToList();

            results.Add(new DiscoveredArtifact(
                meta.Name,
                classification.Type,
                meta.Version,
                relPath,
                pluginFiles,
                null,
                classification.Confidence,
                classification.Reason,
                true
            ));
        }
    }

    private void ScanMcpServers(string workspacePath, List<DiscoveredArtifact> results, HashSet<string> discoveredRootPaths)
    {
        var mcpCandidates = new[]
        {
            Path.Combine(workspacePath, "mcp_config.json"),
            Path.Combine(workspacePath, "mcp.json"),
            Path.Combine(workspacePath, ".mcp", "server.json")
        };

        foreach (var candidate in mcpCandidates)
        {
            if (File.Exists(candidate) && !IsSensitiveOrIgnoredFile(candidate) && discoveredRootPaths.Add(candidate))
            {
                var relPath = Path.GetRelativePath(workspacePath, candidate).Replace('\\', '/');
                var classification = _classifier.Classify(candidate, null, false, relPath);
                var meta = _metadata.ExtractMetadata(candidate, classification.Type);

                results.Add(new DiscoveredArtifact(
                    classification.ExtractedName ?? meta.Name,
                    classification.Type,
                    classification.ExtractedVersion ?? meta.Version,
                    relPath,
                    new[] { relPath },
                    null,
                    classification.Confidence,
                    classification.Reason,
                    true
                ));
            }
        }

        var mcpFolders = new[]
        {
            Path.Combine(workspacePath, ".mcp"),
            Path.Combine(workspacePath, ".github", "mcp"),
            Path.Combine(workspacePath, "mcp")
        };

        foreach (var mcpFolder in mcpFolders)
        {
            if (!Directory.Exists(mcpFolder)) continue;
            foreach (var sub in Directory.GetDirectories(mcpFolder))
            {
                if (!discoveredRootPaths.Add(sub)) continue;
                var relPath = Path.GetRelativePath(workspacePath, sub).Replace('\\', '/');
                var classification = _classifier.Classify(sub, null, true, relPath);
                var meta = _metadata.ExtractMetadata(sub, classification.Type, null, true);
                var mcpFiles = Directory.GetFiles(sub, "*", SearchOption.AllDirectories)
                    .Where(f => !IsSensitiveOrIgnoredFile(f))
                    .Select(f => Path.GetRelativePath(workspacePath, f).Replace('\\', '/'))
                    .ToList();

                results.Add(new DiscoveredArtifact(
                    meta.Name,
                    classification.Type != ArtifactType.Unknown ? classification.Type : ArtifactType.McpServer,
                    meta.Version,
                    relPath,
                    mcpFiles,
                    null,
                    classification.Confidence,
                    classification.Reason,
                    true
                ));
            }
        }
    }

    /// <summary>
    /// Centralized sensitive and build artifact exclusion filter to prevent accidental secret leakage
    /// </summary>
    public static bool IsSensitiveOrIgnoredFile(string path)
    {
        if (string.IsNullOrWhiteSpace(path)) return true;
        var norm = path.Replace('\\', '/').ToLowerInvariant();
        var fileName = Path.GetFileName(norm);

        // 1. Version control and cache dirs
        if (norm.Contains("/.git/") || norm.Contains("/node_modules/") || norm.Contains("/bin/") ||
            norm.Contains("/obj/") || norm.Contains("/__pycache__/") || norm.Contains("/.vs/") ||
            norm.Contains("/.vscode/") || norm.Contains("/.idea/"))
        {
            return true;
        }

        // 2. Sensitive env and credential files
        if (fileName.Equals(".env", StringComparison.OrdinalIgnoreCase) ||
            fileName.StartsWith(".env.", StringComparison.OrdinalIgnoreCase) ||
            fileName.Equals("credentials.json", StringComparison.OrdinalIgnoreCase) ||
            fileName.Equals("token.json", StringComparison.OrdinalIgnoreCase) ||
            fileName.Equals("tokens_cache.json", StringComparison.OrdinalIgnoreCase) ||
            fileName.Equals("session.json", StringComparison.OrdinalIgnoreCase) ||
            fileName.EndsWith(".tokenguard", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // 3. Certificates, keys, private keys
        if (fileName.EndsWith(".pem") || fileName.EndsWith(".key") || fileName.EndsWith(".pfx") ||
            fileName.EndsWith(".p12") || fileName.EndsWith(".crt") || fileName.EndsWith(".cer") ||
            fileName.Equals("id_rsa") || fileName.Equals("id_ed25519"))
        {
            return true;
        }

        // 4. Executables and compiled binaries
        if (fileName.EndsWith(".exe") || fileName.EndsWith(".dll") || fileName.EndsWith(".so") ||
            fileName.EndsWith(".dylib") || fileName.EndsWith(".pdb") || fileName.EndsWith(".bin") ||
            fileName.Equals(".ds_store"))
        {
            return true;
        }

        return false;
    }
}
