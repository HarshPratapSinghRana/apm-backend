using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;
using Newtonsoft.Json;

namespace EngineeringCommonsCli.Commands;

public class ContributeCommand
{
    private readonly IArtifactDiscoveryService _disc;
    private readonly IArtifactPlacementService _place;
    private readonly IBackendClient _backend;
    private readonly IAuthenticationService _authProvider;

    public ContributeCommand(IArtifactDiscoveryService disc, IArtifactPlacementService place, IBackendClient backend, IAuthenticationService authProvider)
    {
        _disc = disc;
        _place = place;
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

        var workspace = Directory.GetCurrentDirectory();
        var allDiscovered = _disc.DiscoverAsync(workspace).GetAwaiter().GetResult().ToList();
        var contributable = allDiscovered.Where(a => a.IsContributableArtifact).ToList();
        var nonArtifacts = allDiscovered.Where(a => !a.IsContributableArtifact).ToList();

        // Support structured JSON discovery mode for VS Code extension and automation
        if (args.Length > 0 && (args[0].Equals("--discover", StringComparison.OrdinalIgnoreCase) ||
                                args[0].Equals("--json", StringComparison.OrdinalIgnoreCase) ||
                                args[0].Equals("-d", StringComparison.OrdinalIgnoreCase)))
        {
            var json = JsonConvert.SerializeObject(new
            {
                success = true,
                count = contributable.Count,
                artifacts = contributable.Select(c => new
                {
                    name = c.Name,
                    type = c.Type.ToString(),
                    version = c.Version ?? "1.0.0",
                    rootPath = c.RootPath,
                    files = c.Files,
                    confidence = c.Confidence.ToString(),
                    reason = c.Reason,
                    parentPackage = c.ParentPackage
                })
            }, Formatting.Indented);
            Console.WriteLine(json);
            return 0;
        }

        bool hasExplicitVisibility = false;
        bool isPrivate = false;

        string? visOption = GetOptionValue(args, "--visibility", "-v");
        if (!string.IsNullOrEmpty(visOption))
        {
            hasExplicitVisibility = true;
            isPrivate = visOption.Equals("private", StringComparison.OrdinalIgnoreCase) || visOption.Equals("secret", StringComparison.OrdinalIgnoreCase);
        }
        else if (args.Any(a => a.Equals("--private", StringComparison.OrdinalIgnoreCase) || a.Equals("-p", StringComparison.OrdinalIgnoreCase)))
        {
            hasExplicitVisibility = true;
            isPrivate = true;
        }
        else if (args.Any(a => a.Equals("--public", StringComparison.OrdinalIgnoreCase)))
        {
            hasExplicitVisibility = true;
            isPrivate = false;
        }

        string? allowedContributors = GetOptionValue(args, "--contributors", "-c");
        string? allowedReviewers = GetOptionValue(args, "--reviewers", "-r");
        string? allowedConsumers = GetOptionValue(args, "--consumers", "--installers");

        var nonFlagArgs = new List<string>();
        for (int i = 0; i < args.Length; i++)
        {
            var a = args[i];
            if (a.StartsWith('-'))
            {
                if ((a.Equals("--contributors", StringComparison.OrdinalIgnoreCase) || a.Equals("-c", StringComparison.OrdinalIgnoreCase) ||
                     a.Equals("--reviewers", StringComparison.OrdinalIgnoreCase) || a.Equals("-r", StringComparison.OrdinalIgnoreCase) ||
                     a.Equals("--consumers", StringComparison.OrdinalIgnoreCase) || a.Equals("--installers", StringComparison.OrdinalIgnoreCase) ||
                     a.Equals("--visibility", StringComparison.OrdinalIgnoreCase) || a.Equals("-v", StringComparison.OrdinalIgnoreCase))
                    && i + 1 < args.Length && !args[i + 1].StartsWith('-'))
                {
                    i++; // skip value argument
                }
                continue;
            }
            nonFlagArgs.Add(a);
        }

        DiscoveredArtifact selected;
        if (nonFlagArgs.Count > 0)
        {
            var targetName = nonFlagArgs[0].Trim();
            var match = contributable.FirstOrDefault(f => f.Name.Equals(targetName, StringComparison.OrdinalIgnoreCase))
                     ?? contributable.FirstOrDefault(f => !string.IsNullOrEmpty(f.RootPath) && (f.RootPath.Equals(targetName, StringComparison.OrdinalIgnoreCase) || f.RootPath.Replace('\\', '/').Equals(targetName.Replace('\\', '/'), StringComparison.OrdinalIgnoreCase)))
                     ?? contributable.FirstOrDefault(f => f.Files.Any(file => file.Equals(targetName, StringComparison.OrdinalIgnoreCase) || file.Replace('\\', '/').Equals(targetName.Replace('\\', '/'), StringComparison.OrdinalIgnoreCase) || file.EndsWith(targetName, StringComparison.OrdinalIgnoreCase)));
            
            if (match == null)
            {
                var fullTarget = Path.IsPathRooted(targetName) ? targetName : Path.Combine(workspace, targetName);
                if (File.Exists(fullTarget))
                {
                    var rel = Path.GetRelativePath(workspace, fullTarget).Replace('\\', '/');
                    var ext = Path.GetExtension(fullTarget).ToLowerInvariant();
                    var name = Path.GetFileNameWithoutExtension(fullTarget).Replace(".agent", "").Replace(".prompt", "");
                    var type = ext == ".md" && fullTarget.Contains("agent") ? ArtifactType.Agent :
                               (ext == ".md" && fullTarget.Contains("skill") ? ArtifactType.Skill :
                               (ext == ".md" && fullTarget.Contains("prompt") ? ArtifactType.Prompt :
                               (ext == ".json" && fullTarget.Contains("plugin") ? ArtifactType.Plugin :
                               (ext == ".json" && fullTarget.Contains("mcp") ? ArtifactType.McpServer :
                               (ext == ".yml" || ext == ".yaml" ? ArtifactType.CipPackage : ArtifactType.Agent)))));
                    selected = new DiscoveredArtifact(name, type, "1.0.0", rel, new List<string> { rel }, null, DetectionConfidence.High, "User selected workspace file", true);
                }
                else if (Directory.Exists(fullTarget))
                {
                    var rel = Path.GetRelativePath(workspace, fullTarget).Replace('\\', '/');
                    var dirFiles = Directory.GetFiles(fullTarget, "*.*", SearchOption.AllDirectories)
                        .Select(f => Path.GetRelativePath(workspace, f).Replace('\\', '/'))
                        .ToList();
                    var name = Path.GetFileName(fullTarget.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar));
                    var type = fullTarget.Contains("agent") ? ArtifactType.Agent :
                               (fullTarget.Contains("skill") ? ArtifactType.Skill :
                               (fullTarget.Contains("plugin") ? ArtifactType.Plugin :
                               (fullTarget.Contains("mcp") ? ArtifactType.McpServer : ArtifactType.Agent)));
                    selected = new DiscoveredArtifact(name, type, "1.0.0", rel, dirFiles, null, DetectionConfidence.High, "User selected workspace directory", true);
                }
                else
                {
                    Console.WriteLine($"ERROR: Artifact '{targetName}' not found among contributable artifacts or workspace files.");
                    return 1;
                }
            }
            else
            {
                selected = match;
            }
        }
        else
        {
            Console.WriteLine($"Scanning workspace: {workspace} for AI artifacts...");

            if (!contributable.Any())
            {
                Console.WriteLine("No AI artifacts discovered in workspace.");
                if (nonArtifacts.Any())
                {
                    Console.WriteLine("\nDetected non-artifact / project configuration files (excluded from contribution):");
                    foreach (var na in nonArtifacts)
                    {
                        Console.WriteLine($"  - {na.Name} ({na.Type} - {na.Reason})");
                    }
                }
                return 1;
            }

            Console.WriteLine($"\nDiscovered {contributable.Count} AI artifact(s) / package(s) available to contribute:\n");
            for (int i = 0; i < contributable.Count; i++)
            {
                var item = contributable[i];
                var parentInfo = !string.IsNullOrEmpty(item.ParentPackage) ? $" | Parent: {item.ParentPackage}" : "";
                Console.WriteLine($"  [{i + 1}] Name: {item.Name} | Type: {item.Type} | Version: {item.Version}{parentInfo} | Confidence: {item.Confidence}");
                Console.WriteLine($"      Reason: {item.Reason}");
                Console.WriteLine($"      Files ({item.Files.Count()}):");
                foreach (var f in item.Files)
                {
                    Console.WriteLine($"        - {f}");
                }
            }

            if (nonArtifacts.Any())
            {
                Console.WriteLine($"\nFiltered {nonArtifacts.Count} normal / configuration file(s) (Not AI artifacts):");
                foreach (var na in nonArtifacts.Take(5))
                {
                    Console.WriteLine($"  • {na.Name} ({na.Type} - Not an AI artifact)");
                }
                if (nonArtifacts.Count > 5) Console.WriteLine($"  • ... and {nonArtifacts.Count - 5} more");
            }

            if (contributable.Count == 1)
            {
                selected = contributable[0];
                Console.WriteLine($"\nAutomatically selecting: {selected.Name}");
            }
            else
            {
                Console.Write($"\nSelect artifact to contribute [1-{contributable.Count}]: ");
                var input = Console.ReadLine()?.Trim();
                if (int.TryParse(input, out int choice) && choice >= 1 && choice <= contributable.Count)
                {
                    selected = contributable[choice - 1];
                }
                else
                {
                    selected = contributable[0];
                    Console.WriteLine($"Invalid selection. Defaulting to: {selected.Name}");
                }
            }
        }

