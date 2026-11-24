using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace EngineeringCommons.Backend.IntegrationTests;

public class EmailDiagnosticsTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public EmailDiagnosticsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<HttpClient> CreateAdminClientAsync()
    {
        var client = _factory.CreateClient();
        var ssoResp = await client.PostAsJsonAsync("/api/auth/sso", new
        {
            token = "mock-ms-token-admin",
            email = "admin@maqsoftware.com",
            name = "Admin User"
        });
        ssoResp.EnsureSuccessStatusCode();
        var body = await ssoResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = body.GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task GetEmailStatus_ReturnsValidStatus()
    {
        var client = await CreateAdminClientAsync();
        var resp = await client.GetAsync("/api/admin/emails/status");
        resp.EnsureSuccessStatusCode();

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.TryGetProperty("deliveryMode", out var mode));
        Assert.False(string.IsNullOrWhiteSpace(mode.GetString()));
        Assert.True(body.TryGetProperty("pickupDirectoryPath", out var pickupPath));
        Assert.False(string.IsNullOrWhiteSpace(pickupPath.GetString()));
    }

    [Fact]
    public async Task SendTestEmail_DispatchesToAdmin_GeneratesEml()
    {
        var client = await CreateAdminClientAsync();
        var resp = await client.PostAsJsonAsync("/api/admin/emails/test", new
        {
            recipient = "admin@maqsoftware.com",
            subject = "Test Automated Access Notification",
            body = "Hello Admin, this is a test notification."
        });

        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("success").GetBoolean());

        var record = body.GetProperty("record");
        Assert.Equal("admin@maqsoftware.com", record.GetProperty("recipient").GetString());
        Assert.Equal("Disabled (Commented Out)", record.GetProperty("deliveryMethod").GetString());
        Assert.False(record.GetProperty("smtpAttempted").GetBoolean());
        Assert.False(record.GetProperty("graphAttempted").GetBoolean());
    }

    [Fact]
    public async Task GetOutbox_ReturnsHistory()
    {
        var client = await CreateAdminClientAsync();

        // Send a test email first
        await client.PostAsJsonAsync("/api/admin/emails/test", new
        {
            recipient = "admin@maqsoftware.com",
            subject = "History Check"
        });

        var resp = await client.GetAsync("/api/admin/emails/outbox");
        resp.EnsureSuccessStatusCode();

        var outbox = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Array, outbox.ValueKind);
        Assert.True(outbox.GetArrayLength() > 0);
    }
}
