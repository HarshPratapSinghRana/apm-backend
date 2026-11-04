using System;
using System.Collections.Generic;

namespace EngineeringCommonsCli.Models;

public enum ArtifactType
{
    Agent,
    Skill,
    Command,
    Prompt,
    Plugin,
    McpServer,
    CipPackage,
    CipConfiguration,
    NormalFile,
    Unknown
}

public enum DetectionConfidence
{
    High,
    Medium,
    Low
}

public record ClassificationResult(
    ArtifactType Type,
    DetectionConfidence Confidence,
    string Reason,
    string? ExtractedName = null,
    string? ExtractedVersion = null,
    string? ExtractedDescription = null
);

public record DiscoveredArtifact(
    string Name,
    ArtifactType Type,
    string Version,
    string RootPath,
    IEnumerable<string> Files,
    string? ParentPackage = null,
    DetectionConfidence Confidence = DetectionConfidence.Medium,
    string Reason = "",
    bool IsContributableArtifact = true
)
{
    // Convenience backward-compatible constructor for string type
    public DiscoveredArtifact(string name, string typeString, IEnumerable<string> files)
        : this(
            name,
            Enum.TryParse<ArtifactType>(typeString, true, out var parsedType) ? parsedType : ArtifactType.Unknown,
            "1.0.0",
            name,
            files,
            null,
            DetectionConfidence.Medium,
            $"Legacy classification: {typeString}",
            !typeString.Equals("NormalFile", StringComparison.OrdinalIgnoreCase) && !typeString.Equals("CipConfiguration", StringComparison.OrdinalIgnoreCase)
        )
    {
    }
}
