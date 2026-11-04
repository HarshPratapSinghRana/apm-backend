using System;
using System.Linq;
using EngineeringCommonsCli.Services.Interfaces;

namespace EngineeringCommonsCli.Commands;

public class ListVersionsCommand
{
    private readonly IBackendClient _backend;
    private readonly IAuthenticationService _authProvider;

    public ListVersionsCommand(IBackendClient backend, IAuthenticationService authProvider)
    {
        _backend = backend;
        _authProvider = authProvider;
    }

    public int Invoke(string[] args)
    {
        string? name = null;
        bool forceRefresh = false;

        for (int i = 0; i < args.Length; i++)
        {
            if (args[i].Equals("--refresh", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-r", StringComparison.OrdinalIgnoreCase))
            {
                forceRefresh = true;
            }
            else if (!args[i].StartsWith('-') && name == null)
            {
                name = args[i];
            }
        }

        if (string.IsNullOrEmpty(name))
        {
            Console.WriteLine("Usage: engineering-commons list-versions <artifact>");
            return 2;
        }

        // Authentication check
        var session = _authProvider.CurrentSessionAsync().GetAwaiter().GetResult();
        if (session == null)
        {
            Console.WriteLine("ERROR: You are not logged in. Run:\n  engineering-commons login");
            return 1;
        }

        var versions = _backend.GetArtifactVersionsAsync(name, forceRefresh).GetAwaiter().GetResult().ToList();
        if (versions.Count == 0)
        {
            Console.WriteLine($"Artifact '{name}' was not found in marketplace or has no published versions.");
            return 1;
        }

        Console.WriteLine($"Available versions for {name}:\n");
        foreach (var v in versions)
        {
            var tag = v.IsLatest ? "  (latest)" : "";
            Console.WriteLine($"{v.Version}{tag}");
        }

        return 0;
    }
}