        var artifactTypeStr = selected.Type.ToString().ToLowerInvariant();
        if (selected.Type == ArtifactType.Unknown)
        {
            Console.WriteLine("\nThe artifact type is Unknown. Please select the artifact type:");
            Console.WriteLine("  [1] Agent  [2] Skill  [3] Command  [4] Prompt  [5] Plugin  [6] McpServer  [7] CipPackage");
            Console.Write("Choice [1-7]: ");
            var typeChoice = Console.ReadLine()?.Trim();
            artifactTypeStr = typeChoice switch
            {
                "1" => "agent",
                "2" => "skill",
                "3" => "command",
                "4" => "prompt",
                "5" => "plugin",
                "6" => "mcp-server",
                "7" => "package",
                _ => "agent"
            };
        }

        if (!hasExplicitVisibility && !Console.IsInputRedirected)
        {
            Console.WriteLine($"\nSelect Visibility for '{selected.Name}':");
            Console.WriteLine("  [1] Public  - Available to entire team in Marketplace (Default)");
            Console.WriteLine("  [2] Private - Restricted access under development (whitelisted team members only)");
            Console.Write("Choice [1/2] (Default: 1): ");
            var visChoice = Console.ReadLine()?.Trim();
            if (visChoice == "2" || string.Equals(visChoice, "private", StringComparison.OrdinalIgnoreCase) || string.Equals(visChoice, "p", StringComparison.OrdinalIgnoreCase))
            {
                isPrivate = true;
                Console.WriteLine("Selected: 🔒 PRIVATE");

                if (string.IsNullOrWhiteSpace(allowedContributors))
                {
                    Console.Write("Allowed Contributors (comma-separated emails, or press Enter for owner only): ");
                    var contribInput = Console.ReadLine()?.Trim();
                    if (!string.IsNullOrWhiteSpace(contribInput)) allowedContributors = contribInput;
                }

                if (string.IsNullOrWhiteSpace(allowedReviewers))
                {
                    Console.Write("Designated Reviewers (comma-separated emails, or press Enter for all reviewers): ");
                    var revInput = Console.ReadLine()?.Trim();
                    if (!string.IsNullOrWhiteSpace(revInput)) allowedReviewers = revInput;
                }

                if (string.IsNullOrWhiteSpace(allowedConsumers))
                {
                    Console.Write("Allowed Consumers / Installers (comma-separated emails, or press Enter for owner only): ");
                    var consInput = Console.ReadLine()?.Trim();
                    if (!string.IsNullOrWhiteSpace(consInput)) allowedConsumers = consInput;
                }
            }
            else
            {
                isPrivate = false;
                Console.WriteLine("Selected: 🌐 PUBLIC");
            }
        }

