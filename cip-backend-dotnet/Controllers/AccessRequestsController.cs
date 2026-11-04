using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using CipBackend.Models;
using CipBackend.Services.Interfaces;
using CipBackend.Services.Implementations;

namespace CipBackend.Controllers;

[ApiController]
public class AccessRequestsController : ControllerBase
{
    private readonly IUserRoleService _userRoleService;

    public AccessRequestsController(IUserRoleService userRoleService)
    {
        _userRoleService = userRoleService;
    }

    [HttpPost("api/access-requests")]
    public async Task<IActionResult> RequestAccess([FromBody] CreateAccessRequestDto dto)
    {
        if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();
        var email = User.Identity?.Name;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var requestedRole = !string.IsNullOrWhiteSpace(dto?.RequestedRole)
            ? dto.RequestedRole.Trim().ToUpperInvariant()
            : "CONTRIBUTOR";

        if (requestedRole != "CONTRIBUTOR" && requestedRole != "PRODUCER" && requestedRole != "REVIEWER" && requestedRole != "CERTIFIED_REVIEWER")
        {
            return BadRequest(new { error = "invalid_role", detail = "Requested role must be 'CONTRIBUTOR', 'PRODUCER', 'REVIEWER', or 'CERTIFIED_REVIEWER'." });
        }

        var request = await _userRoleService.SubmitAccessRequestAsync(email, requestedRole, dto?.Reason);
        return Ok(new
        {
            message = $"Access request for {requestedRole} submitted successfully. An alert has been dispatched to admin harsh.rana@maqsoftware.com.",
            request
        });
    }

    [HttpGet("api/access-requests/my")]
    public async Task<IActionResult> GetMyRequests()
    {
        if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();
        var email = User.Identity?.Name;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var currentRole = await _userRoleService.ResolveUserRoleAsync(email);
        var isCertified = await _userRoleService.IsCertifiedReviewerAsync(email);
        var requests = await _userRoleService.GetUserRequestsAsync(email);

        return Ok(new
        {
            email,
            currentRole,
            isCertifiedReviewer = isCertified,
            requests
        });
    }

    [HttpGet("api/admin/access-requests")]
    public async Task<IActionResult> GetAdminAccessRequests([FromQuery] string? status = null)
    {
        if (!await IsAdminUserAsync())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                error = "access_denied",
                detail = "Only system administrator harsh.rana@maqsoftware.com can view and manage access requests."
            });
        }

        var requests = await _userRoleService.GetAccessRequestsAsync(status);
        return Ok(requests);
    }

    [HttpPost("api/admin/access-requests/{id}/approve")]
    public async Task<IActionResult> ApproveAccessRequest(string id, [FromBody] ReviewAccessRequestDecisionDto? dto)
    {
        if (!await IsAdminUserAsync())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                error = "access_denied",
                detail = "Only system administrator harsh.rana@maqsoftware.com can approve access requests."
            });
        }

        var adminEmail = User.Identity?.Name ?? SqliteUserRoleService.DefaultSuperAdmin;
        var approved = await _userRoleService.ApproveRequestAsync(id, adminEmail, dto?.Notes);
        if (approved == null)
        {
            return NotFound(new { error = "not_found", detail = $"Access request '{id}' not found." });
        }

        return Ok(new
        {
            message = $"Access request '{id}' approved. User {approved.UserEmail} has been granted {approved.RequestedRole} role.",
            request = approved
        });
    }

    [HttpPost("api/admin/access-requests/{id}/reject")]
    public async Task<IActionResult> RejectAccessRequest(string id, [FromBody] ReviewAccessRequestDecisionDto? dto)
    {
        if (!await IsAdminUserAsync())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                error = "access_denied",
                detail = "Only system administrator harsh.rana@maqsoftware.com can reject access requests."
            });
        }

        var adminEmail = User.Identity?.Name ?? SqliteUserRoleService.DefaultSuperAdmin;
        var rejected = await _userRoleService.RejectRequestAsync(id, adminEmail, dto?.Notes);
        if (rejected == null)
        {
            return NotFound(new { error = "not_found", detail = $"Access request '{id}' not found." });
        }

        return Ok(new
        {
            message = $"Access request '{id}' rejected.",
            request = rejected
        });
    }

    [HttpPost("api/admin/roles/revoke")]
    public async Task<IActionResult> RevokeAccess([FromBody] RevokeAccessRequestDto dto)
    {
        if (!await IsAdminUserAsync())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                error = "access_denied",
                detail = "Only system administrator harsh.rana@maqsoftware.com can revoke reviewer access."
            });
        }

        var targetEmail = dto?.EffectiveTargetEmail;
        if (string.IsNullOrWhiteSpace(targetEmail))
        {
            return BadRequest(new { error = "missing_email", detail = "Target email is required to revoke access." });
        }

        var adminEmail = User.Identity?.Name ?? SqliteUserRoleService.DefaultSuperAdmin;
        var assignment = await _userRoleService.RevokeAccessAsync(targetEmail, adminEmail, dto?.Notes);

        return Ok(new
        {
            message = $"Reviewer access revoked for {targetEmail}. Active role reset to CONSUMER.",
            assignment
        });
    }

    [HttpPost("api/admin/roles/certify-reviewer")]
    public async Task<IActionResult> CertifyReviewer([FromBody] CertifyReviewerRequestDto dto)
    {
        if (!await IsAdminUserAsync())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                error = "access_denied",
                detail = "Only system administrator harsh.rana@maqsoftware.com can grant Certified Reviewer status."
            });
        }

        var targetEmail = dto?.EffectiveTargetEmail;
        if (string.IsNullOrWhiteSpace(targetEmail))
        {
            return BadRequest(new { error = "missing_email", detail = "Target email is required to certify reviewer." });
        }

        var adminEmail = User.Identity?.Name ?? SqliteUserRoleService.DefaultSuperAdmin;
        var assignment = await _userRoleService.CertifyReviewerAsync(targetEmail, adminEmail, dto?.Notes);

        return Ok(new
        {
            message = $"User {targetEmail} is now a Certified Reviewer.",
            assignment
        });
    }

    [HttpPost("api/admin/roles/sync-ado")]
    public async Task<IActionResult> SyncToAdo()
    {
        if (!await IsAdminUserAsync())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                error = "access_denied",
                detail = "Only system administrator harsh.rana@maqsoftware.com can trigger governance ADO sync."
            });
        }

        var success = await _userRoleService.SyncToAzureDevOpsAsync();
        return Ok(new
        {
            success,
            message = success 
                ? "✓ User roles and access requests synchronized to Azure DevOps repository (governance/user-roles.json)." 
                : "ADO sync completed (check backend logs or configure AzureDevOps:Token PAT)."
        });
    }

    [HttpGet("api/roles")]
    [HttpGet("api/admin/roles")]
    public async Task<IActionResult> GetAllRoles()
    {
        var roles = await _userRoleService.GetAllRolesAsync();
        return Ok(roles);
    }

    private async Task<bool> IsAdminUserAsync()
    {
        if (!User.Identity?.IsAuthenticated ?? true) return false;
        var email = User.Identity?.Name ?? string.Empty;
        var role = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;

        if (role == "ADMIN") return true;
        return await _userRoleService.IsAdminAsync(email);
    }
}
