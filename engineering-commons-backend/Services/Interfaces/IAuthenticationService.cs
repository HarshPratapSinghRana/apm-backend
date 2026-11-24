using EngineeringCommons.Backend.Models;

namespace EngineeringCommons.Backend.Services.Interfaces;

public interface IAuthenticationService
{
    User? ValidateCredentials(string email, string password);
}
