using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using EngineeringCommonsCli.Services.Interfaces;

namespace EngineeringCommonsCli.Services.Implementations;

public class MicrosoftSsoAuthService : ISsoAuthService
{
    public const string DefaultTenantId = "e4d98dd2-9199-42e5-ba8b-da3e763ede2e";
    public const string DefaultClientId = "a5f3ba81-4c95-4c74-afd9-38b72cf39156";
    public const string DefaultScopes = "User.Read Sites.Read.All Sites.ReadWrite.All offline_access openid profile email";

    private readonly HttpClient _httpClient;
    private static readonly string[] DefaultAllowedDomains = { "maqsoftware.com", "company.com", "test.com" };

    public MicrosoftSsoAuthService(HttpClient? httpClient = null)
    {
        _httpClient = httpClient ?? new HttpClient();
    }

    public bool IsAllowedDomain(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        var lower = email.Trim().ToLowerInvariant();
        var allowedEnv = Environment.GetEnvironmentVariable("ALLOWED_SSO_DOMAINS");
        var domains = !string.IsNullOrWhiteSpace(allowedEnv)
            ? allowedEnv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            : DefaultAllowedDomains;

        foreach (var domain in domains)
        {
            if (lower.EndsWith($"@{domain.ToLowerInvariant()}"))
            {
                return true;
            }
        }
        return false;
    }

    public async Task<SsoAuthResult> AcquireTokenInteractiveAsync(SsoAuthOptions options, CancellationToken cancellationToken = default)
    {
        var tenantId = options.TenantId
            ?? Environment.GetEnvironmentVariable("AZURE_TENANT_ID")
            ?? Environment.GetEnvironmentVariable("ENGINEERING_COMMONS_SSO_TENANT_ID")
            ?? DefaultTenantId;

        var clientId = options.ClientId
            ?? Environment.GetEnvironmentVariable("AZURE_CLIENT_ID")
            ?? Environment.GetEnvironmentVariable("ENGINEERING_COMMONS_SSO_CLIENT_ID")
            ?? DefaultClientId;

        var scopes = options.Scopes ?? DefaultScopes;
        var writer = options.OutputWriter ?? Console.Out;

        try
        {
            // Step 1: Request Device Code from Microsoft Entra ID
            var deviceCodeUrl = $"https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/devicecode";
            using var deviceReqContent = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("client_id", clientId),
                new KeyValuePair<string, string>("scope", scopes)
            });

            using var deviceResp = await _httpClient.PostAsync(deviceCodeUrl, deviceReqContent, cancellationToken);
            var deviceJson = await deviceResp.Content.ReadAsStringAsync(cancellationToken);

            if (!deviceResp.IsSuccessStatusCode)
            {
                return new SsoAuthResult(
                    Success: false,
                    Error: $"Failed to initiate device authentication with Microsoft Entra ID (HTTP {(int)deviceResp.StatusCode}): {deviceJson}");
            }

            using var deviceDoc = JsonDocument.Parse(deviceJson);
            var root = deviceDoc.RootElement;
            var userCode = root.GetProperty("user_code").GetString();
            var deviceCode = root.GetProperty("device_code").GetString();
            var verificationUri = root.TryGetProperty("verification_uri", out var vProp)
                ? vProp.GetString()
                : "https://microsoft.com/devicelogin";
            var interval = root.TryGetProperty("interval", out var iProp) ? iProp.GetInt32() : 5;
            var expiresIn = root.TryGetProperty("expires_in", out var expProp) ? expProp.GetInt32() : 900;

            if (string.IsNullOrEmpty(userCode) || string.IsNullOrEmpty(deviceCode))
            {
                return new SsoAuthResult(
                    Success: false,
                    Error: "Device code response from Microsoft Entra ID was incomplete.");
            }

