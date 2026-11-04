using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using EngineeringCommonsCli.Commands;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;
using Moq;
using Xunit;

namespace EngineeringCommonsCli.Tests;

public class BountyCommandTests
{
    private readonly Mock<IBackendClient> _backendMock = new();
    private readonly Mock<IAuthenticationService> _authMock = new();

    private BountyCommand CreateCommand(string role = "PRODUCER", string email = "user@maqsoftware.com")
    {
        _authMock.Setup(a => a.CurrentSessionAsync())
            .ReturnsAsync(new UserSession("valid_token", email, role, email));
        return new BountyCommand(_backendMock.Object, _authMock.Object);
    }

    [Fact]
    public void Bounty_Unauthenticated_Returns1()
    {
        _authMock.Setup(a => a.CurrentSessionAsync()).ReturnsAsync((UserSession?)null);
        var cmd = new BountyCommand(_backendMock.Object, _authMock.Object);

        var exitCode = cmd.Invoke(new[] { "list" });
        Assert.Equal(1, exitCode);
    }

    [Fact]
    public void Bounty_Help_Returns0()
    {
        var cmd = CreateCommand();
        var exitCode = cmd.Invoke(new[] { "--help" });
        Assert.Equal(0, exitCode);
    }

    [Fact]
    public void Bounty_List_Returns0()
    {
        _backendMock.Setup(b => b.GetBountiesAsync(null, null, null))
            .ReturnsAsync(new List<BountyCliDto>
            {
                new() { Id = "bounty-1", Title = "Build MCP Server", Stage = "CodeGeneration", Category = "Code gen", Credits = 50, Status = "Open" }
            });

        var cmd = CreateCommand();
        var exitCode = cmd.Invoke(new[] { "list" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.GetBountiesAsync(null, null, null), Times.Once);
    }

    [Fact]
    public void Bounty_Get_Success()
    {
        _backendMock.Setup(b => b.GetBountyByIdAsync("bounty-1"))
            .ReturnsAsync(new BountyDetailCliDto
            {
                Id = "bounty-1",
                Title = "Build MCP Server",
                Stage = "CodeGeneration",
                Category = "Code gen",
                Credits = 50,
                Status = "Open",
                Description = "Implement SQLite MCP tools"
            });

        var cmd = CreateCommand();
        var exitCode = cmd.Invoke(new[] { "get", "bounty-1" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.GetBountyByIdAsync("bounty-1"), Times.Once);
    }

    [Fact]
    public void Bounty_Claim_Success()
    {
        _backendMock.Setup(b => b.ClaimBountyAsync("bounty-1"))
            .ReturnsAsync(new BountyCliDto
            {
                Id = "bounty-1",
                Title = "Build MCP Server",
                Stage = "CodeGeneration",
                Category = "Code gen",
                Credits = 50,
                Status = "Claimed",
                ClaimedByEmail = "user@maqsoftware.com"
            });

        var cmd = CreateCommand();
        var exitCode = cmd.Invoke(new[] { "claim", "bounty-1" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.ClaimBountyAsync("bounty-1"), Times.Once);
    }

    [Fact]
    public void Bounty_Release_Success()
    {
        _backendMock.Setup(b => b.ReleaseBountyAsync("bounty-1"))
            .ReturnsAsync(new BountyCliDto
            {
                Id = "bounty-1",
                Title = "Build MCP Server",
                Stage = "CodeGeneration",
                Category = "Code gen",
                Credits = 50,
                Status = "Open"
            });

        var cmd = CreateCommand();
        var exitCode = cmd.Invoke(new[] { "release", "bounty-1" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.ReleaseBountyAsync("bounty-1"), Times.Once);
    }

    [Fact]
    public void Bounty_Submit_TransitionsToInReview()
    {
        _backendMock.Setup(b => b.SubmitBountyCodeAsync("bounty-1", "code content", null, "solution note"))
            .ReturnsAsync(new BountyCliDto
            {
                Id = "bounty-1",
                Title = "Build MCP Server",
                Stage = "InReview",
                Category = "Code gen",
                Credits = 50,
                Status = "Claimed"
            });

        var cmd = CreateCommand();
        var exitCode = cmd.Invoke(new[] { "submit", "bounty-1", "--code", "code content", "--notes", "solution note" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.SubmitBountyCodeAsync("bounty-1", "code content", null, "solution note"), Times.Once);
    }

    [Fact]
    public void Bounty_Review_Approve_TransitionsToInTesting()
    {
        _backendMock.Setup(b => b.ReviewBountyCodeAsync("bounty-1", true, "Looks great!"))
            .ReturnsAsync(new BountyCliDto
            {
                Id = "bounty-1",
                Title = "Build MCP Server",
                Stage = "InTesting",
                Category = "Code gen",
                Credits = 50,
                Status = "Claimed"
            });

        var cmd = CreateCommand(role: "REVIEWER");
        var exitCode = cmd.Invoke(new[] { "review", "bounty-1", "--approve", "--feedback", "Looks great!" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.ReviewBountyCodeAsync("bounty-1", true, "Looks great!"), Times.Once);
    }

    [Fact]
    public void Bounty_Test_Pass_CompletesBounty()
    {
        _backendMock.Setup(b => b.RunBountyTestsAsync("bounty-1", "Automated CI/CD Test Suite", true, 10, 0, It.IsAny<string>()))
            .ReturnsAsync(new BountyCliDto
            {
                Id = "bounty-1",
                Title = "Build MCP Server",
                Stage = "Completed",
                Category = "Code gen",
                Credits = 50,
                Status = "Completed",
                WinnerEmail = "user@maqsoftware.com"
            });

        var cmd = CreateCommand();
        var exitCode = cmd.Invoke(new[] { "test", "bounty-1", "--pass" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.RunBountyTestsAsync("bounty-1", "Automated CI/CD Test Suite", true, 10, 0, It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public void Bounty_Feedback_SetsChoice()
    {
        _backendMock.Setup(b => b.SetBountyFeedbackChoiceAsync("bounty-1", "OpenToCommunity"))
            .ReturnsAsync(new BountyCliDto
            {
                Id = "bounty-1",
                Title = "Build MCP Server",
                Stage = "CodeGeneration",
                Category = "Code gen",
                Credits = 50,
                Status = "Open",
                ProducerResolutionPreference = "OpenToCommunity"
            });

        var cmd = CreateCommand();
        var exitCode = cmd.Invoke(new[] { "feedback", "bounty-1", "--choice", "OpenToCommunity" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.SetBountyFeedbackChoiceAsync("bounty-1", "OpenToCommunity"), Times.Once);
    }

    [Fact]
    public void Bounty_Analytics_Success()
    {
        _backendMock.Setup(b => b.GetBountyAnalyticsAsync())
            .ReturnsAsync(new BountyAnalyticsCliDto
            {
                TotalBounties = 10,
                OpenBounties = 4,
                ClaimedBounties = 3,
                CompletedBounties = 3,
                SuccessRatePercent = 85.0,
                TotalCreditsPaid = 150,
                AverageCompletionHours = 24.5,
                StageDistribution = new Dictionary<string, int> { { "CodeGeneration", 3 }, { "InReview", 2 }, { "InTesting", 1 }, { "Completed", 3 } }
            });

        var cmd = CreateCommand();
        var exitCode = cmd.Invoke(new[] { "analytics" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.GetBountyAnalyticsAsync(), Times.Once);
    }
}
