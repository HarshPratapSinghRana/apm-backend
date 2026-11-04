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
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace CipBackend.Tests;

public class VisibilityTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public VisibilityTests(TestWebApplicationFactory factory)
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
    public async Task SubmitPrivateArtifact_SetsIsPrivate_AndBlocksOtherUsersFromListingAndDownloading()
    {
        var producerEmail = "producer@company.com";
        var otherUserEmail = "consumer@company.com";

        var producerClient = await CreateClientForUserAsync(producerEmail);
        var otherClient = await CreateClientForUserAsync(otherUserEmail);

        var artifactId = $"test-private-agent-{Guid.NewGuid():N}";
        var payload = new
        {
            name = artifactId,
            type = "agent",
            version = "1.0.0",
            isPrivate = true,
            description = "Private agent under development",
            files = new[]
            {
                new { path = $".github/agents/{artifactId}.agent.md", content = "# Private Dev Agent" }
            }
        };

        // 1. Producer submits private artifact
        var submitContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var submitResp = await producerClient.PostAsync($"/api/artifacts/{artifactId}/changes", submitContent);
        Assert.Equal(HttpStatusCode.OK, submitResp.StatusCode);

        var submitJson = await submitResp.Content.ReadAsStringAsync();
        using (var doc = JsonDocument.Parse(submitJson))
        {
            Assert.True(doc.RootElement.GetProperty("isPrivate").GetBoolean(), "Submission should be marked private");
        }

        // 2. Approve/Publish the review so it is in the marketplace service
        using (var scope = _factory.Services.CreateScope())
        {
            var reviewService = scope.ServiceProvider.GetRequiredService<IReviewService>();
            var reviews = reviewService.GetByProducer(producerEmail).ToList();
            var targetReview = reviews.First(r => r.ArtifactId == artifactId);
            Assert.True(targetReview.IsPrivate, "Review entity should persist IsPrivate = true");

            await reviewService.ApproveAsync(targetReview.Id, "reviewer@company.com");
        }

        // 3. Producer lists artifacts -> should see the private artifact with isPrivate = true
        var producerListResp = await producerClient.GetAsync("/api/artifacts");
        Assert.Equal(HttpStatusCode.OK, producerListResp.StatusCode);
        var producerListJson = await producerListResp.Content.ReadAsStringAsync();
        using (var doc = JsonDocument.Parse(producerListJson))
        {
            var matched = doc.RootElement.EnumerateArray().FirstOrDefault(e => e.GetProperty("name").GetString() == artifactId);
            Assert.True(matched.ValueKind != JsonValueKind.Undefined, "Producer must see their own private artifact in list");
            Assert.True(matched.GetProperty("isPrivate").GetBoolean(), "isPrivate flag should be true for producer");
        }

        // 4. Other user lists artifacts -> should NOT see the private artifact
        var otherListResp = await otherClient.GetAsync("/api/artifacts");
        Assert.Equal(HttpStatusCode.OK, otherListResp.StatusCode);
        var otherListJson = await otherListResp.Content.ReadAsStringAsync();
        using (var doc = JsonDocument.Parse(otherListJson))
        {
            var matched = doc.RootElement.EnumerateArray().FirstOrDefault(e => e.GetProperty("name").GetString() == artifactId);
            Assert.True(matched.ValueKind == JsonValueKind.Undefined, "Other users must NOT see private artifacts in list");
        }

        // 5. Other user attempts to download private artifact -> 403 Forbidden
        var otherDownloadResp = await otherClient.GetAsync($"/api/artifacts/{artifactId}/download");
        Assert.Equal(HttpStatusCode.Forbidden, otherDownloadResp.StatusCode);

        // 6. Producer updates visibility to PUBLIC via /api/artifacts/{id}/visibility
        var visibilityPayload = new { isPrivate = false, visibility = "public" };
        var visibilityContent = new StringContent(JsonSerializer.Serialize(visibilityPayload), Encoding.UTF8, "application/json");
        var visibilityResp = await producerClient.PutAsync($"/api/artifacts/{artifactId}/visibility", visibilityContent);
        Assert.Equal(HttpStatusCode.OK, visibilityResp.StatusCode);

        // 7. Now other user lists artifacts -> should see it!
        var otherListResp2 = await otherClient.GetAsync("/api/artifacts");
        Assert.Equal(HttpStatusCode.OK, otherListResp2.StatusCode);
        var otherListJson2 = await otherListResp2.Content.ReadAsStringAsync();
        using (var doc = JsonDocument.Parse(otherListJson2))
        {
            var matched = doc.RootElement.EnumerateArray().FirstOrDefault(e => e.GetProperty("name").GetString() == artifactId);
            Assert.True(matched.ValueKind != JsonValueKind.Undefined, "Other users should see artifact once made public");
            Assert.False(matched.GetProperty("isPrivate").GetBoolean(), "isPrivate flag should now be false");
        }

        // 8. Other user can now download the artifact
        var otherDownloadResp2 = await otherClient.GetAsync($"/api/artifacts/{artifactId}/download");
        Assert.Equal(HttpStatusCode.OK, otherDownloadResp2.StatusCode);
    }

    [Fact]
    public async Task SubmitPrivateArtifact_WithWhitelists_EnforcesRBACPermissions()
    {
        var producerEmail = "producer2@company.com";
        var allowedContribEmail = "contrib@company.com";
        var designatedReviewerEmail = "designated-rev@company.com";
        var allowedConsumerEmail = "tester@company.com";
        var unauthorizedUserEmail = "random@company.com";

        var producerClient = await CreateClientForUserAsync(producerEmail);
        var contribClient = await CreateClientForUserAsync(allowedContribEmail);
        var reviewerClient = await CreateClientForUserAsync(designatedReviewerEmail);
        var consumerClient = await CreateClientForUserAsync(allowedConsumerEmail);
        var unauthorizedClient = await CreateClientForUserAsync(unauthorizedUserEmail);

        var artifactId = $"test-rbac-agent-{Guid.NewGuid():N}";
        var payload = new
        {
            name = artifactId,
            type = "agent",
            version = "1.0.0",
            isPrivate = true,
            allowedContributors = allowedContribEmail,
            allowedReviewers = designatedReviewerEmail,
            allowedConsumers = allowedConsumerEmail,
            description = "Private agent with granular RBAC",
            files = new[]
            {
                new { path = $".github/agents/{artifactId}.agent.md", content = "# Private RBAC Agent" }
            }
        };

        // 1. Producer submits private artifact with whitelists
        var submitContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var submitResp = await producerClient.PostAsync($"/api/artifacts/{artifactId}/changes", submitContent);
        Assert.Equal(HttpStatusCode.OK, submitResp.StatusCode);

        // 2. Approve review with designated reviewer
        using (var scope = _factory.Services.CreateScope())
        {
            var reviewService = scope.ServiceProvider.GetRequiredService<IReviewService>();
            var reviews = reviewService.GetByProducer(producerEmail).ToList();
            var targetReview = reviews.First(r => r.ArtifactId == artifactId);
            Assert.True(targetReview.IsPrivate);
            Assert.Equal(allowedContribEmail, targetReview.AllowedContributors);
            Assert.Equal(designatedReviewerEmail, targetReview.AllowedReviewers);
            Assert.Equal(allowedConsumerEmail, targetReview.AllowedConsumers);

            // Attempt approval with unauthorized reviewer -> throws UnauthorizedAccessException
            await Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            {
                await reviewService.ApproveAsync(targetReview.Id, "unauthorized-rev@company.com");
            });

            // Designated reviewer approves
            await reviewService.ApproveAsync(targetReview.Id, designatedReviewerEmail);
        }

        // 3. Whitelisted consumer can view and download private artifact
        var consumerGetResp = await consumerClient.GetAsync($"/api/artifacts/{artifactId}");
        Assert.Equal(HttpStatusCode.OK, consumerGetResp.StatusCode);

        var consumerDownloadResp = await consumerClient.GetAsync($"/api/artifacts/{artifactId}/download");
        Assert.Equal(HttpStatusCode.OK, consumerDownloadResp.StatusCode);

        // 4. Unauthorized user cannot view or download
        var unauthGetResp = await unauthorizedClient.GetAsync($"/api/artifacts/{artifactId}");
        Assert.Equal(HttpStatusCode.Forbidden, unauthGetResp.StatusCode);

        var unauthDownloadResp = await unauthorizedClient.GetAsync($"/api/artifacts/{artifactId}/download");
        Assert.Equal(HttpStatusCode.Forbidden, unauthDownloadResp.StatusCode);

        // 5. Allowed contributor can submit new change / version
        var contribPayload = new
        {
            name = artifactId,
            type = "agent",
            version = "1.1.0",
            isPrivate = true,
            files = new[]
            {
                new { path = $".github/agents/{artifactId}.agent.md", content = "# Private RBAC Agent Updated" }
            }
        };
        var contribSubmitResp = await contribClient.PostAsync($"/api/artifacts/{artifactId}/changes", new StringContent(JsonSerializer.Serialize(contribPayload), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.OK, contribSubmitResp.StatusCode);

        // 6. Unauthorized user cannot submit changes to private artifact
        var unauthSubmitResp = await unauthorizedClient.PostAsync($"/api/artifacts/{artifactId}/changes", new StringContent(JsonSerializer.Serialize(contribPayload), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Forbidden, unauthSubmitResp.StatusCode);
    }

    [Fact]
    public async Task StrictOwnership_OnlyOriginalProducerOwnerCanMakePrivateArtifactPublic()
    {
        var ownerEmail = "owner-producer@company.com";
        var otherProducerEmail = "other-producer@company.com";
        var consumerEmail = "consumer@company.com";
        var reviewerEmail = "reviewer@company.com";

        var ownerClient = await CreateClientForUserAsync(ownerEmail);
        var otherProducerClient = await CreateClientForUserAsync(otherProducerEmail);
        var consumerClient = await CreateClientForUserAsync(consumerEmail);
        var reviewerClient = await CreateClientForUserAsync(reviewerEmail);
        var unauthClient = _factory.CreateClient(); // No auth header

        var artifactId = $"test-owner-artifact-{Guid.NewGuid():N}";
        var payload = new
        {
            name = artifactId,
            type = "agent",
            version = "1.0.0",
            isPrivate = true,
            description = "Private agent with strict ownership",
            files = new[]
            {
                new { path = $".github/agents/{artifactId}.agent.md", content = "# Private Strict Agent" }
            }
        };

        // 1. Owner submits private artifact
        var submitResp = await ownerClient.PostAsync($"/api/artifacts/{artifactId}/changes", 
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.OK, submitResp.StatusCode);

        // Approve and publish the review so it is indexed in the marketplace
        using (var scope = _factory.Services.CreateScope())
        {
            var reviewService = scope.ServiceProvider.GetRequiredService<IReviewService>();
            var reviews = reviewService.GetByProducer(ownerEmail).ToList();
            var targetReview = reviews.First(r => r.ArtifactId == artifactId);
            await reviewService.ApproveAsync(targetReview.Id, reviewerEmail);
        }

        var makePublicPayload = new StringContent(JsonSerializer.Serialize(new { isPrivate = false, visibility = "public" }), Encoding.UTF8, "application/json");

        // 2. Unauthenticated user attempts to make Public -> 401 Unauthorized
        var unauthResp = await unauthClient.PutAsync($"/api/artifacts/{artifactId}/visibility", makePublicPayload);
        Assert.Equal(HttpStatusCode.Unauthorized, unauthResp.StatusCode);

        // 3. Different Producer attempts to make Public -> 403 Forbidden
        var otherProducerResp = await otherProducerClient.PutAsync($"/api/artifacts/{artifactId}/visibility", makePublicPayload);
        Assert.Equal(HttpStatusCode.Forbidden, otherProducerResp.StatusCode);

        // 4. Consumer attempts to make Public -> 403 Forbidden
        var consumerResp = await consumerClient.PutAsync($"/api/artifacts/{artifactId}/visibility", makePublicPayload);
        Assert.Equal(HttpStatusCode.Forbidden, consumerResp.StatusCode);

        // 5. Reviewer attempts to make Public -> 403 Forbidden (Reviewers do NOT gain ownership privileges)
        var reviewerResp = await reviewerClient.PutAsync($"/api/artifacts/{artifactId}/visibility", makePublicPayload);
        Assert.Equal(HttpStatusCode.Forbidden, reviewerResp.StatusCode);

        // 6. Original Owner makes Private artifact Public -> 200 OK (Allowed)
        var ownerResp = await ownerClient.PutAsync($"/api/artifacts/{artifactId}/visibility", makePublicPayload);
        Assert.Equal(HttpStatusCode.OK, ownerResp.StatusCode);

        // Verify artifact is now public for other users
        var listResp = await consumerClient.GetAsync("/api/artifacts");
        Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);
        var listJson = await listResp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(listJson);
        var item = doc.RootElement.EnumerateArray().FirstOrDefault(e => e.GetProperty("name").GetString() == artifactId);
        Assert.True(item.ValueKind != JsonValueKind.Undefined, "Artifact should now be visible to consumer in marketplace list");
        Assert.False(item.GetProperty("isPrivate").GetBoolean(), "isPrivate should be false");
    }
}
