using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;
using Newtonsoft.Json.Linq;

namespace EngineeringCommonsCli.Services.Implementations;

public class ArtifactPlacementService : IArtifactPlacementService
{
    private readonly IArtifactClassifier _classifier;

    public ArtifactPlacementService(IArtifactClassifier? classifier = null)
    {
        _classifier = classifier ?? new ArtifactClassifier();
    }

    public string DeterminePlacement(string artifactType, string artifactName)
    {
        var normType = (artifactType ?? string.Empty).Trim().ToLowerInvariant();
        var safeArtifactName = string.IsNullOrWhiteSpace(artifactName) ? "artifact" : artifactName;

        if (string.IsNullOrEmpty(normType) || normType == "unknown" || normType == "other" || normType == "normalfile")
        {
            var detected = _classifier.Classify(safeArtifactName);
            if (detected.Type != ArtifactType.Unknown && detected.Type != ArtifactType.NormalFile)
            {
                normType = detected.Type.ToString().ToLowerInvariant();
            }
            else
            {
                normType = "agent";
            }
        }

        return normType switch
        {
            "agent" => Path.Combine(Directory.GetCurrentDirectory(), ".github", "agents", safeArtifactName),
            "skill" => Path.Combine(Directory.GetCurrentDirectory(), ".github", "skills", safeArtifactName),
            "command" => Path.Combine(Directory.GetCurrentDirectory(), ".github", "commands"),
            "prompt" => Path.Combine(Directory.GetCurrentDirectory(), ".github", "prompts"),
            "plugin" => Path.Combine(Directory.GetCurrentDirectory(), "plugins", safeArtifactName),
            "mcp" or "mcp-server" or "mcpserver" => Path.Combine(Directory.GetCurrentDirectory(), ".mcp", safeArtifactName),
            "package" or "cip-package" or "cippackage" => Path.Combine(Directory.GetCurrentDirectory(), ".github", "packages", safeArtifactName),
            _ => Path.Combine(Directory.GetCurrentDirectory(), "artifacts", safeArtifactName)
        };
    }

