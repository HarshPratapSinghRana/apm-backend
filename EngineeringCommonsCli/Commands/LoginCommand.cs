using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Implementations;
using EngineeringCommonsCli.Services.Interfaces;

namespace EngineeringCommonsCli.Commands;

public class LoginCommand
{
    private readonly IAuthenticationService _auth;
    private readonly ISsoAuthService _ssoService;

    public LoginCommand(IAuthenticationService auth, ISsoAuthService? ssoService = null)
    {
        _auth = auth;
        _ssoService = ssoService ?? new MicrosoftSsoAuthService();
    }

    public int Invoke(string[] args)
    {
        if (Array.Exists(args, a => a.Equals("--help", StringComparison.OrdinalIgnoreCase) || a.Equals("-h", StringComparison.OrdinalIgnoreCase)))
        {
            ShowHelp();
            return 0;
        }

        string email = string.Empty;
        string pwd = string.Empty;
        bool isSso = false;
        bool isCredentials = false;
        string? ssoToken = null;
        bool force = false;
        string? role = null;
        string? tenantId = null;
        string? clientId = null;
        bool autoOpenBrowser = true;

        for (int i = 0; i < args.Length; i++)
        {
            var arg = args[i];
            if (arg.Equals("--sso", StringComparison.OrdinalIgnoreCase) || arg.Equals("-s", StringComparison.OrdinalIgnoreCase))
            {
                isSso = true;
            }
            else if (arg.Equals("--credentials", StringComparison.OrdinalIgnoreCase) || arg.Equals("-c", StringComparison.OrdinalIgnoreCase))
            {
                isCredentials = true;
            }
            else if (arg.Equals("--force", StringComparison.OrdinalIgnoreCase) || arg.Equals("-f", StringComparison.OrdinalIgnoreCase))
            {
                force = true;
            }
            else if (arg.Equals("--no-browser", StringComparison.OrdinalIgnoreCase))
            {
                autoOpenBrowser = false;
            }
            else if (arg.Equals("--token", StringComparison.OrdinalIgnoreCase) || arg.Equals("-t", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length) { ssoToken = args[i + 1]; i++; }
            }
            else if (arg.Equals("--role", StringComparison.OrdinalIgnoreCase) || arg.Equals("-r", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length) { role = args[i + 1]; i++; }
            }
            else if (arg.Equals("--tenant-id", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length) { tenantId = args[i + 1]; i++; }
            }
            else if (arg.Equals("--client-id", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length) { clientId = args[i + 1]; i++; }
            }
            else if (arg.Equals("--email", StringComparison.OrdinalIgnoreCase) || arg.Equals("-e", StringComparison.OrdinalIgnoreCase) ||
                     arg.Equals("--user", StringComparison.OrdinalIgnoreCase) || arg.Equals("-u", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length) { email = args[i + 1]; i++; }
            }
            else if (arg.Equals("--password", StringComparison.OrdinalIgnoreCase) || arg.Equals("-p", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length) { pwd = args[i + 1]; i++; }
            }
            else if (string.IsNullOrEmpty(email) && !arg.StartsWith('-'))
            {
                email = arg;
            }
            else if (string.IsNullOrEmpty(pwd) && !arg.StartsWith('-'))
            {
                pwd = arg;
            }
        }

        // Determine sign-in mode:
        // By default, 'engineering-commons login' uses MAQ Microsoft SSO.
        // Credential sign-in is only used if explicitly requested (--credentials, -c) or password is provided.
        bool useCredentials = isCredentials || (!string.IsNullOrEmpty(pwd) && !isSso);

        if (!useCredentials)
        {
            return HandleSsoLogin(new SsoCommandOptions(
                Token: ssoToken,
                Email: !string.IsNullOrWhiteSpace(email) ? email : null,
                Role: role,
                Force: force,
                TenantId: tenantId,
                ClientId: clientId,
                AutoOpenBrowser: autoOpenBrowser));
        }

        if (string.IsNullOrEmpty(email))
        {
            Console.Write("Email: ");
            email = Console.ReadLine()?.Trim() ?? string.Empty;
        }
        if (string.IsNullOrEmpty(pwd))
        {
            Console.Write("Password: ");
            pwd = ReadPassword();
        }

        var t = _auth.LoginAsync(email, pwd).GetAwaiter().GetResult();
        if (t == null)
        {
            Console.WriteLine("\nERROR: Login failed. Check credentials and try again.");
            return 1;
        }

        var displayRole = !string.IsNullOrWhiteSpace(t.Role) ? t.Role : "PRODUCER";
        Console.WriteLine($"\n✓ Login successful as {t.Email} (Role: {displayRole})");
        return 0;
    }

