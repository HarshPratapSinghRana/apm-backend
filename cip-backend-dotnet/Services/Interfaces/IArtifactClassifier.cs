using System;
using System.Collections.Generic;

namespace EngineeringCommons.Backend.Services.Interfaces;

public enum ArtifactType
{
    Agent,
    Skill,
    Plugin,
    McpServer,
    CipPackage,
    Prompt,
    Command,
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
    string? DetectedName = null,
    string? DetectedVersion = null,
    string? DetectedDescription = null
);

public interface IArtifactClassifier
{
    ClassificationResult Classify(string fullPathOrName, string? content = null, bool isDirectory = false, string? relativePath = null);
    ClassificationResult ClassifyMultiFile(string rootPackageName, IEnumerable<(string Path, string? Content)> files, string? manifestCipYmlContent = null);
}
