using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Services.Implementations;

public class ArtifactDiffService : IArtifactDiffService
{
    private readonly IMarketplaceService _marketplace;
    private readonly ILogger<ArtifactDiffService>? _logger;

    public ArtifactDiffService(IMarketplaceService marketplace, ILogger<ArtifactDiffService>? logger = null)
    {
        _marketplace = marketplace;
        _logger = logger;
    }

    public List<LineChange> GenerateUnifiedDiff(string? oldContent, string? newContent)
    {
        return GenerateLineChanges(oldContent, newContent);
    }

    public ArtifactChangeType GetArtifactChangeType(ArtifactDto? oldArtifact, string submittedContentJson, int filesChangedCount)
    {
        if (oldArtifact == null)
        {
            return ArtifactChangeType.NewArtifact;
        }

        if (filesChangedCount > 0)
        {
            return ArtifactChangeType.Modified;
        }

        return ArtifactChangeType.NoChanges;
    }

    public static string ComputeSha256(string content)
    {
        using var sha = System.Security.Cryptography.SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(content ?? string.Empty);
        var hash = sha.ComputeHash(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public static string ComputeArtifactFingerprint(Dictionary<string, string> files)
    {
        if (files == null || files.Count == 0) return string.Empty;
        var sorted = files
            .Select(kvp => $"{GetCanonicalPath(kvp.Key).ToLowerInvariant()}:{ComputeSha256(NormalizeLineEndings(kvp.Value ?? string.Empty))}")
            .OrderBy(s => s, StringComparer.Ordinal)
            .ToList();

        return ComputeSha256(string.Join("\n", sorted));
    }

    public async Task<DuplicateCheckResult> CheckDuplicateAsync(
        string artifactId,
        string submittedContentJson,
        string? artifactType = null)
    {
        // 1. Fetch current approved artifact from marketplace
        ArtifactDto? currentApproved = null;
        try
        {
            currentApproved = await _marketplace.GetArtifactAsync(artifactId);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to retrieve approved artifact content for {ArtifactId}; defaulting to null.", artifactId);
            currentApproved = null;
        }

        // If no matching artifact exists in marketplace, it cannot be a duplicate
        if (currentApproved == null)
        {
            var sFiles = ExtractFiles(submittedContentJson, artifactId);
            var sVer = ExtractVersion(submittedContentJson) ?? "1.0.0";
            return new DuplicateCheckResult
            {
                IsDuplicate = false,
                IsUnchanged = false,
                MatchedArtifactId = null,
                MatchedArtifactName = null,
                MatchedVersion = null,
                SubmittedVersion = sVer,
                ArtifactType = artifactType,
                FilesCompared = sFiles.Count,
                FilesUnchanged = 0,
                FilesAdded = sFiles.Count,
                FilesModified = 0,
                FilesDeleted = 0,
                FilesChanged = sFiles.Count,
                Message = "New artifact contribution. No existing marketplace version found."
            };
        }

        // Check artifact type compatibility (e.g. agent vs skill)
        if (!string.IsNullOrEmpty(artifactType) && !string.IsNullOrEmpty(currentApproved.Type))
        {
            var normSubmittedType = artifactType.Replace("-", "").ToLowerInvariant();
            var normCurrentType = currentApproved.Type.Replace("-", "").ToLowerInvariant();
            if (!string.Equals(normSubmittedType, normCurrentType, StringComparison.OrdinalIgnoreCase))
            {
                var sFiles = ExtractFiles(submittedContentJson, artifactId);
                return new DuplicateCheckResult
                {
                    IsDuplicate = false,
                    IsUnchanged = false,
                    MatchedArtifactId = currentApproved.Id,
                    MatchedArtifactName = currentApproved.Name,
                    MatchedVersion = currentApproved.Version,
                    SubmittedVersion = ExtractVersion(submittedContentJson) ?? "1.0.0",
                    ArtifactType = artifactType,
                    FilesCompared = sFiles.Count,
                    FilesUnchanged = 0,
                    FilesAdded = sFiles.Count,
                    FilesModified = 0,
                    FilesDeleted = 0,
                    FilesChanged = sFiles.Count,
                    Message = $"Different artifact type (Submitted: {artifactType}, Existing: {currentApproved.Type}). Not a duplicate."
                };
            }
        }

        // 2. Parse current and submitted files
        var currentFiles = ExtractFiles(currentApproved.Content, currentApproved.Name);
        var submittedFiles = ExtractFiles(submittedContentJson, artifactId);
        var currentVer = currentApproved.Version ?? "1.0.0";
        var submittedVer = ExtractVersion(submittedContentJson) ?? currentVer;

        // 3. Compute deterministic fingerprints
        var existingFp = ComputeArtifactFingerprint(currentFiles);
        var submittedFp = ComputeArtifactFingerprint(submittedFiles);

        // 4. Compare every file
        var allPaths = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var p in currentFiles.Keys) allPaths.Add(p);
        foreach (var p in submittedFiles.Keys) allPaths.Add(p);

        int added = 0;
        int deleted = 0;
        int modified = 0;
        int unchanged = 0;

        foreach (var path in allPaths)
        {
            bool inCurrent = currentFiles.TryGetValue(path, out var oldContent);
            bool inSubmitted = submittedFiles.TryGetValue(path, out var newContent);

            if (!inCurrent && inSubmitted)
            {
                added++;
            }
            else if (inCurrent && !inSubmitted)
            {
                deleted++;
            }
            else if (inCurrent && inSubmitted)
            {
                var normOld = NormalizeLineEndings(oldContent ?? string.Empty);
                var normNew = NormalizeLineEndings(newContent ?? string.Empty);
                if (string.Equals(normOld, normNew, StringComparison.Ordinal))
                {
                    unchanged++;
                }
                else
                {
                    modified++;
                }
            }
        }

        int totalChanged = added + deleted + modified;
        bool isIdentical = totalChanged == 0 && currentFiles.Count > 0 && submittedFiles.Count > 0;

        string message;
        if (isIdentical)
        {
            message = $"An identical artifact already exists in the marketplace (v{currentVer}). No changes detected.";
        }
        else
        {
            message = $"Changes detected compared to existing v{currentVer} (Modified: {modified}, Added: {added}, Deleted: {deleted}).";
        }

        return new DuplicateCheckResult
        {
            IsDuplicate = isIdentical,
            IsUnchanged = isIdentical,
            MatchedArtifactId = currentApproved.Id,
            MatchedArtifactName = currentApproved.Name,
            MatchedVersion = currentVer,
            SubmittedVersion = submittedVer,
            ArtifactType = currentApproved.Type,
            FilesCompared = allPaths.Count,
            FilesUnchanged = unchanged,
            FilesAdded = added,
            FilesModified = modified,
            FilesDeleted = deleted,
            FilesChanged = totalChanged,
            ExistingFingerprint = existingFp,
            SubmittedFingerprint = submittedFp,
            Message = message
        };
    }

    public async Task<ArtifactDiff> GenerateDiffAsync(
        string artifactId,
        string submittedContentJson,
        string? reviewId = null,
        string? producerEmail = null,
        DateTime? submittedAt = null)
    {
        // 1. Fetch current approved artifact (if exists)
        ArtifactDto? currentApproved = null;
        try
        {
            currentApproved = await _marketplace.GetArtifactAsync(artifactId);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to retrieve approved artifact content for {ArtifactId}; defaulting to null.", artifactId);
            currentApproved = null;
        }

        // 2. Parse current files
        var currentFiles = ExtractFiles(currentApproved?.Content, currentApproved?.Name);
        var currentVersion = currentApproved?.Version;

        // 3. Parse submitted files
        var submittedFiles = ExtractFiles(submittedContentJson, artifactId);
        var submittedVersion = ExtractVersion(submittedContentJson) ?? "1.0.0";
        var artifactName = ExtractName(submittedContentJson) ?? currentApproved?.Name ?? artifactId;

        // 4. Group all file paths
        var allPaths = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var p in currentFiles.Keys) allPaths.Add(p);
        foreach (var p in submittedFiles.Keys) allPaths.Add(p);

        var fileDiffs = new List<ArtifactFileDiff>();
        int addedCount = 0;
        int modifiedCount = 0;
        int deletedCount = 0;
        int unchangedCount = 0;

        foreach (var path in allPaths)
        {
            bool inCurrent = currentFiles.TryGetValue(path, out var oldContent);
            bool inSubmitted = submittedFiles.TryGetValue(path, out var newContent);

            if (!inCurrent && inSubmitted)
            {
                // File was Added
                var lineChanges = GenerateUnifiedDiff(null, newContent);
                fileDiffs.Add(new ArtifactFileDiff
                {
                    Path = path,
                    ChangeType = ChangeType.Added,
                    OldContent = null,
                    NewContent = newContent,
                    LineChanges = lineChanges,
                    AddedLinesCount = lineChanges.Count(l => l.Type == LineChangeType.Added),
                    DeletedLinesCount = 0
                });
                addedCount++;
            }
            else if (inCurrent && !inSubmitted)
            {
                // File was Deleted
                var lineChanges = GenerateUnifiedDiff(oldContent, null);
                fileDiffs.Add(new ArtifactFileDiff
                {
                    Path = path,
                    ChangeType = ChangeType.Deleted,
                    OldContent = oldContent,
                    NewContent = null,
                    LineChanges = lineChanges,
                    AddedLinesCount = 0,
                    DeletedLinesCount = lineChanges.Count(l => l.Type == LineChangeType.Deleted)
                });
                deletedCount++;
            }
            else if (inCurrent && inSubmitted)
            {
                // Normalize line endings for comparison
                var normOld = NormalizeLineEndings(oldContent ?? string.Empty);
                var normNew = NormalizeLineEndings(newContent ?? string.Empty);

                if (string.Equals(normOld, normNew, StringComparison.Ordinal))
                {
                    // Unchanged
                    var lineChanges = GenerateUnifiedDiff(oldContent, newContent);
                    fileDiffs.Add(new ArtifactFileDiff
                    {
                        Path = path,
                        ChangeType = ChangeType.Unchanged,
                        OldContent = oldContent,
                        NewContent = newContent,
                        LineChanges = lineChanges,
                        AddedLinesCount = 0,
                        DeletedLinesCount = 0
                    });
                    unchangedCount++;
                }
                else
                {
                    // Modified
                    var lineChanges = GenerateUnifiedDiff(oldContent, newContent);
                    fileDiffs.Add(new ArtifactFileDiff
                    {
                        Path = path,
                        ChangeType = ChangeType.Modified,
                        OldContent = oldContent,
                        NewContent = newContent,
                        LineChanges = lineChanges,
                        AddedLinesCount = lineChanges.Count(l => l.Type == LineChangeType.Added),
                        DeletedLinesCount = lineChanges.Count(l => l.Type == LineChangeType.Deleted)
                    });
                    modifiedCount++;
                }
            }
        }

        int totalChanged = addedCount + modifiedCount + deletedCount;
        var changeType = GetArtifactChangeType(currentApproved, submittedContentJson, totalChanged);

        return new ArtifactDiff
        {
            ReviewId = reviewId,
            ArtifactName = artifactName,
            CurrentVersion = currentVersion,
            SubmittedVersion = submittedVersion,
            ProducerEmail = producerEmail,
            SubmittedAt = submittedAt,
            ArtifactChangeType = changeType,
            FilesChangedCount = totalChanged,
            AddedFilesCount = addedCount,
            ModifiedFilesCount = modifiedCount,
            DeletedFilesCount = deletedCount,
            UnchangedFilesCount = unchangedCount,
            Files = fileDiffs
        };
    }

