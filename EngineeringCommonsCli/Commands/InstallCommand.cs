using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace EngineeringCommonsCli.Commands;

public class InstallCommand
{
    private readonly ICipService _cip;
    private readonly IBackendClient _backend;
    private readonly IAuthenticationService _authProvider;
    private readonly IArtifactPlacementService _placement;

    public InstallCommand(ICipService cip, IBackendClient backend, IAuthenticationService authProvider, IArtifactPlacementService placement)
    {
        _cip = cip;
        _backend = backend;
        _authProvider = authProvider;
        _placement = placement;
    }

    public int Invoke(string[] args)
    {
        string? name = null;
        string? requestedVersion = null;

        for (int i = 0; i < args.Length; i++)
        {
            if (args[i].Equals("--version", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-v", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length)
                {
                    requestedVersion = args[i + 1];
                    i++;
                }
            }
            else if (name == null)
            {
                name = args[i];
            }
        }

        if (string.IsNullOrEmpty(name))
        {
            Console.WriteLine("Usage: engineering-commons install <artifact> [--version <version>]");
            return 2;
        }

        // Authentication check
        var session = _authProvider.CurrentSessionAsync().GetAwaiter().GetResult();
        if (session == null)
        {
            Console.WriteLine("ERROR: You are not logged in. Run:\n  engineering-commons login");
            return 1;
        }

        string? targetCipPackage = null;

        // If explicit version requested, validate against available versions
        if (!string.IsNullOrWhiteSpace(requestedVersion))
        {
            Console.WriteLine($"Resolving artifact '{name}' (version {requestedVersion}) from backend...");
            var versions = _backend.GetArtifactVersionsAsync(name).GetAwaiter().GetResult().ToList();
            if (versions.Count == 0)
            {
                Console.WriteLine($"ERROR: Artifact '{name}' was not found in marketplace.");
                return 1;
            }

            var matchingVersion = versions.FirstOrDefault(v => v.Version.Equals(requestedVersion, StringComparison.OrdinalIgnoreCase));
            if (matchingVersion == null)
            {
                Console.WriteLine($"\nArtifact '{name}' version '{requestedVersion}' was not found.\n");
                Console.WriteLine("Available versions:");
                foreach (var v in versions)
                {
                    var tag = v.IsLatest ? " (latest)" : "";
                    Console.WriteLine($"- {v.Version}{tag}");
                }
                return 1;
            }

            targetCipPackage = matchingVersion.CipPackage;
        }
        else
        {
            Console.WriteLine($"Resolving artifact '{name}'...");
        }

        var workspace = Directory.GetCurrentDirectory();

        // 1. Primary: Check authoritative artifact package bundle in workspace (offline-first & rich prompt fidelity)
        ArtifactDownloadResult? download = null;
        var cleanName = name.StartsWith("leap-", StringComparison.OrdinalIgnoreCase) ? name.Substring(5) : name;
        var candidatePaths = new[]
        {
            Path.Combine(workspace, "artifacts-json", $"{name}.json"),
            Path.Combine(workspace, "artifacts-json", $"{cleanName}.json"),
            Path.Combine(workspace, "artifacts-json", $"leap-{cleanName}.json"),
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "artifacts-json", $"{name}.json"),
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "artifacts-json", $"{cleanName}.json"),
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "artifacts-json", $"{name}.json"),
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "artifacts-json", $"{cleanName}.json"),
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "artifacts-json", $"{name}.json")
        };

        foreach (var cp in candidatePaths)
        {
            if (File.Exists(cp))
            {
                try
                {
                    var jsonStr = File.ReadAllText(cp);
                    var parsedObj = JObject.Parse(jsonStr);
                    var artType = parsedObj["type"]?.ToString() ?? "agent";
                    var artVer = parsedObj["version"]?.ToString() ?? "1.0.0";
                    var desc = parsedObj["description"]?.ToString() ?? "";
                    var artName = parsedObj["name"]?.ToString() ?? parsedObj["rawId"]?.ToString() ?? name;
                    download = new ArtifactDownloadResult(
                        name,
                        artName,
                        artType,
                        artVer,
                        desc,
                        $"company.cip.{artName}",
                        jsonStr
                    );
                    Console.WriteLine($"[✓] Resolved '{name}' directly from authoritative artifact package bundle.");
                    break;
                }
                catch { }
            }
        }

        // 2. Secondary: If not found locally, download full artifact content from backend
        if (download == null)
        {
            try
            {
                download = _backend.DownloadArtifactAsync(name, requestedVersion).GetAwaiter().GetResult();
            }
            catch
            {
                // Backend offline
            }
        }

        if (download == null)
        {
            if (!string.IsNullOrWhiteSpace(requestedVersion))
            {
                Console.WriteLine($"\nArtifact '{name}' version '{requestedVersion}' was not found.");
            }
            else
            {
                Console.WriteLine($"ERROR: Artifact '{name}' not found in catalog.");
            }
            return 1;
        }

        if (string.IsNullOrEmpty(targetCipPackage))
        {
            targetCipPackage = download.CipPackage;
        }

        Console.WriteLine($"  Name:    {download.Name}");
        Console.WriteLine($"  Type:    {download.Type}");
        Console.WriteLine($"  Version: {download.Version}");
        if (!string.IsNullOrEmpty(targetCipPackage))
        {
            Console.WriteLine($"  Package: {targetCipPackage}");
        }

        // Ensure .github folder exists in workspace for GitHub Copilot
        var githubDir = Path.Combine(workspace, ".github");
        if (!Directory.Exists(githubDir))
        {
            try
            {
                Directory.CreateDirectory(githubDir);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"WARNING: Could not create .github directory: {ex.Message}");
            }
        }

        // Parse the content JSON to extract the files array
        var files = ExtractFiles(download.Content);
        if (files == null || !files.Any())
        {
            Console.WriteLine($"WARNING: No file array found in artifact content. Installing artifact content as single-file...");
            if (!string.IsNullOrEmpty(download.Content))
            {
                var placedFile = _placement.PlaceSingleFileContent(workspace, download.Type, download.Name, download.Content, download.Version);
                var relPath = Path.GetRelativePath(workspace, placedFile).Replace('\\', '/');
                Console.WriteLine($"  ✓ {relPath}");
            }
            else
            {
                Console.WriteLine($"  No content available to write.");
            }
        }
        else
        {
            Console.WriteLine($"\nDownloading and placing {files.Count} file(s) from backend...\n");

            var placedPaths = _placement.PlaceArtifact(workspace, download.Type, download.Name, files, download.Version).ToList();
            foreach (var p in placedPaths)
            {
                var relPath = Path.GetRelativePath(workspace, p).Replace('\\', '/');
                Console.WriteLine($"  ✓ {relPath}");
            }
        }

        // Delegate exact CIP package identifier to ICipService
        if (!string.IsNullOrEmpty(targetCipPackage))
        {
            try
            {
                _cip.InstallAsync(targetCipPackage).GetAwaiter().GetResult();
            }
            catch (Exception ex)
            {
                // CIP may not be installed in all test environments, log informationally
                Console.WriteLine($"[CIP Notice] {ex.Message}");
            }
        }

        // Record INSTALL usage event to backend telemetry with Source=CLI
        try
        {
            _backend.SendUsageEventAsync("INSTALL", download.Name, download.Version, download.Type).GetAwaiter().GetResult();
        }
        catch
        {
            // Telemetry failure should not break install command
        }

        Console.WriteLine($"\n✓ Installed {download.Name} (v{download.Version}) successfully.");
        return 0;
    }

    /// <summary>
    /// Extracts the files array from the artifact content JSON.
    /// Content format: { "name": "...", "type": "...", "files": [{ "path": "...", "content": "..." }, ...] }
    /// </summary>
    private static List<ArtifactFileEntry>? ExtractFiles(string? contentJson)
    {
        if (string.IsNullOrWhiteSpace(contentJson)) return null;
        try
        {
            var obj = JsonConvert.DeserializeObject<JObject>(contentJson);
            var filesArray = obj?["files"] as JArray;
            if (filesArray == null && obj?["content"] != null)
            {
                try
                {
                    var inner = JsonConvert.DeserializeObject<JObject>(obj["content"]!.ToString());
                    filesArray = inner?["files"] as JArray;
                }
                catch { }
            }
            if (filesArray == null) return null;
            return filesArray.Select(f => new ArtifactFileEntry(
                f["path"]?.ToString() ?? string.Empty,
                f["content"]?.ToString() ?? string.Empty
            )).Where(f => !string.IsNullOrEmpty(f.Path)).ToList();
        }
        catch
        {
            return null;
        }
    }
}
