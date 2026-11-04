namespace EngineeringCommonsCli.Services.Interfaces;

public record ArtifactSpec(
    string Name, 
    string Type, 
    string Version, 
    string CipPackage, 
    bool IsPrivate = false, 
    string? ProducerEmail = null, 
    string? Source = null, 
    string? Domain = null,
    string? Usability = null,
    string? UsabilityLabel = null,
    string? UsabilityBadge = null,
    bool IsCopilotReady = false);

public interface ICipService
{
    Task<IEnumerable<ArtifactSpec>> ListAsync(string? typeFilter = null);
    Task InstallAsync(string cipPackageIdentifier);
    Task UpdateAsync(string cipPackageIdentifier);
}
