using System;
using System.IO;
using System.Threading.Tasks;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace EngineeringCommonsCli.Services.Implementations;

public class FileAuthTokenStore : IAuthTokenStore
{
    private readonly string _path;

    public FileAuthTokenStore(string? customPath = null)
    {
        if (!string.IsNullOrWhiteSpace(customPath))
        {
            _path = customPath;
        }
        else
        {
            var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            var dir = Path.Combine(home, ".engineering-commons");
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            _path = Path.Combine(dir, "session.json");
        }
    }

    public async Task<string?> GetTokenAsync()
    {
        var session = await GetSessionAsync();
        return session?.Token;
    }

    public async Task<string?> GetEmailAsync()
    {
        var session = await GetSessionAsync();
        return !string.IsNullOrWhiteSpace(session?.Email) ? session.Email : null;
    }

    public async Task<UserSession?> GetSessionAsync()
    {
        if (!File.Exists(_path)) return null;
        try
        {
            var txt = await File.ReadAllTextAsync(_path);
            if (string.IsNullOrWhiteSpace(txt)) return null;

            var obj = JObject.Parse(txt);
            var token = obj["token"]?.ToString();
            if (string.IsNullOrWhiteSpace(token)) return null;

            var email = obj["email"]?.ToString() ?? string.Empty;
            var role = obj["role"]?.ToString();
            var name = obj["name"]?.ToString();
            var authType = obj["authType"]?.ToString();
            var ssoToken = obj["ssoToken"]?.ToString();

            return new UserSession(token, email, role, name, authType, ssoToken);
        }
        catch
        {
            return null;
        }
    }

    public Task SaveTokenAsync(string token, string? email = null)
    {
        var session = new UserSession(
            Token: token,
            Email: email ?? string.Empty,
            Role: "PRODUCER",
            Name: email,
            AuthType: "credentials",
            SsoToken: null);

        return SaveSessionAsync(session);
    }

    public Task SaveSessionAsync(UserSession session)
    {
        var dir = Path.GetDirectoryName(_path);
        if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
        {
            Directory.CreateDirectory(dir);
        }

        var obj = new
        {
            email = session.Email,
            token = session.Token,
            ssoToken = session.SsoToken ?? string.Empty,
            role = session.Role ?? "PRODUCER",
            name = session.Name ?? session.Email,
            loginTime = DateTime.UtcNow.ToString("o"),
            authType = session.AuthType ?? "credentials"
        };

        var txt = JsonConvert.SerializeObject(obj, Formatting.Indented);
        return File.WriteAllTextAsync(_path, txt);
    }

    public Task ClearTokenAsync()
    {
        try { if (File.Exists(_path)) File.Delete(_path); } catch (Exception) { /* handled non-fatal CLI fallback */ }
        return Task.CompletedTask;
    }
}


