using System;
using System.IO;
using System.Text.Json;
using System.Text.RegularExpressions;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;

namespace EngineeringCommonsCli.Services.Implementations;

public class ArtifactClassifier : IArtifactClassifier
{
    private static readonly HashSet<string> NormalFileNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "README.md", "README", "LICENSE", "LICENSE.md", "LICENSE.txt",
        "package.json", "package-lock.json", "requirements.txt",
        ".gitignore", ".gitattributes", ".editorconfig",
        "documentation.md", "docs.md", "notes.md", "guide.md", "sample.md",
        "appsettings.json", "appsettings.Development.json", "launch.json", "tasks.json",
        "tsconfig.json", "global.json", "nuget.config"
    };

    private static readonly HashSet<string> NormalFileExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".csproj", ".sln", ".cs", ".ts", ".js", ".jsx", ".tsx",
        ".py", ".html", ".css", ".scss", ".xml", ".dll", ".exe", ".pdb", ".log"
    };

    public ClassificationResult Classify(string fullPath, string? content = null, bool isDirectory = false, string? relativePath = null)
    {
        var normRelPath = (relativePath ?? fullPath).Replace('\\', '/');
        var fileName = Path.GetFileName(fullPath);
        var dirName = isDirectory ? fileName : Path.GetDirectoryName(fullPath);

        // Load content if not provided and file exists
        if (content == null && !isDirectory && File.Exists(fullPath))
        {
            try { content = File.ReadAllText(fullPath); } catch (Exception) { /* handled non-fatal CLI fallback */ }
        }

        // =========================================================================
        // PRIORITY 1: Explicit Metadata / Frontmatter
        // =========================================================================
        if (!string.IsNullOrWhiteSpace(content))
        {
            var fmMatch = Regex.Match(content, @"^---\s*[\r\n]+([\s\S]*?)[\r\n]+---", RegexOptions.Multiline);
            if (fmMatch.Success)
            {
                var fmBody = fmMatch.Groups[1].Value;
                var typeMatch = Regex.Match(fmBody, @"^\s*type\s*:\s*([A-Za-z0-9_\-]+)", RegexOptions.Multiline | RegexOptions.IgnoreCase);
                if (typeMatch.Success)
                {
                    var rawType = typeMatch.Groups[1].Value.Trim().ToLowerInvariant();
                    var nameMatch = Regex.Match(fmBody, @"^\s*name\s*:\s*(.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
                    var verMatch = Regex.Match(fmBody, @"^\s*version\s*:\s*(.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
                    var descMatch = Regex.Match(fmBody, @"^\s*description\s*:\s*(.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase);

                    var extName = nameMatch.Success ? nameMatch.Groups[1].Value.Trim().Trim('"', '\'') : null;
                    var extVer = verMatch.Success ? verMatch.Groups[1].Value.Trim().Trim('"', '\'') : null;
                    var extDesc = descMatch.Success ? descMatch.Groups[1].Value.Trim().Trim('"', '\'') : null;

                    var artifactType = rawType switch
                    {
                        "agent" => ArtifactType.Agent,
                        "skill" => ArtifactType.Skill,
                        "command" => ArtifactType.Command,
                        "prompt" => ArtifactType.Prompt,
                        "plugin" => ArtifactType.Plugin,
                        "mcp" or "mcp-server" or "mcpserver" => ArtifactType.McpServer,
                        "package" or "cip-package" => ArtifactType.CipPackage,
                        _ => ArtifactType.Unknown
                    };

                    if (artifactType != ArtifactType.Unknown)
                    {
                        return new ClassificationResult(artifactType, DetectionConfidence.High, $"Explicit YAML frontmatter metadata (type: {rawType})", extName, extVer, extDesc);
                    }
                }
            }

            // Check JSON metadata: {"type": "agent", ...}
            if (content.TrimStart().StartsWith("{"))
            {
                try
                {
                    using var doc = JsonDocument.Parse(content);
                    if (doc.RootElement.TryGetProperty("type", out var tProp))
                    {
                        var rawType = tProp.GetString()?.Trim().ToLowerInvariant();
                        if (!string.IsNullOrEmpty(rawType))
                        {
                            var artifactType = rawType switch
                            {
                                "agent" => ArtifactType.Agent,
                                "skill" => ArtifactType.Skill,
                                "command" => ArtifactType.Command,
                                "prompt" => ArtifactType.Prompt,
                                "plugin" => ArtifactType.Plugin,
                                "mcp" or "mcp-server" => ArtifactType.McpServer,
                                "package" => ArtifactType.CipPackage,
                                _ => ArtifactType.Unknown
                            };
                            if (artifactType != ArtifactType.Unknown)
                            {
                                var name = doc.RootElement.TryGetProperty("name", out var nProp) ? nProp.GetString() : null;
                                var ver = doc.RootElement.TryGetProperty("version", out var vProp) ? vProp.GetString() : null;
                                return new ClassificationResult(artifactType, DetectionConfidence.High, $"Explicit JSON metadata (type: {rawType})", name, ver);
                            }
                        }
                    }
                }
                catch (Exception) { /* handled non-fatal CLI fallback */ }
            }
        }

        // =========================================================================
        // PRIORITY 2: Valid Manifest / Configuration
        // =========================================================================
        // 2a. cip.yml / cip.yaml
        if (fileName.Equals("cip.yml", StringComparison.OrdinalIgnoreCase) || fileName.Equals("cip.yaml", StringComparison.OrdinalIgnoreCase))
        {
            return new ClassificationResult(ArtifactType.CipConfiguration, DetectionConfidence.High, "CIP configuration manifest file (cip.yml)");
        }

        // 2b. Directory containing cip.yml
        if (isDirectory && (File.Exists(Path.Combine(fullPath, "cip.yml")) || File.Exists(Path.Combine(fullPath, "cip.yaml"))))
        {
            return new ClassificationResult(ArtifactType.CipPackage, DetectionConfidence.High, "CIP package project containing cip.yml", fileName);
        }

        // 2c. plugin.json
        if (fileName.Equals("plugin.json", StringComparison.OrdinalIgnoreCase))
        {
            return new ClassificationResult(ArtifactType.NormalFile, DetectionConfidence.High, "Plugin metadata manifest (plugin.json)");
        }

        // 2d. Directory containing plugin.json
        if (isDirectory && File.Exists(Path.Combine(fullPath, "plugin.json")))
        {
            return new ClassificationResult(ArtifactType.Plugin, DetectionConfidence.High, "Plugin package containing plugin.json manifest", fileName);
        }

        // 2e. MCP Server Manifests
        if (fileName.Equals("mcp_config.json", StringComparison.OrdinalIgnoreCase) ||
            fileName.Equals("mcp.json", StringComparison.OrdinalIgnoreCase) ||
            fileName.EndsWith(".mcp.json", StringComparison.OrdinalIgnoreCase) ||
            fileName.EndsWith(".mcp", StringComparison.OrdinalIgnoreCase) ||
            normRelPath.EndsWith(".mcp/server.json", StringComparison.OrdinalIgnoreCase))
        {
            return new ClassificationResult(ArtifactType.McpServer, DetectionConfidence.High, $"Model Context Protocol (MCP) server manifest ({fileName})", Path.GetFileNameWithoutExtension(fileName));
        }

        // Content check for MCP config (e.g. JSON containing "mcpServers")
        if (!string.IsNullOrWhiteSpace(content) && content.Contains("\"mcpServers\"", StringComparison.OrdinalIgnoreCase))
        {
            return new ClassificationResult(ArtifactType.McpServer, DetectionConfidence.High, "JSON contains mcpServers declaration", Path.GetFileNameWithoutExtension(fileName));
        }

        // =========================================================================
        // PRIORITY 3: Known Directory Structure
        // =========================================================================
        // 3a. Skills: .agents/skills/<name>/SKILL.md or skills/<name>/SKILL.md or directory with SKILL.md
        if (fileName.Equals("SKILL.md", StringComparison.OrdinalIgnoreCase))
        {
            var skillDirName = Path.GetFileName(Path.GetDirectoryName(fullPath) ?? string.Empty);
            return new ClassificationResult(ArtifactType.Skill, DetectionConfidence.High, "Skill instruction manifest (SKILL.md)", skillDirName);
        }

        if (isDirectory && File.Exists(Path.Combine(fullPath, "SKILL.md")))
        {
            return new ClassificationResult(ArtifactType.Skill, DetectionConfidence.High, "Skill package containing SKILL.md", fileName);
        }

        if (normRelPath.Contains("/skills/", StringComparison.OrdinalIgnoreCase) || normRelPath.StartsWith("skills/", StringComparison.OrdinalIgnoreCase))
        {
            var skillName = Path.GetFileNameWithoutExtension(fileName);
            return new ClassificationResult(ArtifactType.Skill, DetectionConfidence.High, "Located in supported skills/ directory structure", skillName);
        }

        // 3b. Agents: .github/agents/ or agents/
        if (normRelPath.Contains("/agents/", StringComparison.OrdinalIgnoreCase) || normRelPath.StartsWith("agents/", StringComparison.OrdinalIgnoreCase) || normRelPath.StartsWith(".github/agents/", StringComparison.OrdinalIgnoreCase))
        {
            var agentName = Path.GetFileNameWithoutExtension(fileName);
            if (agentName.EndsWith(".agent", StringComparison.OrdinalIgnoreCase)) agentName = agentName.Substring(0, agentName.Length - 6);
            return new ClassificationResult(ArtifactType.Agent, DetectionConfidence.High, "Located in standard agents/ directory structure", agentName);
        }

        // 3c. Prompts: .github/prompts/ or prompts/
        if (normRelPath.Contains("/prompts/", StringComparison.OrdinalIgnoreCase) || normRelPath.StartsWith("prompts/", StringComparison.OrdinalIgnoreCase) || normRelPath.StartsWith(".github/prompts/", StringComparison.OrdinalIgnoreCase))
        {
            var promptName = Path.GetFileNameWithoutExtension(fileName);
            if (promptName.EndsWith(".prompt", StringComparison.OrdinalIgnoreCase)) promptName = promptName.Substring(0, promptName.Length - 7);
            return new ClassificationResult(ArtifactType.Prompt, DetectionConfidence.High, "Located in standard prompts/ directory structure", promptName);
        }

        // 3d. Commands: .github/commands/ or commands/
        if (normRelPath.Contains("/commands/", StringComparison.OrdinalIgnoreCase) || normRelPath.StartsWith("commands/", StringComparison.OrdinalIgnoreCase) || normRelPath.StartsWith(".github/commands/", StringComparison.OrdinalIgnoreCase))
        {
            var cmdName = Path.GetFileNameWithoutExtension(fileName);
            return new ClassificationResult(ArtifactType.Command, DetectionConfidence.High, "Located in standard commands/ directory structure", cmdName);
        }

        // 3e. Plugins directory: plugins/<name>/
        if (normRelPath.Contains("/plugins/", StringComparison.OrdinalIgnoreCase) || normRelPath.StartsWith("plugins/", StringComparison.OrdinalIgnoreCase))
        {
            var plugName = isDirectory ? fileName : Path.GetFileNameWithoutExtension(fileName);
            return new ClassificationResult(ArtifactType.Plugin, DetectionConfidence.High, "Located in standard plugins/ directory structure", plugName);
        }

        // =========================================================================
        // PRIORITY 4: File Name Conventions
        // =========================================================================
        if (fileName.EndsWith(".agent.md", StringComparison.OrdinalIgnoreCase) || fileName.EndsWith(".agent", StringComparison.OrdinalIgnoreCase))
        {
            var name = fileName.EndsWith(".agent.md", StringComparison.OrdinalIgnoreCase) ? fileName.Substring(0, fileName.Length - 9) : fileName.Substring(0, fileName.Length - 6);
            return new ClassificationResult(ArtifactType.Agent, DetectionConfidence.High, "File naming convention (*.agent.md)", name);
        }

        if (fileName.EndsWith(".prompt.md", StringComparison.OrdinalIgnoreCase) || fileName.EndsWith(".prompt", StringComparison.OrdinalIgnoreCase))
        {
            var name = fileName.EndsWith(".prompt.md", StringComparison.OrdinalIgnoreCase) ? fileName.Substring(0, fileName.Length - 10) : fileName.Substring(0, fileName.Length - 7);
            return new ClassificationResult(ArtifactType.Prompt, DetectionConfidence.High, "File naming convention (*.prompt.md)", name);
        }

        // =========================================================================
        // PRIORITY 4b: Normal File Exclusions (Guard standard source code & project files from loose name heuristics)
        // =========================================================================
        if (NormalFileNames.Contains(fileName))
        {
            return new ClassificationResult(ArtifactType.NormalFile, DetectionConfidence.High, $"Recognized project / documentation file ({fileName}), not an AI artifact.");
        }

        var ext = Path.GetExtension(fullPath);
        if (!string.IsNullOrEmpty(ext) && NormalFileExtensions.Contains(ext))
        {
            return new ClassificationResult(ArtifactType.NormalFile, DetectionConfidence.High, $"Source code / project configuration file ({ext}), not an AI artifact.");
        }

        // =========================================================================
        // PRIORITY 4c: Name / Semantic Identifier Patterns (When full file extension is absent or markdown)
        // =========================================================================
        var cleanName = Path.GetFileNameWithoutExtension(fileName).ToLowerInvariant();
        if (cleanName.EndsWith("-agent", StringComparison.Ordinal) || cleanName.EndsWith("_agent", StringComparison.Ordinal) || cleanName.EndsWith(".agent", StringComparison.Ordinal) ||
            cleanName.StartsWith("agent-", StringComparison.Ordinal) || cleanName.StartsWith("agent_", StringComparison.Ordinal) ||
            cleanName.EndsWith("-reviewer", StringComparison.Ordinal) || cleanName.EndsWith("_reviewer", StringComparison.Ordinal) || cleanName.Contains("reviewer", StringComparison.Ordinal) ||
            cleanName.Contains("-agent-", StringComparison.Ordinal) || cleanName.Contains("_agent_", StringComparison.Ordinal))
        {
            return new ClassificationResult(ArtifactType.Agent, DetectionConfidence.Medium, $"Name pattern matched Agent ({cleanName})", cleanName);
        }

        if (cleanName.EndsWith("-skill", StringComparison.Ordinal) || cleanName.EndsWith("_skill", StringComparison.Ordinal) || cleanName.EndsWith(".skill", StringComparison.Ordinal) ||
            cleanName.StartsWith("skill-", StringComparison.Ordinal) || cleanName.StartsWith("skill_", StringComparison.Ordinal) || cleanName.Equals("skills", StringComparison.Ordinal) ||
            cleanName.Contains("-skill-", StringComparison.Ordinal) || cleanName.Contains("_skill_", StringComparison.Ordinal) || cleanName.Contains("refactor", StringComparison.Ordinal))
        {
            return new ClassificationResult(ArtifactType.Skill, DetectionConfidence.Medium, $"Name pattern matched Skill ({cleanName})", cleanName);
        }

        if (cleanName.EndsWith("-prompt", StringComparison.Ordinal) || cleanName.EndsWith("_prompt", StringComparison.Ordinal) || cleanName.EndsWith(".prompt", StringComparison.Ordinal) ||
            cleanName.StartsWith("prompt-", StringComparison.Ordinal) || cleanName.StartsWith("prompt_", StringComparison.Ordinal) || cleanName.Contains("-prompt-", StringComparison.Ordinal) ||
            cleanName.Contains("prompt", StringComparison.Ordinal))
        {
            return new ClassificationResult(ArtifactType.Prompt, DetectionConfidence.Medium, $"Name pattern matched Prompt ({cleanName})", cleanName);
        }

        if (cleanName.EndsWith("-command", StringComparison.Ordinal) || cleanName.EndsWith("_command", StringComparison.Ordinal) || cleanName.EndsWith(".command", StringComparison.Ordinal) ||
            cleanName.StartsWith("cmd-", StringComparison.Ordinal) || cleanName.StartsWith("command-", StringComparison.Ordinal))
        {
            return new ClassificationResult(ArtifactType.Command, DetectionConfidence.Medium, $"Name pattern matched Command ({cleanName})", cleanName);
        }

        if (cleanName.EndsWith("-plugin", StringComparison.Ordinal) || cleanName.EndsWith("_plugin", StringComparison.Ordinal) || cleanName.StartsWith("plugin-", StringComparison.Ordinal) || cleanName.Contains("plugin", StringComparison.Ordinal))
        {
            return new ClassificationResult(ArtifactType.Plugin, DetectionConfidence.Medium, $"Name pattern matched Plugin ({cleanName})", cleanName);
        }

        if (cleanName.EndsWith("-mcp", StringComparison.Ordinal) || cleanName.EndsWith("_mcp", StringComparison.Ordinal) || cleanName.EndsWith("mcpserver", StringComparison.Ordinal) || cleanName.StartsWith("mcp-", StringComparison.Ordinal) || cleanName.Contains("-mcp-", StringComparison.Ordinal))
        {
            return new ClassificationResult(ArtifactType.McpServer, DetectionConfidence.Medium, $"Name pattern matched MCP Server ({cleanName})", cleanName);
        }

        if (cleanName.EndsWith("-package", StringComparison.Ordinal) || cleanName.StartsWith("pkg-", StringComparison.Ordinal) || cleanName.EndsWith("-poc", StringComparison.Ordinal) || cleanName.EndsWith("_poc", StringComparison.Ordinal) || cleanName.Contains("consumer-poc", StringComparison.Ordinal))
        {
            return new ClassificationResult(ArtifactType.CipPackage, DetectionConfidence.Medium, $"Name pattern matched CIP Package ({cleanName})", cleanName);
        }

        // =========================================================================
        // PRIORITY 5: Content-Based Detection (Only for non-trivial markdown)
        // =========================================================================
        if (!string.IsNullOrWhiteSpace(content) && fileName.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
        {
            if (!NormalFileNames.Contains(fileName))
            {
                if (Regex.IsMatch(content, @"^(#\s*Agent|#\s*AI Agent|<agent\b)", RegexOptions.Multiline | RegexOptions.IgnoreCase))
                {
                    return new ClassificationResult(ArtifactType.Agent, DetectionConfidence.Medium, "Matched AI Agent instruction patterns in content", Path.GetFileNameWithoutExtension(fileName));
                }

                if (content.Contains("{{") && content.Contains("}}") && (content.Contains("system:") || content.Contains("user:") || content.Contains("assistant:")))
                {
                    return new ClassificationResult(ArtifactType.Prompt, DetectionConfidence.Medium, "Matched prompt template variable syntax ({{ ... }}) in content", Path.GetFileNameWithoutExtension(fileName));
                }
            }
        }

        // =========================================================================
        // PRIORITY 6: Generic Non-Artifact Document Fallback
        // =========================================================================

        // Generic markdown or text file with no artifact cues
        if (fileName.EndsWith(".md", StringComparison.OrdinalIgnoreCase) || fileName.EndsWith(".txt", StringComparison.OrdinalIgnoreCase))
        {
            return new ClassificationResult(ArtifactType.NormalFile, DetectionConfidence.Medium, "Generic markdown/text document without AI artifact structure or metadata.");
        }

        // =========================================================================
        // PRIORITY 7: Unknown (Never default to Agent!)
        // =========================================================================
        return new ClassificationResult(ArtifactType.Unknown, DetectionConfidence.Low, "Artifact structure does not match a supported artifact type.", Path.GetFileNameWithoutExtension(fileName));
    }

    public ClassificationResult ClassifyMultiFile(string rootPackageName, IEnumerable<(string Path, string? Content)> files, string? manifestCipYmlContent = null)
    {
        var fileList = files.ToList();
        if (!fileList.Any())
        {
            return new ClassificationResult(ArtifactType.Unknown, DetectionConfidence.Low, "No files provided in artifact package.", rootPackageName);
        }

        // 1. Check explicit cip.yml content if provided
        var cipFile = fileList.FirstOrDefault(f => Path.GetFileName(f.Path).Equals("cip.yml", StringComparison.OrdinalIgnoreCase) ||
                                                  Path.GetFileName(f.Path).Equals("cip.yaml", StringComparison.OrdinalIgnoreCase));
        var rawCipYml = manifestCipYmlContent ?? cipFile.Content;
        if (!string.IsNullOrWhiteSpace(rawCipYml))
        {
            var typeMatch = Regex.Match(rawCipYml, @"^\s*type\s*:\s*([A-Za-z0-9_\-]+)", RegexOptions.Multiline | RegexOptions.IgnoreCase);
            if (typeMatch.Success)
            {
                var rawType = typeMatch.Groups[1].Value.Trim().ToLowerInvariant();
                var artifactType = rawType switch
                {
                    "agent" => ArtifactType.Agent,
                    "skill" => ArtifactType.Skill,
                    "command" => ArtifactType.Command,
                    "prompt" => ArtifactType.Prompt,
                    "plugin" => ArtifactType.Plugin,
                    "mcp" or "mcp-server" or "mcpserver" => ArtifactType.McpServer,
                    "package" or "cippackage" or "cip-package" => ArtifactType.CipPackage,
                    _ => ArtifactType.Unknown
                };
                if (artifactType != ArtifactType.Unknown && artifactType != ArtifactType.CipPackage)
                {
                    return new ClassificationResult(artifactType, DetectionConfidence.High, $"Explicit type in cip.yml ({artifactType})", rootPackageName);
                }
            }
        }

        // 2. Check each file for explicit YAML frontmatter or JSON type
        foreach (var file in fileList)
        {
            if (!string.IsNullOrWhiteSpace(file.Content))
            {
                var singleRes = Classify(file.Path, file.Content, false, file.Path);
                if (singleRes.Confidence == DetectionConfidence.High &&
                    singleRes.Type != ArtifactType.NormalFile &&
                    singleRes.Type != ArtifactType.CipConfiguration &&
                    singleRes.Type != ArtifactType.Unknown &&
                    singleRes.Type != ArtifactType.CipPackage)
                {
                    return new ClassificationResult(singleRes.Type, DetectionConfidence.High, $"Multi-file package classified via primary artifact ({file.Path}: {singleRes.Reason})", rootPackageName);
                }
            }
        }

        // 3. Inspect directory structure and filenames in files list
        bool hasSkill = fileList.Any(f => Path.GetFileName(f.Path).Equals("SKILL.md", StringComparison.OrdinalIgnoreCase) ||
                                          f.Path.Replace('\\', '/').Contains("/skills/") ||
                                          f.Path.Replace('\\', '/').StartsWith("skills/"));
        if (hasSkill)
        {
            return new ClassificationResult(ArtifactType.Skill, DetectionConfidence.High, "Multi-file package contains SKILL.md / skills directory", rootPackageName);
        }

        bool hasAgent = fileList.Any(f => f.Path.EndsWith(".agent.md", StringComparison.OrdinalIgnoreCase) ||
                                          f.Path.EndsWith(".agent", StringComparison.OrdinalIgnoreCase) ||
                                          f.Path.Replace('\\', '/').Contains("/agents/") ||
                                          f.Path.Replace('\\', '/').StartsWith("agents/") ||
                                          f.Path.Replace('\\', '/').StartsWith(".github/agents/"));
        if (hasAgent)
        {
            return new ClassificationResult(ArtifactType.Agent, DetectionConfidence.High, "Multi-file package contains agent definition (.agent.md / agents/)", rootPackageName);
        }

        bool hasPlugin = fileList.Any(f => Path.GetFileName(f.Path).Equals("plugin.json", StringComparison.OrdinalIgnoreCase) ||
                                           f.Path.Replace('\\', '/').Contains("/plugins/") ||
                                           f.Path.Replace('\\', '/').StartsWith("plugins/"));
        if (hasPlugin)
        {
            return new ClassificationResult(ArtifactType.Plugin, DetectionConfidence.High, "Multi-file package contains plugin manifest / structure", rootPackageName);
        }

        bool hasMcp = fileList.Any(f => Path.GetFileName(f.Path).Equals("mcp_config.json", StringComparison.OrdinalIgnoreCase) ||
                                       Path.GetFileName(f.Path).Equals("mcp.json", StringComparison.OrdinalIgnoreCase) ||
                                       (!string.IsNullOrWhiteSpace(f.Content) && f.Content.Contains("\"mcpServers\"")));
        if (hasMcp)
        {
            return new ClassificationResult(ArtifactType.McpServer, DetectionConfidence.High, "Multi-file package contains MCP server configuration", rootPackageName);
        }

        // 4. If cip.yml exists but no sub-AI artifact is matched, it is a generic CIP Package
        if (cipFile.Path != null || !string.IsNullOrWhiteSpace(manifestCipYmlContent))
        {
            return new ClassificationResult(ArtifactType.CipPackage, DetectionConfidence.High, "Multi-file package containing cip.yml manifest", rootPackageName);
        }

        // 5. Check if all files are normal non-artifact files
        bool allNormal = fileList.All(f => NormalFileNames.Contains(Path.GetFileName(f.Path)) || NormalFileExtensions.Contains(Path.GetExtension(f.Path)));
        if (allNormal)
        {
            return new ClassificationResult(ArtifactType.NormalFile, DetectionConfidence.High, "Multi-file bundle contains only documentation/build files.", rootPackageName);
        }

        // 6. Unknown fallback
        return new ClassificationResult(ArtifactType.Unknown, DetectionConfidence.Low, "Multi-file package does not match a recognized AI artifact type.", rootPackageName);
    }
}


