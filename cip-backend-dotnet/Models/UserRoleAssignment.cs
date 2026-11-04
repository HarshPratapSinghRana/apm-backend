using System;

namespace CipBackend.Models;

public class UserRoleAssignment
{
    public string Id => UserEmail;
    public string UserEmail { get; set; } = string.Empty;
    public string Role { get; set; } = "PRODUCER";
    public bool IsCertifiedReviewer { get; set; } = false;
    public string? GrantedBy { get; set; }
    public string? Notes { get; set; }
    public DateTime GrantedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
