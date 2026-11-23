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
        var role = User.FindFirst(ClaimTypes.Role)?.Value 
            ?? User.FindFirst("roles")?.Value 
            ?? User.FindFirst("http://schemas.microsoft.com/ws/2008/06/identity/claims/role")?.Value;

        if (!string.IsNullOrEmpty(role)) return role.ToUpperInvariant();
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

    [HttpGet("{artifactId}/evaluate")]
    [HttpGet("evaluate/{artifactId}")]
    public async Task<IActionResult> EvaluateCertification(string artifactId)
    {
        var evaluation = await _certificationService.EvaluateCertificationAsync(artifactId);
        
        var userRole = UserRoleExtensions.ToUserRole(GetUserRole());
        if (userRole == UserRole.Consumer)
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

    [HttpPost("{artifactId}/request")]
    [HttpPost("request-certification/{artifactId}")]
    public async Task<IActionResult> RequestCertification(string artifactId)
    {
        var email = GetUserEmail();
        var userRole = UserRoleExtensions.ToUserRole(GetUserRole());

        if (userRole == UserRole.Consumer)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new 
            { 
                error = "Access Denied: Consumers cannot request certification. Only artifact producers and reviewers can request certification." 
            });
        }

        var result = await _certificationService.RequestCertificationAsync(artifactId, email);
        return Ok(result);
    }

    [Authorize(Policy = "RequireReviewer")]
    [HttpPost("{artifactId}/certify")]
    [HttpPost("certify-artifact/{artifactId}")]
    public async Task<IActionResult> CertifyArtifact(string artifactId, [FromBody] CertifyRequestPayload? payload)
    {
        var email = GetUserEmail();
        var result = await _certificationService.CertifyArtifactAsync(artifactId, email, payload?.Version, payload?.Reason);

        // Dispatches Microsoft Graph background email notification upon artifact certification approval
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailService.SendArtifactCertifiedNotificationAsync(artifactId, payload?.Version ?? "1.0.0", email, email, result?.Status);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CertificationsController] Notification dispatch error: {ex.Message}");
            }
        });

        return Ok(result);
    }

    [Authorize(Policy = "RequireReviewer")]
    [HttpPost("{artifactId}/revoke")]
    [HttpPost("revoke-certification/{artifactId}")]
    public async Task<IActionResult> RevokeCertification(string artifactId, [FromBody] RevokeRequestPayload payload)
    {
        var email = GetUserEmail();

        if (string.IsNullOrWhiteSpace(payload?.Reason))
        {
            return BadRequest(new { error = "A valid reason must be provided when revoking artifact certification." });
        }

        var result = await _certificationService.RevokeCertificationAsync(artifactId, email, payload.Reason);

        // Dispatches Microsoft Graph background email notification upon artifact certification revocation
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailService.SendArtifactCertificationRejectedNotificationAsync(artifactId, email, payload.Reason, email);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CertificationsController] Notification dispatch error: {ex.Message}");
            }
        });

        return Ok(result);
    }
}
