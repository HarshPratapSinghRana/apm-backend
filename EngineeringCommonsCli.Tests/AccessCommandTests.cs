using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using EngineeringCommonsCli.Commands;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;
using Moq;
using Xunit;

namespace EngineeringCommonsCli.Tests;

public class AccessCommandTests
{
    private readonly Mock<IBackendClient> _backendMock = new();
    private readonly Mock<IAuthenticationService> _authMock = new();

    private AccessCommand CreateCommand(string role = "PRODUCER", string email = "user@maqsoftware.com")
    {
        _authMock.Setup(a => a.CurrentSessionAsync())
            .ReturnsAsync(new UserSession("valid_token", email, role, email));
        return new AccessCommand(_backendMock.Object, _authMock.Object);
    }

    [Fact]
    public void Access_Unauthenticated_Returns1()
    {
        _authMock.Setup(a => a.CurrentSessionAsync()).ReturnsAsync((UserSession?)null);
        var cmd = new AccessCommand(_backendMock.Object, _authMock.Object);

        var exitCode = cmd.Invoke(new[] { "request", "reviewer" });
        Assert.Equal(1, exitCode);
    }

    [Fact]
    public void Access_Help_Returns0()
    {
        var cmd = CreateCommand();
        var exitCode = cmd.Invoke(new[] { "--help" });
        Assert.Equal(0, exitCode);
    }

    [Fact]
    public void Access_RequestAccess_DefaultContributor_Success()
    {
        _backendMock.Setup(b => b.RequestAccessAsync("CONTRIBUTOR", "Need access to contribute AI artifacts"))
            .ReturnsAsync(true);

        var cmd = CreateCommand();
        var exitCode = cmd.Invoke(new[] { "request", "--reason", "Need access to contribute AI artifacts" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.RequestAccessAsync("CONTRIBUTOR", "Need access to contribute AI artifacts"), Times.Once);
    }

    [Fact]
    public void Access_RequestAccess_ExplicitReviewer_Success()
    {
        _backendMock.Setup(b => b.RequestAccessAsync("REVIEWER", "Need access to review prompt templates"))
            .ReturnsAsync(true);

        var cmd = CreateCommand();
        var exitCode = cmd.Invoke(new[] { "request", "reviewer", "--reason", "Need access to review prompt templates" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.RequestAccessAsync("REVIEWER", "Need access to review prompt templates"), Times.Once);
    }

    [Fact]
    public void Access_RequestAccess_CertifiedReviewer_Success()
    {
        _backendMock.Setup(b => b.RequestAccessAsync("CERTIFIED_REVIEWER", "Senior domain expert"))
            .ReturnsAsync(true);

        var cmd = CreateCommand();
        var exitCode = cmd.Invoke(new[] { "request", "certified-reviewer", "--reason", "Senior domain expert" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.RequestAccessAsync("CERTIFIED_REVIEWER", "Senior domain expert"), Times.Once);
    }

    [Fact]
    public void Access_MyRequests_Success()
    {
        _backendMock.Setup(b => b.GetMyAccessRequestsAsync())
            .ReturnsAsync(new UserRoleStatusCliDto(
                Email: "user@maqsoftware.com",
                CurrentRole: "PRODUCER",
                IsCertifiedReviewer: false,
                Requests: new List<AccessRequestCliDto>
                {
                    new("req-123", "user@maqsoftware.com", "REVIEWER", "PRODUCER", "PENDING", "Need reviewer role", null, null, DateTime.UtcNow, null)
                }));

        var cmd = CreateCommand();
        var exitCode = cmd.Invoke(new[] { "my-requests" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.GetMyAccessRequestsAsync(), Times.Once);
    }

    [Fact]
    public void Access_AdminList_Success()
    {
        _backendMock.Setup(b => b.GetAdminAccessRequestsAsync(null))
            .ReturnsAsync(new List<AccessRequestCliDto>
            {
                new("req-123", "user@maqsoftware.com", "REVIEWER", "PRODUCER", "PENDING", "Need review perms", null, null, DateTime.UtcNow, null)
            });

        var cmd = CreateCommand("ADMIN", "harsh.rana@maqsoftware.com");
        var exitCode = cmd.Invoke(new[] { "list" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.GetAdminAccessRequestsAsync(null), Times.Once);
    }

    [Fact]
    public void Access_Approve_Success()
    {
        _backendMock.Setup(b => b.ApproveAccessRequestAsync("req-123", "Approved by Harsh"))
            .ReturnsAsync(true);

        var cmd = CreateCommand("ADMIN", "harsh.rana@maqsoftware.com");
        var exitCode = cmd.Invoke(new[] { "approve", "req-123", "--notes", "Approved by Harsh" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.ApproveAccessRequestAsync("req-123", "Approved by Harsh"), Times.Once);
    }

    [Fact]
    public void Access_Reject_Success()
    {
        _backendMock.Setup(b => b.RejectAccessRequestAsync("req-123", "Not sufficient experience"))
            .ReturnsAsync(true);

        var cmd = CreateCommand("ADMIN", "harsh.rana@maqsoftware.com");
        var exitCode = cmd.Invoke(new[] { "reject", "req-123", "--notes", "Not sufficient experience" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.RejectAccessRequestAsync("req-123", "Not sufficient experience"), Times.Once);
    }

    [Fact]
    public void Access_Revoke_Success()
    {
        _backendMock.Setup(b => b.RevokeAccessAsync("developer@maqsoftware.com", "Project transitioned"))
            .ReturnsAsync(true);

        var cmd = CreateCommand("ADMIN", "harsh.rana@maqsoftware.com");
        var exitCode = cmd.Invoke(new[] { "revoke", "developer@maqsoftware.com", "--notes", "Project transitioned" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.RevokeAccessAsync("developer@maqsoftware.com", "Project transitioned"), Times.Once);
    }

    [Fact]
    public void Access_CertifyReviewer_Success()
    {
        _backendMock.Setup(b => b.CertifyReviewerAsync("lead@maqsoftware.com", "Completed certification checklist"))
            .ReturnsAsync(true);

        var cmd = CreateCommand("ADMIN", "harsh.rana@maqsoftware.com");
        var exitCode = cmd.Invoke(new[] { "certify", "lead@maqsoftware.com", "--notes", "Completed certification checklist" });

        Assert.Equal(0, exitCode);
        _backendMock.Verify(b => b.CertifyReviewerAsync("lead@maqsoftware.com", "Completed certification checklist"), Times.Once);
    }
}
