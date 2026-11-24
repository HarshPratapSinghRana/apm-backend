using EngineeringCommonsCli.Services.Interfaces;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace EngineeringCommonsCli.Services.Implementations;

public class CipService : ICipService
{
    public async Task<IEnumerable<ArtifactSpec>> ListAsync(string? typeFilter = null)
    {
        await Task.Delay(10);
        var data = new[]
        {
            new ArtifactSpec("design-reviewer", "agent", "1.1.0", "harshpratapsinghrana1/design-reviewer#v1.1.0"),
            new ArtifactSpec("sql-transformer", "skill", "2.0.0", string.Empty),
            new ArtifactSpec("accessibility", "plugin", "1.0.0", string.Empty)
        };
        return string.IsNullOrEmpty(typeFilter) ? data : data.Where(d => d.Type.Equals(typeFilter, StringComparison.OrdinalIgnoreCase));
    }

    public Task InstallAsync(string cipPackageIdentifier)
    {
        if (string.IsNullOrWhiteSpace(cipPackageIdentifier)) return Task.CompletedTask;

        Console.WriteLine($"[EngineeringCommonsService] Registering {cipPackageIdentifier} in local manifest...");
        UpdateCipManifest(cipPackageIdentifier);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(string cipPackageIdentifier)
    {
        if (string.IsNullOrWhiteSpace(cipPackageIdentifier)) return Task.CompletedTask;

        Console.WriteLine($"[EngineeringCommonsService] Updating {cipPackageIdentifier} in local manifest...");
        UpdateCipManifest(cipPackageIdentifier);
        return Task.CompletedTask;
    }

    private static void UpdateCipManifest(string cipPackageIdentifier)
    {
        var cipYmlPath = FindCipYml(Directory.GetCurrentDirectory());
        if (cipYmlPath == null) return;

        try
        {
            var lines = File.ReadAllLines(cipYmlPath).ToList();

            // Extract base package repo name (e.g. "harshpratapsinghrana1/design-reviewer" from "harshpratapsinghrana1/design-reviewer#v1.0.0")
            var baseRepo = cipPackageIdentifier.Contains('#')
                ? cipPackageIdentifier.Substring(0, cipPackageIdentifier.IndexOf('#'))
                : cipPackageIdentifier;

            bool foundExisting = false;
            int cipSectionIndex = -1;

            for (int i = 0; i < lines.Count; i++)
            {
                var line = lines[i];
                if (line.Trim().StartsWith("cip:"))
                {
                    cipSectionIndex = i;
                }

                if (line.Trim().StartsWith("- ") && line.Contains(baseRepo))
                {
                    // Update existing version in cip.yml
                    var indent = line.Substring(0, line.IndexOf('-'));
                    lines[i] = $"{indent}- {cipPackageIdentifier}";
                    foundExisting = true;
                    break;
                }
            }

            if (!foundExisting)
            {
                if (cipSectionIndex >= 0)
                {
                    lines.Insert(cipSectionIndex + 1, $"    - {cipPackageIdentifier}");
                }
                else
                {
                    lines.Add("dependencies:");
                    lines.Add("  cip:");
                    lines.Add($"    - {cipPackageIdentifier}");
                }
            }

            File.WriteAllLines(cipYmlPath, lines);
            Console.WriteLine($"[EngineeringCommonsService] Updated dependency in {Path.GetFileName(cipYmlPath)}.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EngineeringCommonsService Notice] Could not update {Path.GetFileName(cipYmlPath)}: {ex.Message}");
        }
    }

    private static string? FindCipYml(string startDir)
    {
        var current = new DirectoryInfo(startDir);
        while (current != null)
        {
            var filePath = Path.Combine(current.FullName, "cip.yml");
            if (File.Exists(filePath)) return filePath;
            current = current.Parent;
        }
        return null;
    }
}
