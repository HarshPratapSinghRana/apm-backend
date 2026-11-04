using EngineeringCommonsCli.Commands;
using EngineeringCommonsCli.Services.Interfaces;
using Moq;
using Xunit;

namespace EngineeringCommonsCli.Tests;

public class LoginCommandTests
{
    [Fact]
    public void Login_Success_WithArgs()
    {
        var mock = new Mock<IAuthenticationService>();
        mock.Setup(a => a.LoginAsync("consumer@test.com", "Consumer@123")).ReturnsAsync(new EngineeringCommonsCli.Models.UserSession("tok","consumer@test.com"));
        var cmd = new LoginCommand(mock.Object);
        var code = cmd.Invoke(new[] { "consumer@test.com", "Consumer@123" });
        Assert.Equal(0, code);
    }

    [Fact]
    public void Login_InvalidCredentials_Returns1()
    {
        var mock = new Mock<IAuthenticationService>();
        mock.Setup(a => a.LoginAsync("bad@test.com", "x")).ReturnsAsync((EngineeringCommonsCli.Models.UserSession?)null);
        var cmd = new LoginCommand(mock.Object);
        var code = cmd.Invoke(new[] { "bad@test.com", "x" });
        Assert.Equal(1, code);
    }
}
