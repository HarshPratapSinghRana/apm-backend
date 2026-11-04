using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CipBackend.Models;
using CipBackend.Services.Implementations;
using CipBackend.Services.Interfaces;
using Xunit;
using Xunit.Abstractions;

namespace CipBackend.Tests;

public class ManualVerificationTests
{
    private readonly ITestOutputHelper _output;

    public ManualVerificationTests(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public async Task Scenario1_NewSingleFileArtifact()
    {
        var marketplace = new FakeMarketplaceService();
        var diffService = new ArtifactDiffService(marketplace);

        var submittedContent = @"{
            ""name"": ""single-agent"",
            ""version"": ""1.0.0"",
            ""files"": [
                { ""path"": "".github/agents/single-agent.md"", ""content"": ""# Single Agent\nLine 2"" }
            ]
        }";

        var backendDiff = await diffService.GenerateDiffAsync("single-agent", submittedContent);
        Assert.Equal(ArtifactChangeType.NewArtifact, backendDiff.ArtifactChangeType);
        Assert.True(backendDiff.IsNewArtifact);
        Assert.Equal(1, backendDiff.AddedFilesCount);
        Assert.Equal(0, backendDiff.ModifiedFilesCount);
        Assert.Equal(0, backendDiff.DeletedFilesCount);
        Assert.Equal(ChangeType.Added, backendDiff.Files[0].ChangeType);
    }

    [Fact]
    public async Task Scenario2_NewMultiFileArtifact()
    {
        var marketplace = new FakeMarketplaceService();
        var diffService = new ArtifactDiffService(marketplace);

        var submittedContent = @"{
            ""name"": ""accessibility-reviewer"",
            ""version"": ""1.0.0"",
            ""files"": [
                { ""path"": ""agents/accessibility-reviewer.md"", ""content"": ""# Agent"" },
                { ""path"": ""skills/accessibility/SKILL.md"", ""content"": ""# Skill"" },
                { ""path"": ""README.md"", ""content"": ""# Accessibility Reviewer"" }
            ]
        }";

        var backendDiff = await diffService.GenerateDiffAsync("accessibility-reviewer", submittedContent);
        Assert.Equal(ArtifactChangeType.NewArtifact, backendDiff.ArtifactChangeType);
        Assert.True(backendDiff.IsNewArtifact);
        Assert.Equal(3, backendDiff.AddedFilesCount);
        Assert.All(backendDiff.Files, f => Assert.Equal(ChangeType.Added, f.ChangeType));
    }

    [Fact]
    public async Task Scenario3_ExistingArtifactWithOneModifiedFile()
    {
        var marketplace = new FakeMarketplaceService();
        marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Version = "1.0.0",
            Content = @"{""files"":[{""path"":""agents/design-reviewer.md"",""content"":""You are a design reviewer.\nReview the provided code carefully.\nCheck only the basic accessibility issues.\nGenerate a detailed report.""}]}"
        });

        var diffService = new ArtifactDiffService(marketplace);

        var submittedContent = @"{
            ""name"": ""design-reviewer"",
            ""version"": ""1.1.0"",
            ""files"": [
                { ""path"":""agents/design-reviewer.md"",""content"":""You are a design reviewer.\nReview the provided code carefully.\nCheck all WCAG accessibility issues.\nVerify keyboard navigation.\nGenerate a detailed report.""}
            ]
        }";

        var backendDiff = await diffService.GenerateDiffAsync("design-reviewer", submittedContent);
        Assert.Equal(ArtifactChangeType.Modified, backendDiff.ArtifactChangeType);
        Assert.False(backendDiff.IsNewArtifact);
        Assert.Equal(1, backendDiff.ModifiedFilesCount);

        var file = backendDiff.Files[0];
        Assert.Equal(ChangeType.Modified, file.ChangeType);
        Assert.Contains(file.LineChanges, l => l.Type == LineChangeType.Deleted && l.Content.Contains("basic accessibility"));
        Assert.Contains(file.LineChanges, l => l.Type == LineChangeType.Added && l.Content.Contains("WCAG accessibility"));
        Assert.Contains(file.LineChanges, l => l.Type == LineChangeType.Added && l.Content.Contains("keyboard navigation"));
    }

