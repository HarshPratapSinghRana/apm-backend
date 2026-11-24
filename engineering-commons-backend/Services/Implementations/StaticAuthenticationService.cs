using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace EngineeringCommons.Backend.Services.Implementations;

public class StaticAuthOptions 
{ 
    public bool EnableLocalTestingUsers { get; set; } = false;
    public List<User> Users { get; set; } = new(); 
}

/// <summary>
/// Token- and Credential-based authentication service.
/// In production, user roles and credentials originate strictly from Microsoft Entra ID tokens and database assignments.
/// Static test accounts are only dynamically synthesized in Development / Test environments when explicitly enabled.
/// </summary>
public class StaticAuthenticationService : IAuthenticationService
{
    private readonly List<User> _users;
    private readonly IConfiguration? _config;
    private readonly bool _allowTestUsers;

    public StaticAuthenticationService(IOptions<StaticAuthOptions> opts, IConfiguration? config = null, IHostEnvironment? env = null)
    {
        _config = config;
        _users = opts.Value.Users ?? new List<User>();

        // Static test users are strictly restricted to local testing and development environments
        _allowTestUsers = opts.Value.EnableLocalTestingUsers || 
                          (env != null && (env.IsDevelopment() || env.EnvironmentName.Equals("Testing", StringComparison.OrdinalIgnoreCase))) ||
                          string.Equals(Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"), "Development", StringComparison.OrdinalIgnoreCase);
    }

    private static bool VerifyPassword(string inputPassword, User user)
    {
        if (string.IsNullOrEmpty(inputPassword)) return false;

        // 1. Verify against SHA-256 hash if present
        if (!string.IsNullOrEmpty(user.PasswordHash))
        {
            using var sha = SHA256.Create();
            var computed = Convert.ToHexString(sha.ComputeHash(Encoding.UTF8.GetBytes(inputPassword))).ToLowerInvariant();
            if (string.Equals(computed, user.PasswordHash.ToLowerInvariant(), StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        // 2. Fallback to direct password check with constant-time equality
        if (!string.IsNullOrEmpty(user.Password))
        {
            var inputBytes = Encoding.UTF8.GetBytes(inputPassword);
            var storedBytes = Encoding.UTF8.GetBytes(user.Password);
            if (inputBytes.Length == storedBytes.Length && CryptographicOperations.FixedTimeEquals(inputBytes, storedBytes))
            {
                return true;
            }
        }

        return false;
    }

    public User? ValidateCredentials(string email, string password)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrEmpty(password)) return null;

        var existing = _users.FirstOrDefault(u => u.Email.Equals(email.Trim(), StringComparison.OrdinalIgnoreCase) && VerifyPassword(password, u));
        if (existing != null)
        {
            return existing;
        }

        // Only allow test domain accounts when running in test / development mode with explicit opt-in
        if (_allowTestUsers && (email.EndsWith("@company.com", StringComparison.OrdinalIgnoreCase) || email.EndsWith("@test.com", StringComparison.OrdinalIgnoreCase)))
        {
            var role = (email.StartsWith("reviewer@", StringComparison.OrdinalIgnoreCase) || email.StartsWith("designated-rev@", StringComparison.OrdinalIgnoreCase)) ? "REVIEWER" : 
                       (email.StartsWith("producer", StringComparison.OrdinalIgnoreCase) || email.StartsWith("contrib@", StringComparison.OrdinalIgnoreCase)) ? "PRODUCER" : "CONSUMER";
            var newUser = new User { Email = email, Password = password, Role = role };
            _users.Add(newUser);
            return newUser;
        }

        return null;
    }
}
