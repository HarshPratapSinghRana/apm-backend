using EngineeringCommonsCli.Models;
using System.IO;

namespace EngineeringCommonsCli.Services.Interfaces;

public interface IUnifiedDiffRenderer
{
    void RenderDiff(ArtifactDiffDto diff, TextWriter writer, bool useColor = false);
}