    public static string GetCanonicalPath(string path)
    {
        if (string.IsNullOrWhiteSpace(path)) return string.Empty;
        var p = path.Replace('\\', '/').Trim('/');

        var standardMarkers = new[] { ".github/", ".agents/", ".mcp/", "agents/", "skills/", "prompts/", "plugins/", "cip.yml", "cip.yaml", "plugin.json" };
        foreach (var marker in standardMarkers)
        {
            var idx = p.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (idx >= 0)
            {
                return p.Substring(idx);
            }
        }

        return p;
    }

    private static Dictionary<string, string> ExtractFiles(string? contentJson, string? defaultArtifactName)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(contentJson)) return result;

        try
        {
            using var doc = JsonDocument.Parse(contentJson);
            if (doc.RootElement.TryGetProperty("files", out var filesElem) && filesElem.ValueKind == JsonValueKind.Array)
            {
                foreach (var f in filesElem.EnumerateArray())
                {
                    if (f.TryGetProperty("path", out var pProp))
                    {
                        var rawPath = pProp.GetString();
                        var content = f.TryGetProperty("content", out var cProp) ? cProp.GetString() ?? string.Empty : string.Empty;
                        if (!string.IsNullOrEmpty(rawPath))
                        {
                            var canonical = GetCanonicalPath(rawPath);
                            result[canonical] = content;
                        }
                    }
                }
            }
            else
            {
                // Fallback: If contentJson is not a wrapper JSON with a files array, treat it as a single file
                var fallbackPath = $"{defaultArtifactName ?? "artifact"}.md";
                result[fallbackPath] = contentJson;
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[ArtifactDiffService] ExtractFiles parse error: {ex.Message}");
            var fallbackPath = $"{defaultArtifactName ?? "artifact"}.md";
            result[fallbackPath] = contentJson;
        }

        return result;
    }

    private static string? ExtractVersion(string? contentJson)
    {
        if (string.IsNullOrWhiteSpace(contentJson)) return null;
        try
        {
            using var doc = JsonDocument.Parse(contentJson);
            if (doc.RootElement.TryGetProperty("version", out var vProp)) return vProp.GetString();
        }
        catch (JsonException ex) 
        {
            System.Diagnostics.Debug.WriteLine($"[ArtifactDiffService] ExtractVersion parse error: {ex.Message}");
            return null;
        }
        return null;
    }

    private static string? ExtractName(string? contentJson)
    {
        if (string.IsNullOrWhiteSpace(contentJson)) return null;
        try
        {
            using var doc = JsonDocument.Parse(contentJson);
            if (doc.RootElement.TryGetProperty("name", out var nProp)) return nProp.GetString();
        }
        catch (JsonException ex) 
        {
            System.Diagnostics.Debug.WriteLine($"[ArtifactDiffService] ExtractName parse error: {ex.Message}");
            return null;
        }
        return null;
    }

    private static string NormalizeLineEndings(string s) => s.Replace("\r\n", "\n").Replace('\r', '\n');

    public static List<LineChange> GenerateLineChanges(string? oldContent, string? newContent)
    {
        var result = new List<LineChange>();

        var oldLines = string.IsNullOrEmpty(oldContent) 
            ? Array.Empty<string>() 
            : NormalizeLineEndings(oldContent).Split('\n');
            
        var newLines = string.IsNullOrEmpty(newContent) 
            ? Array.Empty<string>() 
            : NormalizeLineEndings(newContent).Split('\n');

        // Brand-new file (All lines Added)
        if (oldLines.Length == 0 && newLines.Length > 0)
        {
            for (int i = 0; i < newLines.Length; i++)
            {
                result.Add(new LineChange
                {
                    OldLineNumber = null,
                    NewLineNumber = i + 1,
                    Type = LineChangeType.Added,
                    Content = newLines[i]
                });
            }
            return result;
        }

        // Deleted file (All lines Deleted)
        if (oldLines.Length > 0 && newLines.Length == 0)
        {
            for (int i = 0; i < oldLines.Length; i++)
            {
                result.Add(new LineChange
                {
                    OldLineNumber = i + 1,
                    NewLineNumber = null,
                    Type = LineChangeType.Deleted,
                    Content = oldLines[i]
                });
            }
            return result;
        }

        // Unchanged file
        if (oldLines.SequenceEqual(newLines))
        {
            for (int i = 0; i < oldLines.Length; i++)
            {
                result.Add(new LineChange
                {
                    OldLineNumber = i + 1,
                    NewLineNumber = i + 1,
                    Type = LineChangeType.Unchanged,
                    Content = oldLines[i]
                });
            }
            return result;
        }

        // Modified file: Compute Longest Common Subsequence (LCS) matrix
        int n = oldLines.Length;
        int m = newLines.Length;
        int[,] lcs = new int[n + 1, m + 1];

        for (int i = 0; i < n; i++)
        {
            for (int j = 0; j < m; j++)
            {
                if (oldLines[i] == newLines[j])
                {
                    lcs[i + 1, j + 1] = lcs[i, j] + 1;
                }
                else
                {
                    lcs[i + 1, j + 1] = Math.Max(lcs[i + 1, j], lcs[i, j + 1]);
                }
            }
        }

        // Backtrack to build line changes in order
        var tempChanges = new List<LineChange>();
        int x = n, y = m;

        while (x > 0 || y > 0)
        {
            if (x > 0 && y > 0 && oldLines[x - 1] == newLines[y - 1])
            {
                tempChanges.Add(new LineChange
                {
                    OldLineNumber = x,
                    NewLineNumber = y,
                    Type = LineChangeType.Unchanged,
                    Content = oldLines[x - 1]
                });
                x--;
                y--;
            }
            else if (y > 0 && (x == 0 || lcs[x, y - 1] >= lcs[x - 1, y]))
            {
                tempChanges.Add(new LineChange
                {
                    OldLineNumber = null,
                    NewLineNumber = y,
                    Type = LineChangeType.Added,
                    Content = newLines[y - 1]
                });
                y--;
            }
            else if (x > 0 && (y == 0 || lcs[x, y - 1] < lcs[x - 1, y]))
            {
                tempChanges.Add(new LineChange
                {
                    OldLineNumber = x,
                    NewLineNumber = null,
                    Type = LineChangeType.Deleted,
                    Content = oldLines[x - 1]
                });
                x--;
            }
        }

        tempChanges.Reverse();
        return tempChanges;
    }
}
