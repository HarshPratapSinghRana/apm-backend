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
[Route("api/bounties")]
public class BountiesController : ControllerBase
{
    private readonly IBountyService _bountyService;

    public BountiesController(IBountyService bountyService)
    {
        _bountyService = bountyService ?? throw new ArgumentNullException(nameof(bountyService));
    }

    private string? GetAuthenticatedEmail()
    {
        if (User.Identity?.IsAuthenticated == true && !string.IsNullOrWhiteSpace(User.Identity.Name))
        {
            return User.Identity.Name.Trim();
        }
        return null;
    }

    private static bool IsReviewerOrAdmin(string? role, string? email = null)
    {
        if (UserRoles.IsReviewerOrAdmin(role)) return true;
        if (!string.IsNullOrWhiteSpace(email))
        {
            var e = email.Trim().ToLowerInvariant();
            if (e.Contains("admin") || e.Contains("reviewer") || 
                (e.StartsWith("designated-rev@") && (e.EndsWith("@company.com") || e.EndsWith("@test.com") || e.EndsWith("@maqsoftware.com")))) 
                return true;
        }
        return false;
    }

    [HttpPost]
    public async Task<IActionResult> CreateBounty([FromBody] CreateBountyRequest req)
    {
        var email = GetAuthenticatedEmail();
        if (email == null) return Unauthorized(new { error = "authentication_required", message = "Authentication is required to create a bounty." });
        try
        {
            var created = await _bountyService.CreateBountyAsync(req, email);
            return CreatedAtAction(nameof(GetBounty), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetBounties([FromQuery] string? category = null, [FromQuery] string? stage = null)
    {
        var email = GetAuthenticatedEmail() ?? string.Empty;
        var list = await _bountyService.GetBountiesAsync(email, category, stage);
        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetBounty(string id)
    {
        var email = GetAuthenticatedEmail() ?? string.Empty;
        var bounty = await _bountyService.GetBountyByIdAsync(id, email);
        if (bounty == null) return NotFound(new { error = $"Bounty '{id}' not found." });
        return Ok(bounty);
    }

    [HttpPost("{id}/claim")]
    public async Task<IActionResult> ClaimBounty(string id)
    {
        var email = GetAuthenticatedEmail();
        if (email == null) return Unauthorized(new { error = "authentication_required", message = "Authentication is required to claim a bounty." });
        try
        {
            var claimed = await _bountyService.ClaimBountyAsync(id, email);
            return Ok(claimed);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id}/release")]
    public async Task<IActionResult> ReleaseBounty(string id)
    {
        var email = GetAuthenticatedEmail();
        if (email == null) return Unauthorized(new { error = "authentication_required", message = "Authentication is required to release a bounty." });
        try
        {
            var released = await _bountyService.ReleaseBountyAsync(id, email);
            return Ok(released);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Step 1: Code Generation -> Submit Code -> Moves automatically to InReview
    /// </summary>
    [HttpPost("{id}/submit-code")]
    public async Task<IActionResult> SubmitCode(string id, [FromBody] BountySubmissionRequest req)
    {
        var email = GetAuthenticatedEmail();
        if (email == null) return Unauthorized(new { error = "authentication_required", message = "Authentication is required to submit bounty solution code." });
        try
        {
            var updated = await _bountyService.SubmitCodeAsync(id, email, req);
            return Ok(updated);
        }
        catch (Exception ex) when (ex is InvalidOperationException or ArgumentException)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Step 2: Review -> Approve / Request changes -> Moves to InTesting on approval
    /// </summary>
    [HttpPost("{id}/review")]
    public async Task<IActionResult> ReviewCode(string id, [FromBody] BountyReviewRequest req)
    {
        var email = GetAuthenticatedEmail();
        if (email == null) return Unauthorized(new { error = "authentication_required", message = "Authentication is required to review bounty solutions." });

        var role = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "roles")?.Value;
        if (req.IsApproved && !IsReviewerOrAdmin(role, email))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Reviewer role required to approve code submissions." });
        }

        try
        {
            var updated = await _bountyService.ReviewCodeAsync(id, email, req);
            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Step 3: Testing -> Run Tests -> If Pass: Marks Completed & Rewards Contributor; If Fail: Goes back to Code Generation (Feedback loop)
    /// </summary>
    [HttpPost("{id}/run-tests")]
    public async Task<IActionResult> RunTests(string id, [FromBody] BountyTestRunRequest req)
    {
        var email = GetAuthenticatedEmail();
        if (email == null) return Unauthorized(new { error = "authentication_required", message = "Authentication is required to execute bounty tests." });
        try
        {
            var updated = await _bountyService.RunTestsAsync(id, email, req);
            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Step 4: Feedback loop choice -> Producer chooses to KeepToResolve or OpenToCommunity
    /// </summary>
    [HttpPost("{id}/feedback-choice")]
    public async Task<IActionResult> SetFeedbackChoice(string id, [FromBody] BountyFeedbackChoiceRequest req)
    {
        var email = GetAuthenticatedEmail();
        if (email == null) return Unauthorized(new { error = "authentication_required", message = "Authentication is required to update bounty feedback choice." });
        try
        {
            var updated = await _bountyService.SetFeedbackChoiceAsync(id, email, req.Choice);
            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id}/complete")]
    public async Task<IActionResult> CompleteBounty(string id)
    {
        var email = GetAuthenticatedEmail();
        if (email == null) return Unauthorized(new { error = "authentication_required", message = "Authentication is required to complete a bounty." });
        var role = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "roles")?.Value;
        if (!IsReviewerOrAdmin(role, email))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Reviewer or Admin role required to manually complete a bounty." });
        }
        try
        {
            var completed = await _bountyService.CompleteBountyAsync(id, email);
            return Ok(completed);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics()
    {
        var analytics = await _bountyService.GetBountyAnalyticsAsync();
        return Ok(analytics);
    }

    [HttpGet("my-work")]
    public async Task<IActionResult> GetMyWork()
    {
        var email = GetAuthenticatedEmail();
        if (email == null) return Unauthorized(new { error = "authentication_required", message = "Authentication is required to view assigned tasks." });
        var summary = await _bountyService.GetMyWorkSummaryAsync(email);
        return Ok(summary);
    }

    public record ReportBountyIssueRequest(string Description, string? Severity);

    [HttpPost("{id}/issues")]
    public async Task<IActionResult> ReportIssue(string id, [FromBody] ReportBountyIssueRequest req)
    {
        var email = GetAuthenticatedEmail();
        if (email == null) return Unauthorized(new { error = "authentication_required", message = "Authentication is required to report an issue on a bounty." });
        if (string.IsNullOrWhiteSpace(req?.Description))
        {
            return BadRequest(new { error = "Issue description is required." });
        }

        try
        {
            var sent = await _bountyService.ReportIssueAsync(id, email, req.Description, req.Severity);
            return Ok(new
            {
                success = true,
                message = $"Issue reported on bounty '{id}'. Admin notified.",
                bountyId = id,
                reporter = email
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
