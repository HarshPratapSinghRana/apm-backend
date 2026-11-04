using System.Net.Http.Json;
using System.Threading.Tasks;
using Xunit;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CipBackend.IntegrationTests;

public class AuthenticationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    public AuthenticationTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task Login_And_SubmitChange_Workflow()
    {
        var client = _factory.CreateClient();
        var loginResp = await client.PostAsJsonAsync("/api/auth/login", new { email = "producer@company.com", password = "password" });
        loginResp.EnsureSuccessStatusCode();
        var body = await loginResp.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        string token = body.GetProperty("token").GetString() ?? string.Empty;
        Assert.False(string.IsNullOrEmpty(token));

        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        var submitResp = await client.PostAsJsonAsync("/api/artifacts/sample-artifact/changes", new { content = "change v1" });
        submitResp.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task SsoLogin_MaqDomain_Success()
    {
        var client = _factory.CreateClient();
        var ssoResp = await client.PostAsJsonAsync("/api/auth/sso", new
        {
            token = "mock-ms-token-12345",
            email = "developer@maqsoftware.com",
            name = "MAQ Developer"
        });

        ssoResp.EnsureSuccessStatusCode();
        var body = await ssoResp.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        string token = body.GetProperty("token").GetString() ?? string.Empty;
        var user = body.GetProperty("user");

        Assert.False(string.IsNullOrEmpty(token));
        Assert.Equal("developer@maqsoftware.com", user.GetProperty("email").GetString());
        Assert.Equal("CONSUMER", user.GetProperty("role").GetString());
    }

    [Fact]
    public async Task SsoLogin_ForeignDomain_Forbidden()
    {
        var client = _factory.CreateClient();
        var ssoResp = await client.PostAsJsonAsync("/api/auth/sso", new
        {
            token = "mock-ms-token-unauthorized",
            email = "external@gmail.com",
            name = "External User"
        });

        Assert.Equal(System.Net.HttpStatusCode.Forbidden, ssoResp.StatusCode);
    }

    [Fact]
    public async Task SsoLogin_RegularMaqUser_DefaultsToConsumer()
    {
        var client = _factory.CreateClient();
        var ssoResp = await client.PostAsJsonAsync("/api/auth/sso", new
        {
            token = "mock-ms-token-regular",
            email = "john.doe@maqsoftware.com",
            name = "John Doe",
            role = "REVIEWER" // Any requested role is ignored by governance policy
        });

        ssoResp.EnsureSuccessStatusCode();
        var body = await ssoResp.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var user = body.GetProperty("user");

        Assert.Equal("john.doe@maqsoftware.com", user.GetProperty("email").GetString());
        // Default permission is strictly CONSUMER
        Assert.Equal("CONSUMER", user.GetProperty("role").GetString());
    }

    [Fact]
    public async Task SsoLogin_Admin_HarshRana_GetsAdminRole()
    {
        var client = _factory.CreateClient();
        var ssoResp = await client.PostAsJsonAsync("/api/auth/sso", new
        {
            token = "mock-ms-token-admin",
            email = "harsh.rana@maqsoftware.com",
            name = "Harsh Rana"
        });

        ssoResp.EnsureSuccessStatusCode();
        var body = await ssoResp.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var user = body.GetProperty("user");

        Assert.Equal("harsh.rana@maqsoftware.com", user.GetProperty("email").GetString());
        Assert.Equal("ADMIN", user.GetProperty("role").GetString());
    }
}

