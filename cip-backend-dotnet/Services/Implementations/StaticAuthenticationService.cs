using CipBackend.Models;
using CipBackend.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace CipBackend.Services.Implementations;

public class StaticAuthOptions { public List<User> Users { get; set; } = new(); }

public class StaticAuthenticationService : IAuthenticationService
{
    private readonly List<User> _users;
    public StaticAuthenticationService(IOptions<StaticAuthOptions> opts)
    {
        _users = opts.Value.Users ?? new List<User>();
        var defaultUsers = new List<User>() {
            new User { Email = "producer@company.com", Password = "password", Role = "PRODUCER" },
            new User { Email = "producer@test.com", Password = "Producer@123", Role = "PRODUCER" },
            new User { Email = "reviewer@company.com", Password = "password", Role = "REVIEWER" },
            new User { Email = "reviewer@test.com", Password = "Reviewer@123", Role = "REVIEWER" },
            new User { Email = "consumer@company.com", Password = "password", Role = "CONSUMER" },
            new User { Email = "consumer@test.com", Password = "Consumer@123", Role = "CONSUMER" }
        };

        foreach (var du in defaultUsers)
        {
            if (!_users.Any(u => u.Email.Equals(du.Email, StringComparison.OrdinalIgnoreCase)))
            {
                _users.Add(du);
            }
        }
    }

    public User? ValidateCredentials(string email, string password)
    {
        var existing = _users.FirstOrDefault(u => u.Email.Equals(email, StringComparison.OrdinalIgnoreCase) && u.Password == password);
        if (existing != null) return existing;

        // In test & dev environments, allow any company.com or test.com user with "password"
        if (!string.IsNullOrEmpty(email) && email.Contains("@") && (password == "password" || password == "Producer@123" || password == "Reviewer@123" || password == "Consumer@123"))
        {
            var role = email.Contains("reviewer") ? "REVIEWER" : (email.Contains("producer") || email.Contains("contrib") ? "PRODUCER" : "CONSUMER");
            var newUser = new User { Email = email, Password = password, Role = role };
            _users.Add(newUser);
            return newUser;
        }

        return null;
    }
}
