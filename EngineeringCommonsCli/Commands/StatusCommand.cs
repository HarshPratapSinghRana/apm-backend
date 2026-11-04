using System;
using System.Linq;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;

namespace EngineeringCommonsCli.Commands;

public class StatusCommand
{
    private readonly IBackendClient _backend;
    private readonly IAuthenticationService _authProvider;

    public StatusCommand(IBackendClient backend, IAuthenticationService authProvider)
    {
        _backend = backend;
        _authProvider = authProvider;
    }

    public int Invoke(string[] args)
    {
        var session = _authProvider.CurrentSessionAsync().GetAwaiter().GetResult();
        if (session == null)
        {
            Console.WriteLine("ERROR: You are not logged in. Run:\n  engineering-commons login");
            return 1;
        }

        bool forceRefresh = false;
        string? filter = null;
        for (int i = 0; i < args.Length; i++)
        {
            if (args[i].Equals("--refresh", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-r", StringComparison.OrdinalIgnoreCase))
            {
                forceRefresh = true;
            }
            else if (!args[i].StartsWith('-') && filter == null)
            {
                filter = args[i];
            }
        }

        Console.WriteLine($"Fetching submission & review status for '{session.Email}'...\n");

        var list = _backend.GetMySubmissionsAsync(forceRefresh).GetAwaiter().GetResult().ToList();

        if (!string.IsNullOrEmpty(filter))
        {
            list = list.Where(s => s.ArtifactId.Equals(filter, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (!list.Any())
        {
            if (!string.IsNullOrEmpty(filter))
            {
                Console.WriteLine($"No submissions found for artifact '{filter}'.");
            }
            else
            {
                Console.WriteLine($"No submissions found for '{session.Email}'.");
                Console.WriteLine("Use 'engineering-commons contribute' to submit an AI artifact for review.");
            }
            return 0;
        }

        Console.WriteLine("====================================================================================================");
        Console.WriteLine("                                  MY SUBMISSIONS & REVIEWS STATUS");
        Console.WriteLine("====================================================================================================");

        int pendingCount = 0;
        int approvedCount = 0;
        int rejectedCount = 0;

        for (int i = 0; i < list.Count; i++)
        {
            var item = list[i];
            var normStatus = item.Status?.Trim().ToUpperInvariant() ?? "UNKNOWN";
            string badge;
            ConsoleColor statusColor;

            switch (normStatus)
            {
                case "APPROVED":
                    badge = "[APPROVED] ✅";
                    statusColor = ConsoleColor.Green;
                    approvedCount++;
                    break;
                case "REJECTED":
                    badge = "[REJECTED] ❌";
                    statusColor = ConsoleColor.Red;
                    rejectedCount++;
                    break;
                case "PENDING":
                default:
                    badge = "[PENDING] ⏳";
                    statusColor = ConsoleColor.Yellow;
                    pendingCount++;
                    break;
            }

            Console.WriteLine($"[{i + 1}] Artifact:    {item.ArtifactId} (Review ID: {item.Id})");
            
            Console.Write("    Status:      ");
            var prevColor = Console.ForegroundColor;
            Console.ForegroundColor = statusColor;
            Console.WriteLine(badge);
            Console.ForegroundColor = prevColor;

            Console.WriteLine($"    Submitted:   {item.SubmittedAt.ToLocalTime():yyyy-MM-dd HH:mm:ss} UTC");
            Console.WriteLine($"    Reviewer:    {(string.IsNullOrEmpty(item.ReviewerEmail) ? "(Awaiting Reviewer Assignment)" : item.ReviewerEmail)}");
            
            if (item.DecisionAt.HasValue)
            {
                Console.WriteLine($"    Decision At: {item.DecisionAt.Value.ToLocalTime():yyyy-MM-dd HH:mm:ss} UTC");
            }

            if (!string.IsNullOrWhiteSpace(item.Feedback))
            {
                Console.ForegroundColor = ConsoleColor.Cyan;
                Console.WriteLine($"    Feedback:    \"{item.Feedback}\"");
                Console.ForegroundColor = prevColor;
            }
            else
            {
                Console.WriteLine($"    Feedback:    (No reviewer notes provided)");
            }

            if (i < list.Count - 1)
            {
                Console.WriteLine("----------------------------------------------------------------------------------------------------");
            }
        }

        Console.WriteLine("====================================================================================================");
        Console.WriteLine($"Summary: {list.Count} submission(s) | {pendingCount} Pending ⏳ | {approvedCount} Approved ✅ | {rejectedCount} Rejected ❌");
        Console.WriteLine("====================================================================================================");

        return 0;
    }
}
