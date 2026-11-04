using System;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using CipBackend.Models;
using Xunit;

namespace CipBackend.IntegrationTests;

public class AccessGovernanceTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public AccessGovernanceTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task SsoLogin_HarshRana_ResolvedAsAdmin()
    {
        var client = _factory.CreateClient();
        var ssoResp = await client.PostAsJsonAsync("/api/auth/sso", new
        {
            token = "mock-ms-token-admin",
            email = "harsh.rana@maqsoftware.com",
            name = "Harsh Rana"
        });

        ssoResp.EnsureSuccessStatusCode();
        var body = await ssoResp.Content.ReadFromJsonAsync<JsonElement>();
        var user = body.GetProperty("user");

        Assert.Equal("harsh.rana@maqsoftware.com", user.GetProperty("email").GetString());
        Assert.Equal("ADMIN", user.GetProperty("role").GetString());
    }

    [Fact]
    public async Task SsoLogin_StandardMAQUser_RestrictedToConsumer_EvenIfRequestingReviewer()
    {
        var client = _factory.CreateClient();
        var ssoResp = await client.PostAsJsonAsync("/api/auth/sso", new
        {
            token = "mock-ms-token-standard",
            email = "standard.dev@maqsoftware.com",
            name = "Standard Dev",
            role = "REVIEWER" // Attempting to self-grant reviewer role
        });

        ssoResp.EnsureSuccessStatusCode();
        var body = await ssoResp.Content.ReadFromJsonAsync<JsonElement>();
        var user = body.GetProperty("user");

        Assert.Equal("standard.dev@maqsoftware.com", user.GetProperty("email").GetString());
        // Must be restricted to CONSUMER
        Assert.Equal("CONSUMER", user.GetProperty("role").GetString());
    }

    [Fact]
    public async Task CompleteAccessRequestAndAdminGovernanceLifecycle()
    {
        var client = _factory.CreateClient();

        // 1. Standard user logs in via SSO -> CONSUMER
        var userEmail = $"test.engineer.{Guid.NewGuid():N}@maqsoftware.com";
        var userLoginResp = await client.PostAsJsonAsync("/api/auth/sso", new
        {
            token = "ms-token-engineer",
            email = userEmail,
            name = "Test Engineer"
        });
        userLoginResp.EnsureSuccessStatusCode();
        var userLoginDoc = await userLoginResp.Content.ReadFromJsonAsync<JsonElement>();
        var userToken = userLoginDoc.GetProperty("token").GetString();
        Assert.Equal("CONSUMER", userLoginDoc.GetProperty("user").GetProperty("role").GetString());

        // 2. Admin harsh.rana logs in via SSO -> ADMIN
        var adminLoginResp = await client.PostAsJsonAsync("/api/auth/sso", new
        {
            token = "ms-token-admin-session",
            email = "harsh.rana@maqsoftware.com",
            name = "Harsh Rana"
        });
        adminLoginResp.EnsureSuccessStatusCode();
        var adminLoginDoc = await adminLoginResp.Content.ReadFromJsonAsync<JsonElement>();
        var adminToken = adminLoginDoc.GetProperty("token").GetString();
        Assert.Equal("ADMIN", adminLoginDoc.GetProperty("user").GetProperty("role").GetString());

        // 3. Standard user submits access request for CONTRIBUTOR
        using var userClient = _factory.CreateClient();
        userClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", userToken);

        var reqResp = await userClient.PostAsJsonAsync("/api/access-requests", new
        {
            requestedRole = "CONTRIBUTOR",
            reason = "Want to contribute and publish AI agents to the marketplace."
        });
        reqResp.EnsureSuccessStatusCode();
        var reqDoc = await reqResp.Content.ReadFromJsonAsync<JsonElement>();
        var requestId = reqDoc.GetProperty("request").GetProperty("id").GetString();
        Assert.False(string.IsNullOrEmpty(requestId));

        // 4. Verify admin harsh.rana received in-app notification
        using var adminClient = _factory.CreateClient();
        adminClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var notifResp = await adminClient.GetAsync("/api/notifications?unreadOnly=true");
        notifResp.EnsureSuccessStatusCode();
        var notifs = await notifResp.Content.ReadFromJsonAsync<JsonElement[]>();
        Assert.Contains(notifs!, n => n.GetProperty("type").GetString() == "AccessRequested" &&
                                      n.GetProperty("message").GetString()!.Contains(userEmail));

        // 5. Non-admin attempting to view admin requests -> 403 Forbidden
        var forbiddenResp = await userClient.GetAsync("/api/admin/access-requests");
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenResp.StatusCode);

        // 6. Admin harsh.rana lists pending access requests
        var adminListResp = await adminClient.GetAsync("/api/admin/access-requests?status=Pending");
        adminListResp.EnsureSuccessStatusCode();
        var pendingList = await adminListResp.Content.ReadFromJsonAsync<JsonElement[]>();
        Assert.Contains(pendingList!, r => r.GetProperty("id").GetString() == requestId);

        // 7. Admin approves access request -> user becomes CONTRIBUTOR
        var approveResp = await adminClient.PostAsJsonAsync($"/api/admin/access-requests/{requestId}/approve", new
        {
            notes = "Approved contributor access."
        });
        approveResp.EnsureSuccessStatusCode();

        // 8. User checks status -> now CONTRIBUTOR!
        var myStatusResp = await userClient.GetAsync("/api/access-requests/my");
        myStatusResp.EnsureSuccessStatusCode();
        var myStatus = await myStatusResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("CONTRIBUTOR", myStatus.GetProperty("currentRole").GetString());

        // 9. User can now submit an artifact change
        var submitResp = await userClient.PostAsJsonAsync("/api/artifacts/contributed-agent/changes", new { content = "v1" });
        submitResp.EnsureSuccessStatusCode();

        // 10. Admin promotes user to Certified Reviewer
        var certifyResp = await adminClient.PostAsJsonAsync("/api/admin/roles/certify-reviewer", new
        {
            targetEmail = userEmail,
            notes = "Passed enterprise certification standards."
        });
        certifyResp.EnsureSuccessStatusCode();

        var certifiedStatusResp = await userClient.GetAsync("/api/access-requests/my");
        var certifiedStatus = await certifiedStatusResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(certifiedStatus.GetProperty("isCertifiedReviewer").GetBoolean());

        // 11. Admin revokes reviewer access -> reverts to CONSUMER
        var revokeResp = await adminClient.PostAsJsonAsync("/api/admin/roles/revoke", new
        {
            targetEmail = userEmail,
            notes = "Rotated off review committee."
        });
        revokeResp.EnsureSuccessStatusCode();

        var revokedStatusResp = await userClient.GetAsync("/api/access-requests/my");
        var revokedStatus = await revokedStatusResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("CONSUMER", revokedStatus.GetProperty("currentRole").GetString());
        Assert.False(revokedStatus.GetProperty("isCertifiedReviewer").GetBoolean());
    }
}
