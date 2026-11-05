using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Json;
using System.Threading.Tasks;
using CipBackend.IntegrationTests;
using CipBackend.Models;
using CipBackend.Services.Implementations;
using CipBackend.Services.Interfaces;
using Xunit;

namespace CipBackend.Tests;

public class FakeMarketplaceService : IMarketplaceService
{
    private readonly Dictionary<string, ArtifactDto> _store = new(StringComparer.OrdinalIgnoreCase);

    public void SetArtifact(ArtifactDto dto) => _store[dto.Id] = dto;

    public Task<IEnumerable<ArtifactDto>> ListArtifactsAsync() => Task.FromResult<IEnumerable<ArtifactDto>>(_store.Values);

    public Task<ArtifactDto?> GetArtifactAsync(string artifactId, string? version = null)
    {
        _store.TryGetValue(artifactId, out var dto);
        if (dto != null && !string.IsNullOrWhiteSpace(version) && !dto.Version.Equals(version, StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult<ArtifactDto?>(null);
        }
        return Task.FromResult(dto);
    }

    public Task<IEnumerable<ArtifactVersionDto>> GetArtifactVersionsAsync(string artifactId)
    {
        if (_store.TryGetValue(artifactId, out var dto))
        {
            return Task.FromResult<IEnumerable<ArtifactVersionDto>>(new[]
            {
                new ArtifactVersionDto { Version = dto.Version, CipPackage = dto.CipPackage, IsLatest = true }
            });
        }
        return Task.FromResult<IEnumerable<ArtifactVersionDto>>(Enumerable.Empty<ArtifactVersionDto>());
    }

    public Task PublishArtifactAsync(string artifactId, string content)
    {
        _store[artifactId] = new ArtifactDto { Id = artifactId, Name = artifactId, Content = content };
        return Task.CompletedTask;
    }

    public Task<bool> UpdateVisibilityAsync(string artifactId, bool isPrivate, string userEmail, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null)
    {
        if (_store.TryGetValue(artifactId, out var art))
        {
            art.IsPrivate = isPrivate;
            if (allowedContributors != null) art.AllowedContributors = allowedContributors;
            if (allowedReviewers != null) art.AllowedReviewers = allowedReviewers;
            if (allowedConsumers != null) art.AllowedConsumers = allowedConsumers;
            return Task.FromResult(true);
        }
        return Task.FromResult(false);
    }
}

public class ArtifactDiffServiceTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ArtifactDiffServiceTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Test1_NewArtifact_AllFilesShownAsAdded()
    {
        var marketplace = new FakeMarketplaceService();
        var service = new ArtifactDiffService(marketplace);

        var submittedContent = @"{
            ""name"": ""brand-new-agent"",
            ""type"": ""agent"",
            ""version"": ""1.0.0"",
            ""files"": [
                { ""path"": "".github/agents/agent1.md"", ""content"": ""# Agent 1\nLine 2"" },
                { ""path"": "".github/agents/agent2.md"", ""content"": ""# Agent 2"" }
            ]
        }";

        var diff = await service.GenerateDiffAsync("brand-new-agent", submittedContent, "rev-1", "producer@test.com", DateTime.UtcNow);

        Assert.NotNull(diff);
        Assert.Equal("brand-new-agent", diff.ArtifactName);
        Assert.Null(diff.CurrentVersion);
        Assert.Equal("1.0.0", diff.SubmittedVersion);
        Assert.Equal(2, diff.FilesChangedCount);
        Assert.Equal(2, diff.AddedFilesCount);
        Assert.Equal(0, diff.ModifiedFilesCount);
        Assert.Equal(0, diff.DeletedFilesCount);
        Assert.All(diff.Files, f => Assert.Equal(ChangeType.Added, f.ChangeType));
        Assert.All(diff.Files, f => Assert.Null(f.OldContent));
    }

