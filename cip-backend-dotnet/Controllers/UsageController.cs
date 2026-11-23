using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Controllers;

[ApiController]
[Authorize]
[Route("api/usage")]
public class UsageController : ControllerBase
{
    private const int DefaultQueryLimit = 5;
    private readonly IUsageService _usageService;

    public UsageController(IUsageService usageService)
    {
        _usageService = usageService ?? throw new ArgumentNullException(nameof(usageService));
    }

    [HttpPost("events")]
    public async Task<IActionResult> RecordUsage([FromBody] RecordUsageRequest req)
    {
        var eventType = !string.IsNullOrWhiteSpace(req.EventType) 
            ? req.EventType.Trim().ToUpperInvariant() 
            : (!string.IsNullOrWhiteSpace(req.Action) ? req.Action.Trim().ToUpperInvariant() : "USE");

        var userEmail = User.Identity?.Name ?? "authenticated-user";

        var usageEvent = new UsageEvent
        {
            UserId = userEmail,
            UserEmail = userEmail,
            ArtifactId = req.ArtifactId ?? req.ArtifactName,
            ArtifactName = req.ArtifactName ?? req.ArtifactId,
            ArtifactType = req.ArtifactType,
            ArtifactVersion = req.ArtifactVersion ?? "1.0.0",
            EventType = eventType,
            Action = eventType,
            Source = string.IsNullOrWhiteSpace(req.Source) ? "VS_CODE" : req.Source.Trim().ToUpperInvariant(),
            Platform = string.IsNullOrWhiteSpace(req.Platform) ? "EngineeringCommons" : req.Platform.Trim(),
            SessionId = req.SessionId,
            Metadata = req.Metadata,
            Timestamp = req.Timestamp ?? DateTime.UtcNow,
            Workspace = req.Workspace
        };

        await _usageService.RecordUsageAsync(usageEvent);

        return Ok(new { success = true, eventId = usageEvent.Id });
    }

    [HttpGet]
    public async Task<IActionResult> GetUsageEvents([FromQuery] string? userId = null)
    {
        var events = await _usageService.GetUsageEventsAsync(userId);
        return Ok(events);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetUsageSummary(
        [FromQuery] string? period = "all",
        [FromQuery] string? artifactType = null,
        [FromQuery] string? artifactId = null,
        [FromQuery] int limit = DefaultQueryLimit)
    {
        var userEmail = User.Identity?.Name;
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? UserRoles.Consumer;

        var filters = new UsageFilterOptions
        {
            Period = period,
            ArtifactType = artifactType,
            ArtifactId = artifactId,
            Limit = limit
        };

        var summary = await _usageService.GetSummaryAsync(filters, userEmail, userRole);
        return Ok(summary);
    }

    [HttpGet("artifacts")]
    public async Task<IActionResult> GetArtifactAnalytics(
        [FromQuery] string? period = "all",
        [FromQuery] string? artifactType = null,
        [FromQuery] string? artifactId = null)
    {
        var userEmail = User.Identity?.Name;
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? UserRoles.Consumer;

        var filters = new UsageFilterOptions
        {
            Period = period,
            ArtifactType = artifactType,
            ArtifactId = artifactId
        };

        var list = await _usageService.GetArtifactAnalyticsAsync(filters, userEmail, userRole);
        return Ok(list);
    }

    [HttpGet("artifacts/{artifactId}")]
    public async Task<IActionResult> GetArtifactDetailsAnalytics(string artifactId)
    {
        var userEmail = User.Identity?.Name;
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? UserRoles.Consumer;

        var details = await _usageService.GetArtifactDetailsAnalyticsAsync(artifactId, userEmail, userRole);
        if (details == null)
        {
            return NotFound(new { error = $"Artifact '{artifactId}' not found." });
        }

        return Ok(details);
    }

    [HttpGet("most-downloaded")]
    public async Task<IActionResult> GetMostDownloaded(
        [FromQuery] string? period = "all",
        [FromQuery] string? artifactType = null,
        [FromQuery] int limit = DefaultQueryLimit)
    {
        var userEmail = User.Identity?.Name;
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? UserRoles.Consumer;

        var filters = new UsageFilterOptions
        {
            Period = period,
            ArtifactType = artifactType,
            Limit = limit
        };

        var items = await _usageService.GetMostDownloadedAsync(limit, filters, userEmail, userRole);
        return Ok(items);
    }

    [HttpGet("most-used")]
    public async Task<IActionResult> GetMostUsed(
        [FromQuery] string? period = "all",
        [FromQuery] string? artifactType = null,
        [FromQuery] int limit = DefaultQueryLimit)
    {
        var userEmail = User.Identity?.Name;
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? UserRoles.Consumer;

        var filters = new UsageFilterOptions
        {
            Period = period,
            ArtifactType = artifactType,
            Limit = limit
        };

        var items = await _usageService.GetMostUsedAsync(limit, filters, userEmail, userRole);
        return Ok(items);
    }

    [HttpGet("artifacts/{artifactId}/users")]
    public async Task<IActionResult> GetArtifactUserUsage(string artifactId)
    {
        var userEmail = User.Identity?.Name ?? "anonymous";
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? UserRoles.Consumer;

        var users = await _usageService.GetUserUsageByArtifactAsync(artifactId, userEmail, userRole);
        return Ok(users);
    }
}
