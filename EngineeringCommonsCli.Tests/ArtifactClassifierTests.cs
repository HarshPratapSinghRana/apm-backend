using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Implementations;
using Xunit;

namespace EngineeringCommonsCli.Tests;

public class ArtifactClassifierTests
{
    private readonly ArtifactClassifier _classifier = new();
    private readonly ArtifactMetadataService _metadata = new();

    [Fact]
    public void Test1_Agent_ClassifiedCorrectly()
    {
        // 1a. Via path agents/design-reviewer.md
        var res1 = _classifier.Classify("C:/repo/agents/design-reviewer.md", "# Agent instructions", false, "agents/design-reviewer.md");
        Assert.Equal(ArtifactType.Agent, res1.Type);
        Assert.Equal(DetectionConfidence.High, res1.Confidence);

        // 1b. Via *.agent.md convention
        var res2 = _classifier.Classify("C:/repo/custom.agent.md", "# Custom", false, "custom.agent.md");
        Assert.Equal(ArtifactType.Agent, res2.Type);

        // 1c. Via YAML frontmatter
        var content = "---\ntype: agent\nname: my-agent\nversion: 2.0.0\n---\n# Agent";
        var res3 = _classifier.Classify("C:/repo/some-file.md", content, false, "some-file.md");
        Assert.Equal(ArtifactType.Agent, res3.Type);
        Assert.Equal("my-agent", res3.ExtractedName);
    }

    [Fact]
    public void Test2_Skill_ClassifiedCorrectly()
    {
        // 2a. Via SKILL.md
        var res1 = _classifier.Classify("C:/repo/skills/accessibility/SKILL.md", "# Skill", false, "skills/accessibility/SKILL.md");
        Assert.Equal(ArtifactType.Skill, res1.Type);
        Assert.Equal(DetectionConfidence.High, res1.Confidence);

        // 2b. Via skills directory structure
        var res2 = _classifier.Classify("C:/repo/.agents/skills/review/checker.md", "# Check", false, ".agents/skills/review/checker.md");
        Assert.Equal(ArtifactType.Skill, res2.Type);
    }

    [Fact]
    public void Test3_Command_ClassifiedCorrectly()
    {
        var res = _classifier.Classify("C:/repo/.github/commands/deploy.md", "echo deploy", false, ".github/commands/deploy.md");
        Assert.Equal(ArtifactType.Command, res.Type);
        Assert.Equal(DetectionConfidence.High, res.Confidence);
    }

    [Fact]
    public void Test4_Prompt_ClassifiedCorrectly()
    {
        // 4a. Via prompts/ directory
        var res1 = _classifier.Classify("C:/repo/prompts/summarize.md", "Summarize the text", false, "prompts/summarize.md");
        Assert.Equal(ArtifactType.Prompt, res1.Type);

        // 4b. Via *.prompt.md convention
        var res2 = _classifier.Classify("C:/repo/review.prompt.md", "Prompt text", false, "review.prompt.md");
        Assert.Equal(ArtifactType.Prompt, res2.Type);
    }

    [Fact]
    public void Test5_Plugin_ClassifiedCorrectly()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "cip_test_plugin_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);
        File.WriteAllText(Path.Combine(tempDir, "plugin.json"), "{\"name\":\"sample-plugin\",\"version\":\"1.0.0\"}");

