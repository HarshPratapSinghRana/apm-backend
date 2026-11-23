using System;
using System.IO;
using System.Threading.Tasks;
using EngineeringCommonsCli.Services.Interfaces;
using Newtonsoft.Json;

namespace EngineeringCommonsCli.Services.Implementations;

public class CliDiskCache : ICliDiskCache
{
    private readonly string _cacheDirectory;

    public string CacheDirectory => _cacheDirectory;

    public CliDiskCache(string? customCacheDir = null)
    {
        if (!string.IsNullOrWhiteSpace(customCacheDir))
        {
            _cacheDirectory = customCacheDir;
        }
        else
        {
            var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            _cacheDirectory = Path.Combine(home, ".engineering-commons", "cache");
        }
    }

    public async Task<T?> GetAsync<T>(string filename, TimeSpan? maxAge = null)
    {
        try
        {
            var safeFilename = Path.GetFileName(filename);
            var filePath = Path.Combine(_cacheDirectory, safeFilename);
            var fullPath = Path.GetFullPath(filePath);
            var fullCacheDir = Path.GetFullPath(_cacheDirectory).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            var sep = Path.DirectorySeparatorChar.ToString();
            if (!fullPath.Equals(fullCacheDir, StringComparison.OrdinalIgnoreCase) && !fullPath.StartsWith(fullCacheDir + sep, StringComparison.OrdinalIgnoreCase)) return default;
            if (!File.Exists(fullPath)) return default;

            var json = await File.ReadAllTextAsync(fullPath);
            if (string.IsNullOrWhiteSpace(json)) return default;

            var entry = JsonConvert.DeserializeObject<DiskCacheEntry<T>>(json);
            if (entry == null) return default;

            var effectiveMaxAge = maxAge ?? TimeSpan.FromSeconds(entry.TtlSeconds > 0 ? entry.TtlSeconds : 900);
            if (DateTime.UtcNow - entry.CachedAt > effectiveMaxAge || DateTime.UtcNow > entry.ExpiresAt)
            {
                // Expired cache entry
                return default;
            }

            return entry.Data;
        }
        catch
        {
            return default;
        }
    }

    public async Task SetAsync<T>(string filename, T data, TimeSpan? ttl = null)
    {
        try
        {
            if (!Directory.Exists(_cacheDirectory))
            {
                Directory.CreateDirectory(_cacheDirectory);
            }

            var safeFilename = Path.GetFileName(filename);
            var filePath = Path.Combine(_cacheDirectory, safeFilename);
            var fullPath = Path.GetFullPath(filePath);
            var fullCacheDir = Path.GetFullPath(_cacheDirectory).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            var sep = Path.DirectorySeparatorChar.ToString();
            if (!fullPath.Equals(fullCacheDir, StringComparison.OrdinalIgnoreCase) && !fullPath.StartsWith(fullCacheDir + sep, StringComparison.OrdinalIgnoreCase)) return;

            var effectiveTtl = ttl ?? TimeSpan.FromMinutes(15);
            var entry = new DiskCacheEntry<T>
            {
                CachedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.Add(effectiveTtl),
                TtlSeconds = effectiveTtl.TotalSeconds,
                Data = data
            };

            var json = JsonConvert.SerializeObject(entry, Formatting.Indented);
            await File.WriteAllTextAsync(fullPath, json);
        }
        catch
        {
            // Disk caching errors must not fail CLI commands
        }
    }

    public Task InvalidateAsync(string filename)
    {
        try
        {
            var safeFilename = Path.GetFileName(filename);
            var filePath = Path.Combine(_cacheDirectory, safeFilename);
            var fullPath = Path.GetFullPath(filePath);
            var fullCacheDir = Path.GetFullPath(_cacheDirectory).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            var sep = Path.DirectorySeparatorChar.ToString();
            if (!fullPath.Equals(fullCacheDir, StringComparison.OrdinalIgnoreCase) && !fullPath.StartsWith(fullCacheDir + sep, StringComparison.OrdinalIgnoreCase)) return Task.CompletedTask;

            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
            }
        }
        catch (Exception) { /* handled non-fatal CLI fallback */ }

        return Task.CompletedTask;
    }

    public Task ClearAllAsync()
    {
        try
        {
            if (Directory.Exists(_cacheDirectory))
            {
                Directory.Delete(_cacheDirectory, true);
            }
        }
        catch (Exception) { /* handled non-fatal CLI fallback */ }

        return Task.CompletedTask;
    }
}

public class DiskCacheEntry<T>
{
    public DateTime CachedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public double TtlSeconds { get; set; } = 900; // 15 minutes default
    public T? Data { get; set; }
}


