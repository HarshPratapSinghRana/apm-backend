using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using EngineeringCommonsCli.Commands;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;
using Moq;
using Xunit;

namespace EngineeringCommonsCli.Tests;

[Collection("ConsoleOutputCollection")]
public class StatusCommandTests
{
    [Fact]
    public void StatusCommand_Unauthenticated_Returns_Error()
    {
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync((UserSession?)null);

        var cmd = new StatusCommand(backend.Object, auth.Object);
        var code = cmd.Invoke(Array.Empty<string>());

        Assert.Equal(1, code);
    }

    [Fact]
    public void StatusCommand_NoSubmissions_Displays_EmptyMessage()
    {
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new UserSession("token-123", "producer@example.com"));
        backend.Setup(b => b.GetMySubmissionsAsync()).ReturnsAsync(new List<ProducerSubmissionDto>());

        var sw = new StringWriter();
        var origOut = Console.Out;
        Console.SetOut(sw);

        try
        {
            var cmd = new StatusCommand(backend.Object, auth.Object);
            var code = cmd.Invoke(Array.Empty<string>());

            Assert.Equal(0, code);
            var output = sw.ToString();
            Assert.Contains("No submissions found for 'producer@example.com'", output);
        }
        finally
        {
            Console.SetOut(origOut);
        }
    }

    [Fact]
    public void StatusCommand_WithSubmissions_Displays_StatusesAndFeedback()
    {
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new UserSession("token-123", "producer@example.com"));

        var list = new List<ProducerSubmissionDto>
        {
            new("rev-1", "design-reviewer", "Pending", DateTime.UtcNow.AddHours(-2)),
            new("rev-2", "code-auditor", "Approved", DateTime.UtcNow.AddHours(-1), "reviewer@example.com", "Approved and verified.", DateTime.UtcNow.AddMinutes(-30)),
            new("rev-3", "broken-agent", "Rejected", DateTime.UtcNow.AddHours(-3), "reviewer@example.com", "Please fix missing rules.md", DateTime.UtcNow.AddMinutes(-10))
        };

        backend.Setup(b => b.GetMySubmissionsAsync()).ReturnsAsync(list);

        var sw = new StringWriter();
        var origOut = Console.Out;
        Console.SetOut(sw);

        try
        {
            var cmd = new StatusCommand(backend.Object, auth.Object);
            var code = cmd.Invoke(Array.Empty<string>());

            Assert.Equal(0, code);
            var output = sw.ToString();
            Assert.Contains("MY SUBMISSIONS & REVIEWS STATUS", output);
            Assert.Contains("design-reviewer", output);
            Assert.Contains("[PENDING] ⏳", output);
            Assert.Contains("code-auditor", output);
            Assert.Contains("[APPROVED] ✅", output);
            Assert.Contains("Approved and verified.", output);
            Assert.Contains("broken-agent", output);
            Assert.Contains("[REJECTED] ❌", output);
            Assert.Contains("Please fix missing rules.md", output);
            Assert.Contains("reviewer@example.com", output);
            Assert.Contains("1 Pending ⏳", output);
            Assert.Contains("1 Approved ✅", output);
            Assert.Contains("1 Rejected ❌", output);
        }
        finally
        {
            Console.SetOut(origOut);
        }
    }

    [Fact]
    public void StatusCommand_WithFilter_Filters_By_ArtifactName()
    {
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new UserSession("token-123", "producer@example.com"));

        var list = new List<ProducerSubmissionDto>
        {
            new("rev-1", "design-reviewer", "Pending", DateTime.UtcNow),
            new("rev-2", "code-auditor", "Approved", DateTime.UtcNow, "reviewer@example.com", "Looks good", DateTime.UtcNow)
        };

        backend.Setup(b => b.GetMySubmissionsAsync()).ReturnsAsync(list);

        var sw = new StringWriter();
        var origOut = Console.Out;
        Console.SetOut(sw);

        try
        {
            var cmd = new StatusCommand(backend.Object, auth.Object);
            var code = cmd.Invoke(new[] { "code-auditor" });

            Assert.Equal(0, code);
            var output = sw.ToString();
            Assert.Contains("code-auditor", output);
            Assert.DoesNotContain("design-reviewer", output);
            Assert.Contains("Looks good", output);
        }
        finally
        {
            Console.SetOut(origOut);
        }
    }
}
