using EngineeringCommonsCli.Models;

namespace EngineeringCommonsCli.Services.Interfaces;

public interface ISharePointGraphClient
{
    Task<IEnumerable<ArtifactSpec>> GetArtifactsAsync(string token, string? typeFilter = null);
    Task<ArtifactSpec?> GetArtifactByNameAsync(string token, string name);
    Task<IEnumerable<BountyCliDto>> GetBountiesAsync(string token, string? status = null, string? category = null);
    Task<BountyDetailCliDto?> GetBountyByIdAsync(string token, string id);
}
