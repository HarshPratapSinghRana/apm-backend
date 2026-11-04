using EngineeringCommonsCli.Services.Interfaces;

namespace EngineeringCommonsCli.Commands;

public class ListCommand
{
    private readonly IBackendClient _backend;
    private readonly IAuthenticationService _authProvider;
    public ListCommand(IBackendClient backend, IAuthenticationService authProvider) { _backend = backend; _authProvider = authProvider; }

    public int Invoke(string[] args)
    {
        string? typeFilter = null;
        string? sourceFilter = null;
        string? domainFilter = null;
        bool forceRefresh = false;
        bool copilotReadyOnly = false;

        for (int i = 0; i < args.Length; i++)
        {
            if (args[i].Equals("--refresh", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-r", StringComparison.OrdinalIgnoreCase))
            {
                forceRefresh = true;
            }
            else if (args[i].Equals("--copilot-ready", StringComparison.OrdinalIgnoreCase) || args[i].Equals("--usable", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-u", StringComparison.OrdinalIgnoreCase))
            {
                copilotReadyOnly = true;
            }
            else if (args[i].Equals("--leap", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-l", StringComparison.OrdinalIgnoreCase))
            {
                sourceFilter = "AI_LEAP";
            }
            else if (args[i].Equals("--source", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                sourceFilter = args[i + 1].ToUpperInvariant();
                i++;
            }
            else if (args[i].Equals("--domain", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                domainFilter = args[i + 1];
                i++;
            }
            else if (args[i].Equals("--type", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                typeFilter = args[i + 1];
                i++;
            }
            else if (args[i].Equals("--token-optimization", StringComparison.OrdinalIgnoreCase) || args[i].Equals("--token-opt", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-t", StringComparison.OrdinalIgnoreCase))
            {
                typeFilter = "token-optimization";
            }
            else if (!args[i].StartsWith('-'))
            {
                if (args[i].Equals("leap", StringComparison.OrdinalIgnoreCase) || args[i].Equals("ai-leap", StringComparison.OrdinalIgnoreCase))
                {
                    sourceFilter = "AI_LEAP";
                }
                else if (args[i].Equals("token-optimization", StringComparison.OrdinalIgnoreCase) || args[i].Equals("token-opt", StringComparison.OrdinalIgnoreCase) || args[i].Equals("tokens", StringComparison.OrdinalIgnoreCase))
                {
                    typeFilter = "token-optimization";
                }
                else if (args[i].Equals("copilot-ready", StringComparison.OrdinalIgnoreCase) || args[i].Equals("usable", StringComparison.OrdinalIgnoreCase))
                {
                    copilotReadyOnly = true;
                }
                else
                {
                    typeFilter = args[i];
                }
            }
        }

        // Authentication check
        var session = _authProvider.CurrentSessionAsync().GetAwaiter().GetResult();
        if (session == null)
        {
            Console.WriteLine("ERROR: You are not logged in. Run:\n  engineering-commons login");
            return 1;
        }

        var items = _backend.ListArtifactsAsync(typeFilter, forceRefresh).GetAwaiter().GetResult()?.ToList() ?? new List<ArtifactSpec>();

        if (copilotReadyOnly)
        {
            items = items.Where(it => it.IsCopilotReady || it.Usability == "copilot-ready" || !string.Equals(it.Source, "AI_LEAP", StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (!string.IsNullOrEmpty(sourceFilter))
        {
            if (sourceFilter.Equals("AI_LEAP", StringComparison.OrdinalIgnoreCase) || sourceFilter.Equals("AI-LEAP", StringComparison.OrdinalIgnoreCase) || sourceFilter.Equals("LEAP", StringComparison.OrdinalIgnoreCase))
            {
                items = items.Where(it => string.Equals(it.Source, "AI_LEAP", StringComparison.OrdinalIgnoreCase) || it.Name.StartsWith("leap-", StringComparison.OrdinalIgnoreCase)).ToList();
            }
            else if (sourceFilter.Equals("CIP", StringComparison.OrdinalIgnoreCase) || sourceFilter.Equals("NATIVE", StringComparison.OrdinalIgnoreCase))
            {
                items = items.Where(it => !string.Equals(it.Source, "AI_LEAP", StringComparison.OrdinalIgnoreCase) && !it.Name.StartsWith("leap-", StringComparison.OrdinalIgnoreCase)).ToList();
            }
        }

        if (!string.IsNullOrEmpty(domainFilter))
        {
            items = items.Where(it => string.Equals(it.Domain, domainFilter, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (!string.IsNullOrEmpty(typeFilter) && (typeFilter.Equals("token-optimization", StringComparison.OrdinalIgnoreCase) || typeFilter.Equals("token-opt", StringComparison.OrdinalIgnoreCase) || typeFilter.Equals("tokens", StringComparison.OrdinalIgnoreCase)))
        {
            var tokenOptNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "ponytail", "caveman", "token-optimization", "token-hygiene", "token-optimizer", "rtk", "token-coach", "token-optimization-advanced", "squeez"
            };
            items = items.Where(it => tokenOptNames.Contains(it.Name) ||
                                      string.Equals(it.Type, "token-optimization", StringComparison.OrdinalIgnoreCase) ||
                                      (!string.IsNullOrEmpty(it.Domain) && it.Domain.Contains("Token", StringComparison.OrdinalIgnoreCase))).ToList();
        }

        if (!items.Any())
        {
            Console.WriteLine("\nNo artifacts found in the registry matching the specified filters.");
            Console.WriteLine("Tip: Ensure the backend API server is running or artifacts are loaded.");
            return 0;
        }

        var leapCount = items.Count(it => string.Equals(it.Source, "AI_LEAP", StringComparison.OrdinalIgnoreCase) || it.Name.StartsWith("leap-"));
        var nativeCount = items.Count - leapCount;
        var copilotCount = items.Count(it => it.IsCopilotReady || it.Usability == "copilot-ready" || !string.Equals(it.Source, "AI_LEAP", StringComparison.OrdinalIgnoreCase));

        Console.WriteLine("\n=========================================================================================");
        Console.WriteLine("                         ENGINEERING COMMONS ARTIFACT REGISTRY                          ");
        Console.WriteLine("=========================================================================================");
        Console.WriteLine($"Total: {items.Count} artifacts ({copilotCount} Copilot & Claude Ready, {leapCount} AI Leap, {nativeCount} Native Commons)\n");
        Console.WriteLine($"{"NAME",-32} {"TYPE",-8} {"USABILITY",-26} {"DOMAIN",-14} {"SOURCE",-10}");
        Console.WriteLine(new string('-', 94));

        foreach (var it in items)
        {
            var isLeap = string.Equals(it.Source, "AI_LEAP", StringComparison.OrdinalIgnoreCase) || it.Name.StartsWith("leap-");
            var sourceTag = isLeap ? "🚀 AI LEAP" : "⚡ CIP";
            var usabilityTag = it.UsabilityBadge ?? (it.IsCopilotReady || !isLeap ? "🤖 Copilot Ready" : (it.Usability == "solution-deck" ? "📑 Arch Deck" : "📦 Python Repo"));
            if (usabilityTag.Length > 25) usabilityTag = usabilityTag.Substring(0, 22) + "...";
            var domainTag = string.IsNullOrEmpty(it.Domain) ? "-" : it.Domain;
            if (domainTag.Length > 13) domainTag = domainTag.Substring(0, 10) + "...";
            var displayName = it.Name;
            if (displayName.Length > 31) displayName = displayName.Substring(0, 28) + "...";

            Console.WriteLine($"{displayName,-32} {it.Type,-8} {usabilityTag,-26} {domainTag,-14} {sourceTag,-10}");
        }
        Console.WriteLine(new string('-', 94));
        Console.WriteLine("Tip: Install any artifact into workspace using: engineering-commons install <name>");
        Console.WriteLine("Tip: Filter only directly usable Copilot agent prompts: engineering-commons list --copilot-ready\n");
        return 0;
    }
}
