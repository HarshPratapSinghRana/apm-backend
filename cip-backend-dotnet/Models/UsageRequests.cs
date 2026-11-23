using System;

namespace EngineeringCommons.Backend.Models;

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

