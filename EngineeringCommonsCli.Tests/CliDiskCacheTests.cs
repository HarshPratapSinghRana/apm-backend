using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using EngineeringCommonsCli.Commands;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Implementations;
using EngineeringCommonsCli.Services.Interfaces;
using Moq;
using Xunit;

namespace EngineeringCommonsCli.Tests;

[Collection("ConsoleOutputCollection")]
public class CliDiskCacheTests : IDisposable
{
    private readonly string _testCacheDir;
    private readonly CliDiskCache _cache;

    public CliDiskCacheTests()
    {
        _testCacheDir = Path.Combine(Path.GetTempPath(), "engineering-commons-test-cache-" + Guid.NewGuid().ToString("N"));
        _cache = new CliDiskCache(_testCacheDir);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_testCacheDir))
            {
                Directory.Delete(_testCacheDir, true);
            }
        }
        catch { }
    }

    [Fact]
    public async Task GetAsync_WhenFileDoesNotExist_ReturnsDefault()
    {
        var result = await _cache.GetAsync<List<ArtifactSpec>>("catalog_cache.json");
        Assert.Null(result);
    }

    [Fact]
    public async Task SetAsync_And_GetAsync_WithinTtl_ReturnsCachedData()
    {
        var sampleData = new List<ArtifactSpec>
        {
            new("design-reviewer", "agent", "1.1.0", "org/pkg#v1.1.0", false, "test@example.com"),
            new("unit-test-writer", "skill", "2.0.0", "org/pkg2#v2.0.0", true, "test2@example.com")
        };

        await _cache.SetAsync("catalog_cache.json", sampleData, TimeSpan.FromMinutes(15));
        var retrieved = await _cache.GetAsync<List<ArtifactSpec>>("catalog_cache.json");

        Assert.NotNull(retrieved);
        Assert.Equal(2, retrieved.Count);
        Assert.Equal("design-reviewer", retrieved[0].Name);
        Assert.Equal("unit-test-writer", retrieved[1].Name);
    }

    [Fact]
    public async Task GetAsync_WhenEntryExpired_ReturnsNull()
    {
        var sampleData = new List<ArtifactSpec>
        {
            new("old-artifact", "prompt", "1.0.0", "org/pkg#v1.0.0", false)
        };

        // Write with negative TTL to simulate expired item
        await _cache.SetAsync("catalog_cache.json", sampleData, TimeSpan.FromSeconds(-1));
        var retrieved = await _cache.GetAsync<List<ArtifactSpec>>("catalog_cache.json");

        Assert.Null(retrieved);
    }

    [Fact]
    public async Task InvalidateAsync_RemovesCacheFile()
    {
        var sampleData = new List<string> { "item1", "item2" };
        await _cache.SetAsync("temp.json", sampleData, TimeSpan.FromMinutes(10));

        var before = await _cache.GetAsync<List<string>>("temp.json");
        Assert.NotNull(before);

        await _cache.InvalidateAsync("temp.json");

        var after = await _cache.GetAsync<List<string>>("temp.json");
        Assert.Null(after);
    }

    [Fact]
    public async Task ClearAllAsync_RemovesAllCachedFiles()
    {
        await _cache.SetAsync("file1.json", "data1");
        await _cache.SetAsync("file2.json", "data2");

        Assert.NotNull(await _cache.GetAsync<string>("file1.json"));
        Assert.NotNull(await _cache.GetAsync<string>("file2.json"));

        await _cache.ClearAllAsync();

        Assert.Null(await _cache.GetAsync<string>("file1.json"));
        Assert.Null(await _cache.GetAsync<string>("file2.json"));
    }

    [Fact]
    public void ListCommand_WithRefreshFlag_PassesForceRefreshTrue()
    {
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new UserSession("token-123", "user@company.com"));
        backend.Setup(b => b.ListArtifactsAsync(null, true)).ReturnsAsync(new[]
        {
            new ArtifactSpec("design-reviewer", "agent", "1.1.0", "org/pkg#v1.1.0")
        });

        var cmd = new ListCommand(backend.Object, auth.Object);
        var code = cmd.Invoke(new[] { "--refresh" });

        Assert.Equal(0, code);
        backend.Verify(b => b.ListArtifactsAsync(null, true), Times.Once);
    }

    [Fact]
    public void StatusCommand_WithRefreshFlag_PassesForceRefreshTrue()
    {
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new UserSession("token-123", "user@company.com"));
        backend.Setup(b => b.GetMySubmissionsAsync(true)).ReturnsAsync(new List<ProducerSubmissionDto>
        {
            new("rev-1", "design-reviewer", "Approved", DateTime.UtcNow)
        });

        var sw = new StringWriter();
        var origOut = Console.Out;
        Console.SetOut(sw);

        try
        {
            var cmd = new StatusCommand(backend.Object, auth.Object);
            var code = cmd.Invoke(new[] { "--refresh" });

            Assert.Equal(0, code);
            backend.Verify(b => b.GetMySubmissionsAsync(true), Times.Once);
        }
        finally
        {
            Console.SetOut(origOut);
        }
    }

    [Fact]
    public void ListVersionsCommand_WithRefreshFlag_PassesForceRefreshTrue()
    {
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(new UserSession("token-123", "user@company.com"));
        backend.Setup(b => b.GetArtifactVersionsAsync("design-reviewer", true)).ReturnsAsync(new List<ArtifactVersionDto>
        {
            new("1.1.0", "org/pkg#v1.1.0", true)
        });

        var sw = new StringWriter();
        var origOut = Console.Out;
        Console.SetOut(sw);

        try
        {
            var cmd = new ListVersionsCommand(backend.Object, auth.Object);
            var code = cmd.Invoke(new[] { "design-reviewer", "--refresh" });

            Assert.Equal(0, code);
            backend.Verify(b => b.GetArtifactVersionsAsync("design-reviewer", true), Times.Once);
        }
        finally
        {
            Console.SetOut(origOut);
        }
    }

    [Fact]
    public async Task BackendClient_UsesDiskCache_OnSecondCallWithoutHttp()
    {
        var tokenStoreMock = new Mock<IAuthTokenStore>();
        tokenStoreMock.Setup(t => t.GetTokenAsync()).ReturnsAsync("mock-token");
        tokenStoreMock.Setup(t => t.GetSessionAsync()).ReturnsAsync(new UserSession("mock-token", "user@example.com"));

        var spMock = new Mock<ISharePointGraphClient>();
        var sampleCatalog = new List<ArtifactSpec>
        {
            new("design-reviewer", "agent", "1.1.0", "org/pkg#v1.1.0", false, "user@example.com")
        };
        spMock.Setup(s => s.GetArtifactsAsync(It.IsAny<string>(), It.IsAny<string?>())).ReturnsAsync(sampleCatalog);

        var backendClient = new BackendClient(tokenStoreMock.Object, spMock.Object, _cache);

        // 1st call: Should query SharePoint and cache to disk
        var firstResult = (await backendClient.ListArtifactsAsync()).ToList();
        Assert.Single(firstResult);
        Assert.Equal("design-reviewer", firstResult[0].Name);
        spMock.Verify(s => s.GetArtifactsAsync(It.IsAny<string>(), It.IsAny<string?>()), Times.Once);

        // 2nd call: Should hit disk cache, zero additional SharePoint/HTTP calls
        var secondResult = (await backendClient.ListArtifactsAsync()).ToList();
        Assert.Single(secondResult);
        Assert.Equal("design-reviewer", secondResult[0].Name);
        spMock.Verify(s => s.GetArtifactsAsync(It.IsAny<string>(), It.IsAny<string?>()), Times.Once);

        // 3rd call with forceRefresh = true: Should bypass cache and call SharePoint again
        var thirdResult = (await backendClient.ListArtifactsAsync(null, forceRefresh: true)).ToList();
        Assert.Single(thirdResult);
        spMock.Verify(s => s.GetArtifactsAsync(It.IsAny<string>(), It.IsAny<string?>()), Times.Exactly(2));
    }

    [Fact]
    public async Task InvalidateAsync_WithTraversalPath_DoesNotDeleteOutsideFile()
    {
        var outsideFile = Path.Combine(Path.GetTempPath(), "cip_test_outside_" + Guid.NewGuid().ToString("N") + ".txt");
        File.WriteAllText(outsideFile, "important data");

        try
        {
            await _cache.InvalidateAsync("../../" + Path.GetFileName(outsideFile));
            Assert.True(File.Exists(outsideFile));
        }
        finally
        {
            if (File.Exists(outsideFile)) File.Delete(outsideFile);
        }
    }
}
