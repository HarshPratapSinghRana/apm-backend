using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using EngineeringCommons.Backend.Services.Implementations;
using EngineeringCommons.Backend.Services.Interfaces;
using Xunit;

namespace EngineeringCommons.Backend.Tests;

public class MicrosoftGraphEmailTests : IDisposable
{
    private readonly string _testOutboxDir;

    public MicrosoftGraphEmailTests()
    {
        _testOutboxDir = Path.Combine(Path.GetTempPath(), "cip_test_outbox_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_testOutboxDir);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_testOutboxDir))
            {
                Directory.Delete(_testOutboxDir, true);
            }
        }
        catch { }
    }

    private IConfiguration CreateTestConfig(Dictionary<string, string?> values)
    {
        var dict = new Dictionary<string, string?>
        {
            ["Smtp:PickupDirectory"] = _testOutboxDir,
            ["AdminEmail"] = "admin@maqsoftware.com",
            ["GraphEmail:Instance"] = "https://login.microsoftonline.com/",
            ["GraphEmail:TenantId"] = "e4d98dd2-9199-42e5-ba8b-da3e763ede2e",
            ["GraphEmail:ClientId"] = "a5f3ba81-4c95-4c74-afd9-38b72cf39156",
            ["GraphEmail:SenderMailbox"] = "cip-notifications@maqsoftware.com",
            ["GraphEmail:FallbackSenderMailbox"] = "admin@maqsoftware.com",
            ["GraphEmail:Enabled"] = "false",
            ["GraphEmail:SaveToSentItems"] = "true"
        };

        foreach (var (k, v) in values)
        {
            dict[k] = v;
        }

        return new ConfigurationBuilder().AddInMemoryCollection(dict).Build();
    }

    [Fact]
    public void GraphClient_WhenNoSecret_IsConfiguredIsFalse()
    {
        var config = CreateTestConfig(new Dictionary<string, string?>
        {
            ["GraphEmail:ClientSecret"] = ""
        });

        using var http = new HttpClient();
        var client = new MicrosoftGraphEmailClient(http, config, NullLogger<MicrosoftGraphEmailClient>.Instance);

        Assert.False(client.IsConfigured);
        Assert.Equal("cip-notifications@maqsoftware.com", client.SenderMailbox);
        Assert.Equal("e4d98dd2-9199-42e5-ba8b-da3e763ede2e", client.TenantId);
        Assert.Equal("a5f3ba81-4c95-4c74-afd9-38b72cf39156", client.ClientId);

        var status = client.GetStatus();
        Assert.False(status.HasClientSecret);
        Assert.False(status.Enabled);
    }

    [Fact]
    public void GraphClient_WhenSecretProvided_ReflectsStatus()
    {
        var config = CreateTestConfig(new Dictionary<string, string?>
        {
            ["GraphEmail:ClientSecret"] = "mock_secret_value",
            ["GraphEmail:Enabled"] = "true"
        });

        using var http = new HttpClient();
        var client = new MicrosoftGraphEmailClient(http, config, NullLogger<MicrosoftGraphEmailClient>.Instance);

        Assert.True(client.IsConfigured);
        Assert.True(client.GetStatus().HasClientSecret);
    }

    [Fact]
    public async Task EmailService_WhenCommentedOut_DispatchesDoNotAttemptSending()
    {
        var config = CreateTestConfig(new Dictionary<string, string?>());
        using var http = new HttpClient();
        var graphClient = new MicrosoftGraphEmailClient(http, config, NullLogger<MicrosoftGraphEmailClient>.Instance);
        var emailService = new EmailNotificationService(config, NullLogger<EmailNotificationService>.Instance, graphClient);

        // Test email
        var record = await emailService.SendTestEmailAsync("admin@maqsoftware.com", "Test", "Test body");
        Assert.Equal("Disabled (Commented Out)", record.DeliveryMethod);
        Assert.False(record.SmtpAttempted);
        Assert.False(record.GraphAttempted);
        Assert.Null(record.EmlFilePath);

        // Access request notification
        var sent = await emailService.SendAccessRequestNotificationAsync("admin@maq.com", "user@maq.com", "REVIEWER", "id-1", "reason");
        Assert.False(sent);

        // Access decision
        var sentDecision = await emailService.SendAccessDecisionNotificationAsync("user@maq.com", "APPROVED", "REVIEWER", "welcome");
        Assert.False(sentDecision);

        // Bounty assigned
        var sentBounty = await emailService.SendBountyAssignedNotificationAsync("Bounty 1", "dev@maq.com", 100, "b-1", 2);
        Assert.False(sentBounty);

        // Bounty issue
        var sentIssue = await emailService.SendBountyIssueReportedNotificationAsync("Bounty 1", "dev@maq.com", "issue", "High", "b-1");
        Assert.False(sentIssue);

        // Bounty resolved
        var sentResolved = await emailService.SendBountyResolvedNotificationAsync("Bounty 1", "dev@maq.com", 100, "b-1");
        Assert.False(sentResolved);

        // Artifact certified
        var sentCertified = await emailService.SendArtifactCertifiedNotificationAsync("art-1", "1.0.0", "prod@maq.com", "rev@maq.com", null);
        Assert.False(sentCertified);

        // Artifact rejected
        var sentRejected = await emailService.SendArtifactCertificationRejectedNotificationAsync("art-1", "prod@maq.com", "feedback", "rev@maq.com");
        Assert.False(sentRejected);

        // Artifact published
        var sentPublished = await emailService.SendArtifactPublishedNotificationAsync("art-1", "1.0.0", "prod@maq.com", "rev@maq.com");
        Assert.False(sentPublished);

        // Admin alert
        var sentAlert = await emailService.SendAdminAlertNotificationAsync("TestAlert", "msg", null);
        Assert.False(sentAlert);

        // No files written to outbox directory
        var emlFiles = Directory.GetFiles(_testOutboxDir, "*.eml");
        Assert.Empty(emlFiles);
    }

    [Fact]
    public void EmailService_GetStatus_ReturnsStatusStructure()
    {
        var config = CreateTestConfig(new Dictionary<string, string?>());
        using var http = new HttpClient();
        var graphClient = new MicrosoftGraphEmailClient(http, config, NullLogger<MicrosoftGraphEmailClient>.Instance);
        var emailService = new EmailNotificationService(config, NullLogger<EmailNotificationService>.Instance, graphClient);

        var status = emailService.GetStatus();

        Assert.Equal("Disabled (Commented Out)", status.DeliveryMode);
        Assert.False(status.IsConfigured);
        Assert.NotNull(status.Graph);
        Assert.False(status.Graph.Enabled);
        Assert.Equal("cip-notifications@maqsoftware.com", status.Graph.SenderMailbox);
        Assert.Equal("e4d98dd2-9199-42e5-ba8b-da3e763ede2e", status.Graph.TenantId);
        Assert.Equal("a5f3ba81-4c95-4c74-afd9-38b72cf39156", status.Graph.ClientId);
    }
}
