using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using EngineeringCommonsCli.Commands;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;
using Moq;
using Xunit;

namespace EngineeringCommonsCli.Tests;

[Collection("ConsoleOutputCollection")]
public class ListVersionsCommandTests
{
    private readonly UserSession _testSession = new("token-123", "test@company.com");
    private readonly List<ArtifactVersionDto> _availableVersions = new()
    {
        new("1.1.0", "harshpratapsinghrana1/design-reviewer#v1.1.0", true),
        new("1.0.0", "harshpratapsinghrana1/design-reviewer#v1.0.0", false)
    };

    [Fact]
    public void ListVersions_Unauthenticated_Returns_Error()
    {
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync((UserSession?)null);

        var cmd = new ListVersionsCommand(backend.Object, auth.Object);
        var code = cmd.Invoke(new[] { "design-reviewer" });

        Assert.Equal(1, code);
    }

    [Fact]
    public void ListVersions_NoArgs_Returns_Usage()
    {
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();

        var cmd = new ListVersionsCommand(backend.Object, auth.Object);
        var code = cmd.Invoke(Array.Empty<string>());

        Assert.Equal(2, code);
    }

    [Fact]
    public void ListVersions_Displays_FormattedVersions_With_LatestTag()
    {
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(_testSession);
        backend.Setup(b => b.GetArtifactVersionsAsync("design-reviewer")).ReturnsAsync(_availableVersions);

        var sw = new StringWriter();
        var origOut = Console.Out;
        Console.SetOut(sw);

        try
        {
            var cmd = new ListVersionsCommand(backend.Object, auth.Object);
            var code = cmd.Invoke(new[] { "design-reviewer" });

            Assert.Equal(0, code);
            var output = sw.ToString();
            Assert.Contains("Available versions for design-reviewer:", output);
            Assert.Contains("1.1.0  (latest)", output);
            Assert.Contains("1.0.0", output);
        }
        finally
        {
            Console.SetOut(origOut);
        }
    }

    [Fact]
    public void ListVersions_NotFound_Displays_Error()
    {
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(_testSession);
        backend.Setup(b => b.GetArtifactVersionsAsync("unknown-artifact")).ReturnsAsync(new List<ArtifactVersionDto>());

        var sw = new StringWriter();
        var origOut = Console.Out;
        Console.SetOut(sw);

        try
        {
            var cmd = new ListVersionsCommand(backend.Object, auth.Object);
            var code = cmd.Invoke(new[] { "unknown-artifact" });

            Assert.Equal(1, code);
            var output = sw.ToString();
            Assert.Contains("Artifact 'unknown-artifact' was not found in marketplace", output);
        }
        finally
        {
            Console.SetOut(origOut);
        }
    }
}
