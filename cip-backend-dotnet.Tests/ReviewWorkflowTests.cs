using System.Net.Http.Json;
using System.Threading.Tasks;
using System.Linq;
using System.Collections.Generic;
using Xunit;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using CipBackend.Services.Interfaces;
using CipBackend.Services.Implementations;

namespace CipBackend.IntegrationTests;

public class ReviewWorkflowTests
{
    private WebApplicationFactory<Program> CreateFactory()
    {
        var factory = new TestWebApplicationFactory();
        return factory.WithWebHostBuilder(builder => {
            builder.ConfigureServices(services => {
                // Replace marketplace with a test double
                services.AddSingleton<IMarketplaceService, TestMarketplaceService>();
            });
        });
    }

    [Fact]
    public async Task Producer_Submit_Reviewer_Approve_Publishes()
    {
        using (var _factory = CreateFactory())
        {
            var client = _factory.CreateClient();
            // login producer
            var loginResp = await client.PostAsJsonAsync("/api/auth/login", new { email = "producer@company.com", password = "password" });
            loginResp.EnsureSuccessStatusCode();
            var body = await loginResp.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
            string producerToken = body.GetProperty("token").GetString() ?? string.Empty;

            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", producerToken);
            var submit = await client.PostAsJsonAsync("/api/artifacts/test-art/changes", new { content = "change" });
            submit.EnsureSuccessStatusCode();
            var submitBody = await submit.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
            string reviewId = submitBody.GetProperty("reviewId").GetString() ?? string.Empty;

            // login reviewer
            var loginResp2 = await client.PostAsJsonAsync("/api/auth/login", new { email = "reviewer@company.com", password = "password" });
            loginResp2.EnsureSuccessStatusCode();
            var body2 = await loginResp2.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
            string reviewerToken = body2.GetProperty("token").GetString() ?? string.Empty;

            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", reviewerToken);
            var approve = await client.PostAsync($"/api/reviews/{reviewId}/approve", null);
            approve.EnsureSuccessStatusCode();

            // verify marketplace called
            var svc = _factory.Services.GetRequiredService<IMarketplaceService>() as TestMarketplaceService;
            Assert.NotNull(svc);
            Assert.Contains(svc.Published, p => p.ArtifactId == "test-art");
        }
    }

    class TestMarketplaceService : IMarketplaceService
    {
        public List<(string ArtifactId, string Content)> Published { get; } = new();
        public Task<IEnumerable<ArtifactDto>> ListArtifactsAsync() => Task.FromResult(Enumerable.Empty<ArtifactDto>());
        public Task<ArtifactDto?> GetArtifactAsync(string artifactId, string? version = null) => Task.FromResult<ArtifactDto?>(null);
        public Task<IEnumerable<ArtifactVersionDto>> GetArtifactVersionsAsync(string artifactId) => Task.FromResult<IEnumerable<ArtifactVersionDto>>(Enumerable.Empty<ArtifactVersionDto>());
        public Task PublishArtifactAsync(string artifactId, string content)
        {
            Published.Add((artifactId, content));
            return Task.CompletedTask;
        }
        public Task<bool> UpdateVisibilityAsync(string artifactId, bool isPrivate, string userEmail, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null) => Task.FromResult(true);
    }
}