    public string ResolveDestinationPath(string workspaceRoot, string artifactType, string artifactName, string relativeFilePath, bool isMultiFile = false)
    {
        if (string.IsNullOrWhiteSpace(relativeFilePath))
        {
            relativeFilePath = $"{artifactName}.md";
        }

        // Normalize path separators
        var normalizedPath = relativeFilePath.Replace('\\', '/').TrimStart('/');

        // Security check: reject explicit directory traversal sequences
        if (normalizedPath.Contains("..") || relativeFilePath.Contains(".."))
        {
            var segments = normalizedPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (segments.Any(s => s == ".."))
            {
                throw new InvalidOperationException($"Security violation: Path '{relativeFilePath}' attempts directory traversal outside of workspace root.");
            }
        }

        // Strip legacy / workspace / producer folder prefixes (e.g. cip-consumer-poc/, design-reviewer/.cip/, .agents/agents/)
        normalizedPath = StripSourceFolderPrefixes(normalizedPath);

        var normType = (artifactType ?? string.Empty).Trim().ToLowerInvariant();
        var safeArtifactName = string.IsNullOrWhiteSpace(artifactName) ? "artifact" : artifactName;

        if (string.IsNullOrEmpty(normType) || normType == "unknown" || normType == "other" || normType == "normalfile")
        {
            var pathDetected = _classifier.Classify(normalizedPath);
            if (pathDetected.Type != ArtifactType.Unknown && pathDetected.Type != ArtifactType.NormalFile)
            {
                normType = pathDetected.Type.ToString().ToLowerInvariant();
            }
            else
            {
                var nameDetected = _classifier.Classify(safeArtifactName);
                if (nameDetected.Type != ArtifactType.Unknown && nameDetected.Type != ArtifactType.NormalFile)
                {
                    normType = nameDetected.Type.ToString().ToLowerInvariant();
                }
                else
                {
                    normType = "agent";
                }
            }
        }

        string resolvedAbsolute;

        switch (normType)
        {
            case "plugin":
                if (normalizedPath.StartsWith(".github/plugins/", StringComparison.OrdinalIgnoreCase) ||
                    normalizedPath.StartsWith($"plugins/{safeArtifactName}/", StringComparison.OrdinalIgnoreCase) ||
                    normalizedPath.StartsWith("plugins/", StringComparison.OrdinalIgnoreCase))
                {
                    resolvedAbsolute = Path.Combine(workspaceRoot, normalizedPath.Replace('/', Path.DirectorySeparatorChar));
                }
                else
                {
                    resolvedAbsolute = Path.Combine(workspaceRoot, "plugins", safeArtifactName, normalizedPath.Replace('/', Path.DirectorySeparatorChar));
                }
                break;

            case "package" or "cip-package" or "cippackage":
                var pkgRel = normalizedPath;
                if (pkgRel.StartsWith($"{safeArtifactName}/", StringComparison.OrdinalIgnoreCase))
                {
                    pkgRel = pkgRel.Substring(safeArtifactName.Length + 1);
                }

                // 1. Files already under .github/
                if (pkgRel.StartsWith(".github/", StringComparison.OrdinalIgnoreCase))
                {
                    resolvedAbsolute = Path.Combine(workspaceRoot, pkgRel.Replace('/', Path.DirectorySeparatorChar));
                }
                // 2. Custom instructions for GitHub Copilot
                else if (pkgRel.Equals("copilot-instructions.md", StringComparison.OrdinalIgnoreCase))
                {
                    resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "copilot-instructions.md");
                }
                // 2b. Instructions files: instructions/... or *.instructions.md -> .github/instructions/<filename>
                else if (pkgRel.StartsWith("instructions/", StringComparison.OrdinalIgnoreCase))
                {
                    var sub = pkgRel.Substring("instructions/".Length);
                    resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "instructions", sub.Replace('/', Path.DirectorySeparatorChar));
                }
                else if (pkgRel.StartsWith(".github/instructions/", StringComparison.OrdinalIgnoreCase) ||
                         pkgRel.EndsWith(".instructions.md", StringComparison.OrdinalIgnoreCase))
                {
                    var fileName = Path.GetFileName(pkgRel);
                    resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "instructions", fileName);
                }
                // 3. Agents: agents/helper.md -> .github/agents/helper.md (preserves subfolder) or *.agent.md -> .github/agents/<filename>
                else if (pkgRel.StartsWith("agents/", StringComparison.OrdinalIgnoreCase))
                {
                    var sub = pkgRel.Substring("agents/".Length);
                    resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "agents", sub.Replace('/', Path.DirectorySeparatorChar));
                }
                else if (pkgRel.EndsWith(".agent.md", StringComparison.OrdinalIgnoreCase) ||
                         pkgRel.EndsWith(".agent", StringComparison.OrdinalIgnoreCase))
                {
                    var fileName = Path.GetFileName(pkgRel);
                    if (fileName.EndsWith(".agent", StringComparison.OrdinalIgnoreCase))
                    {
                        fileName = $"{fileName}.md";
                    }
                    resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "agents", fileName);
                }
                // 4. Skills: skills/calc/SKILL.md or .agents/skills/calc/SKILL.md or any .../SKILL.md -> .github/skills/<skillName>/SKILL.md
                else if (pkgRel.StartsWith("skills/", StringComparison.OrdinalIgnoreCase) ||
                         pkgRel.StartsWith(".agents/skills/", StringComparison.OrdinalIgnoreCase) ||
                         pkgRel.EndsWith("SKILL.md", StringComparison.OrdinalIgnoreCase))
                {
                    string skillSubDir;
                    if (pkgRel.EndsWith("SKILL.md", StringComparison.OrdinalIgnoreCase))
                    {
                        var parentDirName = Path.GetFileName(Path.GetDirectoryName(pkgRel));
                        skillSubDir = (!string.IsNullOrEmpty(parentDirName) && 
                                       !parentDirName.Equals("skills", StringComparison.OrdinalIgnoreCase) && 
                                       !parentDirName.Equals(".agents", StringComparison.OrdinalIgnoreCase))
                            ? parentDirName
                            : safeArtifactName;
                        resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "skills", skillSubDir, "SKILL.md");
                    }
                    else
                    {
                        var sub = pkgRel.StartsWith(".agents/skills/", StringComparison.OrdinalIgnoreCase)
                            ? pkgRel.Substring(".agents/skills/".Length)
                            : pkgRel.Substring("skills/".Length);

                        if (sub.Equals("SKILL.md", StringComparison.OrdinalIgnoreCase) || !sub.Contains('/'))
                        {
                            resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "skills", safeArtifactName, sub.Replace('/', Path.DirectorySeparatorChar));
                        }
                        else
                        {
                            resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "skills", sub.Replace('/', Path.DirectorySeparatorChar));
                        }
                    }
                }
                // 5. Prompts: prompts/sql.prompt.md or *.prompt.md -> .github/prompts/<filename>
                else if (pkgRel.StartsWith("prompts/", StringComparison.OrdinalIgnoreCase) ||
                         pkgRel.EndsWith(".prompt.md", StringComparison.OrdinalIgnoreCase))
                {
                    var fileName = Path.GetFileName(pkgRel);
                    resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "prompts", fileName);
                }
                // 6. Commands: commands/build.command.md or *.command.md -> .github/commands/<filename>
                else if (pkgRel.StartsWith("commands/", StringComparison.OrdinalIgnoreCase) ||
                         pkgRel.EndsWith(".command.md", StringComparison.OrdinalIgnoreCase))
                {
                    var fileName = Path.GetFileName(pkgRel);
                    resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "commands", fileName);
                }
                // 7. MCP Servers: mcp/srv/server.json -> .github/mcp/srv/server.json
                else if (pkgRel.StartsWith("mcp/", StringComparison.OrdinalIgnoreCase) ||
                         pkgRel.StartsWith(".mcp/", StringComparison.OrdinalIgnoreCase) ||
                         pkgRel.EndsWith("server.json", StringComparison.OrdinalIgnoreCase))
                {
                    var sub = pkgRel.StartsWith(".mcp/", StringComparison.OrdinalIgnoreCase)
                        ? pkgRel.Substring(".mcp/".Length)
                        : pkgRel.StartsWith("mcp/", StringComparison.OrdinalIgnoreCase)
                            ? pkgRel.Substring("mcp/".Length)
                            : Path.Combine(safeArtifactName, Path.GetFileName(pkgRel));
                    resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "mcp", sub.Replace('/', Path.DirectorySeparatorChar));
                }
                // 8. Plugins: plugins/ext/plugin.json -> .github/plugins/ext/plugin.json
                else if (pkgRel.StartsWith("plugins/", StringComparison.OrdinalIgnoreCase) ||
                         pkgRel.EndsWith("plugin.json", StringComparison.OrdinalIgnoreCase))
                {
                    var sub = pkgRel.StartsWith("plugins/", StringComparison.OrdinalIgnoreCase)
                        ? pkgRel.Substring("plugins/".Length)
                        : Path.Combine(safeArtifactName, Path.GetFileName(pkgRel));
                    resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "plugins", sub.Replace('/', Path.DirectorySeparatorChar));
                }
                // 9. Un-prefixed files: classify by extension / naming convention
                else
                {
                    if (pkgRel.EndsWith(".instructions.md", StringComparison.OrdinalIgnoreCase) ||
                        pkgRel.Equals("copilot-instructions.md", StringComparison.OrdinalIgnoreCase))
                    {
                        resolvedAbsolute = pkgRel.Equals("copilot-instructions.md", StringComparison.OrdinalIgnoreCase)
                            ? Path.Combine(workspaceRoot, ".github", "copilot-instructions.md")
                            : Path.Combine(workspaceRoot, ".github", "instructions", Path.GetFileName(pkgRel));
                    }
                    else
                    {
                        var detected = _classifier.Classify(pkgRel);
                        if (detected.Type == ArtifactType.Agent ||
                            (pkgRel.EndsWith(".md", StringComparison.OrdinalIgnoreCase) && !pkgRel.Equals("README.md", StringComparison.OrdinalIgnoreCase)))
                        {
                            var destFile = Path.GetFileName(pkgRel);
                            resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "agents", destFile);
                        }
                        else if (detected.Type == ArtifactType.Skill)
                        {
                            resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "skills", safeArtifactName, Path.GetFileName(pkgRel));
                        }
                        else if (detected.Type == ArtifactType.Prompt)
                        {
                            resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "prompts", Path.GetFileName(pkgRel));
                        }
                        else if (detected.Type == ArtifactType.Command)
                        {
                            resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "commands", Path.GetFileName(pkgRel));
                        }
                        else if (detected.Type == ArtifactType.McpServer)
                        {
                            resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "mcp", safeArtifactName, Path.GetFileName(pkgRel));
                        }
                        else if (detected.Type == ArtifactType.Plugin)
                        {
                            resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "plugins", safeArtifactName, Path.GetFileName(pkgRel));
                        }
                        else
                        {
                            // Package manifests (cip.yml, cip.lock.yaml, .gitignore), README.md, or general package files -> .github/packages/<safeArtifactName>/
                            resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "packages", safeArtifactName, pkgRel.Replace('/', Path.DirectorySeparatorChar));
                        }
                    }
                }
                break;

            case "mcp" or "mcp-server" or "mcpserver":
                if (normalizedPath.StartsWith(".github/mcp/", StringComparison.OrdinalIgnoreCase) ||
                    normalizedPath.StartsWith($".mcp/{safeArtifactName}/", StringComparison.OrdinalIgnoreCase) ||
                    normalizedPath.StartsWith($"mcp/{safeArtifactName}/", StringComparison.OrdinalIgnoreCase))
                {
                    resolvedAbsolute = Path.Combine(workspaceRoot, normalizedPath.Replace('/', Path.DirectorySeparatorChar));
                }
                else
                {
                    var baseMcpDir = Directory.Exists(Path.Combine(workspaceRoot, "mcp"))
                        ? Path.Combine(workspaceRoot, "mcp", safeArtifactName)
                        : Path.Combine(workspaceRoot, ".mcp", safeArtifactName);
                    resolvedAbsolute = Path.Combine(baseMcpDir, normalizedPath.Replace('/', Path.DirectorySeparatorChar));
                }
                break;

            case "skill":
                // Strip redundant leading "skills/" if not followed by the artifact name or another subfolder
                var cleanSkillRel = normalizedPath;
                if (cleanSkillRel.StartsWith("skills/", StringComparison.OrdinalIgnoreCase))
                {
                    var sub = cleanSkillRel.Substring("skills/".Length);
                    if (sub.Equals("SKILL.md", StringComparison.OrdinalIgnoreCase) || !sub.Contains('/'))
                    {
                        cleanSkillRel = sub;
                    }
                }

                if (cleanSkillRel.StartsWith($"skills/{safeArtifactName}/", StringComparison.OrdinalIgnoreCase) ||
                    cleanSkillRel.StartsWith($".agents/skills/{safeArtifactName}/", StringComparison.OrdinalIgnoreCase) ||
                    cleanSkillRel.StartsWith($".github/skills/{safeArtifactName}/", StringComparison.OrdinalIgnoreCase))
                {
                    resolvedAbsolute = Path.Combine(workspaceRoot, cleanSkillRel.Replace('/', Path.DirectorySeparatorChar));
                }
                else if (cleanSkillRel.StartsWith(".agents/skills/", StringComparison.OrdinalIgnoreCase) ||
                         cleanSkillRel.StartsWith("skills/", StringComparison.OrdinalIgnoreCase) ||
                         cleanSkillRel.StartsWith(".github/skills/", StringComparison.OrdinalIgnoreCase))
                {
                    resolvedAbsolute = Path.Combine(workspaceRoot, cleanSkillRel.Replace('/', Path.DirectorySeparatorChar));
                }
                else
                {
                    var baseSkillsDir = Directory.Exists(Path.Combine(workspaceRoot, ".github", "skills"))
                        ? Path.Combine(workspaceRoot, ".github", "skills", safeArtifactName)
                        : Directory.Exists(Path.Combine(workspaceRoot, ".agents", "skills"))
                            ? Path.Combine(workspaceRoot, ".agents", "skills", safeArtifactName)
                            : Path.Combine(workspaceRoot, "skills", safeArtifactName);
                    resolvedAbsolute = Path.Combine(baseSkillsDir, cleanSkillRel.Replace('/', Path.DirectorySeparatorChar));
                }
                break;

            case "command":
                if (normalizedPath.StartsWith(".github/commands/", StringComparison.OrdinalIgnoreCase) ||
                    normalizedPath.StartsWith("commands/", StringComparison.OrdinalIgnoreCase))
                {
                    resolvedAbsolute = Path.Combine(workspaceRoot, normalizedPath.Replace('/', Path.DirectorySeparatorChar));
                }
                else
                {
                    var baseCmdDir = Directory.Exists(Path.Combine(workspaceRoot, "commands"))
                        ? Path.Combine(workspaceRoot, "commands")
                        : Path.Combine(workspaceRoot, ".github", "commands");
                    resolvedAbsolute = Path.Combine(baseCmdDir, normalizedPath.Replace('/', Path.DirectorySeparatorChar));
                }
                break;

            case "prompt":
                if (normalizedPath.StartsWith(".github/prompts/", StringComparison.OrdinalIgnoreCase) ||
                    normalizedPath.StartsWith("prompts/", StringComparison.OrdinalIgnoreCase))
                {
                    resolvedAbsolute = Path.Combine(workspaceRoot, normalizedPath.Replace('/', Path.DirectorySeparatorChar));
                }
                else
                {
                    var basePromptDir = Directory.Exists(Path.Combine(workspaceRoot, "prompts"))
                        ? Path.Combine(workspaceRoot, "prompts")
                        : Path.Combine(workspaceRoot, ".github", "prompts");
                    resolvedAbsolute = Path.Combine(basePromptDir, normalizedPath.Replace('/', Path.DirectorySeparatorChar));
                }
                break;

            case "agent":
            default:
                if (isMultiFile)
                {
                    if (normalizedPath.StartsWith(".github/", StringComparison.OrdinalIgnoreCase) ||
                        normalizedPath.StartsWith("agents/", StringComparison.OrdinalIgnoreCase) ||
                        normalizedPath.StartsWith("skills/", StringComparison.OrdinalIgnoreCase) ||
                        normalizedPath.StartsWith(".agents/skills/", StringComparison.OrdinalIgnoreCase))
                    {
                        resolvedAbsolute = Path.Combine(workspaceRoot, normalizedPath.Replace('/', Path.DirectorySeparatorChar));
                    }
                    else if (normalizedPath.Equals("copilot-instructions.md", StringComparison.OrdinalIgnoreCase))
                    {
                        resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "copilot-instructions.md");
                    }
                    else if (normalizedPath.StartsWith("prompts/", StringComparison.OrdinalIgnoreCase))
                    {
                        var basePromptDir = Directory.Exists(Path.Combine(workspaceRoot, "prompts"))
                            ? Path.Combine(workspaceRoot, "prompts")
                            : Path.Combine(workspaceRoot, ".github", "prompts");
                        var promptSub = normalizedPath.Substring("prompts/".Length);
                        resolvedAbsolute = Path.Combine(basePromptDir, promptSub.Replace('/', Path.DirectorySeparatorChar));
                    }
                    else
                    {
                        var baseAgentsDir = Directory.Exists(Path.Combine(workspaceRoot, "agents"))
                            ? Path.Combine(workspaceRoot, "agents", safeArtifactName)
                            : Path.Combine(workspaceRoot, ".github", "agents", safeArtifactName);
                        resolvedAbsolute = Path.Combine(baseAgentsDir, normalizedPath.Replace('/', Path.DirectorySeparatorChar));
                    }
                }
                else
                {
                    if (normalizedPath.StartsWith(".github/", StringComparison.OrdinalIgnoreCase) ||
                        normalizedPath.StartsWith("agents/", StringComparison.OrdinalIgnoreCase) ||
                        normalizedPath.StartsWith("skills/", StringComparison.OrdinalIgnoreCase) ||
                        normalizedPath.StartsWith(".agents/skills/", StringComparison.OrdinalIgnoreCase))
                    {
                        resolvedAbsolute = Path.Combine(workspaceRoot, normalizedPath.Replace('/', Path.DirectorySeparatorChar));
                    }
                    else if (normalizedPath.Equals("copilot-instructions.md", StringComparison.OrdinalIgnoreCase))
                    {
                        resolvedAbsolute = Path.Combine(workspaceRoot, ".github", "copilot-instructions.md");
                    }
                    else if (normalizedPath.StartsWith("prompts/", StringComparison.OrdinalIgnoreCase))
                    {
                        var basePromptDir = Directory.Exists(Path.Combine(workspaceRoot, "prompts"))
                            ? Path.Combine(workspaceRoot, "prompts")
                            : Path.Combine(workspaceRoot, ".github", "prompts");
                        var promptSub = normalizedPath.Substring("prompts/".Length);
                        resolvedAbsolute = Path.Combine(basePromptDir, promptSub.Replace('/', Path.DirectorySeparatorChar));
                    }
                    else
                    {
                        var baseAgentsDir = Directory.Exists(Path.Combine(workspaceRoot, "agents"))
                            ? Path.Combine(workspaceRoot, "agents")
                            : Path.Combine(workspaceRoot, ".github", "agents");

                        string destFile;
                        var ext = Path.GetExtension(normalizedPath).ToLowerInvariant();
                        if (ext == ".py" || ext == ".sh" || ext == ".json" || ext == ".yml" || ext == ".yaml" || ext == ".ts" || ext == ".js" || ext == ".txt")
                        {
                            destFile = normalizedPath;
                        }
                        else
                        {
                            destFile = $"{safeArtifactName}.md";
                        }
                        resolvedAbsolute = Path.Combine(baseAgentsDir, destFile.Replace('/', Path.DirectorySeparatorChar));
                    }
                }
                break;
        }

        // Canonical Path Validation: verify resolved path is inside workspaceRoot
        var canonicalWorkspace = Path.GetFullPath(workspaceRoot).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        var canonicalResolved = Path.GetFullPath(resolvedAbsolute);

        var separator = Path.DirectorySeparatorChar.ToString();
        var isInside = canonicalResolved.Equals(canonicalWorkspace, StringComparison.OrdinalIgnoreCase) ||
                       canonicalResolved.StartsWith(canonicalWorkspace + separator, StringComparison.OrdinalIgnoreCase);

        if (!isInside)
        {
            throw new InvalidOperationException($"Security violation: Resolved destination path '{canonicalResolved}' is outside workspace root '{canonicalWorkspace}'.");
        }

        return resolvedAbsolute;
    }

    /// <summary>
    /// Strips legacy producer/workspace folder prefixes such as "cip-consumer-poc/", "subfolder/.github/",
    /// ".cip/skills/", or ".agents/agents/" so that artifact files land in their proper workspace root locations.
    /// </summary>
    private static string StripSourceFolderPrefixes(string path)
    {
        if (string.IsNullOrWhiteSpace(path)) return path;
        var p = path.Replace('\\', '/').TrimStart('/');

        // 1. If it contains .github/ at any index > 0 (e.g. "cip-consumer-poc/.github/agents/foo.agent.md")
        var idxGh = p.IndexOf(".github/", StringComparison.OrdinalIgnoreCase);
        if (idxGh > 0)
        {
            return p.Substring(idxGh);
        }

        // 2. If it contains .agents/skills/ at any index > 0
        var idxAg = p.IndexOf(".agents/skills/", StringComparison.OrdinalIgnoreCase);
        if (idxAg > 0)
        {
            return p.Substring(idxAg);
        }

        // 3. If it contains .agents/agents/ anywhere (convert to .github/agents/)
        var idxAgentsAgents = p.IndexOf(".agents/agents/", StringComparison.OrdinalIgnoreCase);
        if (idxAgentsAgents >= 0)
        {
            return ".github/agents/" + p.Substring(idxAgentsAgents + ".agents/agents/".Length);
        }

        // 4. If it contains .cip/skills/ anywhere (convert to skills/)
        var idxCipSk = p.IndexOf(".cip/skills/", StringComparison.OrdinalIgnoreCase);
        if (idxCipSk >= 0)
        {
            return "skills/" + p.Substring(idxCipSk + ".cip/skills/".Length);
        }

        // 5. If it contains .cip/agents/ anywhere (convert to .github/agents/)
        var idxCipAg = p.IndexOf(".cip/agents/", StringComparison.OrdinalIgnoreCase);
        if (idxCipAg >= 0)
        {
            return ".github/agents/" + p.Substring(idxCipAg + ".cip/agents/".Length);
        }

        // 5b. If it contains /agents/ (and not already starting with .github/)
        var idxAgents = p.IndexOf("/agents/", StringComparison.OrdinalIgnoreCase);
        if (idxAgents >= 0 && !p.StartsWith(".github/", StringComparison.OrdinalIgnoreCase))
        {
            return p.Substring(idxAgents + 1);
        }

        // 5c. If it contains .cip/instructions/ anywhere (convert to .github/instructions/)
        var idxCipInst = p.IndexOf(".cip/instructions/", StringComparison.OrdinalIgnoreCase);
        if (idxCipInst >= 0)
        {
            return ".github/instructions/" + p.Substring(idxCipInst + ".cip/instructions/".Length);
        }

        // 5d. If it contains /instructions/ (and not already starting with .github/)
        var idxInst = p.IndexOf("/instructions/", StringComparison.OrdinalIgnoreCase);
        if (idxInst >= 0 && !p.StartsWith(".github/", StringComparison.OrdinalIgnoreCase))
        {
            return ".github/instructions/" + p.Substring(idxInst + "/instructions/".Length);
        }

        // 6. If it contains /skills/ (and not already starting with .github/ or .agents/)
        var idxSkills = p.IndexOf("/skills/", StringComparison.OrdinalIgnoreCase);
        if (idxSkills >= 0 && !p.StartsWith(".github/", StringComparison.OrdinalIgnoreCase) && !p.StartsWith(".agents/", StringComparison.OrdinalIgnoreCase))
        {
            return p.Substring(idxSkills + 1);
        }

        // 7. If it contains /prompts/ (and not already starting with .github/)
        var idxPrompts = p.IndexOf("/prompts/", StringComparison.OrdinalIgnoreCase);
        if (idxPrompts >= 0 && !p.StartsWith(".github/", StringComparison.OrdinalIgnoreCase))
        {
            return p.Substring(idxPrompts + 1);
        }

        // 8. If it contains /commands/ (and not already starting with .github/)
        var idxCommands = p.IndexOf("/commands/", StringComparison.OrdinalIgnoreCase);
        if (idxCommands >= 0 && !p.StartsWith(".github/", StringComparison.OrdinalIgnoreCase))
        {
            return p.Substring(idxCommands + 1);
        }

        // 9. If it contains /plugins/ (and not already starting with .github/)
        var idxPlugins = p.IndexOf("/plugins/", StringComparison.OrdinalIgnoreCase);
        if (idxPlugins >= 0 && !p.StartsWith(".github/", StringComparison.OrdinalIgnoreCase))
        {
            return p.Substring(idxPlugins + 1);
        }

        // 10. If it contains /.mcp/ or /mcp/
        var idxMcp = p.IndexOf("/.mcp/", StringComparison.OrdinalIgnoreCase);
        if (idxMcp >= 0)
        {
            return p.Substring(idxMcp + 1);
        }
        var idxMcp2 = p.IndexOf("/mcp/", StringComparison.OrdinalIgnoreCase);
        if (idxMcp2 >= 0 && !p.StartsWith(".github/", StringComparison.OrdinalIgnoreCase))
        {
            return p.Substring(idxMcp2 + 1);
        }

        // 11. If path itself starts with .agents/agents/
        if (p.StartsWith(".agents/agents/", StringComparison.OrdinalIgnoreCase))
        {
            return ".github/agents/" + p.Substring(".agents/agents/".Length);
        }

        return p;
    }

    public IEnumerable<string> PlaceArtifact(string workspaceRoot, string artifactType, string artifactName, IEnumerable<ArtifactFileEntry> files, string? version = null)
    {
        var placedPaths = new List<string>();
        var fileList = files?.Where(f => !string.IsNullOrWhiteSpace(f.Path)).ToList() ?? new List<ArtifactFileEntry>();
        if (!fileList.Any()) return placedPaths;

        // Ensure .github folder exists in workspace for GitHub Copilot
        var githubDir = Path.Combine(workspaceRoot, ".github");
        if (!Directory.Exists(githubDir))
        {
            try
            {
                Directory.CreateDirectory(githubDir);
            }
            catch (Exception) { /* handled non-fatal CLI fallback */ }
        }

        bool isMulti = fileList.Count > 1;
        var placedRelativePaths = new List<string>();

        foreach (var file in fileList)
        {
            var destinationPath = ResolveDestinationPath(workspaceRoot, artifactType, artifactName, file.Path, isMulti);
            var parentDir = Path.GetDirectoryName(destinationPath);
            if (!string.IsNullOrEmpty(parentDir))
            {
                Directory.CreateDirectory(parentDir);
            }

            File.WriteAllText(destinationPath, file.Content ?? string.Empty);
            placedPaths.Add(destinationPath);

            var rel = Path.GetRelativePath(workspaceRoot, destinationPath).Replace('\\', '/');
            placedRelativePaths.Add(rel);
        }

        // Clean obsolete files from previously installed version of this artifact
        CleanObsoleteArtifactFiles(workspaceRoot, artifactName, placedRelativePaths);

        // Save updated installation manifest
        SaveInstalledManifest(workspaceRoot, new InstalledArtifactManifest
        {
            ArtifactName = artifactName,
            ArtifactType = artifactType,
            Version = version ?? "1.0.0",
            InstalledAt = DateTime.UtcNow,
            PlacedFiles = placedRelativePaths
        });

        // Automatically sync installed MCP servers to .vscode/mcp.json for GitHub Copilot
        SyncMcpServersToVsCodeConfig(workspaceRoot, placedPaths);

        // Automatically sync installed Commands and Prompts to .github/prompts/ and .vscode/settings.json for GitHub Copilot
        SyncCopilotPromptConfig(workspaceRoot, artifactType, artifactName, placedPaths);

        return placedPaths;
    }

    public string PlaceSingleFileContent(string workspaceRoot, string artifactType, string artifactName, string content, string? version = null)
    {
        // Ensure .github folder exists in workspace for GitHub Copilot
        var githubDir = Path.Combine(workspaceRoot, ".github");
        if (!Directory.Exists(githubDir))
        {
            try
            {
                Directory.CreateDirectory(githubDir);
            }
            catch (Exception) { /* handled non-fatal CLI fallback */ }
        }

        var normType = (artifactType ?? "agent").Trim().ToLowerInvariant();
        var safeArtifactName = Path.GetFileName(string.IsNullOrWhiteSpace(artifactName) ? "artifact" : artifactName);

        string targetPath;
        switch (normType)
        {
            case "agent":
                var baseAgentsDir = Directory.Exists(Path.Combine(workspaceRoot, ".github", "agents"))
                    ? Path.Combine(workspaceRoot, ".github", "agents")
                    : Directory.Exists(Path.Combine(workspaceRoot, "agents"))
                        ? Path.Combine(workspaceRoot, "agents")
                        : Path.Combine(workspaceRoot, ".github", "agents");
                targetPath = Path.Combine(baseAgentsDir, $"{safeArtifactName}.md");
                break;

            case "skill":
                var baseSkillsDir = Directory.Exists(Path.Combine(workspaceRoot, ".github", "skills"))
                    ? Path.Combine(workspaceRoot, ".github", "skills", safeArtifactName)
                    : Directory.Exists(Path.Combine(workspaceRoot, ".agents", "skills"))
                        ? Path.Combine(workspaceRoot, ".agents", "skills", safeArtifactName)
                        : Path.Combine(workspaceRoot, "skills", safeArtifactName);
                targetPath = Path.Combine(baseSkillsDir, "SKILL.md");
                break;

            case "command":
                var baseCmdDir = Directory.Exists(Path.Combine(workspaceRoot, ".github", "commands"))
                    ? Path.Combine(workspaceRoot, ".github", "commands")
                    : Directory.Exists(Path.Combine(workspaceRoot, "commands"))
                        ? Path.Combine(workspaceRoot, "commands")
                        : Path.Combine(workspaceRoot, ".github", "commands");
                targetPath = Path.Combine(baseCmdDir, $"{safeArtifactName}.command.md");
                break;

            case "prompt":
                var basePromptDir = Directory.Exists(Path.Combine(workspaceRoot, ".github", "prompts"))
                    ? Path.Combine(workspaceRoot, ".github", "prompts")
                    : Directory.Exists(Path.Combine(workspaceRoot, "prompts"))
                        ? Path.Combine(workspaceRoot, "prompts")
                        : Path.Combine(workspaceRoot, ".github", "prompts");
                targetPath = Path.Combine(basePromptDir, $"{safeArtifactName}.prompt.md");
                break;

            case "plugin":
                targetPath = Path.Combine(workspaceRoot, "plugins", safeArtifactName, "plugin.json");
                break;

            case "mcp" or "mcp-server" or "mcpserver":
                var baseMcpDir = Directory.Exists(Path.Combine(workspaceRoot, "mcp"))
                    ? Path.Combine(workspaceRoot, "mcp", safeArtifactName)
                    : Path.Combine(workspaceRoot, ".mcp", safeArtifactName);
                targetPath = Path.Combine(baseMcpDir, "server.json");
                break;

            case "package" or "cip-package" or "cippackage":
                var detectedSingle = _classifier.Classify(safeArtifactName);
                if (detectedSingle.Type == ArtifactType.Agent)
                {
                    targetPath = Path.Combine(workspaceRoot, ".github", "agents", $"{safeArtifactName}.md");
                }
                else if (detectedSingle.Type == ArtifactType.Skill)
                {
                    targetPath = Path.Combine(workspaceRoot, ".github", "skills", safeArtifactName, "SKILL.md");
                }
                else if (detectedSingle.Type == ArtifactType.Prompt)
                {
                    targetPath = Path.Combine(workspaceRoot, ".github", "prompts", $"{safeArtifactName}.prompt.md");
                }
                else if (detectedSingle.Type == ArtifactType.Command)
                {
                    targetPath = Path.Combine(workspaceRoot, ".github", "commands", $"{safeArtifactName}.command.md");
                }
                else
                {
                    targetPath = Path.Combine(workspaceRoot, ".github", "packages", safeArtifactName, "cip.yml");
                }
                break;

            default:
                targetPath = Path.Combine(workspaceRoot, "artifacts", $"{safeArtifactName}.md");
                break;
        }

        var dir = Path.GetDirectoryName(targetPath);
        if (!string.IsNullOrEmpty(dir))
        {
            Directory.CreateDirectory(dir);
        }

        var fullTargetPath = Path.GetFullPath(targetPath);
        var fullWorkspace = Path.GetFullPath(workspaceRoot);
        if (!fullTargetPath.StartsWith(fullWorkspace, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Target path is outside the workspace root.");
        }

        File.WriteAllText(fullTargetPath, content ?? string.Empty); // nosemgrep: csharp.lang.security.filesystem.unsafe-path-combine.unsafe-path-combine

        var relPath = Path.GetRelativePath(workspaceRoot, targetPath).Replace('\\', '/');

        // Clean obsolete files and save manifest
        CleanObsoleteArtifactFiles(workspaceRoot, artifactName, new[] { relPath });
        SaveInstalledManifest(workspaceRoot, new InstalledArtifactManifest
        {
            ArtifactName = artifactName,
            ArtifactType = artifactType ?? "unknown",
            Version = version ?? "1.0.0",
            InstalledAt = DateTime.UtcNow,
            PlacedFiles = new List<string> { relPath }
        });

        // Automatically sync installed MCP servers to .vscode/mcp.json for GitHub Copilot
        SyncMcpServersToVsCodeConfig(workspaceRoot, new[] { targetPath });

        // Automatically sync installed Commands and Prompts to .github/prompts/ and .vscode/settings.json for GitHub Copilot
        SyncCopilotPromptConfig(workspaceRoot, artifactType ?? "unknown", artifactName, new[] { targetPath }, content);

        return targetPath;
    }

    public InstalledArtifactManifest? GetInstalledManifest(string workspaceRoot, string artifactName)
    {
        var manifestPath = GetManifestFilePath(workspaceRoot, artifactName);
        if (!File.Exists(manifestPath)) return null;

        try
        {
            var json = File.ReadAllText(manifestPath);
            return JsonSerializer.Deserialize<InstalledArtifactManifest>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch
        {
            return null;
        }
    }

    public IEnumerable<string> CleanObsoleteArtifactFiles(string workspaceRoot, string artifactName, IEnumerable<string> newPlacedRelativePaths)
    {
        var removed = new List<string>();
        var oldManifest = GetInstalledManifest(workspaceRoot, artifactName);
        if (oldManifest == null || oldManifest.PlacedFiles == null || !oldManifest.PlacedFiles.Any())
        {
            return removed;
        }

        var newSet = new HashSet<string>(newPlacedRelativePaths.Select(p => p.Replace('\\', '/')), StringComparer.OrdinalIgnoreCase);

        foreach (var oldRelPath in oldManifest.PlacedFiles)
        {
            var normalizedOldRel = oldRelPath.Replace('\\', '/');
            if (!newSet.Contains(normalizedOldRel))
            {
                var fullOldPath = Path.Combine(workspaceRoot, normalizedOldRel.Replace('/', Path.DirectorySeparatorChar));
                if (File.Exists(fullOldPath))
                {
                    try
                    {
                        File.Delete(fullOldPath);
                        removed.Add(fullOldPath);

                        // If directory is now empty, clean it up recursively towards workspaceRoot
                        var parentDir = Path.GetDirectoryName(fullOldPath);
                        var canonicalRoot = Path.GetFullPath(workspaceRoot).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                        while (!string.IsNullOrEmpty(parentDir) &&
                               !string.Equals(Path.GetFullPath(parentDir).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar), canonicalRoot, StringComparison.OrdinalIgnoreCase) &&
                               Directory.Exists(parentDir) &&
                               !Directory.EnumerateFileSystemEntries(parentDir).Any())
                        {
                            Directory.Delete(parentDir);
                            parentDir = Path.GetDirectoryName(parentDir);
                        }
                    }
                    catch
                    {
                        // Ignore deletion errors on cleanup
                    }
                }
            }
        }

        return removed;
    }

    private void SaveInstalledManifest(string workspaceRoot, InstalledArtifactManifest manifest)
    {
        try
        {
            var manifestPath = GetManifestFilePath(workspaceRoot, manifest.ArtifactName);
            var parentDir = Path.GetDirectoryName(manifestPath);
            if (!string.IsNullOrEmpty(parentDir))
            {
                Directory.CreateDirectory(parentDir);
            }

            var json = JsonSerializer.Serialize(manifest, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(manifestPath, json);
        }
        catch
        {
            // Manifest saving failure should not block core installation
        }
    }

    private static string GetManifestFilePath(string workspaceRoot, string artifactName)
    {
        var safeName = string.IsNullOrWhiteSpace(artifactName) ? "artifact" : artifactName;
        return Path.Combine(workspaceRoot, ".cip", "installed", $"{safeName}.json");
    }

    /// <summary>
    /// Synchronizes installed MCP server configurations into .vscode/mcp.json so GitHub Copilot in VS Code immediately discovers them.
    /// </summary>
    public static void SyncMcpServersToVsCodeConfig(string workspaceRoot, IEnumerable<string> placedFilePaths)
    {
        try
        {
            var mcpConfigs = new Dictionary<string, JToken>();
            foreach (var path in placedFilePaths)
            {
                if (!File.Exists(path)) continue;
                var fileName = Path.GetFileName(path).ToLowerInvariant();
                if (fileName == "mcp.json" || fileName == "server.json" || fileName.EndsWith(".mcp.json") || fileName == "mcp_config.json")
                {
                    try
                    {
                        var text = File.ReadAllText(path);
                        var obj = JObject.Parse(text);
                        if (obj["mcpServers"] is JObject serversObj)
                        {
                            foreach (var prop in serversObj.Properties())
                            {
                                mcpConfigs[prop.Name] = prop.Value.DeepClone();
                            }
                        }
                    }
                    catch (Exception) { /* handled non-fatal CLI fallback */ }
                }
            }

            if (!mcpConfigs.Any()) return;

            var vscodeDir = Path.Combine(workspaceRoot, ".vscode");
            if (!Directory.Exists(vscodeDir))
            {
                Directory.CreateDirectory(vscodeDir);
            }

            var fullWorkspace = Path.GetFullPath(workspaceRoot);
            var mcpJsonPath = Path.Combine(vscodeDir, "mcp.json");
            var fullMcpPath = Path.GetFullPath(mcpJsonPath);
            if (!fullMcpPath.StartsWith(fullWorkspace, StringComparison.OrdinalIgnoreCase)) return;

            JObject rootObj;
            if (File.Exists(fullMcpPath))
            {
                try
                {
                    rootObj = JObject.Parse(File.ReadAllText(fullMcpPath)); // nosemgrep: csharp.lang.security.filesystem.unsafe-path-combine.unsafe-path-combine
                }
                catch
                {
                    rootObj = new JObject();
                }
            }
            else
            {
                rootObj = new JObject();
            }

            if (!(rootObj["mcpServers"] is JObject existingServers))
            {
                existingServers = new JObject();
                rootObj["mcpServers"] = existingServers;
            }

            foreach (var kvp in mcpConfigs)
            {
                existingServers[kvp.Key] = kvp.Value;
            }

            File.WriteAllText(fullMcpPath, rootObj.ToString(Newtonsoft.Json.Formatting.Indented)); // nosemgrep: csharp.lang.security.filesystem.unsafe-path-combine.unsafe-path-combine
        }
        catch (Exception) { /* handled non-fatal CLI fallback */ }
    }

    /// <summary>
    /// Synchronizes command and prompt artifacts into .github/prompts/*.prompt.md and .vscode/settings.json
    /// so GitHub Copilot Chat in VS Code recognizes them as slash commands (e.g. /run-linter).
    /// </summary>
    public static void SyncCopilotPromptConfig(string workspaceRoot, string artifactType, string artifactName, IEnumerable<string> placedFilePaths, string? content = null)
    {
        try
        {
            var normType = (artifactType ?? string.Empty).Trim().ToLowerInvariant();
            var isCommand = normType == "command" || placedFilePaths.Any(p => p.EndsWith(".command.md", StringComparison.OrdinalIgnoreCase));
            var isPrompt = normType == "prompt" || placedFilePaths.Any(p => p.EndsWith(".prompt.md", StringComparison.OrdinalIgnoreCase));

            if (isCommand)
            {
                var promptsDir = Path.Combine(workspaceRoot, ".github", "prompts");
                if (!Directory.Exists(promptsDir))
                {
                    Directory.CreateDirectory(promptsDir);
                }

                var safeName = Path.GetFileName(artifactName);
                var promptFile = Path.Combine(promptsDir, $"{safeName}.prompt.md");
                var fullPromptPath = Path.GetFullPath(promptFile);
                var fullWorkspace = Path.GetFullPath(workspaceRoot);
                if (fullPromptPath.StartsWith(fullWorkspace, StringComparison.OrdinalIgnoreCase) && !File.Exists(fullPromptPath))
                {
                    string fileBody = content ?? string.Empty;
                    if (string.IsNullOrEmpty(fileBody))
                    {
                        var cmdFile = placedFilePaths.FirstOrDefault(p => p.EndsWith(".command.md", StringComparison.OrdinalIgnoreCase) && File.Exists(p));
                        if (!string.IsNullOrEmpty(cmdFile))
                        {
                            fileBody = File.ReadAllText(cmdFile);
                        }
                    }

                    if (!string.IsNullOrWhiteSpace(fileBody))
                    {
                        File.WriteAllText(fullPromptPath, fileBody); // nosemgrep: csharp.lang.security.filesystem.unsafe-path-combine.unsafe-path-combine
                    }
                }
            }

            if (isCommand || isPrompt)
            {
                var vscodeDir = Path.Combine(workspaceRoot, ".vscode");
                if (!Directory.Exists(vscodeDir))
                {
                    Directory.CreateDirectory(vscodeDir);
                }

                var fullWorkspaceSettings = Path.GetFullPath(workspaceRoot);
                var settingsPath = Path.Combine(vscodeDir, "settings.json");
                var fullSettingsPath = Path.GetFullPath(settingsPath);
                if (!fullSettingsPath.StartsWith(fullWorkspaceSettings, StringComparison.OrdinalIgnoreCase)) return;

                JObject settingsObj;
                if (File.Exists(fullSettingsPath))
                {
                    try
                    {
                        settingsObj = JObject.Parse(File.ReadAllText(fullSettingsPath)); // nosemgrep: csharp.lang.security.filesystem.unsafe-path-combine.unsafe-path-combine
                    }
                    catch
                    {
                        settingsObj = new JObject();
                    }
                }
                else
                {
                    settingsObj = new JObject();
                }

                settingsObj["chat.promptFiles"] = true;

                if (!(settingsObj["chat.promptFilesLocations"] is JObject locationsObj))
                {
                    locationsObj = new JObject();
                    settingsObj["chat.promptFilesLocations"] = locationsObj;
                }
                locationsObj[".github/prompts"] = true;

                File.WriteAllText(fullSettingsPath, settingsObj.ToString(Newtonsoft.Json.Formatting.Indented)); // nosemgrep: csharp.lang.security.filesystem.unsafe-path-combine.unsafe-path-combine
            }
        }
        catch (Exception) { /* handled non-fatal CLI fallback */ }
    }
}


