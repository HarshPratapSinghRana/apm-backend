using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using CipBackend.Models;
using CipBackend.Services.Interfaces;

namespace CipBackend.Controllers;

[ApiController]
[Route("api/usage")]
public class UsageController : ControllerBase
{
    private readonly IUsageService _usageService;

    public UsageController(IUsageService usageService)
    {
        _usageService = usageService;
    }

    public class RecordUsageRequest
    {
        public string? ArtifactId { get; set; }
        public string? ArtifactName { get; set; }
        public string? ArtifactType { get; set; }
        public string? ArtifactVersion { get; set; }
        public string? EventType { get; set; }
        public string? Action { get; set; }
        public string? Source { get; set; } = "VS_CODE";
        public string? Platform { get; set; } = "EngineeringCommons";
        public string? SessionId { get; set; }
        public string? Metadata { get; set; }
        public DateTime? Timestamp { get; set; }
        public string? Workspace { get; set; }
    }

    [HttpPost]
    [HttpPost("events")]
    public async Task<IActionResult> RecordUsage([FromBody] RecordUsageRequest req)
    {
        if (!User.Identity?.IsAuthenticated ?? true)
        {
            return Unauthorized(new { error = "Authentication required to log usage events." });
        }

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
        if (!User.Identity?.IsAuthenticated ?? true)
        {
            return Unauthorized();
        }

        var events = await _usageService.GetUsageEventsAsync(userId);
        return Ok(events);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetUsageSummary(
        [FromQuery] string? period = "all",
        [FromQuery] string? artifactType = null,
        [FromQuery] string? artifactId = null,
        [FromQuery] int limit = 5)
    {
        if (!User.Identity?.IsAuthenticated ?? true)
        {
            return Unauthorized();
        }

        var userEmail = User.Identity?.Name;
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "Consumer";

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
        if (!User.Identity?.IsAuthenticated ?? true)
        {
            return Unauthorized();
        }

        var userEmail = User.Identity?.Name;
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "Consumer";

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
        if (!User.Identity?.IsAuthenticated ?? true)
        {
            return Unauthorized();
        }

        var userEmail = User.Identity?.Name;
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "Consumer";

        var details = await _usageService.GetArtifactDetailsAnalyticsAsync(artifactId, userEmail, userRole);
        if (details == null)
        {
            return NotFound(new { error = $"Artifact '{artifactId}' not found." });
        }

        return Ok(details);
    }

    [HttpGet("most-downloaded")]
    public async Task<IActionResult> GetMostDownloaded(
        [FromQuery] int limit = 5,
        [FromQuery] string? period = "all",
        [FromQuery] string? artifactType = null)
    {
        if (!User.Identity?.IsAuthenticated ?? true)
        {
            return Unauthorized();
        }

        var userEmail = User.Identity?.Name;
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "Consumer";

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
        [FromQuery] int limit = 5,
        [FromQuery] string? period = "all",
        [FromQuery] string? artifactType = null)
    {
        if (!User.Identity?.IsAuthenticated ?? true)
        {
            return Unauthorized();
        }

        var userEmail = User.Identity?.Name;
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "Consumer";

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
        if (!User.Identity?.IsAuthenticated ?? true)
        {
            return Unauthorized();
        }

        var userEmail = User.Identity?.Name ?? "anonymous";
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "Consumer";

        var users = await _usageService.GetUserUsageByArtifactAsync(artifactId, userEmail, userRole);
        return Ok(users);
    }
}

