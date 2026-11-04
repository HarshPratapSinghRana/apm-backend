using System;
using System.Linq;
using EngineeringCommonsCli.Services.Interfaces;

namespace EngineeringCommonsCli.Commands;

public class VisibilityCommand
{
    private readonly IBackendClient _backend;
    private readonly IAuthenticationService _authProvider;

    public VisibilityCommand(IBackendClient backend, IAuthenticationService authProvider)
    {
        _backend = backend;
        _authProvider = authProvider;
    }

    public int Invoke(string[] args)
    {
        var session = _authProvider.CurrentSessionAsync().GetAwaiter().GetResult();
        if (session == null)
        {
            Console.WriteLine("ERROR: You must be logged in to modify artifact visibility.\nRun: engineering-commons login");
            return 1;
        }

        if (args.Length == 0)
        {
            Console.WriteLine("Usage:\n  engineering-commons visibility <artifact-name> <public|private>\n  engineering-commons publish <artifact-name>");
            return 1;
        }

        string artifactName = args[0].Trim();
        bool isPrivate = false;

        if (args.Length > 1)
        {
            var visStr = args[1].Trim().ToLowerInvariant();
            if (visStr == "private" || visStr == "secret" || visStr == "dev")
            {
                isPrivate = true;
            }
            else if (visStr == "public" || visStr == "published" || visStr == "marketplace")
            {
                isPrivate = false;
            }
            else
            {
                Console.WriteLine($"ERROR: Invalid visibility '{args[1]}'. Must be 'public' or 'private'.");
                return 1;
            }
        }
        else
        {
            // If invoked as `engineering-commons publish <name>`, default to public
            isPrivate = false;
        }

        string? allowedContributors = GetOptionValue(args, "--contributors", "-c");
        string? allowedReviewers = GetOptionValue(args, "--reviewers", "-r");
        string? allowedConsumers = GetOptionValue(args, "--consumers", "--installers");

        Console.WriteLine($"Updating visibility for '{artifactName}' to {(isPrivate ? "🔒 PRIVATE" : "🌐 PUBLIC")}...");

        var success = _backend.UpdateVisibilityAsync(artifactName, isPrivate, allowedContributors, allowedReviewers, allowedConsumers).GetAwaiter().GetResult();
        if (success)
        {
            Console.WriteLine($"✓ SUCCESS: Artifact '{artifactName}' visibility updated to {(isPrivate ? "🔒 PRIVATE" : "🌐 PUBLIC")}.");
            if (isPrivate)
            {
                Console.WriteLine("  Restricted Team Access Configured:");
                Console.WriteLine($"  • Allowed Contributors: {(!string.IsNullOrEmpty(allowedContributors) ? allowedContributors : "(Only owner)")}");
                Console.WriteLine($"  • Designated Reviewers: {(!string.IsNullOrEmpty(allowedReviewers) ? allowedReviewers : "(All reviewers)")}");
                Console.WriteLine($"  • Allowed Consumers:    {(!string.IsNullOrEmpty(allowedConsumers) ? allowedConsumers : "(Only owner)")}");
            }
            else
            {
                Console.WriteLine("  This artifact is now PUBLIC and available to all team members in the marketplace.");
            }
            return 0;
        }
        else
        {
            Console.WriteLine($"ERROR: Failed to update visibility for '{artifactName}'. Ensure you are the original producer.");
            return 1;
        }
    }

    private static string? GetOptionValue(string[] args, params string[] optionNames)
    {
        for (int i = 0; i < args.Length; i++)
        {
            foreach (var opt in optionNames)
            {
                if (args[i].Equals(opt, StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length && !args[i + 1].StartsWith('-'))
                {
                    return args[i + 1].Trim();
                }
                if (args[i].StartsWith(opt + "=", StringComparison.OrdinalIgnoreCase))
                {
                    return args[i].Substring(opt.Length + 1).Trim();
                }
            }
        }
        return null;
    }
}
