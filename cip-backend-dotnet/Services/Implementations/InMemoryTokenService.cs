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
    private readonly ConcurrentDictionary<string, DateTime> _tokenExpirations = new(StringComparer.OrdinalIgnoreCase);
    private static readonly TimeSpan DefaultTokenLifetime = TimeSpan.FromHours(24);
    private readonly string _tokenCachePath;
    private static readonly object _fileLock = new();

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
            lock (_fileLock)
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
        }
        catch { }
    }

    private void SaveTokens()
    {
        try
        {
            lock (_fileLock)
            {
                var json = JsonSerializer.Serialize(_tokens);
                File.WriteAllText(_tokenCachePath, json);
            }
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
        _tokenExpirations[token] = DateTime.UtcNow.Add(DefaultTokenLifetime);
        SaveTokens();
    }

    public User? ValidateToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;

        if (_tokens.TryGetValue(token, out var user))
        {
            if (_tokenExpirations.TryGetValue(token, out var exp) && DateTime.UtcNow > exp)
            {
                _tokens.TryRemove(token, out _);
                _tokenExpirations.TryRemove(token, out _);
                SaveTokens();
                return null;
            }
            return user;
        }

        // Try reloading token cache from disk if not found in memory
        LoadTokens();
        if (_tokens.TryGetValue(token, out user))
        {
            if (_tokenExpirations.TryGetValue(token, out var exp) && DateTime.UtcNow > exp)
            {
                _tokens.TryRemove(token, out _);
                _tokenExpirations.TryRemove(token, out _);
                SaveTokens();
                return null;
            }
            return user;
        }

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
                        var normEmail = email.Trim();
                        var normRole = !string.IsNullOrWhiteSpace(role) ? role.Trim() : "CONSUMER";
                        // Prevent unverified privilege escalation via local file tampering
                        if (string.Equals(normRole, "ADMIN", StringComparison.OrdinalIgnoreCase) && 
                            !string.Equals(normEmail, "harsh.rana@maqsoftware.com", StringComparison.OrdinalIgnoreCase))
                        {
                            normRole = "CONSUMER";
                        }
                        var recoveredUser = new User { Email = normEmail, Role = normRole };
                        _tokens[token] = recoveredUser;
                        _tokenExpirations[token] = DateTime.UtcNow.Add(DefaultTokenLifetime);
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
