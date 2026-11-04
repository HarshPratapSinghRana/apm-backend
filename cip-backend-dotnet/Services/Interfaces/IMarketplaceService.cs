using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CipBackend.Services.Interfaces;

public class ArtifactDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    /// <summary>
    /// The identifier that should be passed to the `cip` CLI to install this package (e.g. owner/repo#ref)
    /// </summary>
    public string CipPackage { get; set; } = string.Empty;
    /// <summary>
    /// The artifact manifest or content
    /// </summary>
    public string Content { get; set; } = string.Empty;
    /// <summary>
    /// True if the artifact is private to the producer; false if public in the marketplace.
    /// </summary>
    public bool IsPrivate { get; set; } = false;
    /// <summary>
    /// Email of the producer who authored/owns the artifact.
    /// </summary>
    public string? ProducerEmail { get; set; }
    /// <summary>
    /// Whitelist of contributor emails permitted to submit changes to this private artifact.
    /// </summary>
    public string? AllowedContributors { get; set; }
    /// <summary>
    /// Whitelist of reviewer emails designated to review this private artifact.
    /// </summary>
    public string? AllowedReviewers { get; set; }
    /// <summary>
    /// Whitelist of consumer emails permitted to discover, view details, and install this private artifact.
    /// </summary>
    public string? AllowedConsumers { get; set; }
    /// <summary>
    /// True if the artifact has achieved verified certification status.
    /// </summary>
    public bool IsCertified { get; set; } = false;
    /// <summary>
    /// Current certification lifecycle status (NOT_CERTIFIED, ELIGIBLE, CERTIFIED, REVOKED).
    /// </summary>
    public string CertificationStatus { get; set; } = "NOT_CERTIFIED";
    /// <summary>
    /// Timestamp when this artifact was certified.
    /// </summary>
    public DateTime? CertifiedAt { get; set; }
    /// <summary>
    /// Version that was officially certified.
    /// </summary>
    public string? CertifiedVersion { get; set; }
}

public class ArtifactVersionDto
{
    public string Version { get; set; } = string.Empty;
    public string CipPackage { get; set; } = string.Empty;
    public bool IsLatest { get; set; } = false;
    public DateTime? PublishedAt { get; set; }
}

public interface IMarketplaceService
{
    Task<IEnumerable<ArtifactDto>> ListArtifactsAsync();
    Task<ArtifactDto?> GetArtifactAsync(string artifactId, string? version = null);
    Task<IEnumerable<ArtifactVersionDto>> GetArtifactVersionsAsync(string artifactId);
    Task PublishArtifactAsync(string artifactId, string content);
    Task<bool> UpdateVisibilityAsync(string artifactId, bool isPrivate, string userEmail, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null);
}
