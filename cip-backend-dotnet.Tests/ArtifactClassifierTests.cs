using System;
using System.Collections.Generic;
using System.IO;
using CipBackend.Services.Implementations;
using CipBackend.Services.Interfaces;
using Xunit;

namespace CipBackend.Tests;

public class ArtifactClassifierTests
{
    private readonly IArtifactClassifier _classifier = new ArtifactClassifier();

    [Fact]
    public void Test1_AgentFile_ClassifiedAs_Agent()
    {
        var content = "---\nname: code-reviewer\ntype: agent\nversion: 1.0.0\n---\n# Code Reviewer Agent";
        var res = _classifier.Classify("code-reviewer.agent.md", content);
        Assert.Equal(ArtifactType.Agent, res.Type);
    }

    [Fact]
    public void Test2_SkillFile_ClassifiedAs_Skill()
    {
        var content = "---\nname: review-and-refactor\ntype: skill\nversion: 1.0.0\n---\n# Refactor Skill Instructions";
        var res = _classifier.Classify("SKILL.md", content);
        Assert.Equal(ArtifactType.Skill, res.Type);
    }

    [Fact]
    public void Test3_PluginManifest_ClassifiedAs_Plugin()
    {
        var content = "{\"name\": \"git-tools\", \"version\": \"1.0.0\", \"type\": \"plugin\"}";
        var res = _classifier.Classify("plugin.json", content);
        Assert.Equal(ArtifactType.Plugin, res.Type);
    }

    [Fact]
    public void Test4_McpServerManifest_ClassifiedAs_McpServer()
    {
        var content = "{\"mcpServers\": { \"database-tool\": { \"command\": \"npx\" } } }";
        var res = _classifier.Classify("mcp_config.json", content);
        Assert.Equal(ArtifactType.McpServer, res.Type);
    }

    [Fact]
    public void Test5_ApmPackageManifest_ClassifiedAs_ApmPackage()
    {
        var content = "name: enterprise-tools\nversion: 2.0.0\ntype: package\n";
        var res = _classifier.Classify("cip.yml", content);
        Assert.Equal(ArtifactType.CipPackage, res.Type);
    }

    [Fact]
    public void Test6_NormalFiles_ClassifiedAs_NormalFile()
    {
        var readmeRes = _classifier.Classify("README.md", "# Project Readme\nThis is normal documentation.");
        Assert.Equal(ArtifactType.NormalFile, readmeRes.Type);

        var gitignoreRes = _classifier.Classify(".gitignore", "bin/\nobj/\nnode_modules/");
        Assert.Equal(ArtifactType.NormalFile, gitignoreRes.Type);

        var csRes = _classifier.Classify("Program.cs", "Console.WriteLine(\"Hello World\");");
        Assert.Equal(ArtifactType.NormalFile, csRes.Type);
    }

    [Fact]
    public void Test7_UnknownFile_ClassifiedAs_Unknown_NotAgent()
    {
        var unknownRes = _classifier.Classify("random-data.bin", null);
        Assert.Equal(ArtifactType.Unknown, unknownRes.Type);
        Assert.NotEqual(ArtifactType.Agent, unknownRes.Type);
    }

    [Fact]
    public void Test8_MultiFile_AgentFixture_ClassifiedAs_Agent()
    {
        var files = new List<(string Path, string? Content)>
        {
            ("agent/cip.yml", "name: code-auditor\nversion: 1.0.0\ntype: agent\n"),
            ("agent/agent.md", "---\nname: code-auditor\ntype: agent\n---\n# Agent Instructions"),
            ("agent/prompts/system.md", "You are an automated code auditor.")
        };

        var res = _classifier.ClassifyMultiFile("code-auditor", files);
        Assert.Equal(ArtifactType.Agent, res.Type);
    }

    [Fact]
    public void Test9_MultiFile_SkillFixture_ClassifiedAs_Skill()
    {
        var files = new List<(string Path, string? Content)>
        {
            ("skills/cip.yml", "name: demo-skill\nversion: 1.0.0\ntype: skill\n"),
            ("skills/SKILL.md", "---\nname: demo-skill\ndescription: 'Helpful skill'\n---\n# Skill definition"),
            ("skills/README.md", "# Demo Skill Documentation\nExplains usage."),
            ("skills/references/example.md", "# Example Usage\nStep by step guide.")
        };

        var res = _classifier.ClassifyMultiFile("demo-skill", files);
        Assert.Equal(ArtifactType.Skill, res.Type);
        Assert.NotEqual(ArtifactType.Agent, res.Type);
    }

    [Fact]
    public void Test10_Regression_SkillsArtifactWithSkillMd_ClassifiedAs_Skill()
    {
        var files = new List<(string Path, string? Content)>
        {
            (".github/skills/SKILL.md", "---\nname: review-and-refactor\ndescription: 'Review and refactor code in your project'\n---\n\n## Role\nYou're a senior expert software engineer..."),
            ("design-reviewer/.cip/skills/SKILL.md", "---\nname: caveman\ndescription: 'Ultra-compressed communication mode.'\n---\n")
        };

        var res = _classifier.ClassifyMultiFile("skills", files);
        Assert.Equal(ArtifactType.Skill, res.Type);
        Assert.NotEqual(ArtifactType.Agent, res.Type);
    }

    [Fact]
    public void Test11_JsonPayload_WithSkillType_ClassifiedAs_Skill()
    {
        var jsonPayload = "{\n  \"name\": \"skills\",\n  \"type\": \"skill\",\n  \"version\": \"1.0.0\",\n  \"files\": [\n    { \"path\": \".github/skills/SKILL.md\", \"content\": \"# Skill\" }\n  ]\n}";
        var res = _classifier.Classify("skills", jsonPayload);
        Assert.Equal(ArtifactType.Skill, res.Type);
        Assert.NotEqual(ArtifactType.Agent, res.Type);
    }
}