        Console.WriteLine($"\nCollecting files for '{selected.Name}'...");
        var filePayloads = new List<object>();

        foreach (var relativeFilePath in selected.Files)
        {
            if (EngineeringCommonsCli.Services.Implementations.ArtifactDiscoveryService.IsSensitiveOrIgnoredFile(relativeFilePath))
                continue;

            var fullPath = Path.IsPathRooted(relativeFilePath) ? relativeFilePath : Path.Combine(workspace, relativeFilePath);
            if (EngineeringCommonsCli.Services.Implementations.ArtifactDiscoveryService.IsSensitiveOrIgnoredFile(fullPath))
                continue;

            string content = string.Empty;
            if (File.Exists(fullPath))
            {
                try 
                { 
                    content = File.ReadAllText(fullPath); 
                } 
                catch (Exception ex) 
                { 
                    Console.Error.WriteLine($"[ContributeCommand] Warning reading file '{fullPath}': {ex.Message}"); 
                }
            }

            var canonicalPath = relativeFilePath.Replace('\\', '/');
            if (!string.IsNullOrEmpty(selected.ParentPackage))
            {
                var prefix = selected.ParentPackage.Replace('\\', '/') + "/";
                if (canonicalPath.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    canonicalPath = canonicalPath.Substring(prefix.Length);
                }
            }
            var idxGithub = canonicalPath.IndexOf(".github/", StringComparison.OrdinalIgnoreCase);
            if (idxGithub > 0) canonicalPath = canonicalPath.Substring(idxGithub);
            var idxAgents = canonicalPath.IndexOf(".agents/", StringComparison.OrdinalIgnoreCase);
            if (idxAgents > 0) canonicalPath = canonicalPath.Substring(idxAgents);
            var idxSkills = canonicalPath.IndexOf("skills/", StringComparison.OrdinalIgnoreCase);
            if (idxSkills > 0 && !canonicalPath.StartsWith(".github/") && !canonicalPath.StartsWith(".agents/")) canonicalPath = canonicalPath.Substring(idxSkills);

            filePayloads.Add(new
            {
                path = canonicalPath,
                content = content
            });
        }

