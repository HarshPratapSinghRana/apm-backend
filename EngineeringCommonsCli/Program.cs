// =========================================================================================
// CIP #1067 – Engineering Commons CLI Console Entry Point (C# / .NET 10)
// =========================================================================================
//
// Key Responsibilities:
// 1. Dependency Injection: Registers authentication stores, SharePoint Graph clients, backend clients,
//    and artifact lifecycle managers (classifiers, metadata, placement, diff renderers).
// 2. Command Dispatch: Parses command-line verbs (login, sso, list, install, contribute, review, etc.)
//    and routes execution to dedicated command handler classes.
// 3. User Session Management: Persists authentication tokens and custom backend URLs into ~/.engineering-commons.
// =========================================================================================

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using EngineeringCommonsCli.Commands;
using EngineeringCommonsCli.Services.Implementations;
using EngineeringCommonsCli.Services.Interfaces;

var builder = Host.CreateDefaultBuilder(args)
    .ConfigureLogging(logging =>
    {
        logging.ClearProviders();
        logging.AddConsole();
    })
    .ConfigureServices((context, services) =>
    {
        // =========================================================================
        // SECTION 1: Service Layer & Dependency Injection Setup
        // =========================================================================
        services.AddSingleton<EngineeringCommonsCli.Services.Interfaces.IAuthTokenStore, EngineeringCommonsCli.Services.Implementations.FileAuthTokenStore>();
        services.AddSingleton<ICliDiskCache, CliDiskCache>();
        services.AddSingleton<ISharePointGraphClient, SharePointGraphClient>();
        services.AddSingleton<ISsoAuthService, MicrosoftSsoAuthService>();
        services.AddSingleton<IBackendClient, BackendClient>();
        services.AddSingleton<IAuthenticationService, AuthenticationService>();
        services.AddSingleton<ICipService, CipService>();
        services.AddSingleton<IArtifactClassifier, ArtifactClassifier>();
        services.AddSingleton<IArtifactMetadataService, ArtifactMetadataService>();
        services.AddSingleton<IArtifactDiscoveryService, ArtifactDiscoveryService>();
        services.AddSingleton<IArtifactPlacementService, ArtifactPlacementService>();
        services.AddSingleton<IUnifiedDiffRenderer, UnifiedDiffRenderer>();
        services.AddSingleton<IWorkspaceContextExtractor, WorkspaceContextExtractor>();

        // =========================================================================
        // SECTION 2: Command Handler Registrations
        // =========================================================================
        services.AddTransient<LoginCommand>();
        services.AddTransient<ListCommand>();
        services.AddTransient<InstallCommand>();
        services.AddTransient<UpdateCommand>();
        services.AddTransient<ContributeCommand>();
        services.AddTransient<ReviewCommand>();
        services.AddTransient<StatusCommand>();
        services.AddTransient<ListVersionsCommand>();
        services.AddTransient<VisibilityCommand>();
        services.AddTransient<UseCommand>();
        services.AddTransient<CertificationCommand>();
        services.AddTransient<RecommendCommand>();
        services.AddTransient<AccessCommand>();
        services.AddTransient<BountyCommand>();
    })
    .Build();

// Simple CLI via DragonFruit: map positional args to static methods on commands
// We'll expose thin wrappers that resolve services and run.

if (args.Length == 0)
{
    Console.WriteLine("Engineering Commons CLI\nUsage: engineering-commons [login|sso|list|install|update|recommend|use|invoke|contribute|visibility|publish|certification|review|status|submissions|list-versions|access|bounty]");
    return 0;
}

// =========================================================================
// SECTION 3: Command Routing & Execution Switch Dispatcher
// =========================================================================
var cmd = args[0].ToLowerInvariant();
var remaining = args.Skip(1).ToArray();

using var scope = builder.Services.CreateScope();
var svc = scope.ServiceProvider;

