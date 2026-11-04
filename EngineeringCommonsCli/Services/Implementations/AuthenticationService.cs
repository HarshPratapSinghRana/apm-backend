using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;

namespace EngineeringCommonsCli.Services.Implementations;

public class AuthenticationService : IAuthenticationService
{
    private UserSession? _session;
    private readonly IBackendClient _backend;
    private readonly IAuthTokenStore _tokenStore;

    public AuthenticationService(IBackendClient backend, IAuthTokenStore tokenStore)
    {
        _backend = backend;
        _tokenStore = tokenStore;
    }

    public async Task<UserSession?> LoginAsync(string email, string password)
    {
        var s = await _backend.LoginAsync(email, password);
        if (s != null)
        {
            _session = s;
            await _tokenStore.SaveSessionAsync(s);
        }
        return s;
    }

    public async Task<UserSession?> SsoLoginAsync(string token, string? email = null, string? name = null, string? role = null)
    {
        var s = await _backend.SsoLoginAsync(token, email, name, role);
        if (s != null)
        {
            _session = s;
            await _tokenStore.SaveSessionAsync(s);
            return s;
        }

        // Offline / Direct SharePoint Fallback Session
        if (!string.IsNullOrWhiteSpace(token))
        {
            var fallbackSession = new UserSession(
                Token: token,
                Email: email ?? "user@maqsoftware.com",
                Role: role ?? "PRODUCER",
                Name: name ?? email ?? "Corporate User",
                AuthType: "microsoft_sso",
                SsoToken: token);

            _session = fallbackSession;
            await _tokenStore.SaveSessionAsync(fallbackSession);
            return fallbackSession;
        }

        return null;
    }

    public async Task<UserSession?> CurrentSessionAsync()
    {
        if (_session != null) return _session;
        var session = await _tokenStore.GetSessionAsync();
        if (session != null && !string.IsNullOrEmpty(session.Token))
        {
            _session = session;
            return _session;
        }

        var token = await _tokenStore.GetTokenAsync();
        if (string.IsNullOrEmpty(token)) return null;
        var email = await _tokenStore.GetEmailAsync() ?? string.Empty;
        _session = new UserSession(token, email);
        return _session;
    }

    public async Task LogoutAsync()
    {
        _session = null;
        await _tokenStore.ClearTokenAsync();
    }
}