    private int HandleSsoLogin(SsoCommandOptions options)
    {
        // 1. Check existing active session if --force is NOT passed
        if (!options.Force)
        {
            var current = _auth.CurrentSessionAsync().GetAwaiter().GetResult();
            if (current != null && !string.IsNullOrWhiteSpace(current.Email) && !string.IsNullOrWhiteSpace(current.Token))
            {
                var isSsoSession = string.Equals(current.AuthType, "microsoft_sso", StringComparison.OrdinalIgnoreCase)
                                   || current.Email.EndsWith("@maqsoftware.com", StringComparison.OrdinalIgnoreCase);

                if (isSsoSession)
                {
                    var currentRole = !string.IsNullOrWhiteSpace(current.Role) ? current.Role : "PRODUCER";
                    Console.WriteLine($"\n✓ Authenticated via active MAQ Microsoft SSO session: {current.Email} (Role: {currentRole})");
                    Console.WriteLine("Tip: Use 'engineering-commons login --force' (or 'engineering-commons sso -f') to switch accounts.");
                    return 0;
                }
            }
        }

        // 2. Direct token supplied (e.g. CI/CD or automation)
        if (!string.IsNullOrWhiteSpace(options.Token))
        {
            Console.WriteLine("\nAuthenticating with provided Microsoft SSO Bearer token...");
            var ssoSession = _auth.SsoLoginAsync(options.Token, options.Email, options.Email, options.Role).GetAwaiter().GetResult();
            if (ssoSession == null)
            {
                Console.WriteLine("\nERROR: Microsoft SSO authorization failed. The provided token was rejected by Engineering Commons Backend.");
                return 1;
            }

            var activeRole = !string.IsNullOrWhiteSpace(ssoSession.Role) ? ssoSession.Role : "PRODUCER";
            Console.WriteLine($"\n✓ MAQ Microsoft SSO authorization successful!");
            Console.WriteLine($"✓ Signed in as: {ssoSession.Email} (Role: {activeRole})");
            Console.WriteLine("Session synced to ~/.engineering-commons/session.json");
            return 0;
        }

        // 3. Interactive Microsoft Entra ID Device Code Flow
        Console.WriteLine("\nInitiating MAQ Microsoft SSO authentication...");
        var authOptions = new SsoAuthOptions(
            TenantId: options.TenantId,
            ClientId: options.ClientId,
            AutoOpenBrowser: options.AutoOpenBrowser,
            OutputWriter: Console.Out);

        var authResult = _ssoService.AcquireTokenInteractiveAsync(authOptions).GetAwaiter().GetResult();
        if (!authResult.Success || string.IsNullOrEmpty(authResult.AccessToken))
        {
            Console.WriteLine($"\nNotice: Interactive device login could not be completed.");
            if (!string.IsNullOrWhiteSpace(authResult.Error))
            {
                Console.WriteLine($"Detail: {authResult.Error}");
            }
            Console.WriteLine();
            Console.WriteLine("Options to proceed:");
            Console.WriteLine("  1. Sign in with 1-click in VS Code via the Engineering Commons sidebar.");
            Console.WriteLine("  2. Pass a token directly: engineering-commons login --token <token> [--email <email>]");
            Console.WriteLine("  3. Use credentials: engineering-commons login --credentials");
            return 1;
        }

        var resolvedEmail = !string.IsNullOrWhiteSpace(options.Email) ? options.Email : authResult.Email;
        var resolvedName = authResult.DisplayName ?? resolvedEmail;

        // Exchange Microsoft token with Engineering Commons backend /api/auth/sso
        var session = _auth.SsoLoginAsync(authResult.AccessToken, resolvedEmail, resolvedName, options.Role).GetAwaiter().GetResult();
        if (session == null)
        {
            Console.WriteLine("\nERROR: Microsoft SSO token was acquired, but Engineering Commons backend rejected the session.");
            return 1;
        }

        var finalRole = !string.IsNullOrWhiteSpace(session.Role) ? session.Role : "PRODUCER";
        Console.WriteLine($"\n✓ MAQ Microsoft SSO authorization successful!");
        Console.WriteLine($"✓ Signed in as: {session.Email} (Role: {finalRole})");
        Console.WriteLine("Session synced to ~/.engineering-commons/session.json");
        return 0;
    }

    private void ShowHelp()
    {
        Console.WriteLine("Usage: engineering-commons login [options] [email] [password]");
        Console.WriteLine("       engineering-commons sso [options]");
        Console.WriteLine();
        Console.WriteLine("Options:");
        Console.WriteLine("  -s, --sso              Sign in using MAQ Microsoft SSO (Default)");
        Console.WriteLine("  -c, --credentials      Sign in using Email and Password");
        Console.WriteLine("  -t, --token <token>    Direct Microsoft SSO Bearer token (for CI/CD or automation)");
        Console.WriteLine("  -f, --force            Force new authentication even if an active session exists");
        Console.WriteLine("  -e, --email <email>    Email address for sign-in or SSO user hint");
        Console.WriteLine("  -p, --password <pwd>   Password for credential sign-in");
        Console.WriteLine("  -r, --role <role>      Requested role (PRODUCER, REVIEWER, CONSUMER)");
        Console.WriteLine("      --tenant-id <id>   Custom Microsoft Entra ID Tenant ID");
        Console.WriteLine("      --client-id <id>   Custom Microsoft Entra ID Client ID");
        Console.WriteLine("      --no-browser       Do not automatically open default browser for device code");
        Console.WriteLine("  -h, --help             Show help information");
    }

    private string ReadPassword()
    {
        if (Console.IsInputRedirected)
        {
            return Console.ReadLine()?.Trim() ?? string.Empty;
        }

        try
        {
            var pwd = string.Empty;
            ConsoleKeyInfo key;
            while ((key = Console.ReadKey(true)).Key != ConsoleKey.Enter)
            {
                if (key.Key == ConsoleKey.Backspace && pwd.Length > 0)
                {
                    pwd = pwd[0..^1];
                }
                else if (!char.IsControl(key.KeyChar))
                {
                    pwd += key.KeyChar;
                }
            }
            Console.WriteLine();
            return pwd;
        }
        catch (InvalidOperationException)
        {
            return Console.ReadLine()?.Trim() ?? string.Empty;
        }
    }

    private record SsoCommandOptions(
        string? Token,
        string? Email,
        string? Role,
        bool Force,
        string? TenantId,
        string? ClientId,
        bool AutoOpenBrowser);
}
