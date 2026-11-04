using CipBackend.Models;

namespace CipBackend.Services.Interfaces;

public interface IAuthenticationService
{
    User? ValidateCredentials(string email, string password);
}
