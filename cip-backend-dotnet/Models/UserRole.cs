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

public static class UserRoleExtensions
{
    public static UserRole ToUserRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role)) return UserRole.Consumer;
        var clean = role.Trim().Replace("_", "").Replace("-", "");
        if (Enum.TryParse<UserRole>(clean, true, out var parsed))
        {
            return parsed;
        }
        return UserRole.Consumer;
    }

    public static string ToRoleString(this UserRole role) => role switch
    {
        UserRole.Admin => UserRoles.Admin,
        UserRole.CertifiedReviewer => UserRoles.CertifiedReviewer,
        UserRole.Reviewer => UserRoles.Reviewer,
        UserRole.Producer => UserRoles.Producer,
        UserRole.Contributor => UserRoles.Contributor,
        _ => UserRoles.Consumer
    };

    public static bool IsReviewerOrAdmin(this UserRole role) =>
        role is UserRole.Reviewer or UserRole.CertifiedReviewer or UserRole.Admin;

    public static bool IsAdmin(this UserRole role) =>
        role == UserRole.Admin;
}

