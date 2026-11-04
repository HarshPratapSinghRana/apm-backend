using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using EngineeringCommonsCli.Commands;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Implementations;
using EngineeringCommonsCli.Services.Interfaces;
using Moq;
using Xunit;

namespace EngineeringCommonsCli.Tests;

[Collection("ConsoleOutputCollection")]
public class UnifiedDiffRendererTests
{
    private readonly UnifiedDiffRenderer _renderer = new();

    [Fact]
    public void Test1_NewArtifact_Renders_DistinctBox_And_AllFilesAdded()
    {
        var diff = new ArtifactDiffDto(
            ReviewId: "rev-new",
            ArtifactName: "accessibility-reviewer",
            CurrentVersion: null,
            SubmittedVersion: "1.0.0",
            ProducerEmail: "producer@test.com",
            SubmittedAt: DateTime.UtcNow,
            ArtifactChangeType: ArtifactChangeType.NewArtifact,
            FilesChangedCount: 3,
            AddedFilesCount: 3,
            ModifiedFilesCount: 0,
            DeletedFilesCount: 0,
            UnchangedFilesCount: 0,
            Files: new List<ArtifactFileDiffDto>
            {
                new("agents/accessibility-reviewer.md", ChangeType.Added, null, "# Agent", new List<LineChangeDto>
                {
                    new(null, 1, LineChangeType.Added, "# Agent")
                }, 1, 0),
                new("skills/accessibility/SKILL.md", ChangeType.Added, null, "# Skill", new List<LineChangeDto>
                {
                    new(null, 1, LineChangeType.Added, "# Skill")
                }, 1, 0),
                new("README.md", ChangeType.Added, null, "# Readme", new List<LineChangeDto>
                {
                    new(null, 1, LineChangeType.Added, "# Readme")
                }, 1, 0)
            }
        );

        using var sw = new StringWriter();
        _renderer.RenderDiff(diff, sw, useColor: false);
        var output = sw.ToString();

        Assert.Contains("NEW ARTIFACT", output);
        Assert.Contains("accessibility-reviewer", output);
        Assert.Contains("This is a completely new artifact.", output);
        Assert.Contains("All files are new.", output);
        Assert.Contains("+ agents/accessibility-reviewer.md", output);
        Assert.Contains("+ skills/accessibility/SKILL.md", output);
        Assert.Contains("+ README.md", output);
        Assert.Contains("ADDED", output);
    }

    [Fact]
    public void Test2_ModifiedArtifact_Renders_Summary_FilesChanged_And_UnifiedDiff()
    {
        var diff = new ArtifactDiffDto(
            ReviewId: "rev-mod",
            ArtifactName: "design-reviewer",
            CurrentVersion: "1.0.0",
            SubmittedVersion: "1.1.0",
            ProducerEmail: "producer@test.com",
            SubmittedAt: DateTime.UtcNow,
            ArtifactChangeType: ArtifactChangeType.Modified,
            FilesChangedCount: 3,
            AddedFilesCount: 1,
            ModifiedFilesCount: 1,
            DeletedFilesCount: 1,
            UnchangedFilesCount: 0,
            Files: new List<ArtifactFileDiffDto>
            {
                new("agents/design-reviewer.md", ChangeType.Modified, "Line 1\nLine 2", "Line 1\nLine 2 mod\nLine 3", new List<LineChangeDto>
                {
                    new(1, 1, LineChangeType.Unchanged, "You are a design reviewer."),
                    new(2, 2, LineChangeType.Unchanged, "Review the provided code carefully."),
                    new(3, null, LineChangeType.Deleted, "Check only the basic accessibility issues."),
                    new(null, 3, LineChangeType.Added, "Check all WCAG accessibility issues."),
                    new(null, 4, LineChangeType.Added, "Verify keyboard navigation."),
                    new(4, 5, LineChangeType.Unchanged, "Generate a detailed report.")
                }, 2, 1),
                new("skills/new-skill/SKILL.md", ChangeType.Added, null, "# New", new List<LineChangeDto>
                {
                    new(null, 1, LineChangeType.Added, "# New")
                }, 1, 0),
                new("prompts/old-prompt.md", ChangeType.Deleted, "deprecated", null, new List<LineChangeDto>
                {
                    new(1, null, LineChangeType.Deleted, "deprecated")
                }, 0, 1)
            }
        );

        using var sw = new StringWriter();
        _renderer.RenderDiff(diff, sw, useColor: false);
        var output = sw.ToString();

        Assert.Contains("Artifact:", output);
        Assert.Contains("design-reviewer", output);
        Assert.Contains("1.0.0", output);
        Assert.Contains("1.1.0", output);
        Assert.Contains("MODIFIED", output);
        Assert.Contains("3 changed", output);
        Assert.Contains("1 added", output);
        Assert.Contains("1 modified", output);
        Assert.Contains("1 deleted", output);
        Assert.Contains("~ agents/design-reviewer.md", output);
        Assert.Contains("+ skills/new-skill/SKILL.md", output);
        Assert.Contains("- prompts/old-prompt.md", output);
        Assert.Contains("-   3  Check only the basic accessibility issues.", output);
        Assert.Contains("+   3  Check all WCAG accessibility issues.", output);
        Assert.Contains("+   4  Verify keyboard navigation.", output);
        Assert.Contains("   1  You are a design reviewer.", output);
    }

