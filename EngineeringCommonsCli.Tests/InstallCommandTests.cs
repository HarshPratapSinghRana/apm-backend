using System;
using System.IO;
using System.Threading.Tasks;
using EngineeringCommonsCli.Commands;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Implementations;
using EngineeringCommonsCli.Services.Interfaces;
using Moq;
using Xunit;

namespace EngineeringCommonsCli.Tests;

[Collection("ConsoleOutputCollection")]
public class InstallCommandTests
{
    [Fact]
    public void Install_Unauthenticated_Returns_Error()
    {
        var cip = new Mock<ICipService>();
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        var placement = new ArtifactPlacementService();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync((EngineeringCommonsCli.Models.UserSession?)null);
        var cmd = new InstallCommand(cip.Object, backend.Object, auth.Object, placement);
        var code = cmd.Invoke(new[] { "design-reviewer" });
        Assert.Equal(1, code);
    }

    [Fact]
    public void Install_ArtifactNotFound_Returns_Error()
    {
        var cip = new Mock<ICipService>();
        var backend = new Mock<IBackendClient>();
        backend.Setup(b => b.DownloadArtifactAsync("missing", It.IsAny<string?>())).ReturnsAsync((ArtifactDownloadResult?)null);
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new EngineeringCommonsCli.Models.UserSession("tok", "user"));
        var placement = new ArtifactPlacementService();
        var cmd = new InstallCommand(cip.Object, backend.Object, auth.Object, placement);
        var code = cmd.Invoke(new[] { "missing" });
        Assert.Equal(1, code);
    }

    [Fact]
    public void Install_WithFiles_Writes_To_Workspace()
    {
        var cip = new Mock<ICipService>();
        var backend = new Mock<IBackendClient>();
        var contentJson = @"{""name"":""test-agent"",""type"":""agent"",""version"":""1.0.0"",""files"":[{""path"":"".github/agents/test.md"",""content"":""# Test Agent""}]}";
        backend.Setup(b => b.DownloadArtifactAsync("test-agent", It.IsAny<string?>())).ReturnsAsync(
            new ArtifactDownloadResult("test-agent", "test-agent", "agent", "1.0.0", "A test agent", "owner/test-agent#v1.0.0", contentJson));
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new EngineeringCommonsCli.Models.UserSession("tok", "user"));
        var placement = new ArtifactPlacementService();
        var cmd = new InstallCommand(cip.Object, backend.Object, auth.Object, placement);

        var code = cmd.Invoke(new[] { "test-agent" });

        Assert.Equal(0, code);
        // The file should have been written to the current working directory
        var expectedPath = Path.Combine(Directory.GetCurrentDirectory(), ".github", "agents", "test.md");
        Assert.True(File.Exists(expectedPath), $"Expected file at {expectedPath}");
        Assert.Equal("# Test Agent", File.ReadAllText(expectedPath));

        // Cleanup
        File.Delete(expectedPath);
        try { Directory.Delete(Path.Combine(Directory.GetCurrentDirectory(), ".github", "agents")); } catch { }
        try { Directory.Delete(Path.Combine(Directory.GetCurrentDirectory(), ".github")); } catch { }
    }

    [Fact]
    public void Install_NoFiles_Uses_Fallback_Placement()
    {
        var cip = new Mock<ICipService>();
        var backend = new Mock<IBackendClient>();
        // Content without a files array — just raw text
        backend.Setup(b => b.DownloadArtifactAsync("simple-agent", It.IsAny<string?>())).ReturnsAsync(
            new ArtifactDownloadResult("simple-agent", "simple-agent", "agent", "1.0.0", "Simple agent", "", "# Simple agent content"));
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new EngineeringCommonsCli.Models.UserSession("tok", "user"));
        var placement = new ArtifactPlacementService();
        var cmd = new InstallCommand(cip.Object, backend.Object, auth.Object, placement);

        var code = cmd.Invoke(new[] { "simple-agent" });

        Assert.Equal(0, code);
        var expectedPath = Path.Combine(Directory.GetCurrentDirectory(), ".github", "agents", "simple-agent.md");
        Assert.True(File.Exists(expectedPath), $"Expected file at {expectedPath}");
        Assert.Equal("# Simple agent content", File.ReadAllText(expectedPath));

        // Cleanup
        File.Delete(expectedPath);
        try { Directory.Delete(Path.Combine(Directory.GetCurrentDirectory(), ".github", "agents")); } catch { }
        try { Directory.Delete(Path.Combine(Directory.GetCurrentDirectory(), ".github")); } catch { }
    }

    [Fact]
    public void Install_Creates_Github_Folder_If_Missing_In_Workspace()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_test_gh_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);
        var originalCwd = Directory.GetCurrentDirectory();

        try
        {
            Directory.SetCurrentDirectory(tempWorkspace);
            Assert.False(Directory.Exists(Path.Combine(tempWorkspace, ".github")));

            var cip = new Mock<ICipService>();
            var backend = new Mock<IBackendClient>();
            var contentJson = @"{""name"":""copilot-helper"",""type"":""agent"",""version"":""1.0.0"",""files"":[{""path"":"".github/agents/helper.md"",""content"":""# Helper""}]}";
            backend.Setup(b => b.DownloadArtifactAsync("copilot-helper", It.IsAny<string?>())).ReturnsAsync(
                new ArtifactDownloadResult("copilot-helper", "copilot-helper", "agent", "1.0.0", "Copilot Helper", "", contentJson));
            var auth = new Mock<IAuthenticationService>();
            auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new EngineeringCommonsCli.Models.UserSession("tok", "user"));
            var placement = new ArtifactPlacementService();
            var cmd = new InstallCommand(cip.Object, backend.Object, auth.Object, placement);

            var code = cmd.Invoke(new[] { "copilot-helper" });

            Assert.Equal(0, code);
            var githubDir = Path.Combine(tempWorkspace, ".github");
            Assert.True(Directory.Exists(githubDir), "Expected .github folder to be created in workspace for GitHub Copilot.");
            Assert.True(File.Exists(Path.Combine(githubDir, "agents", "helper.md")));
        }
        finally
        {
            Directory.SetCurrentDirectory(originalCwd);
            try { Directory.Delete(tempWorkspace, true); } catch { }
        }
    }
}
