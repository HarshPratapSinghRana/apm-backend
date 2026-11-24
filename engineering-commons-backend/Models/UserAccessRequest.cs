using System;

namespace EngineeringCommons.Backend.Models;

public enum AccessRequestStatus
{
    Pending,
    Approved,
    Rejected,
    Revoked
}

public class UserAccessRequest
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserEmail { get; set; } = string.Empty;
    public string RequestedRole { get; set; } = UserRoles.Reviewer;
    public string CurrentRole { get; set; } = UserRoles.Producer;
    public AccessRequestStatus Status { get; set; } = AccessRequestStatus.Pending;
    public string? Reason { get; set; }
    public string AdminEmail { get; set; } = string.Empty;
    public string? AdminNotes { get; set; }
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
}
