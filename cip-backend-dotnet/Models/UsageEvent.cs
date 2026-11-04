using System;

namespace CipBackend.Models;

public class UsageEvent
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = string.Empty;
    public string? UserEmail { get; set; }
    public string? ArtifactId { get; set; }
    public string? ArtifactName { get; set; }
    public string? ArtifactType { get; set; } // agent, skill, plugin, mcpserver, prompt, command, cippackage
    public string? ArtifactVersion { get; set; }
    public string? EventType { get; set; } // INSTALL, UPDATE, UNINSTALL, USE, INVOKE, CONTRIBUTE, SUBMIT, REVIEW, APPROVE
    public string? Action { get; set; }   // legacy alias for EventType
    public string Source { get; set; } = "VS_CODE"; // VS_CODE, CLI, GITHUB_COPILOT, CLAUDE, OTHER
    public string Platform { get; set; } = "EngineeringCommons"; // EngineeringCommons, GitHubCopilot, Claude, Other
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? SessionId { get; set; }
    public string? Metadata { get; set; }
    public string? Workspace { get; set; }
}
