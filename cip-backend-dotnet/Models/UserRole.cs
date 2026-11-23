using System;
using System.Linq;

namespace EngineeringCommons.Backend.Models;

public enum UserRole
{
    Consumer,
    Contributor,
    Producer,
    Reviewer,
    CertifiedReviewer,
    Admin
}

public static class UserRoles
{
    public const string Consumer = "CONSUMER";
    public const string Contributor = "CONTRIBUTOR";
    public const string Producer = "PRODUCER";
    public const string Reviewer = "REVIEWER";
    public const string CertifiedReviewer = "CERTIFIED_REVIEWER";
    public const string Admin = "ADMIN";

    public static readonly string[] AllRoles = new[]
    {
        Consumer,
        Contributor,
        Producer,
        Reviewer,
        CertifiedReviewer,
        Admin
    };

    public static readonly string[] RequestableRoles = new[]
    {
        Contributor,
        Producer,
        Reviewer,
        CertifiedReviewer
    };

    public static bool IsValidRole(string? role) =>
        !string.IsNullOrWhiteSpace(role) && AllRoles.Contains(role.Trim().ToUpperInvariant());

    public static bool IsValidRequestableRole(string? role) =>
        !string.IsNullOrWhiteSpace(role) && RequestableRoles.Contains(role.Trim().ToUpperInvariant());

    public static bool IsReviewerOrAdmin(string? role) =>
        !string.IsNullOrWhiteSpace(role) && 
        (string.Equals(role, Reviewer, StringComparison.OrdinalIgnoreCase) ||
         string.Equals(role, CertifiedReviewer, StringComparison.OrdinalIgnoreCase) ||
         string.Equals(role, Admin, StringComparison.OrdinalIgnoreCase));
}
