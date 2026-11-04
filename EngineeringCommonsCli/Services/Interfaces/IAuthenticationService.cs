using EngineeringCommonsCli.Models;

namespace EngineeringCommonsCli.Services.Interfaces;

public interface IAuthenticationService
{
    Task<UserSession?> LoginAsync(string email, string password);
    Task<UserSession?> SsoLoginAsync(string token, string? email = null, string? name = null, string? role = null);
    Task<UserSession?> CurrentSessionAsync();
    Task LogoutAsync();
}
