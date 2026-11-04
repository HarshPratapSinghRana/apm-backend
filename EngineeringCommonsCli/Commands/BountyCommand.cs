using System;
using System.Linq;
using System.Threading.Tasks;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;

namespace EngineeringCommonsCli.Commands;

public class BountyCommand
{
    private readonly IBackendClient _backend;
    private readonly IAuthenticationService _authProvider;

    public BountyCommand(IBackendClient backend, IAuthenticationService authProvider)
    {
        _backend = backend;
        _authProvider = authProvider;
    }

    public int Invoke(string[] args)
    {
        if (args.Contains("--help") || args.Contains("-h"))
        {
            ShowHelp();
            return 0;
        }

        var session = _authProvider.CurrentSessionAsync().GetAwaiter().GetResult();
        if (session == null || string.IsNullOrWhiteSpace(session.Token))
        {
            Console.WriteLine("ERROR: You must be logged in to manage or view bounties.\nRun: engineering-commons login");
            return 1;
        }

        if (args.Length == 0)
        {
            return HandleList(Array.Empty<string>());
        }

        var subcmd = args[0].ToLowerInvariant();
        var remaining = args.Skip(1).ToArray();

        return subcmd switch
        {
            "list" => HandleList(remaining),
            "get" or "show" or "view" => HandleGet(remaining),
            "claim" or "take" => HandleClaim(remaining),
            "release" => HandleRelease(remaining),
            "submit" or "submit-code" => HandleSubmit(remaining),
            "review" => HandleReview(remaining),
            "test" or "run-tests" => HandleTest(remaining),
            "feedback" or "choice" => HandleFeedback(remaining),
            "analytics" or "stats" => HandleAnalytics(),
            _ => args[0].StartsWith('-') ? HandleList(args) : HandleUnknown(subcmd)
        };
    }

