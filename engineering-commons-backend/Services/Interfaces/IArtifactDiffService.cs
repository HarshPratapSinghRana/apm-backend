using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using EngineeringCommons.Backend.Models;

namespace EngineeringCommons.Backend.Services.Interfaces;

public interface IArtifactDiffService
{
    Task<ArtifactDiff> GenerateDiffAsync(
        string artifactId,
        string submittedContentJson,
        string? reviewId = null,
        string? producerEmail = null,
        DateTime? submittedAt = null);

    List<LineChange> GenerateUnifiedDiff(string? oldContent, string? newContent);
    ArtifactChangeType GetArtifactChangeType(ArtifactDto? oldArtifact, string submittedContentJson, int filesChangedCount);
    Task<DuplicateCheckResult> CheckDuplicateAsync(string artifactId, string submittedContentJson, string? artifactType = null);
}
