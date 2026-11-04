using System.Collections.Generic;
using System.Threading.Tasks;
using EngineeringCommonsCli.Models;

namespace EngineeringCommonsCli.Services.Interfaces;

public interface IArtifactDiscoveryService
{
    Task<IEnumerable<DiscoveredArtifact>> DiscoverAsync(string workspacePath);
}