    [Fact]
    public void Test3_NoChanges_Renders_NoChanges_Header()
    {
        var diff = new ArtifactDiffDto(
            ReviewId: "rev-same",
            ArtifactName: "design-reviewer",
            CurrentVersion: "1.0.0",
            SubmittedVersion: "1.0.0",
            ProducerEmail: "producer@test.com",
            SubmittedAt: DateTime.UtcNow,
            ArtifactChangeType: ArtifactChangeType.NoChanges,
            FilesChangedCount: 0,
            AddedFilesCount: 0,
            ModifiedFilesCount: 0,
            DeletedFilesCount: 0,
            UnchangedFilesCount: 1,
            Files: new List<ArtifactFileDiffDto>()
        );

        using var sw = new StringWriter();
        _renderer.RenderDiff(diff, sw, useColor: false);
        var output = sw.ToString();

        Assert.Contains("Artifact:", output);
        Assert.Contains("design-reviewer", output);
        Assert.Contains("Status:", output);
        Assert.Contains("NO CHANGES", output);
    }

    [Fact]
    public void Test4_ReviewCommand_Approves_WithFeedback()
    {
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        var session = new UserSession("token-rev", "reviewer@test.com");
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(session);

        var pendingList = new List<PendingReviewDto>
        {
            new("rev-101", "design-reviewer", "producer@test.com", DateTime.UtcNow)
        };
        backend.Setup(b => b.GetPendingReviewsAsync()).ReturnsAsync(pendingList);

        var detail = new ReviewDetailDto("rev-101", "design-reviewer", "producer@test.com", "content", 0, DateTime.UtcNow);
        backend.Setup(b => b.GetReviewDetailAsync("rev-101")).ReturnsAsync(detail);

        var diff = new ArtifactDiffDto("rev-101", "design-reviewer", "1.0.0", "1.1.0", "producer@test.com", DateTime.UtcNow, ArtifactChangeType.Modified, 1, 0, 1, 0, 0, new List<ArtifactFileDiffDto>());
        backend.Setup(b => b.GetReviewDiffAsync("rev-101")).ReturnsAsync(diff);
        backend.Setup(b => b.ApproveReviewAsync("rev-101", "LGTM")).ReturnsAsync(true);

        // Simulate Console input for Approve + Feedback
        var input = new StringReader("1\nA\nLGTM\n");
        Console.SetIn(input);

        var cmd = new ReviewCommand(backend.Object, auth.Object, _renderer);
        var code = cmd.Invoke(Array.Empty<string>());

        Assert.Equal(0, code);
        backend.Verify(b => b.ApproveReviewAsync("rev-101", "LGTM"), Times.Once);
    }

    [Fact]
    public void Test5_ReviewCommand_Rejects_WithFeedback()
    {
        var backend = new Mock<IBackendClient>();
        var auth = new Mock<IAuthenticationService>();
        var session = new UserSession("token-rev", "reviewer@test.com");
        auth.Setup(a => a.CurrentSessionAsync()).ReturnsAsync(session);

        var pendingList = new List<PendingReviewDto>
        {
            new("rev-202", "design-reviewer", "producer@test.com", DateTime.UtcNow)
        };
        backend.Setup(b => b.GetPendingReviewsAsync()).ReturnsAsync(pendingList);

        var detail = new ReviewDetailDto("rev-202", "design-reviewer", "producer@test.com", "content", 0, DateTime.UtcNow);
        backend.Setup(b => b.GetReviewDetailAsync("rev-202")).ReturnsAsync(detail);

        var diff = new ArtifactDiffDto("rev-202", "design-reviewer", "1.0.0", "1.1.0", "producer@test.com", DateTime.UtcNow, ArtifactChangeType.Modified, 1, 0, 1, 0, 0, new List<ArtifactFileDiffDto>());
        backend.Setup(b => b.GetReviewDiffAsync("rev-202")).ReturnsAsync(diff);
        backend.Setup(b => b.RejectReviewAsync("rev-202", "Please fix accessibility.")).ReturnsAsync(true);

        // Simulate Console input for Reject + Feedback
        var input = new StringReader("1\nR\nPlease fix accessibility.\n");
        Console.SetIn(input);

        var cmd = new ReviewCommand(backend.Object, auth.Object, _renderer);
        var code = cmd.Invoke(Array.Empty<string>());

        Assert.Equal(0, code);
        backend.Verify(b => b.RejectReviewAsync("rev-202", "Please fix accessibility."), Times.Once);
    }
}
