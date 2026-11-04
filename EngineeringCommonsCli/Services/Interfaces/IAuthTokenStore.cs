using EngineeringCommonsCli.Models;

namespace EngineeringCommonsCli.Services.Interfaces;

public interface IAuthTokenStore
{
    Task<string?> GetTokenAsync();
    Task<string?> GetEmailAsync();
    Task<UserSession?> GetSessionAsync();
    Task SaveTokenAsync(string token, string? email = null);
    Task SaveSessionAsync(UserSession session);
    Task ClearTokenAsync();
}
