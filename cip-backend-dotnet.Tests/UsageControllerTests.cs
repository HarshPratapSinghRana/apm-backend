using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace EngineeringCommons.Backend.IntegrationTests;

public class UsageControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public UsageControllerTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task RecordUsage_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/usage", new
        {
            artifactName = "design-reviewer",
            artifactType = "agent",
            artifactVersion = "1.1.0",
            action = "INSTALL",
            source = "vscode"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task RecordUsage_Authenticated_RecordsEventWithUserIdentity()
    {
        var client = _factory.CreateClient();

        // 1. Authenticate as producer
        var loginResp = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "producer@company.com",
            password = "password"
        });
        loginResp.EnsureSuccessStatusCode();
        var loginBody = await loginResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = loginBody.GetProperty("token").GetString();
        Assert.False(string.IsNullOrEmpty(token));

        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // 2. Record usage event
        var usagePayload = new
        {
            artifactName = "design-reviewer",
            artifactType = "agent",
            artifactVersion = "1.1.0",
            action = "INSTALL",
            source = "vscode"
        };
        var usageResp = await client.PostAsJsonAsync("/api/usage", usagePayload);
        usageResp.EnsureSuccessStatusCode();

        var usageBody = await usageResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(usageBody.GetProperty("success").GetBoolean());
        Assert.True(usageBody.TryGetProperty("eventId", out _));

        // 3. Query usage events and verify the user identity is associated
        var getResp = await client.GetAsync("/api/usage");
        getResp.EnsureSuccessStatusCode();
        var events = await getResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(events.GetArrayLength() > 0);

        var firstEvent = events[0];
        Assert.Equal("producer@company.com", firstEvent.GetProperty("userId").GetString());
        Assert.Equal("INSTALL", firstEvent.GetProperty("action").GetString());
        Assert.Equal("design-reviewer", firstEvent.GetProperty("artifactName").GetString());
    }
}
