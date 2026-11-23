using System;
using System.Linq;
using System.Threading.Tasks;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;

namespace EngineeringCommonsCli.Commands;

public class AccessCommand
{
    private readonly IBackendClient _backend;
    private readonly IAuthenticationService _authProvider;

    public AccessCommand(IBackendClient backend, IAuthenticationService authProvider)
    {
        _backend = backend;
        _authProvider = authProvider;
    }

    public int Invoke(string[] args)
    {
        if (args.Length == 0 || args.Contains("--help") || args.Contains("-h"))
        {
            ShowHelp();
            return 0;
        }

        var session = _authProvider.CurrentSessionAsync().GetAwaiter().GetResult();
        if (session == null || string.IsNullOrWhiteSpace(session.Token))
        {
            Console.WriteLine("ERROR: You must be logged in to manage or request access.\nRun: engineering-commons login");
            return 1;
        }

        var subcmd = args[0].ToLowerInvariant();
        var remaining = args.Skip(1).ToArray();

        return subcmd switch
        {
            "request" or "request-access" => HandleRequestAccess(remaining),
            "my-requests" or "status" or "my" => HandleMyRequests(),
            "list" or "admin-list" or "pending" => HandleAdminList(remaining),
            "roles" or "list-roles" or "directory" => HandleListRoles(),
            "approve" => HandleApprove(remaining),
            "reject" => HandleReject(remaining),
            "revoke" => HandleRevoke(remaining),
            "certify" or "certify-reviewer" => HandleCertifyReviewer(remaining),
            _ => HandleUnknown(subcmd)
        };
    }

