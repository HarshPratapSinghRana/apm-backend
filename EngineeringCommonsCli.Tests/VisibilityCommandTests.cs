using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using EngineeringCommonsCli.Commands;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;
using Moq;
using Newtonsoft.Json.Linq;
using Xunit;

namespace EngineeringCommonsCli.Tests;

public class VisibilityCommandTests
{
    [Fact]
    public void Visibility_Unauthenticated_Returns_Error()
    {
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync((UserSession?)null);

        var cmd = new VisibilityCommand(backend.Object, auth.Object);
        var code = cmd.Invoke(new[] { "my-agent", "private" });
        Assert.Equal(1, code);
    }

    [Fact]
    public void Visibility_NoArgs_Returns_Error_And_Shows_Usage()
    {
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new UserSession("token", "producer@company.com"));

        var cmd = new VisibilityCommand(backend.Object, auth.Object);
        var code = cmd.Invoke(new string[] { });
        Assert.Equal(1, code);
    }

    [Fact]
    public void Visibility_Set_Private_With_Whitelists_Invokes_Backend_With_RBAC_Params()
    {
        var backend = new Mock<IBackendClient>();
        backend.Setup(b => b.UpdateVisibilityAsync("my-agent", true, "c1@co.com", "r1@co.com", "u1@co.com")).ReturnsAsync(true);

        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new UserSession("token", "producer@company.com"));

        var cmd = new VisibilityCommand(backend.Object, auth.Object);
        var code = cmd.Invoke(new[] { "my-agent", "private", "--contributors", "c1@co.com", "--reviewers", "r1@co.com", "--consumers", "u1@co.com" });

        Assert.Equal(0, code);
        backend.Verify(b => b.UpdateVisibilityAsync("my-agent", true, "c1@co.com", "r1@co.com", "u1@co.com"), Times.Once);
    }

    [Fact]
    public void Visibility_Set_Public_Invokes_Backend_With_False()
    {
        var backend = new Mock<IBackendClient>();
        backend.Setup(b => b.UpdateVisibilityAsync("my-agent", false, It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>())).ReturnsAsync(true);

        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new UserSession("token", "producer@company.com"));

        var cmd = new VisibilityCommand(backend.Object, auth.Object);
        var code = cmd.Invoke(new[] { "my-agent", "public" });

        Assert.Equal(0, code);
        backend.Verify(b => b.UpdateVisibilityAsync("my-agent", false, It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>()), Times.Once);
    }

    [Fact]
    public void ContributeCommand_With_Private_Flag_And_Whitelists_Sets_RBAC_In_Payload()
    {
        var disc = new Mock<IArtifactDiscoveryService>();
        var place = new Mock<IArtifactPlacementService>();
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();

        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new UserSession("token", "producer@company.com"));

        var testArtifact = new DiscoveredArtifact(
            "dev-skill",
            ArtifactType.Skill,
            "1.0.0",
            ".agents/skills/dev-skill",
            new[] { "skills/dev-skill/SKILL.md" },
            null,
            DetectionConfidence.High,
            "Skill manifest",
            true
        );

        disc.Setup(d => d.DiscoverAsync(It.IsAny<string>()))
            .ReturnsAsync(new[] { testArtifact });

        ArtifactSubmission? capturedSubmission = null;
        backend.Setup(b => b.SubmitArtifactAsync(It.IsAny<ArtifactSubmission>()))
            .Callback<ArtifactSubmission>(s => capturedSubmission = s)
            .ReturnsAsync(new ArtifactSubmissionResult { Success = true, Status = "Submitted", ReviewId = "rev-123" });

        var cmd = new ContributeCommand(disc.Object, place.Object, backend.Object, auth.Object);
        var code = cmd.Invoke(new[] { "dev-skill", "--private", "--contributors", "c1@co.com", "-r", "r1@co.com", "--consumers", "u1@co.com" });

        Assert.Equal(0, code);
        Assert.NotNull(capturedSubmission);
        Assert.Equal("dev-skill", capturedSubmission!.Name);

        var parsedPayload = JObject.Parse(capturedSubmission.Path);
        Assert.True(parsedPayload["isPrivate"]?.Value<bool>(), "isPrivate should be true in payload");
        Assert.Equal("private", parsedPayload["visibility"]?.ToString());
        Assert.Equal("c1@co.com", parsedPayload["allowedContributors"]?.ToString());
        Assert.Equal("r1@co.com", parsedPayload["allowedReviewers"]?.ToString());
        Assert.Equal("u1@co.com", parsedPayload["allowedConsumers"]?.ToString());
    }

    [Fact]
    public void ContributeCommand_With_Public_Flag_Sets_Public_Visibility()
    {
        var disc = new Mock<IArtifactDiscoveryService>();
        var place = new Mock<IArtifactPlacementService>();
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();

        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new UserSession("token", "producer@company.com"));

        var testArtifact = new DiscoveredArtifact(
            "public-agent",
            ArtifactType.Agent,
            "1.0.0",
            "agents/public-agent",
            new[] { "agents/public-agent.agent.md" },
            null,
            DetectionConfidence.High,
            "Agent manifest",
            true
        );

        disc.Setup(d => d.DiscoverAsync(It.IsAny<string>()))
            .ReturnsAsync(new[] { testArtifact });

        ArtifactSubmission? capturedSubmission = null;
        backend.Setup(b => b.SubmitArtifactAsync(It.IsAny<ArtifactSubmission>()))
            .Callback<ArtifactSubmission>(s => capturedSubmission = s)
            .ReturnsAsync(new ArtifactSubmissionResult { Success = true, Status = "Submitted", ReviewId = "rev-124" });

        var cmd = new ContributeCommand(disc.Object, place.Object, backend.Object, auth.Object);
        var code = cmd.Invoke(new[] { "public-agent", "--public" });

        Assert.Equal(0, code);
        Assert.NotNull(capturedSubmission);

        var parsedPayload = JObject.Parse(capturedSubmission!.Path);
        Assert.False(parsedPayload["isPrivate"]?.Value<bool>());
        Assert.Equal("public", parsedPayload["visibility"]?.ToString());
    }

    [Fact]
    public void ContributeCommand_With_Visibility_Option_Sets_Visibility()
    {
        var disc = new Mock<IArtifactDiscoveryService>();
        var place = new Mock<IArtifactPlacementService>();
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();

        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new UserSession("token", "producer@company.com"));

        var testArtifact = new DiscoveredArtifact(
            "custom-mcp",
            ArtifactType.McpServer,
            "1.0.0",
            ".mcp/custom-mcp",
            new[] { ".mcp/custom-mcp/mcp.json" },
            null,
            DetectionConfidence.High,
            "MCP manifest",
            true
        );

        disc.Setup(d => d.DiscoverAsync(It.IsAny<string>()))
            .ReturnsAsync(new[] { testArtifact });

        ArtifactSubmission? capturedSubmission = null;
        backend.Setup(b => b.SubmitArtifactAsync(It.IsAny<ArtifactSubmission>()))
            .Callback<ArtifactSubmission>(s => capturedSubmission = s)
            .ReturnsAsync(new ArtifactSubmissionResult { Success = true, Status = "Submitted", ReviewId = "rev-125" });

        var cmd = new ContributeCommand(disc.Object, place.Object, backend.Object, auth.Object);
        var code = cmd.Invoke(new[] { "custom-mcp", "--visibility", "private", "-c", "lead@company.com" });

        Assert.Equal(0, code);
        Assert.NotNull(capturedSubmission);

        var parsedPayload = JObject.Parse(capturedSubmission!.Path);
        Assert.True(parsedPayload["isPrivate"]?.Value<bool>());
        Assert.Equal("private", parsedPayload["visibility"]?.ToString());
        Assert.Equal("lead@company.com", parsedPayload["allowedContributors"]?.ToString());
    }
}
