using System;

namespace EngineeringCommons.Backend.Models;

public class CertifyRequestPayload
{
    public string? Version { get; set; }
    public string? Reason { get; set; }
}

public class RevokeRequestPayload
{
    public string Reason { get; set; } = string.Empty;
}

