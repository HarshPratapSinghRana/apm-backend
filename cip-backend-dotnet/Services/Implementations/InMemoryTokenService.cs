using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using CipBackend.Models;
using CipBackend.Services.Interfaces;

namespace CipBackend.Services.Implementations;

public class InMemoryTokenService : ITokenService
{
    private readonly ConcurrentDictionary<string, User> _tokens = new(StringComparer.OrdinalIgnoreCase);
    private readonly string _tokenCachePath;

    public InMemoryTokenService()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        var dir = Path.Combine(appData, ".engineering-commons");
        if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
        _tokenCachePath = Path.Combine(dir, "tokens_cache.json");
        LoadTokens();
    }

    private void LoadTokens()
    {
        try
        {
            if (File.Exists(_tokenCachePath))
            {
                var json = File.ReadAllText(_tokenCachePath);
                var dict = JsonSerializer.Deserialize<Dictionary<string, User>>(json);
                if (dict != null)
                {
                    foreach (var kv in dict)
                    {
                        _tokens[kv.Key] = kv.Value;
                    }
                }
            }
        }
        catch { }
    }

    private void SaveTokens()
    {
        try
        {
            var json = JsonSerializer.Serialize(_tokens);
            File.WriteAllText(_tokenCachePath, json);
        }
        catch { }
    }

    public string CreateToken(User user)
    {
        var token = Guid.NewGuid().ToString();
        RegisterToken(token, user);
        return token;
    }

    public void RegisterToken(string token, User user)
    {
        if (string.IsNullOrWhiteSpace(token) || user == null) return;
        _tokens[token] = user;
        SaveTokens();
    }

    public User? ValidateToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        if (_tokens.TryGetValue(token, out var user)) return user;

        // Try reloading token cache from disk if not found in memory
        LoadTokens();
        if (_tokens.TryGetValue(token, out user)) return user;

        // Also check ~/.engineering-commons/session.json directly as fallback if explicitly valid
        try
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            var sessionFile = Path.Combine(appData, ".engineering-commons", "session.json");
            if (File.Exists(sessionFile))
            {
                using var doc = JsonDocument.Parse(File.ReadAllText(sessionFile));
                var root = doc.RootElement;
                if (root.TryGetProperty("token", out var tProp) && string.Equals(tProp.GetString(), token, StringComparison.OrdinalIgnoreCase))
                {
                    string? email = root.TryGetProperty("email", out var eProp) ? eProp.GetString() : null;
                    string? role = root.TryGetProperty("role", out var rProp) ? rProp.GetString() : null;

                    if (!string.IsNullOrWhiteSpace(email))
                    {
                        var recoveredUser = new User { Email = email.Trim(), Role = (!string.IsNullOrWhiteSpace(role) ? role.Trim() : "CONSUMER") };
                        _tokens[token] = recoveredUser;
                        SaveTokens();
                        return recoveredUser;
                    }
                }
            }
        }
        catch { }

        return null;
    }
}