    [Fact]
    public async Task Scenario4_ExistingArtifactWithAddedModifiedDeletedFiles()
    {
        var marketplace = new FakeMarketplaceService();
        marketplace.SetArtifact(new ArtifactDto
        {
            Id = "design-reviewer",
            Name = "design-reviewer",
            Version = "1.0.0",
            Content = @"{""files"":[
                {""path"":""agents/design-reviewer.md"",""content"":""Line 1\nLine 2""},
                {""path"":""prompts/old-prompt.md"",""content"":""deprecated prompt""}
            ]}"
        });

        var diffService = new ArtifactDiffService(marketplace);

        var submittedContent = @"{
            ""name"": ""design-reviewer"",
            ""version"": ""1.1.0"",
            ""files"": [
                {""path"":""agents/design-reviewer.md"",""content"":""Line 1\nLine 2 modified""},
                {""path"":""skills/new-skill/SKILL.md"",""content"":""# New Skill""}
            ]
        }";

        var backendDiff = await diffService.GenerateDiffAsync("design-reviewer", submittedContent);
        Assert.Equal(ArtifactChangeType.Modified, backendDiff.ArtifactChangeType);
        Assert.Equal(3, backendDiff.FilesChangedCount);
        Assert.Equal(1, backendDiff.AddedFilesCount);
        Assert.Equal(1, backendDiff.ModifiedFilesCount);
        Assert.Equal(1, backendDiff.DeletedFilesCount);

        Assert.Equal(ChangeType.Added, backendDiff.Files.First(f => f.Path == "skills/new-skill/SKILL.md").ChangeType);
        Assert.Equal(ChangeType.Modified, backendDiff.Files.First(f => f.Path == "agents/design-reviewer.md").ChangeType);
        Assert.Equal(ChangeType.Deleted, backendDiff.Files.First(f => f.Path == "prompts/old-prompt.md").ChangeType);
    }

    [Fact]
    public async Task Scenario5_ExistingArtifactWhereOnlyCipYmlChanges()
    {
        var marketplace = new FakeMarketplaceService();
        marketplace.SetArtifact(new ArtifactDto
        {
            Id = "sample-agent",
            Name = "sample-agent",
            Version = "1.0.0",
            Content = @"{""files"":[
                {""path"":""cip.yml"",""content"":""name: sample-agent\nversion: 1.0.0\ndescription: initial""},
                {""path"":""agents/agent.md"",""content"":""same content""}
            ]}"
        });

        var diffService = new ArtifactDiffService(marketplace);

        var submittedContent = @"{
            ""name"": ""sample-agent"",
            ""version"": ""1.0.1"",
            ""files"": [
                {""path"":""cip.yml"",""content"":""name: sample-agent\nversion: 1.0.1\ndescription: initial""},
                {""path"":""agents/agent.md"",""content"":""same content""}
            ]
        }";

        var backendDiff = await diffService.GenerateDiffAsync("sample-agent", submittedContent);
        Assert.Equal(ArtifactChangeType.Modified, backendDiff.ArtifactChangeType);
        Assert.Equal(1, backendDiff.ModifiedFilesCount);
        Assert.Equal(1, backendDiff.UnchangedFilesCount);

        var cipFile = backendDiff.Files.First(f => f.Path == "cip.yml");
        Assert.Equal(ChangeType.Modified, cipFile.ChangeType);
        Assert.Contains(cipFile.LineChanges, l => l.Type == LineChangeType.Deleted && l.Content.Contains("1.0.0"));
        Assert.Contains(cipFile.LineChanges, l => l.Type == LineChangeType.Added && l.Content.Contains("1.0.1"));
    }

    [Fact]
    public async Task Scenario6_ExistingArtifactWithNoChanges()
    {
        var marketplace = new FakeMarketplaceService();
        marketplace.SetArtifact(new ArtifactDto
        {
            Id = "sample-agent",
            Name = "sample-agent",
            Version = "1.0.0",
            Content = @"{""files"":[
                {""path"":""agents/agent.md"",""content"":""same content""}
            ]}"
        });

        var diffService = new ArtifactDiffService(marketplace);

        var submittedContent = @"{
            ""name"": ""sample-agent"",
            ""version"": ""1.0.0"",
            ""files"": [
                {""path"":""agents/agent.md"",""content"":""same content""}
            ]
        }";

        var backendDiff = await diffService.GenerateDiffAsync("sample-agent", submittedContent);
        Assert.Equal(ArtifactChangeType.NoChanges, backendDiff.ArtifactChangeType);
        Assert.Equal(0, backendDiff.FilesChangedCount);
        Assert.Equal(1, backendDiff.UnchangedFilesCount);
        Assert.Equal(ChangeType.Unchanged, backendDiff.Files[0].ChangeType);
    }
}
