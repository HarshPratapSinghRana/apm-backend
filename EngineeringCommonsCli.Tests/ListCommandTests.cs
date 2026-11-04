using EngineeringCommonsCli.Commands;
using EngineeringCommonsCli.Services.Interfaces;
using Moq;
using Xunit;

namespace EngineeringCommonsCli.Tests;

public class ListCommandTests
{
    [Fact]
    public void List_Unauthenticated_Returns_Error()
    {
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync((EngineeringCommonsCli.Models.UserSession?)null);
        var cmd = new ListCommand(backend.Object, auth.Object);
        var code = cmd.Invoke(new string[] { });
        Assert.Equal(1, code);
    }

    [Fact]
    public void List_Authenticated_Displays_Items()
    {
        var backend = new Mock<IBackendClient>();
        backend.Setup(b => b.ListArtifactsAsync(null)).ReturnsAsync(new[] { new EngineeringCommonsCli.Services.Interfaces.ArtifactSpec("design-reviewer","agent","1.1.0","harshpratapsinghrana1/design-reviewer#v1.1.0") });
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new EngineeringCommonsCli.Models.UserSession("tok","user"));
        var cmd = new ListCommand(backend.Object, auth.Object);
        var code = cmd.Invoke(new string[] { });
        Assert.Equal(0, code);
    }
}
