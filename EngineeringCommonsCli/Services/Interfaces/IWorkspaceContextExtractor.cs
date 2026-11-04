using System.Threading.Tasks;
using EngineeringCommonsCli.Models;

namespace EngineeringCommonsCli.Services.Interfaces;

public interface IWorkspaceContextExtractor
{
    Task<WorkspaceContextSummary> ExtractSummaryAsync(string workspacePath);
}
