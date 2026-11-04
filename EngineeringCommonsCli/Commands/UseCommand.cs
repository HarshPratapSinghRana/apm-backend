using System;
using System.Linq;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Implementations;
using EngineeringCommonsCli.Services.Interfaces;

namespace EngineeringCommonsCli.Commands;

public class UseCommand
{
    private readonly IBackendClient _backend;
    private readonly IAuthenticationService _authProvider;
    private readonly IArtifactClassifier _classifier;

    public UseCommand(IBackendClient backend, IAuthenticationService authProvider, IArtifactClassifier? classifier = null)
    {
        _backend = backend;
        _authProvider = authProvider;
        _classifier = classifier ?? new ArtifactClassifier();
    }

    public int Invoke(string[] args)
    {
        string? name = null;
        string? version = "1.0.0";
        string? source = "CLI";
        string eventType = "INVOKE";

        for (int i = 0; i < args.Length; i++)
        {
            if (args[i].Equals("--version", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-v", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length)
                {
                    version = args[i + 1];
                    i++;
                }
            }
            else if (args[i].Equals("--source", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-s", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length)
                {
                    source = args[i + 1];
                    i++;
                }
            }
            else if (args[i].Equals("--action", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-a", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length)
                {
                    eventType = args[i + 1].ToUpperInvariant();
                    i++;
                }
            }
            else if (name == null)
            {
                name = args[i];
            }
        }

        if (string.IsNullOrEmpty(name))
        {
            Console.WriteLine("Usage: engineering-commons use <artifact> [--version <version>] [--source <source>]");
            return 2;
        }

        var session = _authProvider.CurrentSessionAsync().GetAwaiter().GetResult();
        if (session == null)
        {
            Console.WriteLine("ERROR: You are not logged in. Run:\n  engineering-commons login");
            return 1;
        }

        var artifactType = _classifier.Classify(name).Type.ToString().ToLowerInvariant();
        var platform = source.Contains("COPILOT", StringComparison.OrdinalIgnoreCase) ? "GitHubCopilot" :
                      (source.Contains("CLAUDE", StringComparison.OrdinalIgnoreCase) ? "Claude" :
                      (source.Contains("ANTIGRAVITY", StringComparison.OrdinalIgnoreCase) ? "Antigravity" : "EngineeringCommons"));

        try
        {
            _backend.SendUsageEventAsync(eventType, name, version, artifactType, metadata: $"Invoked via CLI (--source {source})", sessionId: null, source: source, platform: platform).GetAwaiter().GetResult();
            Console.WriteLine($"\n✓ Recorded {eventType} event for artifact '{name}' (v{version}, type: {artifactType}) [Source: {source}, Platform: {platform}].");
            return 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ERROR: Failed to record usage event: {ex.Message}");
            return 1;
        }
    }
}
