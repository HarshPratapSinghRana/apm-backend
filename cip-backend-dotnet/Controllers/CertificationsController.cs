using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Controllers;

[ApiController]
[Authorize]
[Route("api/certifications")]
public class CertificationsController : ControllerBase
{
    private readonly ICertificationService _certificationService;
    private readonly IEmailNotificationService _emailService;

    public CertificationsController(
        ICertificationService certificationService,
        IEmailNotificationService emailService)
    {
        _certificationService = certificationService ?? throw new ArgumentNullException(nameof(certificationService));
        _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
    }

    private string GetUserEmail() => User.Identity?.Name ?? string.Empty;

    private string GetUserRole()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (!string.IsNullOrEmpty(role)) return role.ToUpperInvariant();
        var email = GetUserEmail().ToLowerInvariant();
        if (email.Contains("admin") || email.Contains("reviewer") || 
            (email.StartsWith("designated-rev@") && (email.EndsWith("@company.com") || email.EndsWith("@test.com") || email.EndsWith("@maqsoftware.com")))) 
            return UserRoles.Reviewer;
        if ((email.StartsWith("producer@") || email.StartsWith("contrib@")) && (email.EndsWith("@company.com") || email.EndsWith("@test.com") || email.EndsWith("@maqsoftware.com"))) 
            return UserRoles.Producer;
        return UserRoles.Consumer;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllCertifications()
    {
        var map = await _certificationService.GetCertificationsMapAsync();
        return Ok(map);
    }

    [HttpGet("{artifactId}")]
    public async Task<IActionResult> GetCertificationStatus(string artifactId)
    {
        var status = await _certificationService.GetCertificationStatusAsync(artifactId);
        return Ok(status);
    }

    [HttpGet("evaluate/{artifactId}")]
    public async Task<IActionResult> EvaluateCertification(string artifactId)
    {
        var evaluation = await _certificationService.EvaluateCertificationAsync(artifactId);
        
        var role = GetUserRole();
        if (role == UserRoles.Consumer)
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
        var email = GetUserEmail();
        var role = GetUserRole();

        if (role == UserRoles.Consumer)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new 
            { 
                error = "Access Denied: Consumers cannot request certification. Only artifact producers and reviewers can request certification." 
            });
        }

        var result = await _certificationService.RequestCertificationAsync(artifactId, email);
        return Ok(result);
    }

    [HttpPost("certify/{artifactId}")]
    public async Task<IActionResult> CertifyArtifact(string artifactId, [FromBody] CertifyRequestPayload? payload)
    {
        var email = GetUserEmail();
        var role = GetUserRole();

        if (role != UserRoles.Reviewer && role != UserRoles.Admin && role != UserRoles.CertifiedReviewer)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new 
            { 
                error = "Access Denied: Only users with the Reviewer, Certified Reviewer, or Admin role have permission to certify artifacts (artifact.certify)." 
            });
        }

        var result = await _certificationService.CertifyArtifactAsync(artifactId, email, payload?.Version, payload?.Reason);

        // TODO: Task #4821 - Wire Microsoft Graph API background email notification upon artifact certification approval

        return Ok(result);
    }

    [HttpPost("revoke/{artifactId}")]
    public async Task<IActionResult> RevokeCertification(string artifactId, [FromBody] RevokeRequestPayload payload)
    {
        var email = GetUserEmail();
        var role = GetUserRole();

        if (role != UserRoles.Reviewer && role != UserRoles.Admin && role != UserRoles.CertifiedReviewer)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new 
            { 
                error = "Access Denied: Only users with the Reviewer, Certified Reviewer, or Admin role have permission to revoke certification (artifact.revoke_certification)." 
            });
        }

        if (string.IsNullOrWhiteSpace(payload?.Reason))
        {
            return BadRequest(new { error = "A valid reason must be provided when revoking artifact certification." });
        }

        var result = await _certificationService.RevokeCertificationAsync(artifactId, email, payload.Reason);

        // TODO: Task #4822 - Wire Microsoft Graph API background email notification upon artifact certification revocation

        return Ok(result);
    }
}
