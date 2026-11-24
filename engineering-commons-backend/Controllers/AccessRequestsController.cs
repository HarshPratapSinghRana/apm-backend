using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Interfaces;
using EngineeringCommons.Backend.Services.Implementations;

namespace EngineeringCommons.Backend.Controllers;

[ApiController]
[Authorize]
public class AccessRequestsController : ControllerBase
{
    private readonly IUserRoleService _userRoleService;

    public AccessRequestsController(IUserRoleService userRoleService)
    {
        _userRoleService = userRoleService ?? throw new ArgumentNullException(nameof(userRoleService));
    }

    [HttpPost("api/access-requests")]
    public async Task<IActionResult> SubmitAccessRequestAsync([FromBody] CreateAccessRequestDto? dto)
    {
        if (dto == null)
        {
            return BadRequest(new { error = "missing_payload", detail = "Request body cannot be null." });
        }

        var email = User.FindFirst(ClaimTypes.Email)?.Value 
            ?? User.FindFirst("email")?.Value 
            ?? User.FindFirst("preferred_username")?.Value 
            ?? User.Identity?.Name;

        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var requestedRole = !string.IsNullOrWhiteSpace(dto.RequestedRole)
            ? dto.RequestedRole.Trim().ToUpperInvariant()
            : UserRoles.Contributor;

        if (!UserRoles.IsValidRequestableRole(requestedRole))
        {
            return BadRequest(new 
            { 
                error = "invalid_role", 
                detail = $"Requested role must be one of: {string.Join(", ", UserRoles.RequestableRoles)}." 
            });
        }

        var request = await _userRoleService.SubmitAccessRequestAsync(email, requestedRole, dto.Reason);
        return Ok(new
        {
            message = $"Access request for {requestedRole} submitted successfully. An alert has been dispatched to system administrator.",
            request
        });
    }

    [HttpGet("api/access-requests/my")]
    public async Task<IActionResult> GetMyAccessRequestsAsync()
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value 
            ?? User.FindFirst("email")?.Value 
            ?? User.FindFirst("preferred_username")?.Value 
            ?? User.Identity?.Name;

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
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> GetAdminAccessRequestsAsync([FromQuery] string? status = null)
    {
        var requests = await _userRoleService.GetAccessRequestsAsync(status);
        return Ok(requests);
    }

    private string GetAdminCallerIdentity() =>
        User.FindFirst(ClaimTypes.Email)?.Value 
        ?? User.FindFirst("email")?.Value 
        ?? User.FindFirst("preferred_username")?.Value 
        ?? User.Identity?.Name 
        ?? "admin";

    [HttpPost("api/admin/access-requests/{id}/approve")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> ApproveAccessRequestAsync(string id, [FromBody] ReviewAccessRequestDecisionDto? dto)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { error = "missing_id", detail = "Request id cannot be empty." });
        }

        var adminEmail = GetAdminCallerIdentity();
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
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> RejectAccessRequestAsync(string id, [FromBody] ReviewAccessRequestDecisionDto? dto)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { error = "missing_id", detail = "Request id cannot be empty." });
        }

        var adminEmail = GetAdminCallerIdentity();
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
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> RevokeUserAccessAsync([FromBody] RevokeAccessRequestDto? dto)
    {
        if (dto == null)
        {
            return BadRequest(new { error = "missing_payload", detail = "Request body cannot be null." });
        }

        var targetEmail = dto.EffectiveTargetEmail;
        if (string.IsNullOrWhiteSpace(targetEmail))
        {
            return BadRequest(new { error = "missing_email", detail = "Target email is required to revoke access." });
        }

        var adminEmail = GetAdminCallerIdentity();
        var assignment = await _userRoleService.RevokeAccessAsync(targetEmail, adminEmail, dto.Notes);

        return Ok(new
        {
            message = $"Reviewer access revoked for {targetEmail}. Active role reset to CONSUMER.",
            assignment
        });
    }

    [HttpPost("api/admin/roles/certify-reviewer")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> CertifyUserAsReviewerAsync([FromBody] CertifyReviewerRequestDto? dto)
    {
        if (dto == null)
        {
            return BadRequest(new { error = "missing_payload", detail = "Request body cannot be null." });
        }

        var targetEmail = dto.EffectiveTargetEmail;
        if (string.IsNullOrWhiteSpace(targetEmail))
        {
            return BadRequest(new { error = "missing_email", detail = "Target email is required to certify reviewer." });
        }

        var adminEmail = GetAdminCallerIdentity();
        var assignment = await _userRoleService.CertifyReviewerAsync(targetEmail, adminEmail, dto.Notes);

        return Ok(new
        {
            message = $"User {targetEmail} is now a Certified Reviewer.",
            assignment
        });
    }

    [HttpPost("api/admin/roles/sync-ado")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> SyncAdminRolesAsync()
    {
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
    public async Task<IActionResult> GetAllRoles()
    {
        var roles = await _userRoleService.GetAllRolesAsync();
        return Ok(roles);
    }
}
