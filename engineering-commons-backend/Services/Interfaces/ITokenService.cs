using EngineeringCommons.Backend.Models;

namespace EngineeringCommons.Backend.Services.Interfaces;

public interface ITokenService
{
    string CreateToken(User user);
    void RegisterToken(string token, User user);
    User? ValidateToken(string token);
}