try
{
    return cmd switch
    {
        "help" or "--help" or "-h" => ShowHelp(),
        "login" => svc.GetRequiredService<LoginCommand>().Invoke(remaining),
        "sso" or "sso-login" => svc.GetRequiredService<LoginCommand>().Invoke(new[] { "--sso" }.Concat(remaining).ToArray()),
        "list" => svc.GetRequiredService<ListCommand>().Invoke(remaining),
        "install" => svc.GetRequiredService<InstallCommand>().Invoke(remaining),
        "update" => svc.GetRequiredService<UpdateCommand>().Invoke(remaining),
        "recommend" or "suggest" => svc.GetRequiredService<RecommendCommand>().Invoke(remaining),
        "use" or "invoke" or "run" => svc.GetRequiredService<UseCommand>().Invoke(remaining),
        "contribute" => svc.GetRequiredService<ContributeCommand>().Invoke(remaining),
        "visibility" or "set-visibility" or "publish" => svc.GetRequiredService<VisibilityCommand>().Invoke(remaining),
        "certification" or "cert" or "certify" => svc.GetRequiredService<CertificationCommand>().Invoke(remaining),
        "review" => svc.GetRequiredService<ReviewCommand>().Invoke(remaining),
        "comment" => svc.GetRequiredService<ReviewCommand>().Invoke(new[] { "comment" }.Concat(remaining).ToArray()),
        "reply" => svc.GetRequiredService<ReviewCommand>().Invoke(new[] { "reply" }.Concat(remaining).ToArray()),
        "request-changes" => svc.GetRequiredService<ReviewCommand>().Invoke(new[] { "request-changes" }.Concat(remaining).ToArray()),
        "status" or "submissions" or "my-reviews" => svc.GetRequiredService<StatusCommand>().Invoke(remaining),
        "list-versions" or "versions" => svc.GetRequiredService<ListVersionsCommand>().Invoke(remaining),
        "access" => svc.GetRequiredService<AccessCommand>().Invoke(remaining),
        "request-access" or "request-role" => svc.GetRequiredService<AccessCommand>().Invoke(new[] { "request" }.Concat(remaining).ToArray()),
        "access-status" or "my-requests" => svc.GetRequiredService<AccessCommand>().Invoke(new[] { "my-requests" }.Concat(remaining).ToArray()),
        "access-requests" or "admin-requests" => svc.GetRequiredService<AccessCommand>().Invoke(new[] { "list" }.Concat(remaining).ToArray()),
        "approve-access" => svc.GetRequiredService<AccessCommand>().Invoke(new[] { "approve" }.Concat(remaining).ToArray()),
        "reject-access" => svc.GetRequiredService<AccessCommand>().Invoke(new[] { "reject" }.Concat(remaining).ToArray()),
        "revoke-access" => svc.GetRequiredService<AccessCommand>().Invoke(new[] { "revoke" }.Concat(remaining).ToArray()),
        "certify-reviewer" => svc.GetRequiredService<AccessCommand>().Invoke(new[] { "certify" }.Concat(remaining).ToArray()),
        "roles" or "list-roles" => svc.GetRequiredService<AccessCommand>().Invoke(new[] { "roles" }.Concat(remaining).ToArray()),
        "bounty" or "bounties" => svc.GetRequiredService<BountyCommand>().Invoke(remaining),
        "set-url" or "backend" or "config" => HandleSetUrl(remaining),
        "logout" => HandleLogout(svc),
        _ => Unknown()
    };
}
catch (Exception ex)
{
    Console.WriteLine($"ERROR: {ex.Message}");
    return 1;
}

