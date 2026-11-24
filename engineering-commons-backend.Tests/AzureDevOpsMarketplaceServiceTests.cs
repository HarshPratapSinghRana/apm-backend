using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Xunit;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Configuration;
using EngineeringCommons.Backend.Services.Implementations;

namespace EngineeringCommons.Backend.IntegrationTests
{
    public class AzureDevOpsMarketplaceServiceTests
    {
        class FakeHandler : HttpMessageHandler
        {
            private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;
            public FakeHandler(Func<HttpRequestMessage, HttpResponseMessage> responder) => _responder = responder;
            protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, System.Threading.CancellationToken cancellationToken)
            {
                return Task.FromResult(_responder(request));
            }
        }

        class SimpleFactory : IHttpClientFactory
        {
            private readonly HttpClient _client;
            public SimpleFactory(HttpClient client) => _client = client;
            public HttpClient CreateClient(string name) => _client;
        }

        [Fact]
        public async Task Publish_NewFile_PushesCommitToAzureDevOps()
        {
            // GET refs -> 200 with objectId, GET items -> 404 (new file), POST pushes -> 201
            var handler = new FakeHandler(req =>
            {
                if (req.Method == HttpMethod.Get && req.RequestUri!.ToString().Contains("_apis/git/repositories") && req.RequestUri.ToString().Contains("refs"))
                {
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent("{\"value\":[{\"name\":\"refs/heads/main\",\"objectId\":\"commit-sha-123\"}]}")
                    };
                }
                if (req.Method == HttpMethod.Get && req.RequestUri!.ToString().Contains("items"))
                {
                    return new HttpResponseMessage(HttpStatusCode.NotFound) { Content = new StringContent("{\"message\":\"Not Found\"}") };
                }
                if (req.Method == HttpMethod.Post && req.RequestUri!.ToString().Contains("pushes"))
                {
                    return new HttpResponseMessage(HttpStatusCode.Created)
                    {
                        Content = new StringContent("{\"pushId\":1,\"commits\":[{\"commitId\":\"new-commit-456\"}]}")
                    };
                }
                return new HttpResponseMessage(HttpStatusCode.BadRequest);
            });
            var client = new HttpClient(handler);

            var inMemory = new Dictionary<string, string?>
            {
                { "AzureDevOps:Token", "ado-pat-token-sample" },
                { "AzureDevOps:Organization", "maqsoftware" },
                { "AzureDevOps:Project", "EngineeringCommons" },
                { "AzureDevOps:Repository", "cip-marketplace" }
            };
            var config = new ConfigurationBuilder().AddInMemoryCollection(inMemory).Build();

