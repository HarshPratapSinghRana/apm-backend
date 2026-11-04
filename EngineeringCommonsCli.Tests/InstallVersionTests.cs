using System;
using System.Collections.Generic;
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
public class InstallVersionTests
{
    private readonly UserSession _testSession = new("token-123", "test@company.com");
    private readonly List<ArtifactVersionDto> _availableVersions = new()
    {
        new("1.1.0", "harshpratapsinghrana1/design-reviewer#v1.1.0", true),
        new("1.0.0", "harshpratapsinghrana1/design-reviewer#v1.0.0", false)
    };

    [Fact]
    public void Install_WithoutVersion_InstallsLatestApprovedVersion()
    {
        var cip = new Mock<ICipService>();
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        var placement = new Mock<IArtifactPlacementService>();

        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(_testSession);
        
        var latestContent = @"{""name"":""design-reviewer"",""type"":""agent"",""version"":""1.1.0"",""files"":[{""path"":"".github/agents/design-reviewer.md"",""content"":""v1.1.0""}]}";
        backend.Setup(b => b.DownloadArtifactAsync("design-reviewer", null)).ReturnsAsync(
            new ArtifactDownloadResult("design-reviewer", "design-reviewer", "agent", "1.1.0", "Design reviewer agent", "harshpratapsinghrana1/design-reviewer#v1.1.0", latestContent));

        placement.Setup(p => p.PlaceArtifact(It.IsAny<string>(), "agent", "design-reviewer", It.IsAny<List<ArtifactFileEntry>>(), It.IsAny<string>()))
            .Returns(new List<string> { ".github/agents/design-reviewer.md" });

        var cmd = new InstallCommand(cip.Object, backend.Object, auth.Object, placement.Object);
        var code = cmd.Invoke(new[] { "design-reviewer" });

        Assert.Equal(0, code);
        backend.Verify(b => b.DownloadArtifactAsync("design-reviewer", null), Times.Once);
        cip.Verify(a => a.InstallAsync("harshpratapsinghrana1/design-reviewer#v1.1.0"), Times.Once);
    }

    [Fact]
    public void Install_WithExactVersion_InstallsRequestedVersion()
    {
        var cip = new Mock<ICipService>();
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        var placement = new Mock<IArtifactPlacementService>();

        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(_testSession);
        backend.Setup(b => b.GetArtifactVersionsAsync("design-reviewer")).ReturnsAsync(_availableVersions);

        var v100Content = @"{""name"":""design-reviewer"",""type"":""agent"",""version"":""1.0.0"",""files"":[{""path"":"".github/agents/design-reviewer.md"",""content"":""v1.0.0""}]}";
        backend.Setup(b => b.DownloadArtifactAsync("design-reviewer", "1.0.0")).ReturnsAsync(
            new ArtifactDownloadResult("design-reviewer", "design-reviewer", "agent", "1.0.0", "Design reviewer agent", "harshpratapsinghrana1/design-reviewer#v1.0.0", v100Content));

        placement.Setup(p => p.PlaceArtifact(It.IsAny<string>(), "agent", "design-reviewer", It.IsAny<List<ArtifactFileEntry>>(), It.IsAny<string>()))
            .Returns(new List<string> { ".github/agents/design-reviewer.md" });

        var cmd = new InstallCommand(cip.Object, backend.Object, auth.Object, placement.Object);
        var code = cmd.Invoke(new[] { "design-reviewer", "--version", "1.0.0" });

        Assert.Equal(0, code);
        backend.Verify(b => b.GetArtifactVersionsAsync("design-reviewer"), Times.Once);
        backend.Verify(b => b.DownloadArtifactAsync("design-reviewer", "1.0.0"), Times.Once);
        cip.Verify(a => a.InstallAsync("harshpratapsinghrana1/design-reviewer#v1.0.0"), Times.Once);
    }

    [Fact]
    public void Install_WithInvalidVersion_DisplaysAvailableVersionsAndFails_WithoutFallback()
    {
        var cip = new Mock<ICipService>();
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        var placement = new Mock<IArtifactPlacementService>();

        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(_testSession);
        backend.Setup(b => b.GetArtifactVersionsAsync("design-reviewer")).ReturnsAsync(_availableVersions);

        var sw = new StringWriter();
        var origOut = Console.Out;
        Console.SetOut(sw);

        try
        {
            var cmd = new InstallCommand(cip.Object, backend.Object, auth.Object, placement.Object);
            var code = cmd.Invoke(new[] { "design-reviewer", "--version", "99.0.0" });

            Assert.Equal(1, code);
            var output = sw.ToString();
            Assert.Contains("Artifact 'design-reviewer' version '99.0.0' was not found.", output);
            Assert.Contains("Available versions:", output);
            Assert.Contains("1.1.0 (latest)", output);
            Assert.Contains("1.0.0", output);

            // Verify no download or CIP install was triggered
            backend.Verify(b => b.DownloadArtifactAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            cip.Verify(a => a.InstallAsync(It.IsAny<string>()), Times.Never);
        }
        finally
        {
            Console.SetOut(origOut);
        }
    }
}
