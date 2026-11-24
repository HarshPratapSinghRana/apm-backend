#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;
using EngineeringCommons.Backend.Events;
using EngineeringCommons.Backend.Models;
using EngineeringCommons.Backend.Services.Implementations;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Tests;

public class SecurityAuditRegressionTests
{
    private class FakeReviewRepository : IReviewRepository
    {
        private readonly Dictionary<string, Review> _store = new();
        public void Add(Review review) => _store[review.Id] = review;
        public Review? Get(string id) => _store.TryGetValue(id, out var r) ? r : null;
        public IEnumerable<Review> List() => _store.Values.ToList();
    }

    private class FakeMarketplaceService : IMarketplaceService
    {
        public List<(string ArtifactId, string Content)> Published { get; } = new();
        public Task PublishArtifactAsync(string artifactId, string content)
        {
            Published.Add((artifactId, content));
            return Task.CompletedTask;
        }
        public Task<IEnumerable<ArtifactDto>> ListArtifactsAsync() =>
            Task.FromResult<IEnumerable<ArtifactDto>>(new List<ArtifactDto>
            {
                new ArtifactDto { Id = "design-reviewer", Name = "design-reviewer", Type = "agent", Version = "1.0.0", Description = "PR code reviewer agent" },
                new ArtifactDto { Id = "sql-helper", Name = "sql-helper", Type = "skill", Version = "1.0.0", Description = "Database transformer for SQL" }
            });
        public Task<ArtifactDto?> GetArtifactAsync(string artifactId, string? version = null) => Task.FromResult<ArtifactDto?>(null);
        public Task<IEnumerable<ArtifactVersionDto>> GetArtifactVersionsAsync(string artifactId) => Task.FromResult<IEnumerable<ArtifactVersionDto>>(new List<ArtifactVersionDto>());
        public Task<bool> UpdateVisibilityAsync(string artifactId, bool isPrivate, string userEmail, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null) => Task.FromResult(true);
    }

    private class FakeEventPublisher : IDomainEventPublisher
    {
        public Task PublishAsync<TEvent>(TEvent domainEvent) where TEvent : ReviewDomainEvent => Task.CompletedTask;
    }

    [Fact]
    public async Task SelfApproval_StrictlyForbidden_ThrowsException()
    {
        var repo = new FakeReviewRepository();
        var marketplace = new FakeMarketplaceService();
        var publisher = new FakeEventPublisher();
        var service = new ReviewService(repo, marketplace, publisher);

        var review = service.SubmitChange("agent-test", "reviewer-producer@company.com", "{\"name\":\"agent-test\",\"version\":\"1.0.0\"}");
        service.AssignReview(review.Id, "reviewer-producer@company.com");

        // Attempt self-approval by same email as producer
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ApproveAsync(review.Id, "reviewer-producer@company.com", "Self approving my own code"));

        Assert.Contains("Separation of duties violation", ex.Message);
        Assert.Empty(marketplace.Published);
    }

    [Fact]
    public async Task TamperedContent_AfterSubmission_FailsApprovalHashCheck()
    {
        var repo = new FakeReviewRepository();
        var marketplace = new FakeMarketplaceService();
        var publisher = new FakeEventPublisher();
        var service = new ReviewService(repo, marketplace, publisher);

        var review = service.SubmitChange("agent-tamper", "producer@company.com", "{\"name\":\"agent-tamper\",\"version\":\"1.0.0\"}");
        service.AssignReview(review.Id, "reviewer@company.com");

        // Simulate database / in-flight content tampering after submission
        review.Content = "{\"name\":\"agent-tamper\",\"version\":\"1.0.0\",\"malicious\":\"injected_payload\"}";

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ApproveAsync(review.Id, "reviewer@company.com", "Approved"));

        Assert.Contains("Hash mismatch", ex.Message);
        Assert.Empty(marketplace.Published);
    }

    [Fact]
    public async Task RecommendationEngine_RanksRelevantArtifacts_Safely()
    {
        var marketplace = new FakeMarketplaceService();
        var recService = new ArtifactRecommendationService(marketplace);

        var req = new RecommendationRequest
        {
            Query = "review",
            FileExtensions = new List<string> { ".cs", ".ts" }
        };

        var recs = (await recService.RecommendAsync(req)).ToList();

        Assert.NotEmpty(recs);
        Assert.Equal("design-reviewer", recs[0].Name);
        Assert.True(recs[0].MatchScore > 0.0);
    }
}