            var svc = new AzureDevOpsMarketplaceService(new NullLogger<AzureDevOpsMarketplaceService>(), config, new SimpleFactory(client));
            await svc.PublishArtifactAsync("sql-agent", "{\"name\":\"sql-agent\",\"type\":\"agent\",\"version\":\"1.0.0\"}");
        }

        [Fact]
        public async Task Publish_ExistingFile_UpdatesFileInAzureDevOps()
        {
            // GET refs -> 200, GET items -> 200 (existing file), POST pushes -> 201
            var handler = new FakeHandler(req =>
            {
                if (req.Method == HttpMethod.Get && req.RequestUri!.ToString().Contains("refs"))
                {
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent("{\"value\":[{\"name\":\"refs/heads/main\",\"objectId\":\"existing-sha-789\"}]}")
                    };
                }
                if (req.Method == HttpMethod.Get && req.RequestUri!.ToString().Contains("items"))
                {
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent("{\"objectId\":\"item-blob-id\",\"content\":\"# Old Content\"}")
                    };
                }
                if (req.Method == HttpMethod.Post && req.RequestUri!.ToString().Contains("pushes"))
                {
                    return new HttpResponseMessage(HttpStatusCode.Created)
                    {
                        Content = new StringContent("{\"pushId\":2}")
                    };
                }
                return new HttpResponseMessage(HttpStatusCode.BadRequest);
            });
            var client = new HttpClient(handler);

            var inMemory = new Dictionary<string, string?>
            {
                { "AzureDevOps:Token", "ado-pat-token-sample" },
                { "AzureDevOps:Organization", "maqsoftware" },
                { "AzureDevOps:Project", "EngineeringCommons" },
                { "AzureDevOps:Repository", "cip-marketplace" }
            };
            var config = new ConfigurationBuilder().AddInMemoryCollection(inMemory).Build();

            var svc = new AzureDevOpsMarketplaceService(new NullLogger<AzureDevOpsMarketplaceService>(), config, new SimpleFactory(client));
            await svc.PublishArtifactAsync("sql-agent", "{\"name\":\"sql-agent\",\"type\":\"agent\",\"version\":\"1.1.0\"}");
        }

        [Fact]
        public async Task Publish_MissingToken_ThrowsInvalidOperationException()
        {
            var handler = new FakeHandler(req => new HttpResponseMessage(HttpStatusCode.NotFound));
            var client = new HttpClient(handler);
            var inMemory = new Dictionary<string, string?>
            {
                { "AzureDevOps:Token", "" },
                { "AzureDevOps:Organization", "maqsoftware" },
                { "AzureDevOps:Project", "EngineeringCommons" },
                { "AzureDevOps:Repository", "cip-marketplace" }
            };
            var config = new ConfigurationBuilder().AddInMemoryCollection(inMemory).Build();
            var svc = new AzureDevOpsMarketplaceService(new NullLogger<AzureDevOpsMarketplaceService>(), config, new SimpleFactory(client));

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.PublishArtifactAsync("my-art", "content"));
        }

        [Fact]
        public async Task ListArtifacts_Classifies_Artifacts_From_AzureDevOps_Items()
        {
            var adoJson = "{\"value\": [" +
                "{\"path\": \"/artifacts/review-and-refactor.skill.md\", \"isFolder\": false}," +
                "{\"path\": \"/artifacts/code-auditor.agent.md\", \"isFolder\": false}," +
                "{\"path\": \"/artifacts/database.mcp.json\", \"isFolder\": false}" +
                "]}";

            var handler = new FakeHandler(req =>
            {
                if (req.Method == HttpMethod.Get)
                {
                    return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(adoJson) };
                }
                return new HttpResponseMessage(HttpStatusCode.NotFound);
            });
            var client = new HttpClient(handler);

            var inMemory = new Dictionary<string, string?>
            {
                { "AzureDevOps:Token", "ado-pat-token-sample" },
                { "AzureDevOps:Organization", "maqsoftware" },
                { "AzureDevOps:Project", "EngineeringCommons" },
                { "AzureDevOps:Repository", "cip-marketplace" }
            };
            var config = new ConfigurationBuilder().AddInMemoryCollection(inMemory).Build();

            var svc = new AzureDevOpsMarketplaceService(new NullLogger<AzureDevOpsMarketplaceService>(), config, new SimpleFactory(client));
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

        [Fact]
        public async Task GetArtifactVersions_Returns_Seeded_And_Sorted_Versions()
        {
            var handler = new FakeHandler(req => new HttpResponseMessage(HttpStatusCode.NotFound));
            var client = new HttpClient(handler);

            var inMemory = new Dictionary<string, string?>
            {
                { "AzureDevOps:Token", "ado-pat" },
                { "AzureDevOps:Organization", "maqsoftware" },
                { "AzureDevOps:Project", "EngineeringCommons" },
                { "AzureDevOps:Repository", "cip-marketplace" }
            };
            var config = new ConfigurationBuilder().AddInMemoryCollection(inMemory).Build();

            var svc = new AzureDevOpsMarketplaceService(new NullLogger<AzureDevOpsMarketplaceService>(), config, new SimpleFactory(client));
            var versions = (await svc.GetArtifactVersionsAsync("design-reviewer")).ToList();

            Assert.NotEmpty(versions);
            Assert.True(versions.Count >= 2);
            Assert.Equal("1.1.0", versions[0].Version);
            Assert.True(versions[0].IsLatest);
            Assert.Equal("1.0.0", versions[1].Version);
            Assert.False(versions[1].IsLatest);
        }
    }
}
