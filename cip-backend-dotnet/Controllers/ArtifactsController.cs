using Microsoft.AspNetCore.Mvc;
using CipBackend.Services.Interfaces;
using CipBackend.Models;

namespace CipBackend.Controllers;

[ApiController]
[Route("api/artifacts")]
public class ArtifactsController : ControllerBase
{
    private readonly IReviewService _reviews;
    private readonly IUsageService _usage;
    private readonly INotificationService _notifications;
    private readonly IArtifactDiffService _diffService;
    private readonly ICertificationService? _certificationService;
    private readonly IUserRoleService? _userRoleService;

    public ArtifactsController(
        IReviewService reviews,
        IUsageService usage,
        INotificationService notifications,
        IArtifactDiffService diffService,
        ICertificationService? certificationService = null,
        IUserRoleService? userRoleService = null)
    {
        _reviews = reviews;
        _usage = usage;
        _notifications = notifications;
        _diffService = diffService;
        _certificationService = certificationService;
        _userRoleService = userRoleService;
    }

    private static bool HasUserAccess(string userEmail, string? producerEmail, string? allowedList)
    {
        if (string.IsNullOrWhiteSpace(userEmail)) return false;
        if (!string.IsNullOrEmpty(producerEmail) && producerEmail.Equals(userEmail, StringComparison.OrdinalIgnoreCase)) return true;
        if (string.IsNullOrWhiteSpace(allowedList)) return false;
        var entries = allowedList.Split(new[] { ',', ';', ' ', '\n', '\r', '\t' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return entries.Any(e => e.Equals(userEmail, StringComparison.OrdinalIgnoreCase));
    }

    private static bool CanUserView(string userEmail, ArtifactDto art)
    {
        if (!art.IsPrivate) return true;
        if (string.IsNullOrWhiteSpace(userEmail)) return false;

        bool hasWhitelists = !string.IsNullOrWhiteSpace(art.AllowedContributors) ||
                             !string.IsNullOrWhiteSpace(art.AllowedReviewers) ||
                             !string.IsNullOrWhiteSpace(art.AllowedConsumers);

        if (hasWhitelists)
        {
            if (HasUserAccess(userEmail, null, art.AllowedConsumers)) return true;
            if (HasUserAccess(userEmail, null, art.AllowedContributors)) return true;
            if (HasUserAccess(userEmail, null, art.AllowedReviewers)) return true;
            return false;
        }

        return HasUserAccess(userEmail, art.ProducerEmail, null);
    }

    private static bool CanUserDownload(string userEmail, ArtifactDto art)
    {
        if (!art.IsPrivate) return true;
        if (string.IsNullOrWhiteSpace(userEmail)) return false;

        bool hasWhitelists = !string.IsNullOrWhiteSpace(art.AllowedContributors) ||
                             !string.IsNullOrWhiteSpace(art.AllowedConsumers);

        if (hasWhitelists)
        {
            if (HasUserAccess(userEmail, null, art.AllowedConsumers)) return true;
            if (HasUserAccess(userEmail, null, art.AllowedContributors)) return true;
            return false;
        }

        return HasUserAccess(userEmail, art.ProducerEmail, null);
    }

    private static bool CanUserContribute(string userEmail, ArtifactDto? existingArt)
    {
        if (existingArt == null || !existingArt.IsPrivate) return true;
        if (string.IsNullOrWhiteSpace(userEmail)) return false;

        if (!string.IsNullOrWhiteSpace(existingArt.AllowedContributors))
        {
            return HasUserAccess(userEmail, null, existingArt.AllowedContributors);
        }

        return HasUserAccess(userEmail, existingArt.ProducerEmail, null);
    }

    [HttpGet]
    public async Task<IActionResult> ListArtifacts([FromQuery] string? type, [FromServices] IMarketplaceService marketplace)
    {
        if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();
        var email = User.Identity?.Name ?? string.Empty;
        var items = (await marketplace.ListArtifactsAsync()).ToList();

        // Filter out private artifacts not accessible to this user
        items = items.Where(a => CanUserView(email, a)).ToList();

        if (!string.IsNullOrEmpty(type))
        {
            items = items.Where(a => a.Type.Equals(type, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        var certsMap = _certificationService != null 
            ? await _certificationService.GetCertificationsMapAsync() 
            : new Dictionary<string, CertificationStatusDto>(StringComparer.OrdinalIgnoreCase);

        return Ok(items.Select(a => {
            var artKey = a.Name.ToLowerInvariant();
            var isCert = certsMap.TryGetValue(artKey, out var c) && c.IsCertified;
            return new { 
                a.Id, 
                a.Name, 
                a.Type, 
                a.Version, 
                a.Description, 
                cipPackage = a.CipPackage, 
                isPrivate = a.IsPrivate, 
                producerEmail = a.ProducerEmail,
                allowedContributors = a.AllowedContributors,
                allowedReviewers = a.AllowedReviewers,
                allowedConsumers = a.AllowedConsumers,
                isCertified = isCert,
                certificationStatus = isCert ? "CERTIFIED" : "NOT_CERTIFIED",
                certifiedAt = isCert && c != null ? c.CertifiedAt : null,
                certifiedVersion = isCert && c != null ? c.CertifiedVersion : null
            };
        }));
    }

    [HttpGet("{artifactId}")]
    public async Task<IActionResult> GetArtifact(string artifactId, [FromQuery] string? version, [FromServices] IMarketplaceService marketplace)
    {
        if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();
        var email = User.Identity?.Name ?? string.Empty;
        var art = await marketplace.GetArtifactAsync(artifactId, version);
        if (art == null) return NotFound(new { error = $"Artifact '{artifactId}' not found." });

        if (!CanUserView(email, art))
        {
            return StatusCode(403, new { error = $"Artifact '{artifactId}' is private and only accessible to authorized contributors, reviewers, or consumers." });
        }

        var certStatus = _certificationService != null
            ? await _certificationService.GetCertificationStatusAsync(artifactId)
            : new CertificationStatusDto { ArtifactId = artifactId, IsCertified = false, Status = "NOT_CERTIFIED" };

        return Ok(new { 
            art.Id, 
            art.Name, 
            art.Type, 
            art.Version, 
            art.Description, 
            cipPackage = art.CipPackage, 
            content = art.Content, 
            isPrivate = art.IsPrivate, 
            producerEmail = art.ProducerEmail,
            allowedContributors = art.AllowedContributors,
            allowedReviewers = art.AllowedReviewers,
            allowedConsumers = art.AllowedConsumers,
            isCertified = certStatus.IsCertified,
            certificationStatus = certStatus.Status,
            certifiedAt = certStatus.CertifiedAt,
            certifiedVersion = certStatus.CertifiedVersion,
            certificationReason = certStatus.Reason
        });
    }

    [HttpGet("{artifactId}/versions")]
    public async Task<IActionResult> GetArtifactVersions(string artifactId, [FromServices] IMarketplaceService marketplace)
    {
        if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();
        var versions = await marketplace.GetArtifactVersionsAsync(artifactId);
        if (!versions.Any())
        {
            return NotFound(new { error = $"Artifact '{artifactId}' not found." });
        }
        return Ok(versions);
    }

    [HttpPost("check-duplicate")]
    [HttpPost("{artifactId}/check-duplicate")]
    public async Task<IActionResult> CheckDuplicate(string? artifactId, [FromBody] Newtonsoft.Json.Linq.JToken? rawBody)
    {
        if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();
        string targetId = artifactId ?? string.Empty;
        string content = string.Empty;
        string? artifactType = null;

        if (rawBody is Newtonsoft.Json.Linq.JObject obj)
        {
            if (string.IsNullOrEmpty(targetId)) targetId = obj["name"]?.ToString() ?? obj["artifactId"]?.ToString() ?? string.Empty;
            artifactType = obj["type"]?.ToString() ?? obj["artifactType"]?.ToString();
            content = obj["content"]?.ToString() ?? obj.ToString(Newtonsoft.Json.Formatting.None);
        }
        else
        {
            content = rawBody?.ToString(Newtonsoft.Json.Formatting.None) ?? string.Empty;
        }

        if (string.IsNullOrWhiteSpace(targetId)) return BadRequest(new { error = "Artifact ID or name is required." });

        var result = await _diffService.CheckDuplicateAsync(targetId, content, artifactType);
        return Ok(result);
    }

    [HttpPost("{artifactId}/changes")]
    public async Task<IActionResult> SubmitChange(string artifactId, [FromBody] Newtonsoft.Json.Linq.JToken? rawBody, [FromServices] IMarketplaceService marketplace)
    {
        if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();
        var email = User.Identity?.Name ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        string content;
        string? artifactType = null;
        bool isPrivate = false;
        string? allowedContributors = null;
        string? allowedReviewers = null;
        string? allowedConsumers = null;

        if (rawBody is Newtonsoft.Json.Linq.JObject obj)
        {
            artifactType = obj["type"]?.ToString();
            if (obj["isPrivate"] != null)
            {
                isPrivate = (bool?)obj["isPrivate"] ?? false;
            }
            else if (obj["visibility"] != null)
            {
                isPrivate = obj["visibility"]!.ToString().Equals("private", StringComparison.OrdinalIgnoreCase);
            }

            allowedContributors = obj["allowedContributors"]?.ToString() ?? obj["contributors"]?.ToString();
            allowedReviewers = obj["allowedReviewers"]?.ToString() ?? obj["reviewers"]?.ToString();
            allowedConsumers = obj["allowedConsumers"]?.ToString() ?? obj["consumers"]?.ToString() ?? obj["installers"]?.ToString();

            if (obj["content"] != null)
            {
                content = obj["content"]!.ToString();
                try
                {
                    var innerObj = Newtonsoft.Json.Linq.JObject.Parse(content);
                    if (string.IsNullOrEmpty(artifactType)) artifactType = innerObj["type"]?.ToString();
                    if (obj["isPrivate"] == null && innerObj["isPrivate"] != null) isPrivate = (bool?)innerObj["isPrivate"] ?? false;
                    if (allowedContributors == null && innerObj["allowedContributors"] != null) allowedContributors = innerObj["allowedContributors"]?.ToString();
                    if (allowedReviewers == null && innerObj["allowedReviewers"] != null) allowedReviewers = innerObj["allowedReviewers"]?.ToString();
                    if (allowedConsumers == null && innerObj["allowedConsumers"] != null) allowedConsumers = innerObj["allowedConsumers"]?.ToString();
                }
                catch { }
            }
            else
            {
                content = obj.ToString(Newtonsoft.Json.Formatting.None);
            }
        }
        else
        {
            content = rawBody?.ToString(Newtonsoft.Json.Formatting.None) ?? string.Empty;
        }

        // Check if user has Contributor permissions (Consumer role cannot contribute without Contributor approval)
        if (_userRoleService != null)
        {
            var userRole = await _userRoleService.ResolveUserRoleAsync(email);
            if (string.Equals(userRole, "CONSUMER", StringComparison.OrdinalIgnoreCase))
            {
                var claimRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
                if (!string.Equals(claimRole, "PRODUCER", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(claimRole, "CONTRIBUTOR", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(claimRole, "REVIEWER", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(claimRole, "ADMIN", StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(403, new
                    {
                        error = "contributor_role_required",
                        detail = $"Access Denied: You currently have the 'Consumer' role. Contributing and publishing AI artifacts requires the 'Contributor' role. Please submit an access request through the extension or CLI (run 'engineering-commons access request --role contributor')."
                    });
                }
            }
        }

        // Check contribution permissions if this is an existing private artifact
        var existingArt = await marketplace.GetArtifactAsync(artifactId);
        if (existingArt != null && existingArt.IsPrivate && !CanUserContribute(email, existingArt))
        {
            return StatusCode(403, new { error = $"Access denied: Artifact '{artifactId}' is private and only the producer or whitelisted contributors can submit changes ({existingArt.AllowedContributors ?? existingArt.ProducerEmail})." });
        }

        var existingReview = _reviews.GetPendingReviews().FirstOrDefault(r => r.ArtifactId.Equals(artifactId, StringComparison.OrdinalIgnoreCase));
        if (existingReview != null && existingReview.IsPrivate)
        {
            if (!HasUserAccess(email, existingReview.ProducerEmail, existingReview.AllowedContributors))
            {
                return StatusCode(403, new { error = $"Access denied: Artifact '{artifactId}' is private and only the producer or whitelisted contributors can submit changes ({existingReview.AllowedContributors ?? existingReview.ProducerEmail})." });
            }
        }

        // 1. Server-side Duplicate / Unchanged Content Check BEFORE review creation
        var dupCheck = await _diffService.CheckDuplicateAsync(artifactId, content, artifactType);
        if (dupCheck.IsDuplicate && dupCheck.IsUnchanged)
        {
            // Early Exit: Do NOT create review, do NOT notify reviewer
            await _usage.RecordUsageAsync(new UsageEvent
            {
                UserId = email,
                Action = "SUBMISSION_DUPLICATE_DETECTED",
                ArtifactName = artifactId,
                ArtifactType = dupCheck.ArtifactType ?? artifactType,
                ArtifactVersion = dupCheck.MatchedVersion,
                Source = "backend",
                Timestamp = DateTime.UtcNow
            });

            return Ok(new
            {
                isDuplicate = true,
                isUnchanged = true,
                status = "DuplicateUnchanged",
                matchedArtifactId = dupCheck.MatchedArtifactId,
                matchedArtifactName = dupCheck.MatchedArtifactName,
                matchedVersion = dupCheck.MatchedVersion,
                submittedVersion = dupCheck.SubmittedVersion,
                artifactType = dupCheck.ArtifactType ?? artifactType,
                filesCompared = dupCheck.FilesCompared,
                filesUnchanged = dupCheck.FilesUnchanged,
                filesAdded = dupCheck.FilesAdded,
                filesModified = dupCheck.FilesModified,
                filesDeleted = dupCheck.FilesDeleted,
                filesChanged = dupCheck.FilesChanged,
                message = dupCheck.Message,
                isPrivate = isPrivate,
                allowedContributors = allowedContributors,
                allowedReviewers = allowedReviewers,
                allowedConsumers = allowedConsumers
            });
        }

        // 2. Changes detected or new artifact: Proceed with review submission
        var review = _reviews.SubmitChange(artifactId, email, content, isPrivate, allowedContributors, allowedReviewers, allowedConsumers);

        // Automatically log contribution to SQLite
        await _usage.RecordUsageAsync(new UsageEvent
        {
            UserId = email,
            Action = isPrivate ? "CONTRIBUTE_PRIVATE" : "CONTRIBUTE",
            ArtifactName = artifactId,
            ArtifactType = dupCheck.ArtifactType ?? artifactType,
            ArtifactVersion = dupCheck.SubmittedVersion,
            Source = "backend",
            Timestamp = DateTime.UtcNow
        });

        return Ok(new
        {
            isDuplicate = false,
            isUnchanged = false,
            reviewId = review.Id,
            status = review.Status.ToString(),
            submittedVersion = dupCheck.SubmittedVersion,
            matchedVersion = dupCheck.MatchedVersion,
            artifactType = dupCheck.ArtifactType ?? artifactType,
            filesCompared = dupCheck.FilesCompared,
            filesUnchanged = dupCheck.FilesUnchanged,
            filesAdded = dupCheck.FilesAdded,
            filesModified = dupCheck.FilesModified,
            filesDeleted = dupCheck.FilesDeleted,
            filesChanged = dupCheck.FilesChanged,
            message = dupCheck.Message,
            isPrivate = review.IsPrivate,
            allowedContributors = review.AllowedContributors,
            allowedReviewers = review.AllowedReviewers,
            allowedConsumers = review.AllowedConsumers
        });
    }

    /// <summary>
    /// Update artifact visibility (Public vs Private) and RBAC whitelists
    /// </summary>
    [HttpPut("{artifactId}/visibility")]
    [HttpPost("{artifactId}/visibility")]
    public async Task<IActionResult> UpdateVisibility(string artifactId, [FromBody] Newtonsoft.Json.Linq.JObject? body, [FromServices] IMarketplaceService marketplace)
    {
        if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();
        var email = User.Identity?.Name ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        bool isPrivate = false;
        string? allowedContributors = null;
        string? allowedReviewers = null;
        string? allowedConsumers = null;

        if (body != null)
        {
            if (body["isPrivate"] != null)
            {
                isPrivate = (bool?)body["isPrivate"] ?? false;
            }
            else if (body["visibility"] != null)
            {
                isPrivate = body["visibility"]!.ToString().Equals("private", StringComparison.OrdinalIgnoreCase);
            }

            allowedContributors = body["allowedContributors"]?.ToString() ?? body["contributors"]?.ToString();
            allowedReviewers = body["allowedReviewers"]?.ToString() ?? body["reviewers"]?.ToString();
            allowedConsumers = body["allowedConsumers"]?.ToString() ?? body["consumers"]?.ToString() ?? body["installers"]?.ToString();
        }

        var existing = await marketplace.GetArtifactAsync(artifactId);
        if (existing == null)
        {
            return NotFound(new { error = $"Artifact '{artifactId}' not found." });
        }

        if (!string.IsNullOrEmpty(existing.ProducerEmail) && !existing.ProducerEmail.Equals(email, StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { error = $"Access denied: Only the original producer/owner ({existing.ProducerEmail}) can change the visibility of this artifact." });
        }

        try
        {
            var updated = await marketplace.UpdateVisibilityAsync(artifactId, isPrivate, email, allowedContributors, allowedReviewers, allowedConsumers);
            if (!updated)
            {
                return NotFound(new { error = $"Artifact '{artifactId}' not found or could not be updated." });
            }

            await _usage.RecordUsageAsync(new UsageEvent
            {
                UserId = email,
                Action = isPrivate ? "VISIBILITY_SET_PRIVATE" : "VISIBILITY_SET_PUBLIC",
                ArtifactName = artifactId,
                Source = "backend",
                Timestamp = DateTime.UtcNow
            });

            return Ok(new
            {
                success = true,
                artifactId = artifactId,
                isPrivate = isPrivate,
                visibility = isPrivate ? "private" : "public",
                allowedContributors = allowedContributors,
                allowedReviewers = allowedReviewers,
                allowedConsumers = allowedConsumers,
                message = isPrivate 
                    ? $"Artifact '{artifactId}' is now PRIVATE with restricted team access."
                    : $"Artifact '{artifactId}' is now PUBLIC and available to all team members in the marketplace."
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Download artifact content using the server-side GitHub PAT.
    /// The consumer CLI calls this instead of `cip install`, so no GitHub login is needed.
    /// Returns the full artifact JSON (including files array with path/content).
    /// </summary>
    [HttpGet("{artifactId}/download")]
    public async Task<IActionResult> DownloadArtifact(string artifactId, [FromQuery] string? version, [FromServices] IMarketplaceService marketplace)
    {
        if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();
        var email = User.Identity?.Name ?? "authenticated-consumer";
        var art = await marketplace.GetArtifactAsync(artifactId, version);
        if (art == null)
        {
            if (!string.IsNullOrWhiteSpace(version))
            {
                var available = (await marketplace.GetArtifactVersionsAsync(artifactId)).Select(v => v.Version).ToList();
                return NotFound(new
                {
                    error = $"Artifact '{artifactId}' version '{version}' was not found.",
                    availableVersions = available
                });
            }
            return NotFound(new { error = $"Artifact '{artifactId}' not found." });
        }

        if (!CanUserDownload(email, art))
        {
            return StatusCode(403, new { error = $"Artifact '{artifactId}' is private and cannot be downloaded by your account ({email})." });
        }

        // Automatically log install/download event to SQLite
        await _usage.RecordUsageAsync(new UsageEvent
        {
            UserId = email,
            Action = "INSTALL",
            ArtifactName = art.Name,
            ArtifactType = art.Type,
            ArtifactVersion = art.Version,
            Source = "backend",
            Timestamp = DateTime.UtcNow
        });

        return Ok(new { 
            art.Id, 
            art.Name, 
            art.Type, 
            art.Version, 
            art.Description, 
            cipPackage = art.CipPackage, 
            content = art.Content, 
            isPrivate = art.IsPrivate, 
            producerEmail = art.ProducerEmail,
            allowedContributors = art.AllowedContributors,
            allowedReviewers = art.AllowedReviewers,
            allowedConsumers = art.AllowedConsumers
        });
    }

    [HttpGet("my/changes")]
    public IActionResult MyChanges()
    {
        if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();
        var email = User.Identity?.Name ?? string.Empty;
        var list = _reviews.GetByProducer(email).Select(r => new { 
            r.Id, 
            r.ArtifactId, 
            status = r.Status.ToString(), 
            r.SubmittedAt,
            r.Feedback,
            r.ReviewerEmail,
            r.DecisionAt,
            isPrivate = r.IsPrivate,
            allowedContributors = r.AllowedContributors,
            allowedReviewers = r.AllowedReviewers,
            allowedConsumers = r.AllowedConsumers
        });
        return Ok(list);
    }
}