            // Display instructions to user
            writer.WriteLine();
            writer.WriteLine("=======================================================================");
            writer.WriteLine("  MAQ SOFTWARE MICROSOFT SINGLE SIGN-ON (SSO)");
            writer.WriteLine("=======================================================================");
            writer.WriteLine($"  1. Navigate to: {verificationUri}");
            writer.WriteLine($"  2. Enter code:  {userCode}");
            writer.WriteLine("=======================================================================");
            writer.WriteLine();
            writer.WriteLine("Waiting for authorization in browser... (Press Ctrl+C to cancel)");

            // Try opening default browser automatically
            if (options.AutoOpenBrowser && !string.IsNullOrWhiteSpace(verificationUri))
            {
                try
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = verificationUri,
                        UseShellExecute = true
                    });
                }
                catch
                {
                    // Ignore browser launch failures in headless/restricted terminal environments
                }
            }

            // Step 2: Poll for Token
            var tokenUrl = $"https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token";
            var maxAttempts = Math.Max(30, expiresIn / Math.Max(interval, 2));

            for (int attempt = 0; attempt < maxAttempts; attempt++)
            {
                cancellationToken.ThrowIfCancellationRequested();
                await Task.Delay(interval * 1000, cancellationToken);

                using var tokenContent = new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string, string>("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
                    new KeyValuePair<string, string>("client_id", clientId),
                    new KeyValuePair<string, string>("device_code", deviceCode)
                });

                using var tokenResp = await _httpClient.PostAsync(tokenUrl, tokenContent, cancellationToken);
                var tokenBody = await tokenResp.Content.ReadAsStringAsync(cancellationToken);

                if (tokenResp.IsSuccessStatusCode)
                {
                    using var tokenDoc = JsonDocument.Parse(tokenBody);
                    var accessToken = tokenDoc.RootElement.GetProperty("access_token").GetString();
                    var idToken = tokenDoc.RootElement.TryGetProperty("id_token", out var idProp) ? idProp.GetString() : null;

                    if (string.IsNullOrEmpty(accessToken))
                    {
                        return new SsoAuthResult(false, Error: "Received empty access token from Microsoft Entra ID.");
                    }

                    // Resolve user details
                    var userInfo = await ResolveUserInfoAsync(accessToken, idToken, cancellationToken);
                    var email = userInfo?.Email ?? string.Empty;
                    var displayName = userInfo?.DisplayName;

                    // Domain restriction enforcement
                    if (!string.IsNullOrWhiteSpace(email) && !IsAllowedDomain(email))
                    {
                        return new SsoAuthResult(
                            Success: false,
                            Error: $"Access Denied: Only @maqsoftware.com accounts are permitted. Signed in as: {email}");
                    }

                    return new SsoAuthResult(
                        Success: true,
                        AccessToken: accessToken,
                        IdToken: idToken,
                        Email: email,
                        DisplayName: displayName);
                }

                try
                {
                    using var errDoc = JsonDocument.Parse(tokenBody);
                    if (errDoc.RootElement.TryGetProperty("error", out var errProp))
                    {
                        var errCode = errProp.GetString();
                        if (errCode == "authorization_pending")
                        {
                            continue;
                        }
                        if (errCode == "slow_down")
                        {
                            interval += 5;
                            continue;
                        }
                        if (errCode == "expired_token")
                        {
                            return new SsoAuthResult(false, Error: "Device authentication session expired. Please run the command again.");
                        }

                        var errDesc = errDoc.RootElement.TryGetProperty("error_description", out var dProp)
                            ? dProp.GetString()
                            : errCode;
                        return new SsoAuthResult(false, Error: $"Microsoft SSO authentication failed: {errDesc}");
                    }
                }
                catch (JsonException)
                {
                    return new SsoAuthResult(false, Error: $"Unexpected response during token polling: {tokenBody}");
                }
            }

            return new SsoAuthResult(false, Error: "Device authentication polling timed out. Please try again.");
        }
        catch (OperationCanceledException)
        {
            return new SsoAuthResult(false, Error: "Authentication cancelled by user.");
        }
        catch (Exception ex)
        {
            return new SsoAuthResult(false, Error: $"Authentication error: {ex.Message}");
        }
    }

    public async Task<SsoUserInfo?> ResolveUserInfoAsync(string accessToken, string? idToken = null, CancellationToken cancellationToken = default)
    {
        string? resolvedEmail = null;
        string? resolvedName = null;

        // 1. Try decoding JWT payload from idToken or accessToken
        var tokensToTry = new[] { idToken, accessToken };
        foreach (var tok in tokensToTry)
        {
            if (string.IsNullOrWhiteSpace(tok) || !tok.Contains('.')) continue;

            try
            {
                var parts = tok.Split('.');
                if (parts.Length >= 2)
                {
                    var base64 = parts[1].Replace('-', '+').Replace('_', '/');
                    while (base64.Length % 4 != 0) base64 += "=";
                    var payloadBytes = Convert.FromBase64String(base64);
                    using var jwtDoc = JsonDocument.Parse(payloadBytes);
                    var root = jwtDoc.RootElement;

                    if (string.IsNullOrWhiteSpace(resolvedEmail))
                    {
                        if (root.TryGetProperty("preferred_username", out var pu) && !string.IsNullOrWhiteSpace(pu.GetString()))
                            resolvedEmail = pu.GetString();
                        else if (root.TryGetProperty("upn", out var upn) && !string.IsNullOrWhiteSpace(upn.GetString()))
                            resolvedEmail = upn.GetString();
                        else if (root.TryGetProperty("email", out var em) && !string.IsNullOrWhiteSpace(em.GetString()))
                            resolvedEmail = em.GetString();
                        else if (root.TryGetProperty("unique_name", out var un) && !string.IsNullOrWhiteSpace(un.GetString()))
                            resolvedEmail = un.GetString();
                    }

                    if (string.IsNullOrWhiteSpace(resolvedName) && root.TryGetProperty("name", out var nm))
                    {
                        resolvedName = nm.GetString();
                    }
                }
            }
            catch
            {
                // Ignore JWT parse failures and try Graph API next
            }

            if (!string.IsNullOrWhiteSpace(resolvedEmail) && resolvedEmail.Contains('@'))
            {
                break;
            }
        }

        // 2. Query Microsoft Graph API (/v1.0/me) if email is still missing
        if (string.IsNullOrWhiteSpace(resolvedEmail) || !resolvedEmail.Contains('@'))
        {
            try
            {
                using var req = new HttpRequestMessage(HttpMethod.Get, "https://graph.microsoft.com/v1.0/me");
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                using var resp = await _httpClient.SendAsync(req, cancellationToken);
                if (resp.IsSuccessStatusCode)
                {
                    var content = await resp.Content.ReadAsStringAsync(cancellationToken);
                    using var doc = JsonDocument.Parse(content);
                    var root = doc.RootElement;

                    if (root.TryGetProperty("mail", out var mProp) && !string.IsNullOrWhiteSpace(mProp.GetString()))
                    {
                        resolvedEmail = mProp.GetString();
                    }
                    else if (root.TryGetProperty("userPrincipalName", out var upnProp) && !string.IsNullOrWhiteSpace(upnProp.GetString()))
                    {
                        resolvedEmail = upnProp.GetString();
                    }

                    if (string.IsNullOrWhiteSpace(resolvedName) && root.TryGetProperty("displayName", out var dProp))
                    {
                        resolvedName = dProp.GetString();
                    }
                }
            }
            catch
            {
                // Ignore graph API failures in offline/mock environment
            }
        }

        if (string.IsNullOrWhiteSpace(resolvedEmail)) return null;

        return new SsoUserInfo(resolvedEmail.Trim().ToLowerInvariant(), resolvedName?.Trim());
    }
}
