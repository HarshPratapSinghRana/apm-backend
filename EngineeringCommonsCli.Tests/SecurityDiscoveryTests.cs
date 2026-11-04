using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Xunit;
using EngineeringCommonsCli.Services.Implementations;

namespace EngineeringCommonsCli.Tests;

public class SecurityDiscoveryTests
{
    [Theory]
    [InlineData(".env", true)]
    [InlineData(".env.production", true)]
    [InlineData("credentials.json", true)]
    [InlineData("server.key", true)]
    [InlineData("cert.pem", true)]
    [InlineData("identity.pfx", true)]
    [InlineData("id_rsa", true)]
    [InlineData("program.exe", true)]
    [InlineData("library.dll", true)]
    [InlineData("subfolder/node_modules/pkg/index.js", true)]
    [InlineData("subfolder/bin/Debug/net10.0/app.dll", true)]
    [InlineData("subfolder/obj/Debug/net10.0/app.pdb", true)]
    [InlineData("agent.md", false)]
    [InlineData("skill.yaml", false)]
    [InlineData("SKILL.md", false)]
    [InlineData("cip.yml", false)]
    [InlineData("prompt.txt", false)]
    public void SensitiveFilter_IdentifiesSensitiveAndBuildFilesAccurately(string filePath, bool expectedIgnored)
    {
        var result = ArtifactDiscoveryService.IsSensitiveOrIgnoredFile(filePath);
        Assert.Equal(expectedIgnored, result);
    }

    [Fact]
    public async Task WorkspaceContextExtractor_IgnoresSecretsAndExtractsMetadata()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "cip_test_workspace_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);

        try
        {
            File.WriteAllText(Path.Combine(tempDir, ".env"), "SECRET_API_KEY=12345");
            File.WriteAllText(Path.Combine(tempDir, "private.key"), "-----BEGIN PRIVATE KEY-----");
            File.WriteAllText(Path.Combine(tempDir, "Service.cs"), "public class Service {}");
            File.WriteAllText(Path.Combine(tempDir, "script.ts"), "const a: number = 1;");
            File.WriteAllText(Path.Combine(tempDir, "package.json"), "{\"dependencies\": {\"react\": \"^18.0.0\"}}");

            var extractor = new WorkspaceContextExtractor();
            var summary = await extractor.ExtractSummaryAsync(tempDir);

            Assert.Contains(".cs", summary.FileExtensions);
            Assert.Contains(".ts", summary.FileExtensions);
            Assert.DoesNotContain(".key", summary.FileExtensions);
            Assert.Contains("Node.js", summary.Technologies);
            Assert.Contains("React", summary.Technologies);
            Assert.Contains("react", summary.Dependencies);
        }
        finally
        {
            if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true);
        }
    }

    [Theory]
    [InlineData("../../outside.md")]
    [InlineData("../escape/file.md")]
    public void ArtifactPlacementService_RejectsPathTraversal_OutsideWorkspace(string maliciousRelativePath)
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_test_ws_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var placement = new ArtifactPlacementService();
            Assert.Throws<InvalidOperationException>(() =>
                placement.ResolveDestinationPath(tempWorkspace, "agent", "my-agent", maliciousRelativePath));
        }
        finally
        {
            if (Directory.Exists(tempWorkspace)) Directory.Delete(tempWorkspace, true);
        }
    }
}
