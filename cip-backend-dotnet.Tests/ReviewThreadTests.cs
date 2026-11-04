using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using CipBackend.IntegrationTests;
using CipBackend.Models;
using CipBackend.Services.Interfaces;
using Xunit;

namespace CipBackend.Tests;

public class ReviewThreadTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ReviewThreadTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Test1_ThreadCreatedAndAccessibleByProducerAndReviewer()
    {
        var client = _factory.CreateClient();

        // 1. Login as Producer and submit review
        var prodLogin = await client.PostAsJsonAsync("/api/auth/login", new { email = "producer@company.com", password = "password" });
        var prodToken = (await prodLogin.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", prodToken);

        var submitResp = await client.PostAsJsonAsync("/api/artifacts/thread-test-art/changes", new
        {
            content = @"{""name"":""thread-test-art"",""version"":""1.1.0"",""files"":[{""path"":""agent.md"",""content"":""v1.1""}]}"
        });
        var submitJson = await submitResp.Content.ReadFromJsonAsync<JsonElement>();
        var reviewId = submitJson.GetProperty("reviewId").GetString()!;

        // 2. Producer gets the thread
        var prodThreadResp = await client.GetAsync($"/api/reviews/{reviewId}/thread");
        prodThreadResp.EnsureSuccessStatusCode();
        var prodThread = await prodThreadResp.Content.ReadFromJsonAsync<ReviewThread>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(prodThread);
        Assert.Equal(reviewId, prodThread.ReviewId);
        Assert.Equal("producer@company.com", prodThread.ProducerEmail);

        // 3. Login as Reviewer and get the same thread
        var revLogin = await client.PostAsJsonAsync("/api/auth/login", new { email = "reviewer@company.com", password = "password" });
        var revToken = (await revLogin.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", revToken);

        var revThreadResp = await client.GetAsync($"/api/reviews/{reviewId}/thread");
        revThreadResp.EnsureSuccessStatusCode();
        var revThread = await revThreadResp.Content.ReadFromJsonAsync<ReviewThread>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(revThread);
        Assert.Equal(prodThread.Id, revThread.Id);
    }

    [Fact]
    public async Task Test2_BidirectionalMessagingBetweenReviewerAndProducer()
    {
        var client = _factory.CreateClient();

        // 1. Submit review
        var prodLogin = await client.PostAsJsonAsync("/api/auth/login", new { email = "producer@company.com", password = "password" });
        var prodToken = (await prodLogin.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", prodToken);

        var submitResp = await client.PostAsJsonAsync("/api/artifacts/convo-test-art/changes", new
        {
            content = @"{""name"":""convo-test-art"",""version"":""1.1.0"",""files"":[{""path"":""f.md"",""content"":""x""}]}"
        });
        var reviewId = (await submitResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("reviewId").GetString()!;

        // 2. Reviewer posts a message: "Please update error handling."
        var revLogin = await client.PostAsJsonAsync("/api/auth/login", new { email = "reviewer@company.com", password = "password" });
        var revToken = (await revLogin.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", revToken);

        var revMsgResp = await client.PostAsJsonAsync($"/api/reviews/{reviewId}/thread/messages", new
        {
            message = "Please update the error handling in the new agent."
        });
        revMsgResp.EnsureSuccessStatusCode();
        var revMsg = await revMsgResp.Content.ReadFromJsonAsync<ReviewMessage>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(revMsg);
        Assert.Equal("reviewer@company.com", revMsg.AuthorEmail);
        Assert.Equal("Reviewer", revMsg.AuthorRole);
        Assert.Equal("Please update the error handling in the new agent.", revMsg.Message);

        // 3. Producer fetches thread and sees Reviewer's message
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", prodToken);
        var threadResp1 = await client.GetAsync($"/api/reviews/{reviewId}/thread");
        var thread1 = await threadResp1.Content.ReadFromJsonAsync<ReviewThread>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(thread1);
        Assert.Single(thread1.Messages);
        Assert.Equal("Please update the error handling in the new agent.", thread1.Messages[0].Message);

        // 4. Producer replies: "Updated error handling. Please review."
        var prodMsgResp = await client.PostAsJsonAsync($"/api/reviews/{reviewId}/thread/messages", new
        {
            message = "Updated error handling. Please review again."
        });
        prodMsgResp.EnsureSuccessStatusCode();
        var prodMsg = await prodMsgResp.Content.ReadFromJsonAsync<ReviewMessage>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(prodMsg);
        Assert.Equal("producer@company.com", prodMsg.AuthorEmail);
        Assert.Equal("Producer", prodMsg.AuthorRole);

        // 5. Reviewer fetches thread and sees both messages in order
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", revToken);
        var threadResp2 = await client.GetAsync($"/api/reviews/{reviewId}/thread");
        var thread2 = await threadResp2.Content.ReadFromJsonAsync<ReviewThread>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(thread2);
        Assert.Equal(2, thread2.Messages.Count);
        Assert.Equal("Please update the error handling in the new agent.", thread2.Messages[0].Message);
        Assert.Equal("Updated error handling. Please review again.", thread2.Messages[1].Message);
    }

    [Fact]
    public async Task Test3_UnauthorizedUserCannotAccessThread()
    {
        var client = _factory.CreateClient();

        // 1. Submit review as producer@company.com
        var prodLogin = await client.PostAsJsonAsync("/api/auth/login", new { email = "producer@company.com", password = "password" });
        var prodToken = (await prodLogin.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", prodToken);

        var submitResp = await client.PostAsJsonAsync("/api/artifacts/secret-art/changes", new
        {
            content = @"{""name"":""secret-art"",""version"":""1.0.0"",""files"":[{""path"":""f.md"",""content"":""x""}]}"
        });
        var reviewId = (await submitResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("reviewId").GetString()!;

        // 2. Login as consumer@test.com (unauthorized consumer)
        var consumerLogin = await client.PostAsJsonAsync("/api/auth/login", new { email = "consumer@test.com", password = "Consumer@123" });
        var consumerToken = (await consumerLogin.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", consumerToken);

        var forbiddenResp = await client.GetAsync($"/api/reviews/{reviewId}/thread");
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenResp.StatusCode);

        var postMsgResp = await client.PostAsJsonAsync($"/api/reviews/{reviewId}/thread/messages", new
        {
            message = "Sneaky message"
        });
        Assert.Equal(HttpStatusCode.Forbidden, postMsgResp.StatusCode);
    }

    [Fact]
    public async Task Test4_UsageSummaryAggregation()
    {
        var client = _factory.CreateClient();

        var prodLogin = await client.PostAsJsonAsync("/api/auth/login", new { email = "producer@company.com", password = "password" });
        var prodToken = (await prodLogin.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", prodToken);

        // Record usage events with different platforms
        await client.PostAsJsonAsync("/api/usage", new
        {
            artifactName = "design-reviewer",
            artifactVersion = "1.1.0",
            platform = "GitHubCopilot",
            action = "USED"
        });

        await client.PostAsJsonAsync("/api/usage", new
        {
            artifactName = "design-reviewer",
            artifactVersion = "1.1.0",
            platform = "GitHubCopilot",
            action = "INVOKED"
        });

        await client.PostAsJsonAsync("/api/usage", new
        {
            artifactName = "accessibility-reviewer",
            artifactVersion = "1.0.0",
            platform = "Claude",
            action = "USED"
        });

        var summaryResp = await client.GetAsync("/api/usage/summary");
        summaryResp.EnsureSuccessStatusCode();

        var summary = await summaryResp.Content.ReadFromJsonAsync<UsageSummaryDto>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(summary);
        Assert.True(summary.TotalUses >= 2);

        var artifactsResp = await client.GetAsync("/api/usage/artifacts");
        artifactsResp.EnsureSuccessStatusCode();

        var artifacts = await artifactsResp.Content.ReadFromJsonAsync<List<ArtifactAnalyticsDto>>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(artifacts);
        Assert.Contains(artifacts, s => s.ArtifactName == "design-reviewer" && s.UsageCount >= 2);
        Assert.Contains(artifacts, s => s.ArtifactName == "accessibility-reviewer" && s.UsageCount >= 1);
    }
}
