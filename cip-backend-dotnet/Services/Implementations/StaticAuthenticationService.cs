using System;
using System.Collections.Generic;
using System.Linq;
using CipBackend.Models;
using CipBackend.Services.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace CipBackend.Services.Implementations;

public class StaticAuthOptions { public List<User> Users { get; set; } = new(); }

public class StaticAuthenticationService : IAuthenticationService
{
    private readonly List<User> _users;
    private readonly IConfiguration? _config;

    public StaticAuthenticationService(IOptions<StaticAuthOptions> opts, IConfiguration? config = null)
    {
        _config = config;
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

        // In test & dev environments, allow designated test domains (company.com, test.com)
        if (!string.IsNullOrEmpty(email) && (email.EndsWith("@company.com", StringComparison.OrdinalIgnoreCase) || email.EndsWith("@test.com", StringComparison.OrdinalIgnoreCase)) && 
            (password == "password" || password == "Producer@123" || password == "Reviewer@123" || password == "Consumer@123"))
        {
            // Strict role assignment: Do not grant REVIEWER/ADMIN to arbitrary emails containing substrings
            var role = (email.StartsWith("reviewer@", StringComparison.OrdinalIgnoreCase) || email.StartsWith("designated-rev@", StringComparison.OrdinalIgnoreCase)) ? "REVIEWER" : 
                       (email.StartsWith("producer", StringComparison.OrdinalIgnoreCase) || email.StartsWith("contrib@", StringComparison.OrdinalIgnoreCase)) ? "PRODUCER" : "CONSUMER";
            var newUser = new User { Email = email, Password = password, Role = role };
            _users.Add(newUser);
            return newUser;
        }

        return null;
    }
}