        try
        {
            var res = _classifier.Classify(tempDir, null, true, "sample-plugin");
            Assert.Equal(ArtifactType.Plugin, res.Type);
            Assert.Equal(DetectionConfidence.High, res.Confidence);
        }
        finally
        {
            Directory.Delete(tempDir, true);
        }
    }

    [Fact]
    public void Test6_McpServer_ClassifiedCorrectly()
    {
        // 6a. mcp_config.json
        var res1 = _classifier.Classify("C:/repo/mcp_config.json", "{}", false, "mcp_config.json");
        Assert.Equal(ArtifactType.McpServer, res1.Type);

        // 6b. JSON containing mcpServers declaration
        var mcpJson = "{\"mcpServers\": {\"git\": {\"command\": \"mcp-server-git\"}}}";
        var res2 = _classifier.Classify("C:/repo/config/servers.json", mcpJson, false, "config/servers.json");
        Assert.Equal(ArtifactType.McpServer, res2.Type);
    }

    [Fact]
    public void Test7_ApmPackageDirectory_ClassifiedCorrectly()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "cip_test_pkg_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);
        File.WriteAllText(Path.Combine(tempDir, "cip.yml"), "name: full-package\nversion: 1.2.0\n");

        try
        {
            var res = _classifier.Classify(tempDir, null, true, "full-package");
            Assert.Equal(ArtifactType.CipPackage, res.Type);
            Assert.Equal(DetectionConfidence.High, res.Confidence);
        }
        finally
        {
            Directory.Delete(tempDir, true);
        }
    }

    [Fact]
    public void Test8_ApmYmlFile_ClassifiedAsCipConfiguration_NotAgent()
    {
        var res = _classifier.Classify("C:/repo/cip.yml", "name: test\n", false, "cip.yml");
        Assert.Equal(ArtifactType.CipConfiguration, res.Type);
        Assert.NotEqual(ArtifactType.Agent, res.Type);
    }

    [Fact]
    public void Test9_PluginJsonFile_ClassifiedAsNormalFile_NotAgent()
    {
        var res = _classifier.Classify("C:/repo/plugin.json", "{\"name\":\"test\"}", false, "plugin.json");
        Assert.Equal(ArtifactType.NormalFile, res.Type);
        Assert.NotEqual(ArtifactType.Agent, res.Type);
    }

    [Fact]
    public void Test10_ReadmeMd_ClassifiedAsNormalFile_NotAgent()
    {
        var res = _classifier.Classify("C:/repo/README.md", "# My Project\nThis is docs.", false, "README.md");
        Assert.Equal(ArtifactType.NormalFile, res.Type);
        Assert.NotEqual(ArtifactType.Agent, res.Type);
    }

    [Fact]
    public void Test11_PackageJson_ClassifiedAsNormalFile_NotAgent()
    {
        var res = _classifier.Classify("C:/repo/package.json", "{\"name\":\"app\"}", false, "package.json");
        Assert.Equal(ArtifactType.NormalFile, res.Type);
        Assert.NotEqual(ArtifactType.Agent, res.Type);
    }

    [Fact]
    public void Test12_RandomMarkdown_ClassifiedAsNormalFile_NotAgent()
    {
        var res = _classifier.Classify("C:/repo/docs/meeting-notes.md", "# Notes\nDiscussion on roadmap", false, "docs/meeting-notes.md");
        Assert.Equal(ArtifactType.NormalFile, res.Type);
        Assert.NotEqual(ArtifactType.Agent, res.Type);
    }

    [Fact]
    public void Test13_UnknownArtifact_ClassifiedAsUnknownWithLowConfidence()
    {
        var res = _classifier.Classify("C:/repo/artifacts/custom-binary.bin", null, false, "artifacts/custom-binary.bin");
        Assert.Equal(ArtifactType.Unknown, res.Type);
        Assert.Equal(DetectionConfidence.Low, res.Confidence);
        Assert.Contains("does not match a supported artifact type", res.Reason);
    }

    [Fact]
    public async Task Test14_HierarchicalPackage_DiscoversPackageAndChildArtifacts()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_hierarchical_test_" + Guid.NewGuid().ToString("N"));
        var packageDir = Path.Combine(tempWorkspace, "design-reviewer");
        var agentsDir = Path.Combine(packageDir, "agents");
        var skillsDir = Path.Combine(packageDir, "skills", "accessibility");

        Directory.CreateDirectory(agentsDir);
        Directory.CreateDirectory(skillsDir);

        File.WriteAllText(Path.Combine(packageDir, "cip.yml"), "name: design-reviewer\nversion: 1.1.0\n");
        File.WriteAllText(Path.Combine(packageDir, "plugin.json"), "{\"name\":\"design-reviewer\",\"version\":\"1.1.0\"}");
        File.WriteAllText(Path.Combine(packageDir, "README.md"), "# Design Reviewer Package");
        File.WriteAllText(Path.Combine(agentsDir, "reviewer.md"), "# Reviewer Agent");
        File.WriteAllText(Path.Combine(skillsDir, "SKILL.md"), "# Accessibility Skill");

        try
        {
            var discovery = new ArtifactDiscoveryService(_classifier, _metadata);
            var discovered = (await discovery.DiscoverAsync(tempWorkspace)).ToList();

            // 1. Root package discovered
            var pkg = discovered.FirstOrDefault(d => d.Type == ArtifactType.CipPackage);
            Assert.NotNull(pkg);
            Assert.Equal("design-reviewer", pkg.Name);
            Assert.Equal("1.1.0", pkg.Version);
            Assert.Null(pkg.ParentPackage);
            Assert.True(pkg.IsContributableArtifact);

            // 2. Child Agent discovered
            var agent = discovered.FirstOrDefault(d => d.Type == ArtifactType.Agent);
            Assert.NotNull(agent);
            Assert.Equal("reviewer", agent.Name);
            Assert.Equal("design-reviewer", agent.ParentPackage);
            Assert.True(agent.IsContributableArtifact);

            // 3. Child Skill discovered
            var skill = discovered.FirstOrDefault(d => d.Type == ArtifactType.Skill);
            Assert.NotNull(skill);
            Assert.Equal("accessibility", skill.Name);
            Assert.Equal("design-reviewer", skill.ParentPackage);
            Assert.True(skill.IsContributableArtifact);

            // 4. cip.yml is CipConfiguration (filtered/non-contributable standalone artifact)
            var cipYml = discovered.FirstOrDefault(d => d.Type == ArtifactType.CipConfiguration);
            Assert.NotNull(cipYml);
            Assert.False(cipYml.IsContributableArtifact);

            // 5. README.md is NormalFile (non-contributable)
            var readme = discovered.FirstOrDefault(d => d.Name.Equals("README.md", StringComparison.OrdinalIgnoreCase));
            Assert.NotNull(readme);
            Assert.Equal(ArtifactType.NormalFile, readme.Type);
            Assert.False(readme.IsContributableArtifact);
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Test15_MultiFile_Skill_ClassifiedAs_Skill()
    {
        var files = new List<(string Path, string? Content)>
        {
            ("skills/cip.yml", "name: demo-skill\nversion: 1.0.0\ntype: skill\n"),
            ("skills/SKILL.md", "---\nname: demo-skill\ndescription: 'Helpful skill'\n---\n# Skill"),
            ("skills/README.md", "# Documentation"),
            ("skills/references/example.md", "# Example")
        };

        var res = _classifier.ClassifyMultiFile("demo-skill", files);
        Assert.Equal(ArtifactType.Skill, res.Type);
        Assert.NotEqual(ArtifactType.Agent, res.Type);
    }

    [Fact]
    public void Test16_Regression_Skills_ClassifiedAs_Skill()
    {
        var files = new List<(string Path, string? Content)>
        {
            (".github/skills/SKILL.md", "---\nname: review-and-refactor\ndescription: 'Review code'\n---\n")
        };

        var res = _classifier.ClassifyMultiFile("skills", files);
        Assert.Equal(ArtifactType.Skill, res.Type);
        Assert.NotEqual(ArtifactType.Agent, res.Type);
    }

    [Theory]
    [InlineData("C:/repo/src/code-reviewer.ts")]
    [InlineData("C:/repo/src/prompt-service.cs")]
    [InlineData("C:/repo/scripts/refactor-tool.py")]
    [InlineData("C:/repo/bin/agent-runner.dll")]
    public void Test17_SourceCodeFiles_WithHeuristicNames_ClassifiedAsNormalFile(string filePath)
    {
        var res = _classifier.Classify(filePath, null, false, Path.GetFileName(filePath));
        Assert.Equal(ArtifactType.NormalFile, res.Type);
        Assert.NotEqual(ArtifactType.Agent, res.Type);
        Assert.NotEqual(ArtifactType.Prompt, res.Type);
        Assert.NotEqual(ArtifactType.Skill, res.Type);
    }
}
