using System;
using System.Collections.Generic;
using EngineeringCommonsCli.Models;

namespace EngineeringCommonsCli.Services.Interfaces;

public class InstalledArtifactManifest
{
    public string ArtifactName { get; set; } = string.Empty;
    public string ArtifactType { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0.0";
    public DateTime InstalledAt { get; set; } = DateTime.UtcNow;
    public List<string> PlacedFiles { get; set; } = new();
}

public interface IArtifactPlacementService
{
    /// <summary>
    /// Determine the base placement folder for an artifact type.
    /// </summary>
    string DeterminePlacement(string artifactType, string artifactName);

    /// <summary>
    /// Resolves the absolute destination file path for a file belonging to an artifact in the workspace.
    /// Preserves relative directory structure, validates against path traversal, and normalizes paths.
    /// </summary>
    string ResolveDestinationPath(string workspaceRoot, string artifactType, string artifactName, string relativeFilePath, bool isMultiFile = false);

    /// <summary>
    /// Places all files of an artifact into their resolved locations in the workspace,
    /// creating all required directories, handling overwrites, cleaning obsolete files from previous versions,
    /// writing an installation manifest, and returning the placed file paths.
    /// </summary>
    IEnumerable<string> PlaceArtifact(string workspaceRoot, string artifactType, string artifactName, IEnumerable<ArtifactFileEntry> files, string? version = null);

    /// <summary>
    /// Places a single-file fallback artifact content when no file array is present.
    /// </summary>
    string PlaceSingleFileContent(string workspaceRoot, string artifactType, string artifactName, string content, string? version = null);

    /// <summary>
    /// Gets the installed manifest for an artifact if it was previously installed.
    /// </summary>
    InstalledArtifactManifest? GetInstalledManifest(string workspaceRoot, string artifactName);

    /// <summary>
    /// Removes obsolete files that belonged to a previous installation of the artifact but are no longer present,
    /// ensuring unrelated user files are NEVER deleted.
    /// </summary>
    IEnumerable<string> CleanObsoleteArtifactFiles(string workspaceRoot, string artifactName, IEnumerable<string> newPlacedRelativePaths);
}
