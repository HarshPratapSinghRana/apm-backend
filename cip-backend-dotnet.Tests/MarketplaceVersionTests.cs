using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using EngineeringCommons.Backend.Services.Implementations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EngineeringCommons.Backend.IntegrationTests;

public class MarketplaceVersionTests
{
    class SimpleFactory : System.Net.Http.IHttpClientFactory
    {
        private readonly HttpClient _client;
        public SimpleFactory(HttpClient client) => _client = client;
        public HttpClient CreateClient(string name) => _client;
    }

    private GitHubMarketplaceService CreateService()
    {
        var handler = new HttpClientHandler();
        var client = new HttpClient(handler);
        var inMemory = new Dictionary<string, string?>
        {
            { "GitHub:Token", "fake-token" },
            { "GitHub:Owner", "harshpratapsinghrana1" },
            { "GitHub:Repository", "design-reviewer" }
        };
        var config = new ConfigurationBuilder().AddInMemoryCollection(inMemory).Build();
        return new GitHubMarketplaceService(new NullLogger<GitHubMarketplaceService>(), config, new SimpleFactory(client));
    }

    [Fact]
    public async Task GetArtifactVersions_Returns_SeededVersions_With_LatestFlag()
    {
        var svc = CreateService();
        var versions = (await svc.GetArtifactVersionsAsync("design-reviewer")).ToList();

        Assert.NotEmpty(versions);
        Assert.Contains(versions, v => v.Version == "1.1.0" && v.IsLatest);
        Assert.Contains(versions, v => v.Version == "1.0.0" && !v.IsLatest);
        Assert.Equal("1.1.0", versions.First().Version);
    }

    [Fact]
    public async Task GetArtifact_WithExactVersion_Returns_MatchingPayload()
    {
        var svc = CreateService();
        var art100 = await svc.GetArtifactAsync("design-reviewer", "1.0.0");

        Assert.NotNull(art100);
        Assert.Equal("1.0.0", art100.Version);
        Assert.Contains("v1.0.0", art100.CipPackage);
        Assert.Contains("v1.0.0", art100.Content);
    }

    [Fact]
    public async Task GetArtifact_WithInvalidVersion_Returns_Null()
    {
        var svc = CreateService();
        var art = await svc.GetArtifactAsync("design-reviewer", "99.0.0");

        Assert.Null(art);
    }

    [Fact]
    public async Task GetArtifact_WithoutVersion_Returns_LatestApproved()
    {
        var svc = CreateService();
        var latest = await svc.GetArtifactAsync("design-reviewer");

        Assert.NotNull(latest);
        Assert.Equal("1.1.0", latest.Version);
        Assert.Contains("v1.1.0", latest.CipPackage);
    }
}
