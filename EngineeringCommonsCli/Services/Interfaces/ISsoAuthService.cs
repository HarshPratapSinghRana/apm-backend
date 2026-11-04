using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace EngineeringCommonsCli.Services.Interfaces;

public record SsoAuthOptions(
    string? TenantId = null,
    string? ClientId = null,
    string? Scopes = null,
    bool AutoOpenBrowser = true,
    TextWriter? OutputWriter = null
);

public record SsoAuthResult(
    bool Success,
    string? AccessToken = null,
    string? IdToken = null,
    string? Email = null,
    string? DisplayName = null,
    string? Error = null
);

public record SsoUserInfo(
    string Email,
    string? DisplayName = null
);

public interface ISsoAuthService
{
    Task<SsoAuthResult> AcquireTokenInteractiveAsync(SsoAuthOptions options, CancellationToken cancellationToken = default);
    Task<SsoUserInfo?> ResolveUserInfoAsync(string accessToken, string? idToken = null, CancellationToken cancellationToken = default);
    bool IsAllowedDomain(string email);
}
