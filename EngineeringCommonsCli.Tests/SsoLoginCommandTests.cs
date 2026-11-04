using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using EngineeringCommonsCli.Commands;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Implementations;
using EngineeringCommonsCli.Services.Interfaces;
using Moq;
using Xunit;

namespace EngineeringCommonsCli.Tests;

public class SsoLoginCommandTests
{
    [Fact]
    public void SsoLogin_DirectToken_Success()
    {
        var authMock = new Mock<IAuthenticationService>();
        var ssoMock = new Mock<ISsoAuthService>();

        authMock.Setup(a => a.CurrentSessionAsync())
            .ReturnsAsync((UserSession?)null);

        authMock.Setup(a => a.SsoLoginAsync("test_bearer_token", "developer@maqsoftware.com", "developer@maqsoftware.com", null))
            .ReturnsAsync(new UserSession(
                Token: "mock_test_token", // gitleaks:allow
                Email: "developer@maqsoftware.com",
                Role: "PRODUCER",
                Name: "developer@maqsoftware.com",
                AuthType: "microsoft_sso",
                SsoToken: "test_bearer_token"));

        var cmd = new LoginCommand(authMock.Object, ssoMock.Object);
        var exitCode = cmd.Invoke(new[] { "--sso", "--token", "test_bearer_token", "--email", "developer@maqsoftware.com" });

        Assert.Equal(0, exitCode);
        authMock.Verify(a => a.SsoLoginAsync("test_bearer_token", "developer@maqsoftware.com", "developer@maqsoftware.com", null), Times.Once);
        ssoMock.Verify(s => s.AcquireTokenInteractiveAsync(It.IsAny<SsoAuthOptions>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public void SsoLogin_DirectToken_BackendRejection_Returns1()
    {
        var authMock = new Mock<IAuthenticationService>();
        var ssoMock = new Mock<ISsoAuthService>();

        authMock.Setup(a => a.CurrentSessionAsync())
            .ReturnsAsync((UserSession?)null);

        authMock.Setup(a => a.SsoLoginAsync("invalid_token", null, null, null))
            .ReturnsAsync((UserSession?)null);

        var cmd = new LoginCommand(authMock.Object, ssoMock.Object);
        var exitCode = cmd.Invoke(new[] { "--sso", "--token", "invalid_token" });

        Assert.Equal(1, exitCode);
    }

    [Fact]
    public void SsoLogin_ActiveSsoSession_ReusedWithoutForce()
    {
        var authMock = new Mock<IAuthenticationService>();
        var ssoMock = new Mock<ISsoAuthService>();

        var existingSession = new UserSession(
            Token: "existing_token",
            Email: "user@maqsoftware.com",
            Role: "PRODUCER",
            Name: "MAQ User",
            AuthType: "microsoft_sso",
            SsoToken: "ms_token");

        authMock.Setup(a => a.CurrentSessionAsync())
            .ReturnsAsync(existingSession);

        var cmd = new LoginCommand(authMock.Object, ssoMock.Object);
        var exitCode = cmd.Invoke(new[] { "--sso" });

        Assert.Equal(0, exitCode);
        ssoMock.Verify(s => s.AcquireTokenInteractiveAsync(It.IsAny<SsoAuthOptions>(), It.IsAny<CancellationToken>()), Times.Never);
        authMock.Verify(a => a.SsoLoginAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public void SsoLogin_ActiveSsoSession_ReauthenticatedWithForce()
    {
        var authMock = new Mock<IAuthenticationService>();
        var ssoMock = new Mock<ISsoAuthService>();

        var existingSession = new UserSession(
            Token: "old_token",
            Email: "user@maqsoftware.com",
            Role: "PRODUCER",
            Name: "MAQ User",
            AuthType: "microsoft_sso");

        authMock.Setup(a => a.CurrentSessionAsync())
            .ReturnsAsync(existingSession);

        ssoMock.Setup(s => s.AcquireTokenInteractiveAsync(It.IsAny<SsoAuthOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SsoAuthResult(
                Success: true,
                AccessToken: "fresh_ms_token",
                Email: "fresh@maqsoftware.com",
                DisplayName: "Fresh User"));

        authMock.Setup(a => a.SsoLoginAsync("fresh_ms_token", "fresh@maqsoftware.com", "Fresh User", null))
            .ReturnsAsync(new UserSession(
                Token: "fresh_cip_token",
                Email: "fresh@maqsoftware.com",
                Role: "PRODUCER",
                Name: "Fresh User",
                AuthType: "microsoft_sso"));

        var cmd = new LoginCommand(authMock.Object, ssoMock.Object);
        var exitCode = cmd.Invoke(new[] { "--sso", "--force" });

        Assert.Equal(0, exitCode);
        ssoMock.Verify(s => s.AcquireTokenInteractiveAsync(It.IsAny<SsoAuthOptions>(), It.IsAny<CancellationToken>()), Times.Once);
        authMock.Verify(a => a.SsoLoginAsync("fresh_ms_token", "fresh@maqsoftware.com", "Fresh User", null), Times.Once);
    }

    [Fact]
    public void SsoLogin_InteractiveFlow_Success()
    {
        var authMock = new Mock<IAuthenticationService>();
        var ssoMock = new Mock<ISsoAuthService>();

        authMock.Setup(a => a.CurrentSessionAsync())
            .ReturnsAsync((UserSession?)null);

        ssoMock.Setup(s => s.AcquireTokenInteractiveAsync(It.IsAny<SsoAuthOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SsoAuthResult(
                Success: true,
                AccessToken: "interactive_ms_token",
                Email: "employee@maqsoftware.com",
                DisplayName: "Employee User"));

        authMock.Setup(a => a.SsoLoginAsync("interactive_ms_token", "employee@maqsoftware.com", "Employee User", null))
            .ReturnsAsync(new UserSession(
                Token: "backend_cip_token",
                Email: "employee@maqsoftware.com",
                Role: "PRODUCER",
                Name: "Employee User",
                AuthType: "microsoft_sso"));

        var cmd = new LoginCommand(authMock.Object, ssoMock.Object);
        var exitCode = cmd.Invoke(new[] { "-s" });

        Assert.Equal(0, exitCode);
        ssoMock.Verify(s => s.AcquireTokenInteractiveAsync(It.IsAny<SsoAuthOptions>(), It.IsAny<CancellationToken>()), Times.Once);
        authMock.Verify(a => a.SsoLoginAsync("interactive_ms_token", "employee@maqsoftware.com", "Employee User", null), Times.Once);
    }

    [Fact]
    public void SsoLogin_InteractiveFlow_DeviceError_Returns1()
    {
        var authMock = new Mock<IAuthenticationService>();
        var ssoMock = new Mock<ISsoAuthService>();

        authMock.Setup(a => a.CurrentSessionAsync())
            .ReturnsAsync((UserSession?)null);

        ssoMock.Setup(s => s.AcquireTokenInteractiveAsync(It.IsAny<SsoAuthOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SsoAuthResult(
                Success: false,
                Error: "User cancelled device authorization"));

        var cmd = new LoginCommand(authMock.Object, ssoMock.Object);
        var exitCode = cmd.Invoke(new[] { "--sso" });

        Assert.Equal(1, exitCode);
    }

    [Theory]
    [InlineData("user@maqsoftware.com", true)]
    [InlineData("lead@COMPANY.COM", true)]
    [InlineData("tester@test.com", true)]
    [InlineData("intruder@gmail.com", false)]
    [InlineData("attacker@yahoo.com", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void MicrosoftSsoAuthService_DomainValidation(string? email, bool expectedValid)
    {
        var service = new MicrosoftSsoAuthService();
        var isValid = service.IsAllowedDomain(email!);
        Assert.Equal(expectedValid, isValid);
    }

    [Fact]
    public async Task FileAuthTokenStore_RichSession_RoundTrip()
    {
        var tempFile = Path.Combine(Path.GetTempPath(), $"session_test_{Guid.NewGuid():N}.json");
        try
        {
            var store = new FileAuthTokenStore(tempFile);

            var initialSession = new UserSession(
                Token: "cip_token_999",
                Email: "producer@maqsoftware.com",
                Role: "PRODUCER",
                Name: "Producer User",
                AuthType: "microsoft_sso",
                SsoToken: "ms_access_token_123");

            await store.SaveSessionAsync(initialSession);

            var loadedSession = await store.GetSessionAsync();
            Assert.NotNull(loadedSession);
            Assert.Equal("cip_token_999", loadedSession.Token);
            Assert.Equal("producer@maqsoftware.com", loadedSession.Email);
            Assert.Equal("PRODUCER", loadedSession.Role);
            Assert.Equal("Producer User", loadedSession.Name);
            Assert.Equal("microsoft_sso", loadedSession.AuthType);
            Assert.Equal("ms_access_token_123", loadedSession.SsoToken);

            var tokenOnly = await store.GetTokenAsync();
            Assert.Equal("cip_token_999", tokenOnly);

            var emailOnly = await store.GetEmailAsync();
            Assert.Equal("producer@maqsoftware.com", emailOnly);

            await store.ClearTokenAsync();
            Assert.Null(await store.GetSessionAsync());
        }
        finally
        {
            if (File.Exists(tempFile)) File.Delete(tempFile);
        }
    }

    [Fact]
    public void Login_WithoutArgs_DefaultsToSso()
    {
        var authMock = new Mock<IAuthenticationService>();
        var ssoMock = new Mock<ISsoAuthService>();

        authMock.Setup(a => a.CurrentSessionAsync())
            .ReturnsAsync((UserSession?)null);

        ssoMock.Setup(s => s.AcquireTokenInteractiveAsync(It.IsAny<SsoAuthOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SsoAuthResult(
                Success: true,
                AccessToken: "default_sso_token",
                Email: "engineer@maqsoftware.com",
                DisplayName: "Engineer User"));

        authMock.Setup(a => a.SsoLoginAsync("default_sso_token", "engineer@maqsoftware.com", "Engineer User", null))
            .ReturnsAsync(new UserSession(
                Token: "cip_token_default",
                Email: "engineer@maqsoftware.com",
                Role: "PRODUCER",
                Name: "Engineer User",
                AuthType: "microsoft_sso"));

        var cmd = new LoginCommand(authMock.Object, ssoMock.Object);
        // Invoking 'engineering-commons login' with NO arguments
        var exitCode = cmd.Invoke(Array.Empty<string>());

        Assert.Equal(0, exitCode);
        ssoMock.Verify(s => s.AcquireTokenInteractiveAsync(It.IsAny<SsoAuthOptions>(), It.IsAny<CancellationToken>()), Times.Once);
        authMock.Verify(a => a.SsoLoginAsync("default_sso_token", "engineer@maqsoftware.com", "Engineer User", null), Times.Once);
        // Should NOT call LoginAsync (credentials)
        authMock.Verify(a => a.LoginAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }
}
