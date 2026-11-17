using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Controllers;

public class CertifyRequestPayload
{
    public string? Version { get; set; }
    public string? Reason { get; set; }
}

public class RevokeRequestPayload
{
    public string Reason { get; set; } = string.Empty;
}

[ApiController]
[Route("api/certifications")]
public class CertificationsController : ControllerBase
{
    private readonly ICertificationService _certificationService;
    private readonly IEmailNotificationService _emailService;

    public CertificationsController(
        ICertificationService certificationService,
        IEmailNotificationService emailService)
    {
        _certificationService = certificationService;
        _emailService = emailService;
    }

    private string GetUserEmail() => User.Identity?.Name ?? string.Empty;

    private string GetUserRole()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (!string.IsNullOrEmpty(role)) return role.ToUpperInvariant();
        var email = GetUserEmail().ToLowerInvariant();
        if (email == "harsh.rana@maqsoftware.com" || email == "admin@company.com" || email == "admin@test.com" ||
            email == "reviewer@company.com" || email == "reviewer@test.com" || 
            (email.StartsWith("designated-rev@") && (email.EndsWith("@company.com") || email.EndsWith("@test.com") || email.EndsWith("@maqsoftware.com")))) return "REVIEWER";
        if ((email.StartsWith("producer@") || email.StartsWith("contrib@")) && (email.EndsWith("@company.com") || email.EndsWith("@test.com") || email.EndsWith("@maqsoftware.com"))) return "PRODUCER";
        return "CONSUMER";
    }

    [HttpGet]
    public async Task<IActionResult> GetAllCertifications()
    {
        if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();
        var map = await _certificationService.GetCertificationsMapAsync();
        return Ok(map);
    }

    [HttpGet("{artifactId}")]
    public async Task<IActionResult> GetCertificationStatus(string artifactId)
    {
        if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();
        var status = await _certificationService.GetCertificationStatusAsync(artifactId);
        return Ok(status);
    }

    [HttpGet("evaluate/{artifactId}")]
    public async Task<IActionResult> EvaluateCertification(string artifactId)
    {
        if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();
        var evaluation = await _certificationService.EvaluateCertificationAsync(artifactId);
        
        var role = GetUserRole();
        // Normal consumers only get high-level evaluation; internal metrics are accessible to reviewers & producers
        if (role == "CONSUMER")
        {
            return Ok(new
            {
                evaluation.ArtifactId,
                evaluation.Eligible,
                evaluation.Status,
                evaluation.CurrentVersion,
                evaluation.Reason,
                evaluation.EvaluatedAt
            });
        }

        return Ok(evaluation);
    }

    [HttpPost("request/{artifactId}")]
    public async Task<IActionResult> RequestCertification(string artifactId)
    {
        if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();
        var email = GetUserEmail();
        var role = GetUserRole();

        if (role == "CONSUMER")
        {
            return StatusCode(403, new { error = "Access Denied: Consumers cannot request certification. Only artifact producers and reviewers can request certification." });
        }

        var result = await _certificationService.RequestCertificationAsync(artifactId, email);
        return Ok(result);
    }

    [HttpPost("certify/{artifactId}")]
    public async Task<IActionResult> CertifyArtifact(string artifactId, [FromBody] CertifyRequestPayload? payload)
    {
        if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();
        var email = GetUserEmail();
        var role = GetUserRole();

        if (role != "REVIEWER" && role != "ADMIN" && role != "CERTIFIED_REVIEWER")
        {
            return StatusCode(403, new { error = "Access Denied: Only users with the Reviewer, Certified Reviewer, or Admin role have permission to certify artifacts (artifact.certify)." });
        }

        var result = await _certificationService.CertifyArtifactAsync(artifactId, email, payload?.Version, payload?.Reason);

        // Email notification (COMMENTED OUT FOR NOW)
        /*
        _ = Task.Run(async () =>
        {
            try
            {
                var targetEmail = !string.IsNullOrWhiteSpace(email) ? email : "harsh.rana@maqsoftware.com";
                await _emailService.SendArtifactCertifiedNotificationAsync(artifactId, result.CertifiedVersion ?? "1.0.0", targetEmail, email, "Verified Reviewer Badge");
            }
            catch { }
        });
        */

        return Ok(result);
    }

    [HttpPost("revoke/{artifactId}")]
    public async Task<IActionResult> RevokeCertification(string artifactId, [FromBody] RevokeRequestPayload payload)
    {
        if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();
        var email = GetUserEmail();
        var role = GetUserRole();

        if (role != "REVIEWER" && role != "ADMIN" && role != "CERTIFIED_REVIEWER")
        {
            return StatusCode(403, new { error = "Access Denied: Only users with the Reviewer, Certified Reviewer, or Admin role have permission to revoke certification (artifact.revoke_certification)." });
        }

        if (string.IsNullOrWhiteSpace(payload?.Reason))
        {
            return BadRequest(new { error = "A valid reason must be provided when revoking artifact certification." });
        }

        var result = await _certificationService.RevokeCertificationAsync(artifactId, email, payload.Reason);

        // Email notification (COMMENTED OUT FOR NOW)
        /*
        _ = Task.Run(async () =>
        {
            try
            {
                var targetEmail = !string.IsNullOrWhiteSpace(email) ? email : "harsh.rana@maqsoftware.com";
                await _emailService.SendArtifactCertificationRejectedNotificationAsync(artifactId, targetEmail, payload.Reason, email);
            }
            catch { }
        });
        */

        return Ok(result);
    }
}