    private int HandleRequestAccess(string[] args)
    {
        string role = "CONTRIBUTOR";
        string? reason = null;

        for (int i = 0; i < args.Length; i++)
        {
            if (args[i].Equals("--reason", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-m", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length) { reason = args[i + 1]; i++; }
            }
            else if (args[i].Equals("--role", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-r", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length) { role = args[i + 1].ToUpperInvariant(); i++; }
            }
            else if (args[i].Equals("contributor", StringComparison.OrdinalIgnoreCase))
            {
                role = "CONTRIBUTOR";
            }
            else if (args[i].Equals("producer", StringComparison.OrdinalIgnoreCase))
            {
                role = "PRODUCER";
            }
            else if (args[i].Equals("reviewer", StringComparison.OrdinalIgnoreCase))
            {
                role = "REVIEWER";
            }
            else if (args[i].Equals("certified-reviewer", StringComparison.OrdinalIgnoreCase) || args[i].Equals("certified", StringComparison.OrdinalIgnoreCase))
            {
                role = "CERTIFIED_REVIEWER";
            }
            else if (reason == null && !args[i].StartsWith('-'))
            {
                reason = args[i];
            }
        }

        Console.WriteLine($"Submitting access request for role: {role}...");
        var success = _backend.RequestAccessAsync(role, reason).GetAwaiter().GetResult();
        if (!success)
        {
            return 1;
        }

        var adminEmail = Environment.GetEnvironmentVariable("ENGINEERING_COMMONS_ADMIN_EMAIL") ?? "harsh.rana@maqsoftware.com";
        Console.WriteLine($"\n✓ Access request successfully submitted!");
        Console.WriteLine($"  Role Requested: {role}");
        Console.WriteLine($"  Admin Notified: {adminEmail}");
        Console.WriteLine($"  Notification dispatched to admin inbox / thread.");
        Console.WriteLine($"\nYou will receive a notification once admin {adminEmail} approves your request.");
        return 0;
    }

    private int HandleMyRequests()
    {
        var status = _backend.GetMyAccessRequestsAsync().GetAwaiter().GetResult();
        if (status == null)
        {
            Console.WriteLine("ERROR: Could not retrieve your access request status.");
            return 1;
        }

        Console.WriteLine($"\nUser:                 {status.Email}");
        Console.WriteLine($"Current Role:         {status.CurrentRole}");
        Console.WriteLine($"Certified Reviewer:   {(status.IsCertifiedReviewer ? "Yes ✓" : "No")}\n");

        if (!status.Requests.Any())
        {
            Console.WriteLine("No previous access requests submitted.");
            Console.WriteLine("Tip: To request reviewer privileges, run: engineering-commons request-access reviewer --reason \"...\"");
            return 0;
        }

        Console.WriteLine("REQUEST ID                            ROLE                 STATUS     SUBMITTED");
        Console.WriteLine("---------------------------------------------------------------------------------------");
        foreach (var r in status.Requests)
        {
            Console.WriteLine($"{r.Id,-37} {r.RequestedRole,-20} {r.Status,-10} {r.RequestedAt:yyyy-MM-dd HH:mm}");
            if (!string.IsNullOrWhiteSpace(r.Reason))
            {
                Console.WriteLine($"  └─ Reason: {r.Reason}");
            }
            if (!string.IsNullOrWhiteSpace(r.AdminNotes))
            {
                Console.WriteLine($"  └─ Admin Notes: {r.AdminNotes}");
            }
        }
        return 0;
    }

    private int HandleAdminList(string[] args)
    {
        string? filterStatus = args.FirstOrDefault(a => !a.StartsWith('-'));
        var requests = _backend.GetAdminAccessRequestsAsync(filterStatus).GetAwaiter().GetResult();

        if (!requests.Any())
        {
            Console.WriteLine("\nNo access requests found.");
            return 0;
        }

        Console.WriteLine("\n======================= ACCESS REQUESTS (ADMIN) =======================");
        Console.WriteLine("REQUEST ID                            USER                          ROLE                 STATUS");
        Console.WriteLine("-------------------------------------------------------------------------------------------------");
        foreach (var r in requests)
        {
            Console.WriteLine($"{r.Id,-37} {r.UserEmail,-29} {r.RequestedRole,-20} {r.Status}");
            if (!string.IsNullOrWhiteSpace(r.Reason))
            {
                Console.WriteLine($"  └─ Reason: {r.Reason}");
            }
        }
        Console.WriteLine("\nActions:");
        Console.WriteLine("  engineering-commons approve-access <requestId> [--notes <notes>]");
        Console.WriteLine("  engineering-commons reject-access <requestId> [--notes <notes>]");
        return 0;
    }

    private int HandleApprove(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("Usage: engineering-commons approve-access <requestId> [--notes <text>]");
            return 1;
        }

        var id = args[0];
        string? notes = null;
        for (int i = 1; i < args.Length; i++)
        {
            if (args[i].Equals("--notes", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                notes = args[i + 1];
                i++;
            }
        }

        Console.WriteLine($"Approving access request '{id}'...");
        var ok = _backend.ApproveAccessRequestAsync(id, notes).GetAwaiter().GetResult();
        if (ok)
        {
            Console.WriteLine($"\n✓ Access request '{id}' approved successfully. User role updated and notified.");
            return 0;
        }
        return 1;
    }

    private int HandleReject(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("Usage: engineering-commons reject-access <requestId> [--notes <text>]");
            return 1;
        }

        var id = args[0];
        string? notes = null;
        for (int i = 1; i < args.Length; i++)
        {
            if (args[i].Equals("--notes", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                notes = args[i + 1];
                i++;
            }
        }

        Console.WriteLine($"Rejecting access request '{id}'...");
        var ok = _backend.RejectAccessRequestAsync(id, notes).GetAwaiter().GetResult();
        if (ok)
        {
            Console.WriteLine($"\n✓ Access request '{id}' rejected.");
            return 0;
        }
        return 1;
    }

    private int HandleRevoke(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("Usage: engineering-commons revoke-access <targetEmail> [--notes <text>]");
            return 1;
        }

        var email = args[0];
        string? notes = null;
        for (int i = 1; i < args.Length; i++)
        {
            if (args[i].Equals("--notes", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                notes = args[i + 1];
                i++;
            }
        }

        Console.WriteLine($"Revoking reviewer privileges for '{email}'...");
        var ok = _backend.RevokeAccessAsync(email, notes).GetAwaiter().GetResult();
        if (ok)
        {
            Console.WriteLine($"\n✓ Reviewer privileges for '{email}' revoked. Role reset to CONSUMER.");
            return 0;
        }
        return 1;
    }

    private int HandleCertifyReviewer(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("Usage: engineering-commons certify-reviewer <targetEmail> [--notes <text>]");
            return 1;
        }

        var email = args[0];
        string? notes = null;
        for (int i = 1; i < args.Length; i++)
        {
            if (args[i].Equals("--notes", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                notes = args[i + 1];
                i++;
            }
        }

        Console.WriteLine($"Granting Certified Reviewer status to '{email}'...");
        var ok = _backend.CertifyReviewerAsync(email, notes).GetAwaiter().GetResult();
        if (ok)
        {
            Console.WriteLine($"\n✓ User '{email}' is now a Certified Reviewer.");
            return 0;
        }
        return 1;
    }

    private int HandleListRoles()
    {
        Console.WriteLine("\nRetrieving user role directory from SQLite database...");
        var roles = _backend.GetAllRolesAsync().GetAwaiter().GetResult()?.ToList();
        if (roles == null || !roles.Any())
        {
            Console.WriteLine("No user roles found in database.");
            return 0;
        }

        Console.WriteLine("\nEngineering Commons User Role Directory (SQLite: user_roles):");
        Console.WriteLine($"{"USER / EMAIL",-35} {"ROLE",-12} {"CERTIFIED",-10} {"GRANTED BY",-20} {"NOTES"}");
        Console.WriteLine(new string('-', 105));

        foreach (var r in roles)
        {
            var cert = r.IsCertifiedReviewer ? "Yes (★)" : "No";
            var granted = string.IsNullOrWhiteSpace(r.GrantedBy) ? "SYSTEM" : r.GrantedBy;
            var notes = string.IsNullOrWhiteSpace(r.Notes) ? "-" : r.Notes;
            Console.WriteLine($"{r.UserEmail,-35} {r.Role,-12} {cert,-10} {granted,-20} {notes}");
        }

        Console.WriteLine($"\nTotal users in role registry: {roles.Count}");
        return 0;
    }

    private int HandleUnknown(string subcmd)
    {
        Console.WriteLine($"Unknown access command: {subcmd}");
        ShowHelp();
        return 2;
    }

    private void ShowHelp()
    {
        Console.WriteLine("Engineering Commons Access Governance");
        Console.WriteLine("Usage: engineering-commons access <subcommand> [options]\n");
        Console.WriteLine("User Commands:");
        Console.WriteLine("  request-access [role] [--reason <text>]  Request Contributor, Reviewer, or Certified Reviewer access");
        Console.WriteLine("  access-status / my-requests              Check current role and status of my access requests\n");
        Console.WriteLine("Admin Commands (admin@maqsoftware.com):");
        Console.WriteLine("  access-requests [status]                 List all user access requests (pending/approved/rejected)");
        Console.WriteLine("  approve-access <id> [--notes <text>]     Approve a user's access request (Contributor/Reviewer)");
        Console.WriteLine("  reject-access <id> [--notes <text>]      Reject a user's access request");
        Console.WriteLine("  revoke-access <email> [--notes <text>]   Revoke elevated privileges (reverts to CONSUMER)");
        Console.WriteLine("  certify-reviewer <email>                 Promote a reviewer to Certified Reviewer");
    }
}
