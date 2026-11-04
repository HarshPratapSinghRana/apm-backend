using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using CipBackend.Models;
using CipBackend.Services.Interfaces;
using CipBackend.IntegrationTests;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace CipBackend.Tests;

public class CertificationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public CertificationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<HttpClient> CreateClientForUserAsync(string email)
    {
        var client = _factory.CreateClient();
        var loginResp = await client.PostAsync("/api/auth/login", new StringContent(
            JsonSerializer.Serialize(new { email = email, password = "password" }),
            Encoding.UTF8,
            "application/json"));
        loginResp.EnsureSuccessStatusCode();
        var body = await loginResp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        string token = doc.RootElement.GetProperty("token").GetString() ?? string.Empty;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task Test1_EvaluateCertification_ReturnsEvaluationCriteriaAndMetrics()
    {
        var reviewerClient = await CreateClientForUserAsync("reviewer@company.com");
        var resp = await reviewerClient.GetAsync("/api/certifications/evaluate/design-reviewer");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.Equal("design-reviewer", root.GetProperty("artifactId").GetString());
        Assert.True(root.GetProperty("eligible").GetBoolean());
        Assert.True(root.GetProperty("criteria").GetProperty("reviewHistory").GetBoolean());
        Assert.True(root.GetProperty("criteria").GetProperty("usage").GetBoolean());
        Assert.True(root.GetProperty("criteria").GetProperty("reliability").GetBoolean());
    }

    [Fact]
    public async Task Test2_GetCertificationStatus_ReturnsCertifiedStatusForDefaultArtifact()
    {
        var consumerClient = await CreateClientForUserAsync("consumer@company.com");
        var resp = await consumerClient.GetAsync("/api/certifications/design-reviewer");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.True(root.GetProperty("isCertified").GetBoolean());
        Assert.Equal("CERTIFIED", root.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Test3_CertifyArtifact_ReviewerCanCertifyAndLogsAuditEvent()
    {
        var reviewerClient = await CreateClientForUserAsync("reviewer@company.com");
        var artId = $"agent-cert-{Guid.NewGuid():N}";

        var certifyPayload = new StringContent(
            JsonSerializer.Serialize(new { version = "1.2.0", reason = "Passed full enterprise review and reliability standards." }),
            Encoding.UTF8,
            "application/json");

        var resp = await reviewerClient.PostAsync($"/api/certifications/certify/{artId}", certifyPayload);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.True(root.GetProperty("isCertified").GetBoolean());
        Assert.Equal("CERTIFIED", root.GetProperty("status").GetString());
        Assert.Equal("1.2.0", root.GetProperty("certifiedVersion").GetString());

        // Verify status persists
        var statusResp = await reviewerClient.GetAsync($"/api/certifications/{artId}");
        Assert.Equal(HttpStatusCode.OK, statusResp.StatusCode);
        var statusJson = await statusResp.Content.ReadAsStringAsync();
        using var statusDoc = JsonDocument.Parse(statusJson);
        Assert.True(statusDoc.RootElement.GetProperty("isCertified").GetBoolean());
    }

    [Fact]
    public async Task Test4_RevokeCertification_ReviewerCanRevokeAndSetsStatusToRevoked()
    {
        var reviewerClient = await CreateClientForUserAsync("reviewer@company.com");
        var artId = $"agent-revoke-{Guid.NewGuid():N}";

        // First certify it
        await reviewerClient.PostAsync($"/api/certifications/certify/{artId}", new StringContent(
            JsonSerializer.Serialize(new { version = "1.0.0" }), Encoding.UTF8, "application/json"));

        // Now revoke it
        var revokePayload = new StringContent(
            JsonSerializer.Serialize(new { reason = "Detected security vulnerability in dependencies." }),
            Encoding.UTF8,
            "application/json");

        var revokeResp = await reviewerClient.PostAsync($"/api/certifications/revoke/{artId}", revokePayload);
        Assert.Equal(HttpStatusCode.OK, revokeResp.StatusCode);

        var json = await revokeResp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.False(root.GetProperty("isCertified").GetBoolean());
        Assert.Equal("REVOKED", root.GetProperty("status").GetString());
        Assert.Contains("security vulnerability", root.GetProperty("revocationReason").GetString());
    }

    [Fact]
    public async Task Test5_RBAC_ConsumerAndProducerCannotCertifyOrRevoke()
    {
        var consumerClient = await CreateClientForUserAsync("consumer@company.com");
        var producerClient = await CreateClientForUserAsync("producer@company.com");
        var artId = "accessibility-agent";

        // Consumer attempting to certify -> 403 Forbidden
        var cResp = await consumerClient.PostAsync($"/api/certifications/certify/{artId}", new StringContent("{}", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Forbidden, cResp.StatusCode);

        // Producer attempting to certify -> 403 Forbidden
        var pResp = await producerClient.PostAsync($"/api/certifications/certify/{artId}", new StringContent("{}", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Forbidden, pResp.StatusCode);

        // Consumer attempting to revoke -> 403 Forbidden
        var crResp = await consumerClient.PostAsync($"/api/certifications/revoke/{artId}", new StringContent(
            JsonSerializer.Serialize(new { reason = "test" }), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Forbidden, crResp.StatusCode);

        // Producer attempting to revoke -> 403 Forbidden
        var prResp = await producerClient.PostAsync($"/api/certifications/revoke/{artId}", new StringContent(
            JsonSerializer.Serialize(new { reason = "test" }), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Forbidden, prResp.StatusCode);
    }

    [Fact]
    public async Task Test6_ArtifactsApi_ReturnsCertificationStatusInListAndDetails()
    {
        var client = await CreateClientForUserAsync("consumer@company.com");
        var listResp = await client.GetAsync("/api/artifacts");
        Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);

        var json = await listResp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var items = doc.RootElement.EnumerateArray().ToList();

        var designReviewer = items.FirstOrDefault(i => i.GetProperty("name").GetString() == "design-reviewer");
        Assert.True(designReviewer.ValueKind != JsonValueKind.Undefined);
        Assert.True(designReviewer.GetProperty("isCertified").GetBoolean());
        Assert.Equal("CERTIFIED", designReviewer.GetProperty("certificationStatus").GetString());
    }
}
