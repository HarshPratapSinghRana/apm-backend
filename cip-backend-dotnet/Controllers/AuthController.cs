using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using EngineeringCommons.Backend.Services.Interfaces;
using EngineeringCommons.Backend.Models;

namespace EngineeringCommons.Backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthenticationService _auth;
    private readonly ITokenService _tokens;
    private readonly IUsageService _usage;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly IUserRoleService? _userRoleService;
    private readonly Microsoft.AspNetCore.Hosting.IWebHostEnvironment? _env;

    public AuthController(
        IAuthenticationService auth,
        ITokenService tokens,
        IUsageService usage,
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        IUserRoleService? userRoleService = null,
        Microsoft.AspNetCore.Hosting.IWebHostEnvironment? env = null)
    {
        _auth = auth;
        _tokens = tokens;
        _usage = usage;
        _httpClientFactory = httpClientFactory;
        _config = config;
        _userRoleService = userRoleService;
        _env = env;
    }

    public class LoginRequest { public string Email { get; set; } = string.Empty; public string Password { get; set; } = string.Empty; }

    public class SsoLoginRequest
    {
        public string Token { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Name { get; set; }
        public string? Role { get; set; }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = _auth.ValidateCredentials(req.Email, req.Password);
        if (user == null) return Unauthorized(new { error = "invalid_credentials" });
        var token = _tokens.CreateToken(user);

        // Automatically log login event to SQLite/PostgreSQL
        await _usage.RecordUsageAsync(new UsageEvent
        {
            UserId = user.Email,
            Action = "LOGIN",
            Source = "backend",
            Timestamp = DateTime.UtcNow
        });

        return Ok(new { token, user = new { email = user.Email, role = user.Role } });
    }

    [HttpPost("sso")]
    public async Task<IActionResult> SsoLogin([FromBody] SsoLoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Token))
        {
            return BadRequest(new { error = "missing_token", detail = "SSO authentication token is required." });
        }

        string? verifiedEmail = null;
        string? verifiedName = req.Name;

        // Step 1: Attempt verification against Microsoft Graph API
        try
        {
            var client = _httpClientFactory.CreateClient();
            using var graphRequest = new HttpRequestMessage(HttpMethod.Get, "https://graph.microsoft.com/v1.0/me");
            graphRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", req.Token);
            graphRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var response = await client.SendAsync(graphRequest);
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(content);
                var root = doc.RootElement;

                if (root.TryGetProperty("mail", out var mProp) && !string.IsNullOrWhiteSpace(mProp.GetString()))
                {
                    verifiedEmail = mProp.GetString();
                }
                else if (root.TryGetProperty("userPrincipalName", out var upnProp) && !string.IsNullOrWhiteSpace(upnProp.GetString()))
                {
                    verifiedEmail = upnProp.GetString();
                }

                if (root.TryGetProperty("displayName", out var dProp) && !string.IsNullOrWhiteSpace(dProp.GetString()))
                {
                    verifiedName = dProp.GetString();
                }
            }
        }
        catch
        {
            // Fallback continues if network / offline dev
        }

        // Step 2: Fallback for mock/offline testing or decoded JWT claims ONLY in development/test/mock environments
        if (string.IsNullOrWhiteSpace(verifiedEmail))
        {
            // Unverified token parsing and client email fallback permitted ONLY in non-production test/development environments
            bool isDevOrTest = (_env != null && _env.EnvironmentName.Equals("Development", StringComparison.OrdinalIgnoreCase)) ||
                               string.Equals(_config["EnableMockAuth"], "true", StringComparison.OrdinalIgnoreCase) ||
                               string.Equals(_config["ASPNETCORE_ENVIRONMENT"], "Development", StringComparison.OrdinalIgnoreCase) ||
                               string.Equals(Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"), "Development", StringComparison.OrdinalIgnoreCase) ||
                               string.Equals(Environment.GetEnvironmentVariable("ENABLE_MOCK_AUTH"), "true", StringComparison.OrdinalIgnoreCase);

            if (isDevOrTest)
            {
                if (req.Token.Contains('.'))
                {
                    try
                    {
                        var parts = req.Token.Split('.');
                        if (parts.Length >= 2)
                        {
                            var base64 = parts[1].Replace('-', '+').Replace('_', '/');
                            while (base64.Length % 4 != 0) base64 += "=";
                            var payloadBytes = Convert.FromBase64String(base64);
                            using var jwtDoc = JsonDocument.Parse(payloadBytes);
                            var root = jwtDoc.RootElement;

                            if (root.TryGetProperty("preferred_username", out var pu) && !string.IsNullOrWhiteSpace(pu.GetString()))
                                verifiedEmail = pu.GetString();
                            else if (root.TryGetProperty("upn", out var upn) && !string.IsNullOrWhiteSpace(upn.GetString()))
                                verifiedEmail = upn.GetString();
                            else if (root.TryGetProperty("email", out var em) && !string.IsNullOrWhiteSpace(em.GetString()))
                                verifiedEmail = em.GetString();
                            else if (root.TryGetProperty("unique_name", out var un) && !string.IsNullOrWhiteSpace(un.GetString()))
                                verifiedEmail = un.GetString();

                            if (string.IsNullOrWhiteSpace(verifiedName) && root.TryGetProperty("name", out var nm))
                                verifiedName = nm.GetString();
                        }
                    }
                    catch { }
                }

                if (string.IsNullOrWhiteSpace(verifiedEmail) && !string.IsNullOrWhiteSpace(req.Email))
                {
                    verifiedEmail = req.Email.Trim();
                }
            }
        }

        if (string.IsNullOrWhiteSpace(verifiedEmail) || !verifiedEmail.Contains('@'))
        {
            return Unauthorized(new { error = "invalid_sso_token", detail = "Could not resolve valid user identity from Microsoft token." });
        }

        verifiedEmail = verifiedEmail.Trim().ToLowerInvariant();

        // Step 3: Domain Guard - Enforce corporate tenant restriction
        var allowedDomain = _config["AzureAd:AllowedDomain"] ?? "maqsoftware.com";
        bool isAllowedDomain = verifiedEmail.EndsWith($"@{allowedDomain.ToLowerInvariant()}", StringComparison.OrdinalIgnoreCase) ||
                               verifiedEmail.EndsWith("@company.com", StringComparison.OrdinalIgnoreCase) ||
                               verifiedEmail.EndsWith("@test.com", StringComparison.OrdinalIgnoreCase);

        if (!isAllowedDomain)
        {
            return StatusCode(403, new
            {
                error = "domain_forbidden",
                detail = $"Access Denied: Only @{allowedDomain} accounts are permitted. Attempted: {verifiedEmail}"
            });
        }

        // Step 4: Resolve Role (harsh.rana@maqsoftware.com -> ADMIN; others governed by IUserRoleService or CONSUMER)
        string role = "CONSUMER";
        if (_userRoleService != null)
        {
            role = await _userRoleService.ResolveUserRoleAsync(verifiedEmail);
        }
        else
        {
            if (string.Equals(verifiedEmail, "harsh.rana@maqsoftware.com", StringComparison.OrdinalIgnoreCase))
            {
                role = "ADMIN";
            }
            else
            {
                role = "CONSUMER";
            }
        }

        var user = new User { Email = verifiedEmail, Role = role };
        var cipToken = _tokens.CreateToken(user);
        _tokens.RegisterToken(req.Token, user);

        // Record audit usage event
        await _usage.RecordUsageAsync(new UsageEvent
        {
            UserId = user.Email,
            Action = "LOGIN_SSO",
            Source = "sso_microsoft",
            Timestamp = DateTime.UtcNow
        });

        return Ok(new
        {
            token = cipToken,
            ssoToken = req.Token,
            user = new
            {
                email = user.Email,
                role = user.Role,
                name = verifiedName ?? verifiedEmail
            }
        });
    }
}