    private int HandleList(string[] args)
    {
        string? status = null;
        string? category = null;
        string? stage = null;
        bool forceRefresh = false;

        for (int i = 0; i < args.Length; i++)
        {
            if (args[i].Equals("--refresh", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-r", StringComparison.OrdinalIgnoreCase))
            {
                forceRefresh = true;
            }
            else if (args[i].Equals("--status", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                status = args[++i];
            }
            else if (args[i].Equals("--category", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                category = args[++i];
            }
            else if (args[i].Equals("--stage", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                stage = args[++i];
            }
        }

        var bounties = _backend.GetBountiesAsync(status, category, stage, forceRefresh).GetAwaiter().GetResult().ToList();
        if (bounties.Count == 0)
        {
            Console.WriteLine("No bounties found matching filter criteria.");
            return 0;
        }

        Console.WriteLine($"\n=== AVAILABLE BOUNTIES ({bounties.Count}) ===\n");
        Console.WriteLine($"{"ID",-10} | {"STAGE",-14} | {"CATEGORY",-10} | {"POINTS",-6} | {"STATUS",-10} | {"TITLE"}");
        Console.WriteLine(new string('-', 85));

        foreach (var b in bounties)
        {
            Console.WriteLine($"{b.Id,-10} | {b.Stage,-14} | {b.Category,-10} | {b.Credits,-6} | {b.Status,-10} | {b.Title}");
        }

        Console.WriteLine();
        return 0;
    }

    private int HandleGet(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("ERROR: Bounty ID required. Usage: engineering-commons bounty get <bounty-id>");
            return 1;
        }

        var id = args[0];
        var bounty = _backend.GetBountyByIdAsync(id).GetAwaiter().GetResult();
        if (bounty == null)
        {
            Console.WriteLine($"ERROR: Bounty '{id}' not found.");
            return 1;
        }

        Console.WriteLine($"\n=== BOUNTY DETAILS: {bounty.Title} ===");
        Console.WriteLine($"ID:            {bounty.Id}");
        Console.WriteLine($"Category:      {bounty.Category}");
        Console.WriteLine($"Reward:        {bounty.Credits} points");
        Console.WriteLine($"Status:        {bounty.Status}");
        Console.WriteLine($"Current Stage: {bounty.Stage}");
        Console.WriteLine($"Claimed By:    {(string.IsNullOrEmpty(bounty.ClaimedByEmail) ? "Unclaimed (Open to Community)" : bounty.ClaimedByEmail)}");
        Console.WriteLine($"Description:   {bounty.Description}");
        Console.WriteLine($"Submissions:   {bounty.Submissions.Count}");
        Console.WriteLine($"Reviews:       {bounty.Reviews.Count}");
        Console.WriteLine($"Test Runs:     {bounty.TestRuns.Count}");

        if (bounty.Submissions.Count > 0)
        {
            Console.WriteLine("\n--- Submissions History ---");
            foreach (var s in bounty.Submissions)
            {
                Console.WriteLine($"• [{s.SubmittedAt:g}] By {s.SubmittedByEmail}: {s.Notes ?? "No notes"}");
            }
        }

        if (bounty.Reviews.Count > 0)
        {
            Console.WriteLine("\n--- Reviews History ---");
            foreach (var r in bounty.Reviews)
            {
                Console.WriteLine($"• [{r.ReviewedAt:g}] By {r.ReviewerEmail}: {(r.IsApproved ? "APPROVED" : "CHANGES REQUESTED")} - {r.Feedback}");
            }
        }

        if (bounty.TestRuns.Count > 0)
        {
            Console.WriteLine("\n--- Test Runs History ---");
            foreach (var t in bounty.TestRuns)
            {
                Console.WriteLine($"• [{t.ExecutedAt:g}] By {t.TesterEmail} ({t.TestSuiteName}): {(t.IsPassed ? "PASSED" : "FAILED")} ({t.PassedCount} passed, {t.FailedCount} failed)");
            }
        }

        Console.WriteLine();
        return 0;
    }

    private int HandleClaim(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("ERROR: Bounty ID required. Usage: engineering-commons bounty claim <bounty-id>");
            return 1;
        }

        var id = args[0];
        var result = _backend.ClaimBountyAsync(id).GetAwaiter().GetResult();
        if (result == null)
        {
            Console.WriteLine($"ERROR: Failed to claim bounty '{id}'. It may already be claimed or completed.");
            return 1;
        }

        Console.WriteLine($"✓ Successfully claimed bounty '{result.Title}' ({result.Credits} pts). Stage: {result.Stage}");
        return 0;
    }

    private int HandleRelease(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("ERROR: Bounty ID required. Usage: engineering-commons bounty release <bounty-id>");
            return 1;
        }

        var id = args[0];
        var result = _backend.ReleaseBountyAsync(id).GetAwaiter().GetResult();
        if (result == null)
        {
            Console.WriteLine($"ERROR: Failed to release bounty '{id}'.");
            return 1;
        }

        Console.WriteLine($"✓ Successfully released bounty '{result.Title}' back to the community pool.");
        return 0;
    }

    private int HandleSubmit(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("ERROR: Bounty ID required. Usage: engineering-commons bounty submit <bounty-id> --code <solution> [--notes <notes>]");
            return 1;
        }

        var id = args[0];
        string solutionCode = "Default solution implementation";
        string? commitSha = null;
        string? notes = null;

        for (int i = 1; i < args.Length; i++)
        {
            if ((args[i].Equals("--code", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-c", StringComparison.OrdinalIgnoreCase)) && i + 1 < args.Length)
            {
                solutionCode = args[++i];
            }
            else if (args[i].Equals("--sha", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                commitSha = args[++i];
            }
            else if ((args[i].Equals("--notes", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-m", StringComparison.OrdinalIgnoreCase)) && i + 1 < args.Length)
            {
                notes = args[++i];
            }
        }

        var result = _backend.SubmitBountyCodeAsync(id, solutionCode, commitSha, notes).GetAwaiter().GetResult();
        if (result == null)
        {
            Console.WriteLine($"ERROR: Failed to submit solution for bounty '{id}'.");
            return 1;
        }

        Console.WriteLine($"✓ Solution submitted for '{result.Title}'. Automated transition: Stage is now '{result.Stage}'.");
        return 0;
    }

    private int HandleReview(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("ERROR: Bounty ID required. Usage: engineering-commons bounty review <bounty-id> [--approve|--reject] [--feedback <text>]");
            return 1;
        }

        var id = args[0];
        bool isApproved = true;
        string feedback = "Code validated and approved.";

        for (int i = 1; i < args.Length; i++)
        {
            if (args[i].Equals("--reject", StringComparison.OrdinalIgnoreCase) || args[i].Equals("--request-changes", StringComparison.OrdinalIgnoreCase))
            {
                isApproved = false;
                feedback = "Changes requested on implementation.";
            }
            else if (args[i].Equals("--approve", StringComparison.OrdinalIgnoreCase))
            {
                isApproved = true;
            }
            else if ((args[i].Equals("--feedback", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-f", StringComparison.OrdinalIgnoreCase)) && i + 1 < args.Length)
            {
                feedback = args[++i];
            }
        }

        var result = _backend.ReviewBountyCodeAsync(id, isApproved, feedback).GetAwaiter().GetResult();
        if (result == null)
        {
            Console.WriteLine($"ERROR: Failed to submit review for bounty '{id}'.");
            return 1;
        }

        Console.WriteLine(isApproved
            ? $"✓ Bounty '{result.Title}' approved! Automated transition: Stage is now '{result.Stage}'."
            : $"⚠️ Changes requested for '{result.Title}'. Feedback loop: Returned to '{result.Stage}'.");
        return 0;
    }

    private int HandleTest(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("ERROR: Bounty ID required. Usage: engineering-commons bounty test <bounty-id> [--pass|--fail] [--logs <text>]");
            return 1;
        }

        var id = args[0];
        bool isPassed = true;
        string testLogs = "All automated integration tests passed.";
        int passed = 10;
        int failed = 0;

        for (int i = 1; i < args.Length; i++)
        {
            if (args[i].Equals("--fail", StringComparison.OrdinalIgnoreCase))
            {
                isPassed = false;
                passed = 7;
                failed = 3;
                testLogs = "3 test assertions failed in CI runner.";
            }
            else if (args[i].Equals("--pass", StringComparison.OrdinalIgnoreCase))
            {
                isPassed = true;
                passed = 10;
                failed = 0;
            }
            else if (args[i].Equals("--logs", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                testLogs = args[++i];
            }
        }

        var result = _backend.RunBountyTestsAsync(id, "Automated CI/CD Test Suite", isPassed, passed, failed, testLogs).GetAwaiter().GetResult();
        if (result == null)
        {
            Console.WriteLine($"ERROR: Failed to submit test results for bounty '{id}'.");
            return 1;
        }

        if (isPassed)
        {
            Console.WriteLine($"🎉 All tests passed for '{result.Title}'! Bounty COMPLETED and contributor rewarded (+{result.Credits} pts). Stage: '{result.Stage}'.");
        }
        else
        {
            Console.WriteLine($"⚠️ Tests failed for '{result.Title}'. Feedback loop triggered: Returned to '{result.Stage}'.");
        }

        return 0;
    }

    private int HandleFeedback(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("ERROR: Bounty ID required. Usage: engineering-commons bounty feedback <bounty-id> --choice <ProducerResolving|OpenToCommunity>");
            return 1;
        }

        var id = args[0];
        string choice = "ProducerResolving";

        for (int i = 1; i < args.Length; i++)
        {
            if ((args[i].Equals("--choice", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-c", StringComparison.OrdinalIgnoreCase)) && i + 1 < args.Length)
            {
                choice = args[++i];
            }
        }

        var result = _backend.SetBountyFeedbackChoiceAsync(id, choice).GetAwaiter().GetResult();
        if (result == null)
        {
            Console.WriteLine($"ERROR: Failed to set feedback choice for bounty '{id}'.");
            return 1;
        }

        Console.WriteLine($"✓ Resolution preference updated to '{choice}' for '{result.Title}'. Status: {result.Status}, Stage: {result.Stage}");
        return 0;
    }

    private int HandleAnalytics()
    {
        var stats = _backend.GetBountyAnalyticsAsync().GetAwaiter().GetResult();
        if (stats == null)
        {
            Console.WriteLine("ERROR: Unable to load bounty analytics.");
            return 1;
        }

        Console.WriteLine("\n=== BOUNTY SERVICE ANALYTICS ===");
        Console.WriteLine($"Total Bounties:         {stats.TotalBounties}");
        Console.WriteLine($"Open Bounties:          {stats.OpenBounties}");
        Console.WriteLine($"Claimed In-Progress:    {stats.ClaimedBounties}");
        Console.WriteLine($"Completed Bounties:     {stats.CompletedBounties}");
        Console.WriteLine($"Success Rate:           {stats.SuccessRatePercent}%");
        Console.WriteLine($"Total Credits Paid:     {stats.TotalCreditsPaid} pts");
        Console.WriteLine($"Avg Completion Time:    {stats.AverageCompletionHours} hours\n");

        if (stats.StageDistribution.Count > 0)
        {
            Console.WriteLine("--- Stage Distribution ---");
            foreach (var kvp in stats.StageDistribution)
            {
                Console.WriteLine($"  {kvp.Key,-16}: {kvp.Value}");
            }
        }

        Console.WriteLine();
        return 0;
    }

    private int HandleUnknown(string subcmd)
    {
        Console.WriteLine($"ERROR: Unknown bounty subcommand '{subcmd}'. Run 'engineering-commons bounty --help' for usage.");
        return 1;
    }

    private void ShowHelp()
    {
        Console.WriteLine(@"
Engineering Commons Bounty Service CLI
Commands:
  engineering-commons bounty list [--status <open|claimed|completed>] [--category <codegen|review|testing>] [--stage <CodeGeneration|InReview|InTesting|Completed>]
  engineering-commons bounty get <bounty-id>
  engineering-commons bounty claim <bounty-id>
  engineering-commons bounty release <bounty-id>
  engineering-commons bounty submit <bounty-id> --code <code-or-text> [--notes <notes>]
  engineering-commons bounty review <bounty-id> [--approve|--reject] [--feedback <feedback>]
  engineering-commons bounty test <bounty-id> [--pass|--fail] [--logs <logs>]
  engineering-commons bounty feedback <bounty-id> --choice <ProducerResolving|OpenToCommunity>
  engineering-commons bounty analytics
");
    }
}
