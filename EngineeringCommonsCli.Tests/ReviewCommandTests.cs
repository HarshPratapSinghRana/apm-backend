using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using EngineeringCommonsCli.Commands;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;
using Moq;
using Xunit;

namespace EngineeringCommonsCli.Tests;

public class ReviewCommandTests
{
    [Fact]
    public void Review_Unauthenticated_Returns_Error()
    {
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync((UserSession?)null);

        var cmd = new ReviewCommand(backend.Object, auth.Object);
        var code = cmd.Invoke(new string[] { });
        Assert.Equal(1, code);
    }

    [Fact]
    public void Review_NoPending_Returns_Success()
    {
        var backend = new Mock<IBackendClient>();
        backend.Setup(b => b.GetPendingReviewsAsync()).ReturnsAsync(new List<PendingReviewDto>());
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new UserSession("tok", "reviewer@test.com"));

        var cmd = new ReviewCommand(backend.Object, auth.Object);
        var code = cmd.Invoke(new string[] { });
        Assert.Equal(0, code);
    }
}
