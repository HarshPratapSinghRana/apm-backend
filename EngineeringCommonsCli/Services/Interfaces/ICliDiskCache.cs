using System;
using System.Threading.Tasks;

namespace EngineeringCommonsCli.Services.Interfaces;

public interface ICliDiskCache
{
    string CacheDirectory { get; }
    Task<T?> GetAsync<T>(string filename, TimeSpan? maxAge = null);
    Task SetAsync<T>(string filename, T data, TimeSpan? ttl = null);
    Task InvalidateAsync(string filename);
    Task ClearAllAsync();
}
