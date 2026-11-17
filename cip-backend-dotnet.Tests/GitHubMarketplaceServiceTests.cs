using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System;
using Xunit;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Configuration;
using EngineeringCommons.Backend.Services.Implementations;
using System.Collections.Generic;
using System.Linq;

namespace EngineeringCommons.Backend.IntegrationTests
{
    public class GitHubMarketplaceServiceTests
    {
        class FakeHandler : HttpMessageHandler
        {
            private readonly System.Func<HttpRequestMessage, HttpResponseMessage> _responder;
            public FakeHandler(System.Func<HttpRequestMessage, HttpResponseMessage> responder) => _responder = responder;
            protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, System.Threading.CancellationToken cancellationToken)
            {
                return Task.FromResult(_responder(request));
            }
        }

        class SimpleFactory : System.Net.Http.IHttpClientFactory
        {
            private readonly HttpClient _client;
            public SimpleFactory(HttpClient client) => _client = client;
            public HttpClient CreateClient(string name) => _client;
        }

        [Fact]
        public async Task Publish_NewFile_CreatesFile()
        {
            // GET -> 404, PUT -> 201
            var handler = new FakeHandler(req =>
            {
                if (req.Method == HttpMethod.Get) return new HttpResponseMessage(HttpStatusCode.NotFound) { Content = new StringContent("{\"message\":\"Not Found\"}") };
                if (req.Method == HttpMethod.Put) return new HttpResponseMessage(HttpStatusCode.Created) { Content = new StringContent("{\"content\":{}}") };
                return new HttpResponseMessage(HttpStatusCode.BadRequest);
            });
            var client = new HttpClient(handler);

            var inMemory = new Dictionary<string, string?> { { "GitHub:Token", "t" }, { "GitHub:Owner", "o" }, { "GitHub:Repository", "r" } };
            var config = new ConfigurationBuilder().AddInMemoryCollection(inMemory).Build();

            var svc = new GitHubMarketplaceService(new NullLogger<GitHubMarketplaceService>(), config, new SimpleFactory(client));
            await svc.PublishArtifactAsync("my-art", "content");
        }

        [Fact]
        public async Task Publish_ExistingFile_UpdatesFile()
        {
            // GET -> 200 with sha, PUT -> 200
            var handler = new FakeHandler(req =>
            {
                if (req.Method == HttpMethod.Get) return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"sha\":\"abc123\"}") };
                if (req.Method == HttpMethod.Put) return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"content\":{}}") };
                return new HttpResponseMessage(HttpStatusCode.BadRequest);
            });
            var client = new HttpClient(handler);

            var inMemory = new Dictionary<string, string?> { { "GitHub:Token", "t" }, { "GitHub:Owner", "o" }, { "GitHub:Repository", "r" } };
            var config = new ConfigurationBuilder().AddInMemoryCollection(inMemory).Build();

            var svc = new GitHubMarketplaceService(new NullLogger<GitHubMarketplaceService>(), config, new SimpleFactory(client));
            await svc.PublishArtifactAsync("my-art", "content");
        }

        [Fact]
        public async Task Publish_MissingToken_Throws()
        {
            var handler = new FakeHandler(req => new HttpResponseMessage(HttpStatusCode.NotFound));
            var client = new HttpClient(handler);
            var inMemory = new Dictionary<string, string?> { { "GitHub:Token", "" }, { "GitHub:Owner", "o" }, { "GitHub:Repository", "r" } };
            var config = new ConfigurationBuilder().AddInMemoryCollection(inMemory).Build();
            var svc = new GitHubMarketplaceService(new NullLogger<GitHubMarketplaceService>(), config, new SimpleFactory(client));
            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.PublishArtifactAsync("my-art", "content"));
        }

        [Fact]
        public async Task ListArtifacts_Classifies_Artifacts_WithoutDefaultingToAgent()
        {
            var ghJson = "[{\"name\": \"review-and-refactor.skill.md\"}, {\"name\": \"code-auditor.agent.md\"}, {\"name\": \"database.mcp.json\"}]";
            var handler = new FakeHandler(req =>
            {
                if (req.Method == HttpMethod.Get) return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(ghJson) };
                return new HttpResponseMessage(HttpStatusCode.NotFound);
            });
            var client = new HttpClient(handler);
            var inMemory = new Dictionary<string, string?> { { "GitHub:Token", "t" }, { "GitHub:Owner", "o" }, { "GitHub:Repository", "r" } };
            var config = new ConfigurationBuilder().AddInMemoryCollection(inMemory).Build();

            var svc = new GitHubMarketplaceService(new NullLogger<GitHubMarketplaceService>(), config, new SimpleFactory(client));
            var list = (await svc.ListArtifactsAsync()).ToList();

            var skill = list.FirstOrDefault(a => a.Name.Contains("review-and-refactor"));
            Assert.NotNull(skill);
            Assert.Equal("skill", skill.Type.ToLowerInvariant());

            var agent = list.FirstOrDefault(a => a.Name.Contains("code-auditor"));
            Assert.NotNull(agent);
            Assert.Equal("agent", agent.Type.ToLowerInvariant());

            var mcp = list.FirstOrDefault(a => a.Name.Contains("database"));
            Assert.NotNull(mcp);
            Assert.Equal("mcpserver", mcp.Type.ToLowerInvariant());
        }
    }
}
