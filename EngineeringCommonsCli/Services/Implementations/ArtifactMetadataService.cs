using System;
using System.IO;
using System.Text.Json;
using System.Text.RegularExpressions;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;

namespace EngineeringCommonsCli.Services.Implementations;

public class ArtifactMetadataService : IArtifactMetadataService
{
    public ArtifactMetadata ExtractMetadata(string fullPath, ArtifactType type, string? content = null, bool isDirectory = false)
    {
        var fileName = Path.GetFileName(fullPath);
        var defaultName = isDirectory || type == ArtifactType.NormalFile || type == ArtifactType.CipConfiguration 
            ? fileName 
            : Path.GetFileNameWithoutExtension(fileName);
        
        // Strip secondary extensions
        if (defaultName.EndsWith(".agent", StringComparison.OrdinalIgnoreCase)) defaultName = defaultName.Substring(0, defaultName.Length - 6);
        if (defaultName.EndsWith(".prompt", StringComparison.OrdinalIgnoreCase)) defaultName = defaultName.Substring(0, defaultName.Length - 7);

        string name = defaultName;
        string version = "1.0.0";
        string? description = null;
        string? author = null;
        string? cipPackage = null;

        // If directory, check for cip.yml or plugin.json
        if (isDirectory)
        {
            var safeDir = Path.GetFullPath(fullPath);
            var cipPath = Path.Combine(safeDir, "cip.yml");
            if (!File.Exists(cipPath)) cipPath = Path.Combine(safeDir, "cip.yaml");
            if (File.Exists(cipPath) && Path.GetFullPath(cipPath).StartsWith(safeDir, StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var cipContent = File.ReadAllText(cipPath);
                    var nMatch = Regex.Match(cipContent, @"^\s*name\s*:\s*(.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
                    var vMatch = Regex.Match(cipContent, @"^\s*version\s*:\s*(.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
                    var dMatch = Regex.Match(cipContent, @"^\s*description\s*:\s*(.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
                    var aMatch = Regex.Match(cipContent, @"^\s*author\s*:\s*(.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase);

                    if (nMatch.Success) name = nMatch.Groups[1].Value.Trim().Trim('"', '\'');
                    if (vMatch.Success) version = vMatch.Groups[1].Value.Trim().Trim('"', '\'');
                    if (dMatch.Success) description = dMatch.Groups[1].Value.Trim().Trim('"', '\'');
                    if (aMatch.Success) author = aMatch.Groups[1].Value.Trim().Trim('"', '\'');
                }
                catch (Exception) { /* handled non-fatal CLI fallback */ }
            }

            var pluginPath = Path.Combine(safeDir, "plugin.json");
            if (File.Exists(pluginPath) && Path.GetFullPath(pluginPath).StartsWith(safeDir, StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var pJson = File.ReadAllText(pluginPath);
                    using var doc = JsonDocument.Parse(pJson);
                    if (doc.RootElement.TryGetProperty("name", out var nProp)) name = nProp.GetString() ?? name;
                    if (doc.RootElement.TryGetProperty("version", out var vProp)) version = vProp.GetString() ?? version;
                    if (doc.RootElement.TryGetProperty("description", out var dProp)) description = dProp.GetString() ?? description;
                    if (doc.RootElement.TryGetProperty("author", out var aProp)) author = aProp.GetString() ?? author;
                }
                catch (Exception) { /* handled non-fatal CLI fallback */ }
            }

            return new ArtifactMetadata(name, version, description ?? $"{type} artifact: {name}", author, cipPackage ?? $"harshpratapsinghrana1/{name}#v{version}");
        }

        // If file, read content if needed
        if (content == null && File.Exists(fullPath))
        {
            try { content = File.ReadAllText(fullPath); } catch (Exception) { /* handled non-fatal CLI fallback */ }
        }

        if (!string.IsNullOrWhiteSpace(content))
        {
            // Parse YAML frontmatter
            var fmMatch = Regex.Match(content, @"^---\s*[\r\n]+([\s\S]*?)[\r\n]+---", RegexOptions.Multiline);
            if (fmMatch.Success)
            {
                var fmBody = fmMatch.Groups[1].Value;
                var nMatch = Regex.Match(fmBody, @"^\s*name\s*:\s*(.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
                var vMatch = Regex.Match(fmBody, @"^\s*version\s*:\s*(.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
                var dMatch = Regex.Match(fmBody, @"^\s*description\s*:\s*(.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
                var aMatch = Regex.Match(fmBody, @"^\s*author\s*:\s*(.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase);

                if (nMatch.Success) name = nMatch.Groups[1].Value.Trim().Trim('"', '\'');
                if (vMatch.Success) version = vMatch.Groups[1].Value.Trim().Trim('"', '\'');
                if (dMatch.Success) description = dMatch.Groups[1].Value.Trim().Trim('"', '\'');
                if (aMatch.Success) author = aMatch.Groups[1].Value.Trim().Trim('"', '\'');
            }
        }

        return new ArtifactMetadata(name, version, description ?? $"{type} artifact: {name}", author, $"harshpratapsinghrana1/{name}#v{version}");
    }
}


