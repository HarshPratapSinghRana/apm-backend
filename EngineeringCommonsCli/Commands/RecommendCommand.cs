using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;
using Newtonsoft.Json;

namespace EngineeringCommonsCli.Commands;

public class RecommendCommand
{
    private readonly IBackendClient _backend;
    private readonly IWorkspaceContextExtractor _contextExtractor;
    private readonly IAuthenticationService _authProvider;

    public RecommendCommand(IBackendClient backend, IWorkspaceContextExtractor contextExtractor, IAuthenticationService authProvider)
    {
        _backend = backend;
        _contextExtractor = contextExtractor;
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

        bool scanWorkspace = args.Any(a => a.Equals("--workspace", StringComparison.OrdinalIgnoreCase) || a.Equals("-w", StringComparison.OrdinalIgnoreCase));
        bool jsonOutput = args.Any(a => a.Equals("--json", StringComparison.OrdinalIgnoreCase));

        var queryParts = args.Where(a => !a.StartsWith('-')).ToList();
        string? query = queryParts.Count > 0 ? string.Join(" ", queryParts) : null;

        List<string>? techs = null;
        List<string>? deps = null;
        List<string>? exts = null;

        if (scanWorkspace || string.IsNullOrWhiteSpace(query))
        {
            var workspace = Directory.GetCurrentDirectory();
            Console.WriteLine($"Scanning workspace context safely (excluding secrets/binaries) in: {workspace}");
            var summary = _contextExtractor.ExtractSummaryAsync(workspace).GetAwaiter().GetResult();
            techs = summary.Technologies;
            deps = summary.Dependencies;
            exts = summary.FileExtensions;

            if (techs.Count > 0) Console.WriteLine($"  Detected Technologies : {string.Join(", ", techs)}");
            if (deps.Count > 0) Console.WriteLine($"  Detected Dependencies : {string.Join(", ", deps.Take(5))}{(deps.Count > 5 ? "..." : "")}");
            if (exts.Count > 0) Console.WriteLine($"  File Extensions       : {string.Join(", ", exts.Take(8))}");
        }

        Console.WriteLine("\nFetching artifact recommendations from backend...");
        var recommendations = _backend.GetRecommendationsAsync(query, techs, deps, exts).GetAwaiter().GetResult().ToList();

        if (jsonOutput)
        {
            Console.WriteLine(JsonConvert.SerializeObject(new { success = true, count = recommendations.Count, recommendations }, Formatting.Indented));
            return 0;
        }

        if (recommendations.Count == 0)
        {
            Console.WriteLine("\nNo matching AI artifacts found for your query/workspace.");
            Console.WriteLine("Try searching the full marketplace with: engineering-commons list");
            return 0;
        }

        Console.WriteLine($"\nFound {recommendations.Count} recommended artifact(s):\n");
        Console.WriteLine(new string('-', 80));
        foreach (var rec in recommendations)
        {
            var stars = new string('★', (int)Math.Round(rec.MatchScore * 5));
            Console.WriteLine($"• {rec.Name} ({rec.Type}) [v{rec.Version}] - Relevance: {rec.MatchScore:P0} {stars}");
            Console.WriteLine($"  Description : {rec.Description}");
            Console.WriteLine($"  Why matched : {rec.MatchReason}");
            Console.WriteLine($"  Install     : engineering-commons install {rec.Name}");
            Console.WriteLine(new string('-', 80));
        }

        return 0;
    }
}
