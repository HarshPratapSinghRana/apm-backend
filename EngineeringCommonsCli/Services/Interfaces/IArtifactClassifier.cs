using EngineeringCommonsCli.Models;

namespace EngineeringCommonsCli.Services.Interfaces;

public interface IArtifactClassifier
{
    ClassificationResult Classify(string fullPath, string? content = null, bool isDirectory = false, string? relativePath = null);
    ClassificationResult ClassifyMultiFile(string rootPackageName, IEnumerable<(string Path, string? Content)> files, string? manifestCipYmlContent = null);
}
