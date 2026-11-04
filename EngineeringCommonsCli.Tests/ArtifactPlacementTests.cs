using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Implementations;
using Xunit;

namespace EngineeringCommonsCli.Tests;

public class ArtifactPlacementTests
{
    private readonly ArtifactPlacementService _placement = new();

    [Fact]
    public void Scenario1_ExistingSingleFileAgent()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc1_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("design-reviewer.md", "# Single File Agent")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "agent", "design-reviewer", files, "1.0.0").ToList();

            Assert.Single(placed);
            var expectedPath = Path.Combine(tempWorkspace, ".github", "agents", "design-reviewer.md");
            Assert.True(File.Exists(expectedPath), $"Expected file at {expectedPath}");
            Assert.Equal("# Single File Agent", File.ReadAllText(expectedPath));
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario2_MultiFileAgent_PreservesDirectoryStructure()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc2_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("agent.md", "# Design Reviewer Agent"),
                new("instructions.md", "Review all guidelines"),
                new("references/rules.md", "- Rule 1: No secrets")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "agent", "design-reviewer", files, "1.1.0").ToList();

            Assert.Equal(3, placed.Count);
            var agentMd = Path.Combine(tempWorkspace, ".github", "agents", "design-reviewer", "agent.md");
            var instructionsMd = Path.Combine(tempWorkspace, ".github", "agents", "design-reviewer", "instructions.md");
            var rulesMd = Path.Combine(tempWorkspace, ".github", "agents", "design-reviewer", "references", "rules.md");

            Assert.True(File.Exists(agentMd), $"Missing {agentMd}");
            Assert.True(File.Exists(instructionsMd), $"Missing {instructionsMd}");
            Assert.True(File.Exists(rulesMd), $"Missing {rulesMd}");
            Assert.Equal("- Rule 1: No secrets", File.ReadAllText(rulesMd));
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario3_MultiFileAgent_ContainingCipYmlPackage()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc3_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("cip.yml", "name: design-reviewer\nversion: 1.1.0\n"),
                new("agents/design-reviewer/agent.md", "# Design Reviewer Agent"),
                new("agents/design-reviewer/instructions.md", "Check WCAG accessibility"),
                new("agents/design-reviewer/references/rules.md", "# Rules"),
                new("README.md", "# Design Reviewer Docs")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "package", "design-reviewer", files, "1.1.0").ToList();

            Assert.Equal(5, placed.Count);
            var cipYml = Path.Combine(tempWorkspace, ".github", "packages", "design-reviewer", "cip.yml");
            var agentMd = Path.Combine(tempWorkspace, ".github", "agents", "design-reviewer", "agent.md");
            var instructionsMd = Path.Combine(tempWorkspace, ".github", "agents", "design-reviewer", "instructions.md");
            var rulesMd = Path.Combine(tempWorkspace, ".github", "agents", "design-reviewer", "references", "rules.md");
            var readme = Path.Combine(tempWorkspace, ".github", "packages", "design-reviewer", "README.md");

            Assert.True(File.Exists(cipYml), $"Missing {cipYml}");
            Assert.True(File.Exists(agentMd), $"Missing {agentMd}");
            Assert.True(File.Exists(instructionsMd), $"Missing {instructionsMd}");
            Assert.True(File.Exists(rulesMd), $"Missing {rulesMd}");
            Assert.True(File.Exists(readme), $"Missing {readme}");
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario4_MultiFileAgent_NestedDirectories()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc4_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("agent.md", "# Agent"),
                new("nested/sub1/sub2/sub3/rules.md", "deep rules"),
                new("nested/sub1/examples.md", "examples")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "agent", "deep-agent", files).ToList();

            Assert.Equal(3, placed.Count);
            var deepFile = Path.Combine(tempWorkspace, ".github", "agents", "deep-agent", "nested", "sub1", "sub2", "sub3", "rules.md");
            Assert.True(File.Exists(deepFile), $"Missing {deepFile}");
            Assert.Equal("deep rules", File.ReadAllText(deepFile));
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario5_MultiFileSkill()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc5_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("SKILL.md", "---\nname: accessibility\n---\n# Skill"),
                new("instructions.md", "Audit DOM tree"),
                new("examples/sample.md", "Sample cases")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "skill", "accessibility", files).ToList();

            Assert.Equal(3, placed.Count);
            var skillMd = Path.Combine(tempWorkspace, "skills", "accessibility", "SKILL.md");
            var instructionsMd = Path.Combine(tempWorkspace, "skills", "accessibility", "instructions.md");
            var sampleMd = Path.Combine(tempWorkspace, "skills", "accessibility", "examples", "sample.md");

            Assert.True(File.Exists(skillMd), $"Missing {skillMd}");
            Assert.True(File.Exists(instructionsMd), $"Missing {instructionsMd}");
            Assert.True(File.Exists(sampleMd), $"Missing {sampleMd}");
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario6_Plugin_ContainingAgentAndSkill()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc6_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("plugin.json", "{\"name\":\"code-auditor\",\"version\":\"1.0.0\"}"),
                new("agents/reviewer.md", "# Reviewer"),
                new("skills/accessibility/SKILL.md", "# Accessibility"),
                new("README.md", "# Code Auditor Plugin")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "plugin", "code-auditor", files).ToList();

            Assert.Equal(4, placed.Count);
            var pluginJson = Path.Combine(tempWorkspace, "plugins", "code-auditor", "plugin.json");
            var reviewerMd = Path.Combine(tempWorkspace, "plugins", "code-auditor", "agents", "reviewer.md");
            var skillMd = Path.Combine(tempWorkspace, "plugins", "code-auditor", "skills", "accessibility", "SKILL.md");
            var readme = Path.Combine(tempWorkspace, "plugins", "code-auditor", "README.md");

            Assert.True(File.Exists(pluginJson), $"Missing {pluginJson}");
            Assert.True(File.Exists(reviewerMd), $"Missing {reviewerMd}");
            Assert.True(File.Exists(skillMd), $"Missing {skillMd}");
            Assert.True(File.Exists(readme), $"Missing {readme}");
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario7_McpServer_MultipleFiles()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc7_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("server.json", "{\"name\":\"git-mcp\"}"),
                new("server.js", "console.log('mcp');"),
                new("tools/tool.js", "module.exports = {};")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "mcp-server", "git-mcp", files).ToList();

            Assert.Equal(3, placed.Count);
            var serverJson = Path.Combine(tempWorkspace, ".mcp", "git-mcp", "server.json");
            var serverJs = Path.Combine(tempWorkspace, ".mcp", "git-mcp", "server.js");
            var toolJs = Path.Combine(tempWorkspace, ".mcp", "git-mcp", "tools", "tool.js");

            Assert.True(File.Exists(serverJson), $"Missing {serverJson}");
            Assert.True(File.Exists(serverJs), $"Missing {serverJs}");
            Assert.True(File.Exists(toolJs), $"Missing {toolJs}");
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario8_ApmPackage_MultipleArtifactTypes()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc8_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("cip.yml", "name: full-bundle\nversion: 1.0.0\n"),
                new("agents/helper.md", "# Helper"),
                new("skills/calc/SKILL.md", "# Calc"),
                new("plugins/ext/plugin.json", "{}")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "package", "full-bundle", files).ToList();

            Assert.Equal(4, placed.Count);
            var cipYml = Path.Combine(tempWorkspace, ".github", "packages", "full-bundle", "cip.yml");
            var helper = Path.Combine(tempWorkspace, ".github", "agents", "helper.md");
            var calc = Path.Combine(tempWorkspace, ".github", "skills", "calc", "SKILL.md");
            var plugin = Path.Combine(tempWorkspace, ".github", "plugins", "ext", "plugin.json");

            Assert.True(File.Exists(cipYml), $"Missing {cipYml}");
            Assert.True(File.Exists(helper), $"Missing {helper}");
            Assert.True(File.Exists(calc), $"Missing {calc}");
            Assert.True(File.Exists(plugin), $"Missing {plugin}");
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario9_ReadmeInsidePackage()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc9_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("README.md", "# Package Readme Documentation"),
                new("agent.md", "# Agent")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "package", "my-package", files).ToList();

            Assert.Equal(2, placed.Count);
            var readme = Path.Combine(tempWorkspace, ".github", "packages", "my-package", "README.md");
            var agent = Path.Combine(tempWorkspace, ".github", "agents", "agent.md");
            Assert.True(File.Exists(readme));
            Assert.Equal("# Package Readme Documentation", File.ReadAllText(readme));
            Assert.True(File.Exists(agent));
            Assert.Equal("# Agent", File.ReadAllText(agent));
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario11b_ApmPackage_PrefixedArtifacts_InstalledUnderGithub()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc11_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("my-pack/agents/reviewer.agent.md", "# Reviewer Agent"),
                new("my-pack/skills/git-helper/SKILL.md", "# Git Helper Skill"),
                new("my-pack/prompts/test.prompt.md", "# Test Prompt"),
                new("my-pack/commands/build.command.md", "# Build Command"),
                new("my-pack/copilot-instructions.md", "# Copilot Instructions"),
                new("my-pack/cip.yml", "name: my-pack\nversion: 1.0.0\n")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "package", "my-pack", files).ToList();

            Assert.Equal(6, placed.Count);
            var agent = Path.Combine(tempWorkspace, ".github", "agents", "reviewer.agent.md");
            var skill = Path.Combine(tempWorkspace, ".github", "skills", "git-helper", "SKILL.md");
            var prompt = Path.Combine(tempWorkspace, ".github", "prompts", "test.prompt.md");
            var command = Path.Combine(tempWorkspace, ".github", "commands", "build.command.md");
            var copilot = Path.Combine(tempWorkspace, ".github", "copilot-instructions.md");
            var cipYml = Path.Combine(tempWorkspace, ".github", "packages", "my-pack", "cip.yml");

            Assert.True(File.Exists(agent), $"Missing {agent}");
            Assert.True(File.Exists(skill), $"Missing {skill}");
            Assert.True(File.Exists(prompt), $"Missing {prompt}");
            Assert.True(File.Exists(command), $"Missing {command}");
            Assert.True(File.Exists(copilot), $"Missing {copilot}");
            Assert.True(File.Exists(cipYml), $"Missing {cipYml}");
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario10_PluginJson_MetadataHandled()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc10_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("plugin.json", "{\"name\":\"test-plugin\",\"version\":\"2.0.0\"}")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "plugin", "test-plugin", files).ToList();

            Assert.Single(placed);
            var pJson = Path.Combine(tempWorkspace, "plugins", "test-plugin", "plugin.json");
            Assert.True(File.Exists(pJson));
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario11c_NormalConfigFiles_PlacedInPackageDirectory()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc11c_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("config.json", "{\"port\": 8080}"),
                new(".env.example", "KEY=VALUE")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "package", "service-pkg", files).ToList();

            Assert.Equal(2, placed.Count);
            var cfg = Path.Combine(tempWorkspace, ".github", "packages", "service-pkg", "config.json");
            var env = Path.Combine(tempWorkspace, ".github", "packages", "service-pkg", ".env.example");
            Assert.True(File.Exists(cfg));
            Assert.True(File.Exists(env));
            Assert.Equal("{\"port\": 8080}", File.ReadAllText(cfg));
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario12_ExistingArtifactUpdate()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc12_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            // Initial v1.0.0 install
            var filesV1 = new List<ArtifactFileEntry>
            {
                new("agent.md", "# Version 1.0.0")
            };
            _placement.PlaceArtifact(tempWorkspace, "agent", "design-reviewer", filesV1, "1.0.0");

            var agentPath = Path.Combine(tempWorkspace, ".github", "agents", "design-reviewer.md");
            Assert.Equal("# Version 1.0.0", File.ReadAllText(agentPath));

            // Update to v1.1.0
            var filesV2 = new List<ArtifactFileEntry>
            {
                new("agent.md", "# Version 1.1.0")
            };
            _placement.PlaceArtifact(tempWorkspace, "agent", "design-reviewer", filesV2, "1.1.0");

            Assert.Equal("# Version 1.1.0", File.ReadAllText(agentPath));
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario13_NewFileAddedDuringUpdate()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc13_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            // v1.0.0: only agent.md
            var filesV1 = new List<ArtifactFileEntry>
            {
                new("agent.md", "# Agent v1.0.0"),
                new("instructions.md", "# Instructions v1.0.0")
            };
            _placement.PlaceArtifact(tempWorkspace, "agent", "design-reviewer", filesV1, "1.0.0");

            var rulesPath = Path.Combine(tempWorkspace, ".github", "agents", "design-reviewer", "references", "rules.md");
            Assert.False(File.Exists(rulesPath));

            // v1.1.0: added references/rules.md
            var filesV2 = new List<ArtifactFileEntry>
            {
                new("agent.md", "# Agent v1.1.0"),
                new("instructions.md", "# Instructions v1.1.0"),
                new("references/rules.md", "# New Rules in v1.1.0")
            };
            _placement.PlaceArtifact(tempWorkspace, "agent", "design-reviewer", filesV2, "1.1.0");

            Assert.True(File.Exists(rulesPath));
            Assert.Equal("# New Rules in v1.1.0", File.ReadAllText(rulesPath));
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario14_FileRemovedDuringUpdate_CleanedUpSafely()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc14_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            // v1.0.0 has deprecated-rule.md
            var filesV1 = new List<ArtifactFileEntry>
            {
                new("agent.md", "# Agent"),
                new("instructions.md", "# Instructions"),
                new("references/deprecated-rule.md", "# Old Deprecated Rule")
            };
            _placement.PlaceArtifact(tempWorkspace, "agent", "design-reviewer", filesV1, "1.0.0");

            var deprecatedPath = Path.Combine(tempWorkspace, ".github", "agents", "design-reviewer", "references", "deprecated-rule.md");
            Assert.True(File.Exists(deprecatedPath));

            // v1.1.0 removed deprecated-rule.md
            var filesV2 = new List<ArtifactFileEntry>
            {
                new("agent.md", "# Agent v1.1.0"),
                new("instructions.md", "# Instructions v1.1.0")
            };
            _placement.PlaceArtifact(tempWorkspace, "agent", "design-reviewer", filesV2, "1.1.0");

            // Deprecated rule must be removed cleanly!
            Assert.False(File.Exists(deprecatedPath), "Obsolete file was not cleaned up during artifact update.");
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario15_ExistingUnrelatedUserFiles_MustNotBeDeleted()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc15_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            // Unrelated user project file
            var userSecretFile = Path.Combine(tempWorkspace, "my-custom-code.ts");
            File.WriteAllText(userSecretFile, "export const app = {};");

            var userAgentFile = Path.Combine(tempWorkspace, ".github", "agents", "my-personal-agent.md");
            Directory.CreateDirectory(Path.GetDirectoryName(userAgentFile)!);
            File.WriteAllText(userAgentFile, "# Personal Agent");

            // Install artifact
            var filesV1 = new List<ArtifactFileEntry> { new("agent.md", "# Reviewer v1") };
            _placement.PlaceArtifact(tempWorkspace, "agent", "design-reviewer", filesV1, "1.0.0");

            // Update artifact
            var filesV2 = new List<ArtifactFileEntry> { new("agent.md", "# Reviewer v2") };
            _placement.PlaceArtifact(tempWorkspace, "agent", "design-reviewer", filesV2, "1.1.0");

            // Unrelated files MUST remain intact
            Assert.True(File.Exists(userSecretFile), "Unrelated user file was deleted!");
            Assert.True(File.Exists(userAgentFile), "Unrelated personal agent was deleted!");
            Assert.Equal("export const app = {};", File.ReadAllText(userSecretFile));
            Assert.Equal("# Personal Agent", File.ReadAllText(userAgentFile));
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario16_InvalidPathTraversalAttempt_ThrowsSecurityException()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc16_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var evilFiles = new List<ArtifactFileEntry>
            {
                new("../../secret.txt", "MALICIOUS")
            };

            var ex = Assert.Throws<InvalidOperationException>(() =>
            {
                _placement.PlaceArtifact(tempWorkspace, "agent", "evil-agent", evilFiles);
            });

            Assert.Contains("Security violation", ex.Message);
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario17_MissingTargetDirectory_CreatedAutomatically()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc17_" + Guid.NewGuid().ToString("N"));
        // Does not exist
        Assert.False(Directory.Exists(tempWorkspace));

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("deep/folder/structure/file.md", "content")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "agent", "auto-dir-agent", files).ToList();

            Assert.Single(placed);
            Assert.True(File.Exists(placed[0]));
        }
        finally
        {
            if (Directory.Exists(tempWorkspace)) Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario18_EmptyFile_HandledGracefully()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc18_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("empty.md", "")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "agent", "empty-agent", files).ToList();

            Assert.Single(placed);
            Assert.True(File.Exists(placed[0]));
            Assert.Equal("", File.ReadAllText(placed[0]));
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario19_DuplicateFilePath_HandledWithoutError()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc19_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("agent.md", "Initial"),
                new("agent.md", "Overwritten")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "agent", "dup-agent", files).ToList();

            Assert.Equal(2, placed.Count);
            var path = Path.Combine(tempWorkspace, ".github", "agents", "dup-agent", "agent.md");
            Assert.True(File.Exists(path));
            Assert.Equal("Overwritten", File.ReadAllText(path));
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario20_BackendReturningMultipleFiles_ConcreteDesignReviewerStructure()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc20_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("agent.md", "# Design Reviewer"),
                new("instructions.md", "# Review instructions"),
                new("references/rules.md", "# Rule list"),
                new("references/examples.md", "# Example reports")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "agent", "design-reviewer", files, "1.1.0").ToList();

            Assert.Equal(4, placed.Count);
            var expectedRoot = Path.Combine(tempWorkspace, ".github", "agents", "design-reviewer");
            Assert.True(File.Exists(Path.Combine(expectedRoot, "agent.md")));
            Assert.True(File.Exists(Path.Combine(expectedRoot, "instructions.md")));
            Assert.True(File.Exists(Path.Combine(expectedRoot, "references", "rules.md")));
            Assert.True(File.Exists(Path.Combine(expectedRoot, "references", "examples.md")));
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario21_FullSetPackage_Agent_Instructions_Prompts_Skills_PlacedCorrectly()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc21_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new(".github/copilot-instructions.md", "# Global Copilot Instructions"),
                new(".github/agents/reviewer.agent.md", "# Reviewer Agent"),
                new("prompts/generate-tests.prompt.md", "# Generate Tests Prompt"),
                new("skills/api-tester/SKILL.md", "# API Tester Skill")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "agent", "ai-suite", files, "1.0.0").ToList();

            Assert.Equal(4, placed.Count);
            
            // 1. Instructions placed directly at .github/copilot-instructions.md
            var instructionsPath = Path.Combine(tempWorkspace, ".github", "copilot-instructions.md");
            Assert.True(File.Exists(instructionsPath), $"Missing {instructionsPath}");

            // 2. Agent placed in .github/agents/
            var agentPath = Path.Combine(tempWorkspace, ".github", "agents", "reviewer.agent.md");
            Assert.True(File.Exists(agentPath), $"Missing {agentPath}");

            // 3. Prompt placed in .github/prompts/
            var promptPath = Path.Combine(tempWorkspace, ".github", "prompts", "generate-tests.prompt.md");
            Assert.True(File.Exists(promptPath), $"Missing {promptPath}");

            // 4. Skill placed in skills/
            var skillPath = Path.Combine(tempWorkspace, "skills", "api-tester", "SKILL.md");
            Assert.True(File.Exists(skillPath), $"Missing {skillPath}");
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario22_MarketplaceLegacyPrefix_ApmConsumerPoc_Agent_PlacedDirectlyInGithubAgents()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc22_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("cip-consumer-poc/.github/agents/design-reviewer.agent.md", "# Design Reviewer Agent")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "agent", "design-reviewer", files, "1.0.0").ToList();

            Assert.Single(placed);
            var expectedPath = Path.Combine(tempWorkspace, ".github", "agents", "design-reviewer.agent.md");
            Assert.True(File.Exists(expectedPath), $"Expected agent at {expectedPath}");
            Assert.False(Directory.Exists(Path.Combine(tempWorkspace, ".github", "agents", "cip-consumer-poc")), "Should not create nested cip-consumer-poc directory");
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario23_MarketplaceLegacyPrefix_ApmConsumerPoc_Skill_PlacedDirectlyInSkills()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc23_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("cip-consumer-poc/.agents/skills/review-and-refactor/SKILL.md", "---\nname: review-and-refactor\n---\n# Refactor")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "skill", "review-and-refactor", files, "1.0.0").ToList();

            Assert.Single(placed);
            var expectedPath = Path.Combine(tempWorkspace, ".agents", "skills", "review-and-refactor", "SKILL.md");
            Assert.True(File.Exists(expectedPath), $"Expected skill at {expectedPath}");
            Assert.False(Directory.Exists(Path.Combine(tempWorkspace, "skills", "review-and-refactor", "cip-consumer-poc")), "Should not create nested cip-consumer-poc directory");
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario24_MarketplaceLegacyPrefix_ApmSkills_PlacedDirectlyInSkills()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc24_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("design-reviewer/.cip/skills/SKILL.md", "---\nname: my-skill\n---\n# Skill")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "skill", "my-skill", files, "1.0.0").ToList();

            Assert.Single(placed);
            var expectedPath = Path.Combine(tempWorkspace, "skills", "my-skill", "SKILL.md");
            Assert.True(File.Exists(expectedPath), $"Expected skill at {expectedPath}");
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario25_MultiFileAgent_WithGithubAgentsPrefix_NotDoubleNested()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc25_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new(".github/agents/enterprise-reviewer/enterprise-reviewer.agent.md", "# Agent"),
                new(".github/agents/enterprise-reviewer/instructions/code-quality.md", "# Instructions"),
                new(".github/agents/enterprise-reviewer/rules/security-rules.md", "# Rules"),
                new(".github/agents/enterprise-reviewer/cip.yml", "name: enterprise-reviewer\n")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "agent", "enterprise-reviewer", files, "1.0.0").ToList();

            Assert.Equal(4, placed.Count);
            var expectedAgent = Path.Combine(tempWorkspace, ".github", "agents", "enterprise-reviewer", "enterprise-reviewer.agent.md");
            var expectedInstr = Path.Combine(tempWorkspace, ".github", "agents", "enterprise-reviewer", "instructions", "code-quality.md");
            var expectedRules = Path.Combine(tempWorkspace, ".github", "agents", "enterprise-reviewer", "rules", "security-rules.md");
            var expectedCip = Path.Combine(tempWorkspace, ".github", "agents", "enterprise-reviewer", "cip.yml");

            Assert.True(File.Exists(expectedAgent), $"Missing {expectedAgent}");
            Assert.True(File.Exists(expectedInstr), $"Missing {expectedInstr}");
            Assert.True(File.Exists(expectedRules), $"Missing {expectedRules}");
            Assert.True(File.Exists(expectedCip), $"Missing {expectedCip}");
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario26_SingleFilePrompt_UsesPromptMdExtension()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc26_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var placedPath = _placement.PlaceSingleFileContent(tempWorkspace, "prompt", "code-review", "# Code review prompt", "1.0.0");

            var expectedPath = Path.Combine(tempWorkspace, ".github", "prompts", "code-review.prompt.md");
            Assert.Equal(expectedPath, placedPath);
            Assert.True(File.Exists(expectedPath));
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario27_SingleFileCommand_UsesCommandMdExtension()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc27_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var placedPath = _placement.PlaceSingleFileContent(tempWorkspace, "command", "run-linter", "# Linter command", "1.0.0");

            var expectedPath = Path.Combine(tempWorkspace, ".github", "commands", "run-linter.command.md");
            Assert.Equal(expectedPath, placedPath);
            Assert.True(File.Exists(expectedPath));
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario28_AgentScriptFile_PreservesPythonExtension()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc28_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("find_agent_debug_logs.py", "import sys\nprint('hello')")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "agent", "find_agent_debug_logs", files, "1.0.0").ToList();

            Assert.Single(placed);
            var expectedPath = Path.Combine(tempWorkspace, ".github", "agents", "find_agent_debug_logs.py");
            Assert.True(File.Exists(expectedPath), $"Expected python script at {expectedPath}");
            Assert.Equal("import sys\nprint('hello')", File.ReadAllText(expectedPath));
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }

    [Fact]
    public void Scenario29_PackageArtifact_PlacesAiArtifactsDirectlyInDotGithub()
    {
        var tempWorkspace = Path.Combine(Path.GetTempPath(), "cip_sc29_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempWorkspace);

        try
        {
            var files = new List<ArtifactFileEntry>
            {
                new("cip-consumer-poc/.gitignore", "node_modules/"),
                new("cip-consumer-poc/cip.lock.yaml", "lock: 1"),
                new("cip-consumer-poc/cip.yml", "name: cip-consumer-poc"),
                new(".github/agents/design-reviewer.agent.md", "# Design Reviewer"),
                new(".github/instructions/design-standards.instructions.md", "# Design Standards"),
                new(".agents/skills/review-and-refactor/SKILL.md", "---\nname: review-and-refactor\n---"),
                new("skills/review-and-refactor/SKILL.md", "---\nname: review-and-refactor\n---"),
                new("cip-consumer-poc/cip_modules/harshpratapsinghrana1/design-reviewer/.cip/agents/design-reviewer.agent.md", "# Agent In Module"),
                new("cip-consumer-poc/cip_modules/harshpratapsinghrana1/design-reviewer/.cip/instructions/design-standards.instructions.md", "# Instructions In Module"),
                new("cip-consumer-poc/cip_modules/harshpratapsinghrana1/design-reviewer/build/design-reviewer-1.0.0/agents/design-reviewer.agent.md", "# Build Agent")
            };

            var placed = _placement.PlaceArtifact(tempWorkspace, "cippackage", "cip-consumer-poc", files, "1.0.0").ToList();

            foreach (var p in placed)
            {
                var rel = Path.GetRelativePath(tempWorkspace, p).Replace('\\', '/');
                // Nothing should ever be placed under <workspace>/cip-consumer-poc/
                Assert.False(rel.StartsWith("cip-consumer-poc/"), $"File was placed in cip-consumer-poc: {rel}");
            }

            // All AI artifacts MUST be placed in .github/ so GitHub Copilot can read them!
            Assert.True(File.Exists(Path.Combine(tempWorkspace, ".github", "agents", "design-reviewer.agent.md")), "Copilot agent should exist in .github/agents/");
            Assert.True(File.Exists(Path.Combine(tempWorkspace, ".github", "instructions", "design-standards.instructions.md")), "Copilot instructions should exist in .github/instructions/");
            Assert.True(File.Exists(Path.Combine(tempWorkspace, ".github", "skills", "review-and-refactor", "SKILL.md")), "Copilot skill should exist in .github/skills/");

            // Manifests placed in .github/packages/cip-consumer-poc/
            Assert.True(File.Exists(Path.Combine(tempWorkspace, ".github", "packages", "cip-consumer-poc", "cip.yml")), "Manifest should be in .github/packages/cip-consumer-poc/cip.yml");

            // NO files should be placed in <workspace>/cip-consumer-poc/ loose folder
            Assert.False(Directory.Exists(Path.Combine(tempWorkspace, "cip-consumer-poc")), "Should not create loose cip-consumer-poc directory in workspace root");
        }
        finally
        {
            Directory.Delete(tempWorkspace, true);
        }
    }
}

