using CipBackend.Models;

namespace CipBackend.Services.Interfaces;

public interface ITokenService
{
    string CreateToken(User user);
    void RegisterToken(string token, User user);
    User? ValidateToken(string token);
}
