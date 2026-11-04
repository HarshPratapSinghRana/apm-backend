namespace EngineeringCommonsCli.Models;

public record UserSession(
    string Token,
    string Email,
    string? Role = null,
    string? Name = null,
    string? AuthType = null,
    string? SsoToken = null);