        var orgNamespace = Environment.GetEnvironmentVariable("ENGINEERING_COMMONS_ORG")
            ?? (!string.IsNullOrWhiteSpace(session?.Email) && session.Email.Contains('@')
                ? session.Email.Split('@')[0].Replace(".", "").ToLowerInvariant()
                : "harshpratapsinghrana1");

        var submissionPayload = JsonConvert.SerializeObject(new
        {
            name = selected.Name,
            type = artifactTypeStr,
            version = selected.Version ?? "1.0.0",
            description = $"AI Artifact submission for {selected.Name}",
            cipPackage = $"{orgNamespace}/{selected.Name}#v{selected.Version ?? "1.0.0"}",
            isPrivate = isPrivate,
            visibility = isPrivate ? "private" : "public",
            allowedContributors = allowedContributors,
            allowedReviewers = allowedReviewers,
            allowedConsumers = allowedConsumers,
            files = filePayloads
        }, Formatting.Indented);

        Console.WriteLine($"Submitting '{selected.Name}' ({artifactTypeStr}) [Visibility: {(isPrivate ? "🔒 PRIVATE" : "🌐 PUBLIC")}] to backend for review...");
        var submission = new ArtifactSubmission(selected.Name, artifactTypeStr, selected.Version ?? "1.0.0", submissionPayload);
        var res = _backend.SubmitArtifactAsync(submission).GetAwaiter().GetResult();

        if (res.Success)
        {
            if (res.IsDuplicate || res.IsUnchanged)
            {
                Console.WriteLine();
                Console.WriteLine("┌────────────────────────────────────────────────────────────┐");
                Console.WriteLine("│ Artifact Already Exists                                    │");
                Console.WriteLine("│                                                            │");
                Console.WriteLine($"│ {selected.Name,-59}│");
                Console.WriteLine("│                                                            │");
                Console.WriteLine("│ An identical artifact already exists in the marketplace.   │");
                Console.WriteLine("│                                                            │");
                Console.WriteLine($"│ Existing Version: {res.MatchedVersion ?? "1.0.0",-41}│");
                if (!string.IsNullOrEmpty(res.SubmittedVersion) && res.SubmittedVersion != res.MatchedVersion)
                {
                    Console.WriteLine($"│ Submitted Version: {res.SubmittedVersion,-40}│");
                }
                Console.WriteLine("│                                                            │");
                Console.WriteLine($"│ Files Compared: {res.FilesCompared,-43}│");
                Console.WriteLine($"│ Files Unchanged: {res.FilesUnchanged,-42}│");
                Console.WriteLine($"│ Files Changed: {res.FilesChanged,-44}│");
                Console.WriteLine("│                                                            │");
                Console.WriteLine("│ No changes were detected.                                  │");
                Console.WriteLine("│ Review request was NOT created.                            │");
                Console.WriteLine("└────────────────────────────────────────────────────────────┘");
                return 0;
            }

            Console.WriteLine($"\nSUCCESS: Artifact '{selected.Name}' submitted successfully!");
            Console.WriteLine($"Visibility: {(isPrivate ? "🔒 PRIVATE (Restricted Team Access)" : "🌐 PUBLIC (Discoverable by team in marketplace)")}");
            if (isPrivate)
            {
                Console.WriteLine($"  • Allowed Contributors: {(!string.IsNullOrEmpty(allowedContributors) ? allowedContributors : "(Only owner)")}");
                Console.WriteLine($"  • Designated Reviewers: {(!string.IsNullOrEmpty(allowedReviewers) ? allowedReviewers : "(All reviewers)")}");
                Console.WriteLine($"  • Allowed Consumers:    {(!string.IsNullOrEmpty(allowedConsumers) ? allowedConsumers : "(Only owner)")}");
            }
            if (res.FilesChanged > 0)
            {
                Console.WriteLine($"✓ Changes detected (Modified: {res.FilesModified}, Added: {res.FilesAdded}, Deleted: {res.FilesDeleted})");
            }
            if (!string.IsNullOrEmpty(res.ReviewId))
            {
                Console.WriteLine($"Review ID: {res.ReviewId}");
            }
            Console.WriteLine($"Status: {res.Status}");
            return 0;
        }
        else
        {
            Console.WriteLine($"\nERROR: Submission failed: {res.Status}");
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



