using EngineeringCommonsCli.Models;

namespace EngineeringCommonsCli.Services.Interfaces;

public record ArtifactMetadata(
    string Name,
    string Version,
    string? Description = null,
    string? Author = null,
    string? CipPackage = null
);

public interface IArtifactMetadataService
{
    ArtifactMetadata ExtractMetadata(string fullPath, ArtifactType type, string? content = null, bool isDirectory = false);
}