    [Fact]
    public async Task Test2_UpdatedArtifact_ModifiedFilesDetected()
    {
        var marketplace = new FakeMarketplaceService();
        var currentJson = @"{
            ""name"": ""design-reviewer"",
            ""type"": ""agent"",
            ""version"": ""1.0.0"",
            ""files"": [
                { ""path"": "".github/agents/design-reviewer.md"", ""content"": ""Line 1\nLine 2\nLine 3"" }
            ]
        }";
        marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Type = "agent",
            Version = "1.0.0",
            Content = currentJson
        });

        var service = new ArtifactDiffService(marketplace);

        var submittedJson = @"{
            ""name"": ""design-reviewer"",
            ""type"": ""agent"",
            ""version"": ""1.1.0"",
            ""files"": [
                { ""path"": "".github/agents/design-reviewer.md"", ""content"": ""Line 1\nModified Line 2\nLine 3\nLine 4 Added"" }
            ]
        }";

        var diff = await service.GenerateDiffAsync("design-reviewer", submittedJson);

        Assert.Equal("1.0.0", diff.CurrentVersion);
        Assert.Equal("1.1.0", diff.SubmittedVersion);
        Assert.Equal(1, diff.ModifiedFilesCount);
        var fileDiff = diff.Files.First(f => f.Path == ".github/agents/design-reviewer.md");
        Assert.Equal(ChangeType.Modified, fileDiff.ChangeType);
        Assert.True(fileDiff.AddedLinesCount > 0);
        Assert.True(fileDiff.DeletedLinesCount > 0);
    }

    [Fact]
    public async Task Test3_AddedFileDetected()
    {
        var marketplace = new FakeMarketplaceService();
        var currentJson = @"{
            ""name"": ""design-reviewer"",
            ""files"": [
                { ""path"": "".github/agents/main.md"", ""content"": ""content"" }
            ]
        }";
        marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Version = "1.0.0",
            Content = currentJson
        });

        var service = new ArtifactDiffService(marketplace);

        var submittedJson = @"{
            ""name"": ""design-reviewer"",
            ""version"": ""1.1.0"",
            ""files"": [
                { ""path"": "".github/agents/main.md"", ""content"": ""content"" },
                { ""path"": "".github/skills/new-skill.md"", ""content"": ""# New Skill"" }
            ]
        }";

        var diff = await service.GenerateDiffAsync("design-reviewer", submittedJson);

        Assert.Equal(1, diff.AddedFilesCount);
        Assert.Equal(1, diff.UnchangedFilesCount);
        var added = diff.Files.First(f => f.Path == ".github/skills/new-skill.md");
        Assert.Equal(ChangeType.Added, added.ChangeType);
    }

    [Fact]
    public async Task Test4_DeletedFileDetected()
    {
        var marketplace = new FakeMarketplaceService();
        var currentJson = @"{
            ""name"": ""design-reviewer"",
            ""version"": ""1.0.0"",
            ""files"": [
                { ""path"": "".github/agents/main.md"", ""content"": ""content"" },
                { ""path"": "".github/prompts/old-prompt.md"", ""content"": ""deprecated prompt"" }
            ]
        }";
        marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Version = "1.0.0",
            Content = currentJson
        });

        var service = new ArtifactDiffService(marketplace);

        var submittedJson = @"{
            ""name"": ""design-reviewer"",
            ""version"": ""1.1.0"",
            ""files"": [
                { ""path"": "".github/agents/main.md"", ""content"": ""content"" }
            ]
        }";

        var diff = await service.GenerateDiffAsync("design-reviewer", submittedJson);

        Assert.Equal(1, diff.DeletedFilesCount);
        Assert.Equal(1, diff.UnchangedFilesCount);
        var deleted = diff.Files.First(f => f.Path == ".github/prompts/old-prompt.md");
        Assert.Equal(ChangeType.Deleted, deleted.ChangeType);
        Assert.NotNull(deleted.OldContent);
        Assert.Null(deleted.NewContent);
    }

    [Fact]
    public async Task Test5_UnchangedFileDetected()
    {
        var marketplace = new FakeMarketplaceService();
        var currentJson = @"{
            ""name"": ""design-reviewer"",
            ""files"": [
                { ""path"": "".github/agents/main.md"", ""content"": ""line 1\nline 2"" }
            ]
        }";
        marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Version = "1.0.0",
            Content = currentJson
        });

        var service = new ArtifactDiffService(marketplace);

        var submittedJson = @"{
            ""name"": ""design-reviewer"",
            ""version"": ""1.0.0"",
            ""files"": [
                { ""path"": "".github/agents/main.md"", ""content"": ""line 1\r\nline 2"" }
            ]
        }";

        var diff = await service.GenerateDiffAsync("design-reviewer", submittedJson);

        Assert.Equal(0, diff.FilesChangedCount);
        Assert.Equal(1, diff.UnchangedFilesCount);
        Assert.Equal(ChangeType.Unchanged, diff.Files[0].ChangeType);
    }

    [Fact]
    public void Test6_LineLevelChangesGeneratedCorrectly()
    {
        var oldText = "A\nB\nC";
        var newText = "A\nB modified\nC\nD added";

        var changes = ArtifactDiffService.GenerateLineChanges(oldText, newText);

        Assert.Contains(changes, c => c.Type == LineChangeType.Unchanged && c.Content == "A");
        Assert.Contains(changes, c => c.Type == LineChangeType.Deleted && c.Content == "B");
        Assert.Contains(changes, c => c.Type == LineChangeType.Added && c.Content == "B modified");
        Assert.Contains(changes, c => c.Type == LineChangeType.Unchanged && c.Content == "C");
        Assert.Contains(changes, c => c.Type == LineChangeType.Added && c.Content == "D added");
    }

    [Fact]
    public async Task Test7_CurrentApprovedVersionComparedAgainstSubmittedVersion()
    {
        var marketplace = new FakeMarketplaceService();
        marketplace.SetArtifact(new ArtifactDto
        {
            Id = "agent-v",
            Version = "2.0.0",
            Content = @"{""files"":[{""path"":""f.md"",""content"":""v2""}]}"
        });

        var service = new ArtifactDiffService(marketplace);
        var diff = await service.GenerateDiffAsync("agent-v", @"{""version"":""2.1.0"",""files"":[{""path"":""f.md"",""content"":""v2.1""}]}");

        Assert.Equal("2.0.0", diff.CurrentVersion);
        Assert.Equal("2.1.0", diff.SubmittedVersion);
    }

    [Fact]
    public async Task Test8_ReviewerCanRetrieveDiff_Endpoint()
    {
        var client = _factory.CreateClient();

        // 1. Login as Producer and submit a review
        var prodLogin = await client.PostAsJsonAsync("/api/auth/login", new { email = "producer@company.com", password = "password" });
        var prodToken = (await prodLogin.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", prodToken);

        var submitResp = await client.PostAsJsonAsync("/api/artifacts/diff-test-art/changes", new
        {
            content = @"{""name"":""diff-test-art"",""version"":""1.0.0"",""files"":[{""path"":""test.md"",""content"":""# Test""}]}"
        });
        var submitJson = await submitResp.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var reviewId = submitJson.GetProperty("reviewId").GetString()!;

        // 2. Login as Reviewer and fetch diff
        var revLogin = await client.PostAsJsonAsync("/api/auth/login", new { email = "reviewer@company.com", password = "password" });
        var revToken = (await revLogin.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", revToken);

        var diffResp = await client.GetAsync($"/api/reviews/{reviewId}/diff");
        diffResp.EnsureSuccessStatusCode();

        var diff = await diffResp.Content.ReadFromJsonAsync<ArtifactDiff>(new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(diff);
        Assert.Equal("diff-test-art", diff.ArtifactName);
        Assert.Equal(1, diff.AddedFilesCount);
    }

    [Fact]
    public async Task Test9_RejectWithFeedback_StoresFeedbackAndVisibleToProducer()
    {
        var client = _factory.CreateClient();

        // Submit
        var prodLogin = await client.PostAsJsonAsync("/api/auth/login", new { email = "producer@company.com", password = "password" });
        var prodToken = (await prodLogin.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", prodToken);

        var submitResp = await client.PostAsJsonAsync("/api/artifacts/feedback-art/changes", new
        {
            content = @"{""name"":""feedback-art"",""files"":[{""path"":""f.md"",""content"":""x""}]}"
        });
        var reviewId = (await submitResp.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("reviewId").GetString()!;

        // Reject as Reviewer with feedback
        var revLogin = await client.PostAsJsonAsync("/api/auth/login", new { email = "reviewer@company.com", password = "password" });
        var revToken = (await revLogin.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", revToken);

        var rejectResp = await client.PostAsJsonAsync($"/api/reviews/{reviewId}/reject", new
        {
            feedback = "Please add error handling before resubmitting."
        });
        rejectResp.EnsureSuccessStatusCode();

        // Producer checks changes and sees feedback
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", prodToken);
        var myChangesResp = await client.GetAsync("/api/artifacts/my/changes");
        var myChanges = await myChangesResp.Content.ReadFromJsonAsync<List<System.Text.Json.JsonElement>>();
        var matching = myChanges!.FirstOrDefault(c => c.GetProperty("id").GetString() == reviewId);
        Assert.Equal("Rejected", matching.GetProperty("status").GetString());
        Assert.Equal("Please add error handling before resubmitting.", matching.GetProperty("feedback").GetString());
    }

    [Fact]
    public async Task Test10_ApproveWithFeedback_StoresFeedbackAndApproves()
    {
        var client = _factory.CreateClient();

        // Submit
        var prodLogin = await client.PostAsJsonAsync("/api/auth/login", new { email = "producer@company.com", password = "password" });
        var prodToken = (await prodLogin.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", prodToken);

        var submitResp = await client.PostAsJsonAsync("/api/artifacts/approve-art/changes", new
        {
            content = @"{""name"":""approve-art"",""files"":[{""path"":""f.md"",""content"":""approved content""}]}"
        });
        var reviewId = (await submitResp.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("reviewId").GetString()!;

        // Approve as Reviewer with feedback
        var revLogin = await client.PostAsJsonAsync("/api/auth/login", new { email = "reviewer@company.com", password = "password" });
        var revToken = (await revLogin.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", revToken);

        var approveResp = await client.PostAsJsonAsync($"/api/reviews/{reviewId}/approve", new
        {
            feedback = "Looks great, approved for marketplace."
        });
        approveResp.EnsureSuccessStatusCode();

        var reviewResp = await client.GetAsync($"/api/reviews/{reviewId}");
        var reviewObj = await reviewResp.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var statusProp = reviewObj.GetProperty("status");
        if (statusProp.ValueKind == System.Text.Json.JsonValueKind.Number)
        {
            var statusVal = statusProp.GetInt32();
            Assert.True(statusVal == (int)ReviewStatus.Approved || statusVal == (int)ReviewStatus.Published);
        }
        else
        {
            var statusStr = statusProp.GetString();
            Assert.True(statusStr == "Approved" || statusStr == "Published");
        }
        Assert.Equal("Looks great, approved for marketplace.", reviewObj.GetProperty("feedback").GetString());
    }

    [Fact]
    public async Task Test11_GitHubPAT_NeverAppearsInDiffOrReviewResponses()
    {
        var client = _factory.CreateClient();

        var revLogin = await client.PostAsJsonAsync("/api/auth/login", new { email = "reviewer@company.com", password = "password" });
        var revToken = (await revLogin.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", revToken);

        var pendingResp = await client.GetAsync("/api/reviews/pending");
        var body = await pendingResp.Content.ReadAsStringAsync();

        Assert.DoesNotContain("github_pat", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("ghp_", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Token", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Test12_NewArtifact_CorrectlyClassifiedAs_NewArtifact()
    {
        var marketplace = new FakeMarketplaceService();
        var service = new ArtifactDiffService(marketplace);

        var submittedContent = @"{
            ""name"": ""brand-new-artifact"",
            ""version"": ""1.0.0"",
            ""files"": [
                { ""path"": ""agents/new-agent.md"", ""content"": ""# New Agent"" },
                { ""path"": ""skills/new-skill/SKILL.md"", ""content"": ""# New Skill"" },
                { ""path"": ""README.md"", ""content"": ""# Readme"" }
            ]
        }";

        var diff = await service.GenerateDiffAsync("brand-new-artifact", submittedContent);

        Assert.Equal(ArtifactChangeType.NewArtifact, diff.ArtifactChangeType);
        Assert.True(diff.IsNewArtifact);
        Assert.Equal(3, diff.AddedFilesCount);
        Assert.Equal(0, diff.ModifiedFilesCount);
        Assert.Equal(0, diff.DeletedFilesCount);
        Assert.All(diff.Files, f => Assert.Equal(ChangeType.Added, f.ChangeType));
    }

    [Fact]
    public async Task Test13_ExistingArtifact_Modified_CorrectlyClassifiedAs_Modified()
    {
        var marketplace = new FakeMarketplaceService();
        marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Version = "1.0.0",
            Content = @"{""files"":[{""path"":""agents/design-reviewer.md"",""content"":""old content""}]}"
        });

        var service = new ArtifactDiffService(marketplace);
        var diff = await service.GenerateDiffAsync("design-reviewer", @"{""files"":[{""path"":""agents/design-reviewer.md"",""content"":""new content""}]}");

        Assert.Equal(ArtifactChangeType.Modified, diff.ArtifactChangeType);
        Assert.False(diff.IsNewArtifact);
        Assert.Equal(1, diff.ModifiedFilesCount);
    }

    [Fact]
    public async Task Test14_ExistingArtifact_NoChanges_CorrectlyClassifiedAs_NoChanges()
    {
        var marketplace = new FakeMarketplaceService();
        marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Version = "1.0.0",
            Content = @"{""files"":[{""path"":""agents/design-reviewer.md"",""content"":""identical content""}]}"
        });

        var service = new ArtifactDiffService(marketplace);
        var diff = await service.GenerateDiffAsync("design-reviewer", @"{""files"":[{""path"":""agents/design-reviewer.md"",""content"":""identical content""}]}");

        Assert.Equal(ArtifactChangeType.NoChanges, diff.ArtifactChangeType);
        Assert.False(diff.IsNewArtifact);
        Assert.Equal(0, diff.FilesChangedCount);
        Assert.Equal(1, diff.UnchangedFilesCount);
    }

    [Fact]
    public async Task Test15_NewFileInsideExistingArtifact_NotClassifiedAsNewArtifact()
    {
        var marketplace = new FakeMarketplaceService();
        marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Version = "1.0.0",
            Content = @"{""files"":[{""path"":""agents/design-reviewer.md"",""content"":""content""}]}"
        });

        var service = new ArtifactDiffService(marketplace);
        var submittedContent = @"{
            ""name"": ""design-reviewer"",
            ""version"": ""1.1.0"",
            ""files"": [
                { ""path"": ""agents/design-reviewer.md"", ""content"": ""modified content"" },
                { ""path"": ""skills/accessibility/SKILL.md"", ""content"": ""# Accessibility Skill"" }
            ]
        }";

        var diff = await service.GenerateDiffAsync("design-reviewer", submittedContent);

        // Artifact itself is MODIFIED, NOT NewArtifact!
        Assert.Equal(ArtifactChangeType.Modified, diff.ArtifactChangeType);
        Assert.False(diff.IsNewArtifact);
        Assert.Equal(2, diff.FilesChangedCount);
        Assert.Equal(1, diff.ModifiedFilesCount);
        Assert.Equal(1, diff.AddedFilesCount);

        var addedFile = diff.Files.First(f => f.Path == "skills/accessibility/SKILL.md");
        Assert.Equal(ChangeType.Added, addedFile.ChangeType);
    }

    [Fact]
    public async Task Test16_MultiFileArtifact_PreservesAllFilesAndDiffs()
    {
        var marketplace = new FakeMarketplaceService();
        marketplace.SetArtifact(new ArtifactDto
        {
            Id = "multi-agent",
            Name = "multi-agent",
            Version = "1.0.0",
            Content = @"{""files"":[
                {""path"":""cip.yml"",""content"":""version: 1.0.0""},
                {""path"":""agents/reviewer.md"",""content"":""Line 1\nLine 2""},
                {""path"":""skills/acc/SKILL.md"",""content"":""# Acc Skill""},
                {""path"":""prompts/old-prompt.md"",""content"":""deprecated""}
            ]}"
        });

        var service = new ArtifactDiffService(marketplace);
        var submittedContent = @"{
            ""name"": ""multi-agent"",
            ""version"": ""1.1.0"",
            ""files"": [
                {""path"":""cip.yml"",""content"":""version: 1.1.0""},
                {""path"":""agents/reviewer.md"",""content"":""Line 1\nLine 2 Modified\nLine 3 Added""},
                {""path"":""skills/acc/SKILL.md"",""content"":""# Acc Skill""},
                {""path"":""skills/acc/examples.md"",""content"":""# Examples""}
            ]
        }";

        var diff = await service.GenerateDiffAsync("multi-agent", submittedContent);

        Assert.Equal(ArtifactChangeType.Modified, diff.ArtifactChangeType);
        Assert.Equal(5, diff.Files.Count); // cip.yml (mod), agents/reviewer.md (mod), skills/acc/SKILL.md (unchanged), skills/acc/examples.md (added), prompts/old-prompt.md (deleted) -> total 5 paths
        Assert.Equal(1, diff.AddedFilesCount); // examples.md
        Assert.Equal(2, diff.ModifiedFilesCount); // cip.yml, reviewer.md
        Assert.Equal(1, diff.DeletedFilesCount); // old-prompt.md
        Assert.Equal(1, diff.UnchangedFilesCount); // SKILL.md
    }

    [Fact]
    public async Task Test17_ApmYml_ModifiedMetadata_CalculatesLineDiffs_NotClassifiedAsAgent()
    {
        var marketplace = new FakeMarketplaceService();
        marketplace.SetArtifact(new ArtifactDto
        {
            Id = "my-pkg",
            Name = "my-pkg",
            Version = "1.0.0",
            Content = @"{""files"":[{""path"":""cip.yml"",""content"":""name: my-pkg\nversion: 1.0.0\ndescription: old desc""}]}"
        });

        var service = new ArtifactDiffService(marketplace);
        var submitted = @"{""files"":[{""path"":""cip.yml"",""content"":""name: my-pkg\nversion: 1.1.0\ndescription: new desc""}]}";

        var diff = await service.GenerateDiffAsync("my-pkg", submitted);

        Assert.Equal(ArtifactChangeType.Modified, diff.ArtifactChangeType);
        var fileDiff = diff.Files.First(f => f.Path == "cip.yml");
        Assert.Equal(ChangeType.Modified, fileDiff.ChangeType);
        Assert.Contains(fileDiff.LineChanges, l => l.Type == LineChangeType.Deleted && l.Content.Contains("1.0.0"));
        Assert.Contains(fileDiff.LineChanges, l => l.Type == LineChangeType.Added && l.Content.Contains("1.1.0"));
    }
}
