using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;
using Newtonsoft.Json.Linq;

namespace EngineeringCommonsCli.Services.Implementations;

public class WorkspaceContextExtractor : IWorkspaceContextExtractor
{
    public Task<WorkspaceContextSummary> ExtractSummaryAsync(string workspacePath)
    {
        var summary = new WorkspaceContextSummary();
        if (string.IsNullOrEmpty(workspacePath) || !Directory.Exists(workspacePath))
        {
            return Task.FromResult(summary);
        }

        var extensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var technologies = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var dependencies = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        int scanned = 0;
        try
        {
            var dirsToScan = new Queue<string>();
            dirsToScan.Enqueue(workspacePath);

            while (dirsToScan.Count > 0 && scanned < 500)
            {
                var currentDir = dirsToScan.Dequeue();
                string[] subDirs = Array.Empty<string>();
                string[] dirFiles = Array.Empty<string>();

                try
                {
                    subDirs = Directory.GetDirectories(currentDir);
                    dirFiles = Directory.GetFiles(currentDir);
                }
                catch (Exception) { /* handled non-fatal CLI fallback */ }

                foreach (var sub in subDirs)
                {
                    var dName = Path.GetFileName(sub);
                    if (dName.Equals("node_modules", StringComparison.OrdinalIgnoreCase) ||
                        dName.Equals(".git", StringComparison.OrdinalIgnoreCase) ||
                        dName.Equals("bin", StringComparison.OrdinalIgnoreCase) ||
                        dName.Equals("obj", StringComparison.OrdinalIgnoreCase) ||
                        dName.Equals("__pycache__", StringComparison.OrdinalIgnoreCase) ||
                        dName.StartsWith(".vs", StringComparison.OrdinalIgnoreCase) ||
                        dName.Equals(".idea", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }
                    dirsToScan.Enqueue(sub);
                }

                foreach (var file in dirFiles)
                {
                    if (ArtifactDiscoveryService.IsSensitiveOrIgnoredFile(file)) continue;

                    scanned++;
                    var ext = Path.GetExtension(file).ToLowerInvariant();
                    if (!string.IsNullOrEmpty(ext)) extensions.Add(ext);

                    var fileName = Path.GetFileName(file).ToLowerInvariant();

                    // Detect technologies safely based on manifest file presence
                    if (fileName == "package.json")
                    {
                        technologies.Add("Node.js");
                        technologies.Add("JavaScript");
                        ExtractNodeDependencies(file, dependencies, technologies);
                    }
                    else if (fileName.EndsWith(".csproj") || fileName.EndsWith(".sln"))
                    {
                        technologies.Add(".NET");
                        technologies.Add("C#");
                    }
                    else if (fileName == "requirements.txt" || fileName == "pyproject.toml")
                    {
                        technologies.Add("Python");
                    }
                    else if (fileName.EndsWith(".sql"))
                    {
                        technologies.Add("SQL");
                    }
                    else if (fileName == "cip.yml")
                    {
                        technologies.Add("CIP");
                    }

                    if (scanned >= 500) break;
                }
            }
        }
        catch (Exception) { /* handled non-fatal CLI fallback */ }

        summary.ScannedFileCount = scanned;
        summary.FileExtensions = extensions.Take(20).ToList();
        summary.Technologies = technologies.ToList();
        summary.Dependencies = dependencies.Take(30).ToList();

        return Task.FromResult(summary);
    }

    private static void ExtractNodeDependencies(string packageJsonPath, HashSet<string> deps, HashSet<string> techs)
    {
        try
        {
            var text = File.ReadAllText(packageJsonPath);
            var obj = JObject.Parse(text);
            if (obj["dependencies"] is JObject dObj)
            {
                foreach (var prop in dObj.Properties())
                {
                    deps.Add(prop.Name);
                    if (prop.Name.Contains("react", StringComparison.OrdinalIgnoreCase)) techs.Add("React");
                    if (prop.Name.Contains("vue", StringComparison.OrdinalIgnoreCase)) techs.Add("Vue");
                    if (prop.Name.Contains("angular", StringComparison.OrdinalIgnoreCase)) techs.Add("Angular");
                }
            }
        }
        catch (Exception) { /* handled non-fatal CLI fallback */ }
    }
}