// =========================================================================
// SECTION 4: Auxiliary Command Helpers (Backend URL, Logout, Help Guide)
// =========================================================================
int HandleSetUrl(string[] args)
{
    var url = args.FirstOrDefault(a => !a.StartsWith('-'));
    if (string.IsNullOrWhiteSpace(url))
    {
        var current = BackendClient.ResolveBackendUrl();
        Console.WriteLine($"Current Engineering Commons Backend URL: {current}");
        Console.WriteLine("Usage: engineering-commons set-url <url> (e.g. https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io)");
        return 0;
    }

    url = url.Trim().TrimEnd('/');
    if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
    {
        Console.WriteLine("ERROR: URL must begin with http:// or https://");
        return 1;
    }

    var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
    var dir = Path.Combine(home, ".engineering-commons");
    if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);

    var cfgPath = Path.Combine(dir, "config.json");
    var obj = new Newtonsoft.Json.Linq.JObject();
    if (File.Exists(cfgPath))
    {
        try { obj = Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText(cfgPath)); } catch { }
    }
    obj["backendUrl"] = url;
    File.WriteAllText(cfgPath, obj.ToString());

    // Also update session.json if present
    var sessionPath = Path.Combine(dir, "session.json");
    if (File.Exists(sessionPath))
    {
        try
        {
            var sObj = Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText(sessionPath));
            sObj["backendUrl"] = url;
            File.WriteAllText(sessionPath, sObj.ToString());
        }
        catch { }
    }

    Console.WriteLine($"✓ Engineering Commons Backend URL configured to: {url}");
    return 0;
}

int HandleLogout(IServiceProvider svc)
{
    svc.GetRequiredService<EngineeringCommonsCli.Services.Interfaces.IAuthenticationService>().LogoutAsync().GetAwaiter().GetResult();
    Console.WriteLine("✓ Successfully logged out of Engineering Commons.");
    return 0;
}

int ShowHelp()
{
    Console.WriteLine("Engineering Commons CLI");
    Console.WriteLine("Usage: engineering-commons [command] [options]\n");
    Console.WriteLine("Commands:");
    Console.WriteLine("  login                     Login to Engineering Commons Registry (supports --sso)");
    Console.WriteLine("  sso                       Sign in using MAQ Microsoft SSO (device code or direct token)");
    Console.WriteLine("  logout                    Log out of current Engineering Commons session");
    Console.WriteLine("  list                      List available artifacts in registry");
    Console.WriteLine("  recommend [query] [-w]    Recommend relevant AI artifacts for query or workspace");
    Console.WriteLine("  install <pkg>             Install artifact (e.g. org/pkg#v1.0.0)");
    Console.WriteLine("  update <pkg>              Update installed artifact");
    Console.WriteLine("  contribute <dir>          Submit/contribute artifact to registry");
    Console.WriteLine("  visibility <name> <vis>   Set visibility (public|private|unlisted)");
    Console.WriteLine("  certification <subcmd>    Check, evaluate, certify, or revoke certification");
    Console.WriteLine("  review <subcmd>           Review submission threads and submit feedback");
    Console.WriteLine("  status / submissions     View my submitted artifacts and status");
    Console.WriteLine("  list-versions <name>      List published versions of an artifact");
    Console.WriteLine("  use / invoke <name>       Execute an installed skill or agent");
    Console.WriteLine("  roles / list-roles        View SQLite directory of user IDs and assigned roles");
    Console.WriteLine("  request-access [role]     Request Reviewer or Certified Reviewer access");
    Console.WriteLine("  access-status             Check current role and access request status");
    Console.WriteLine("  access-requests           Admin: Review pending role access requests");
    Console.WriteLine("  approve-access <id>       Admin: Approve reviewer access request");
    Console.WriteLine("  revoke-access <email>     Admin: Revoke reviewer privileges (reverts to producer)");
    Console.WriteLine("  certify-reviewer <email>  Admin: Promote reviewer to Certified Reviewer");
    Console.WriteLine("  bounty                    Browse, claim, submit, and manage engineering bounties");
    Console.WriteLine("  help / --help             Display this help guide");
    return 0;
}

int Unknown()
{
    Console.WriteLine($"Unknown command: {cmd}");
    Console.WriteLine("Run 'engineering-commons help' or 'engineering-commons --help' to view available commands.");
    return 2;
}
