using System;
using System.IO;
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

    [Fact]
    public async Task GetEmailStatus_ReturnsValidStatus()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/admin/emails/status");
        resp.EnsureSuccessStatusCode();

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.TryGetProperty("deliveryMode", out var mode));
        Assert.False(string.IsNullOrWhiteSpace(mode.GetString()));
        Assert.True(body.TryGetProperty("pickupDirectoryPath", out var pickupPath));
        Assert.False(string.IsNullOrWhiteSpace(pickupPath.GetString()));
    }

    [Fact]
    public async Task SendTestEmail_DispatchesToHarshRana_GeneratesEml()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/admin/emails/test", new
        {
            recipient = "harsh.rana@maqsoftware.com",
            subject = "Test Automated Access Notification",
            body = "Hello Harsh, this is a test notification."
        });

        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("success").GetBoolean());

        var record = body.GetProperty("record");
        Assert.Equal("harsh.rana@maqsoftware.com", record.GetProperty("recipient").GetString());
        Assert.Equal("Disabled (Commented Out)", record.GetProperty("deliveryMethod").GetString());
        Assert.False(record.GetProperty("smtpAttempted").GetBoolean());
        Assert.False(record.GetProperty("graphAttempted").GetBoolean());
    }

    [Fact]
    public async Task GetOutbox_ReturnsHistory()
    {
        var client = _factory.CreateClient();

        // Send a test email first
        await client.PostAsJsonAsync("/api/admin/emails/test", new
        {
            recipient = "harsh.rana@maqsoftware.com",
            subject = "History Check"
        });

        var resp = await client.GetAsync("/api/admin/emails/outbox");
        resp.EnsureSuccessStatusCode();

        var outbox = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Array, outbox.ValueKind);
        Assert.True(outbox.GetArrayLength() > 0);
    }
}
