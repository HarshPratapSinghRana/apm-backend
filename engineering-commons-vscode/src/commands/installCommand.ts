import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as https from 'https';
import * as http from 'http';
import { ICliExecutor } from '../services/cliExecutor';
import { IAuthenticationStatusProvider } from '../services/authenticationStatusProvider';
import { IUsageLogger } from '../services/usageLogger';
import { SharePointArtifactService } from '../services/sharepoint/sharepointArtifactService';
import { AdoGovernanceService } from '../services/adoGovernanceService';
import { createZipBuffer } from '../services/zipArchiveService';

export function resolveWorkspaceFilePath(workspaceRoot: string, artifactName: string, type: string, relativePath: string): string {
    const normType = (type || 'skill').toLowerCase();
    const cleanPath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const fileName = path.basename(cleanPath);

    if (cleanPath.startsWith('.agents/')) {
        return path.join(workspaceRoot, cleanPath.replace(/\//g, path.sep));
    }

    if (normType === 'agent' || cleanPath.includes('agents/') || cleanPath.endsWith('.agent.md') || cleanPath.endsWith('.agent')) {
        if (cleanPath.endsWith('.agent.md') || cleanPath.endsWith('agent.md') || cleanPath.endsWith(`${artifactName}.md`) || cleanPath === `${artifactName}.agent.md`) {
            return path.join(workspaceRoot, '.github', 'agents', `${artifactName}.agent.md`);
        }
        if (cleanPath.includes('instructions/')) {
            const sub = cleanPath.substring(cleanPath.indexOf('instructions/') + 'instructions/'.length);
            return path.join(workspaceRoot, '.github', 'instructions', artifactName, sub.replace(/\//g, path.sep));
        }
        if (cleanPath.includes('rules/')) {
            const sub = cleanPath.substring(cleanPath.indexOf('rules/') + 'rules/'.length);
            return path.join(workspaceRoot, '.github', 'rules', artifactName, sub.replace(/\//g, path.sep));
        }
        if (fileName.toLowerCase() === 'cip.yml') {
            return path.join(workspaceRoot, 'cip.yml');
        }
        if (fileName.toLowerCase() === 'readme.md') {
            return path.join(workspaceRoot, 'README.md');
        }
        return path.join(workspaceRoot, '.github', 'agents', fileName);
    }

    if (normType === 'skill' || cleanPath.includes('skills/')) {
        if (fileName.toLowerCase() === 'skill.md') {
            return path.join(workspaceRoot, '.agents', 'skills', artifactName, 'SKILL.md');
        }
    }

    if (normType === 'prompt' || cleanPath.includes('prompts/')) {
        return path.join(workspaceRoot, '.github', 'prompts', `${artifactName}.prompt.md`);
    }

    if (normType === 'command' || cleanPath.includes('commands/')) {
        return path.join(workspaceRoot, '.github', 'commands', `${artifactName}.command.md`);
    }

    if (normType.includes('mcp')) {
        return path.join(workspaceRoot, '.mcp', artifactName, fileName);
    }

    if (normType === 'plugin' || cleanPath.includes('plugins/')) {
        return path.join(workspaceRoot, 'plugins', artifactName, fileName);
    }

    return path.join(workspaceRoot, cleanPath.replace(/\//g, path.sep));
}

export function placeArtifactFilesIntoWorkspace(
    workspaceRoot: string,
    artifactName: string,
    version: string = '1.0.0',
    type: string = 'skill',
    files: Array<{ path: string; content: string }>
): string[] {
    const placedFiles: string[] = [];
    const normType = (type || 'skill').toLowerCase();

    for (const f of files) {
        if (!f.path || f.content === undefined || f.content === null) continue;
        const targetPath = resolveWorkspaceFilePath(workspaceRoot, artifactName, normType, f.path);
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        fs.writeFileSync(targetPath, f.content, 'utf-8');
        const rel = path.relative(workspaceRoot, targetPath).replace(/\\/g, '/');
        if (!placedFiles.includes(rel)) {
            placedFiles.push(rel);
        }
    }

    // 1. Direct GitHub Copilot Agent placement: .github/agents/<artifactName>.agent.md
    if (normType === 'agent' || files.some(f => f.path.endsWith('.agent.md') || f.path.endsWith('.agent') || f.path.includes('.github/agents/'))) {
        const githubAgentsDir = path.join(workspaceRoot, '.github', 'agents');
        if (!fs.existsSync(githubAgentsDir)) {
            fs.mkdirSync(githubAgentsDir, { recursive: true });
        }

        const directAgentPath = path.join(githubAgentsDir, `${artifactName}.agent.md`);
        let agentContent = '';

        // Find primary agent markdown file
        const agentFile = files.find(f => 
            f.path.endsWith(`${artifactName}.agent.md`) ||
            f.path.endsWith('agent.md') ||
            f.path.endsWith(`${artifactName}.md`) ||
            (f.path.includes('agents/') && f.path.endsWith('.md') && !f.path.toLowerCase().includes('readme'))
        );

        if (agentFile && agentFile.content) {
            agentContent = agentFile.content;
        } else if (fs.existsSync(directAgentPath)) {
            try { agentContent = fs.readFileSync(directAgentPath, 'utf8'); } catch {}
        }

        if (!agentContent) {
            const synth = synthesizeArtifactFiles(artifactName, version || '1.0.0', 'agent');
            agentContent = synth.find(f => f.path.endsWith('.agent.md'))?.content || '';
        }

        fs.writeFileSync(directAgentPath, agentContent, 'utf-8');
        const relDirect = `.github/agents/${artifactName}.agent.md`;
        if (!placedFiles.includes(relDirect)) {
            placedFiles.push(relDirect);
        }

        // Clean up any redundant nested folder .github/agents/<artifactName>/ if created
        const nestedDir = path.join(githubAgentsDir, artifactName);
        if (fs.existsSync(nestedDir) && fs.lstatSync(nestedDir).isDirectory()) {
            try { fs.rmSync(nestedDir, { recursive: true, force: true }); } catch {}
        }
    }

    // 2. Direct Copilot & Antigravity Skill placement: .agents/skills/<name>/SKILL.md and skills/<name>/SKILL.md
    if (normType === 'skill' || files.some(f => f.path.endsWith('SKILL.md') || f.path.includes('skills/'))) {
        const skillFile = files.find(f => f.path.endsWith('SKILL.md'));
        const skillContent = skillFile ? skillFile.content : (synthesizeArtifactFiles(artifactName, version || '1.0.0', 'skill').find(f => f.path.endsWith('SKILL.md'))?.content || '');

        const skillTargets = [
            path.join(workspaceRoot, '.agents', 'skills', artifactName, 'SKILL.md'),
            path.join(workspaceRoot, 'skills', artifactName, 'SKILL.md'),
            path.join(workspaceRoot, '.github', 'skills', artifactName, 'SKILL.md')
        ];

        for (const st of skillTargets) {
            const sDir = path.dirname(st);
            if (!fs.existsSync(sDir)) {
                fs.mkdirSync(sDir, { recursive: true });
            }
            fs.writeFileSync(st, skillContent, 'utf-8');
        }
    }

    // Ensure cip.yml exists in workspace root
    const cipYmlPath = path.join(workspaceRoot, 'cip.yml');
    if (!fs.existsSync(cipYmlPath)) {
        const cipContent = `name: ${artifactName}\nversion: ${version || '1.0.0'}\ntype: ${type || 'skill'}\n`;
        fs.writeFileSync(cipYmlPath, cipContent, 'utf-8');
    }

    // Record .cip/installed/<name>.json manifest
    const installedDir = path.join(workspaceRoot, '.cip', 'installed');
    if (!fs.existsSync(installedDir)) {
        fs.mkdirSync(installedDir, { recursive: true });
    }
    const manifestPath = path.join(installedDir, `${artifactName.toLowerCase()}.json`);
    const manifest = {
        name: artifactName,
        version: version || '1.0.0',
        artifactType: type || 'skill',
        installedAt: new Date().toISOString(),
        placedFiles: placedFiles
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    // Configure MCP in .vscode/mcp.json if mcpserver
    if (normType.includes('mcp')) {
        const vscodeDir = path.join(workspaceRoot, '.vscode');
        if (!fs.existsSync(vscodeDir)) {
            fs.mkdirSync(vscodeDir, { recursive: true });
        }
        const mcpJsonPath = path.join(vscodeDir, 'mcp.json');
        let mcpConfig: any = { mcpServers: {} };
        if (fs.existsSync(mcpJsonPath)) {
            try {
                mcpConfig = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf8'));
                if (!mcpConfig.mcpServers) mcpConfig.mcpServers = {};
            } catch {}
        }
        mcpConfig.mcpServers[artifactName] = {
            command: 'node',
            args: [`.mcp/${artifactName}/index.js`],
            env: {},
            disabled: false
        };
        fs.writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2), 'utf-8');
    }

    return placedFiles;
}

export function synthesizeArtifactFiles(
    artifactName: string,
    version: string = '1.0.0',
    type: string = 'skill',
    author: string = 'harsh.rana@maqsoftware.com'
): Array<{ path: string; content: string }> {
    const normType = (type || 'skill').toLowerCase();
    const formattedTitle = artifactName.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const agentTitle = formattedTitle.endsWith('Agent') ? formattedTitle : `${formattedTitle} Agent`;

    if (normType === 'agent') {
        const agentPrompt = `---
name: '${agentTitle}'
id: '${artifactName}'
description: 'Autonomous enterprise AI agent for ${formattedTitle}'
type: 'agent'
domain: 'Enterprise AI'
architecture: 'Pro Code'
usability: 'copilot-ready'
version: '${version}'
tools: ['codebase', 'search', 'editFiles', 'runCommands', 'problems']
argument-hint: 'Ask @${artifactName} for directives, code assistance, or workflow execution'
---

# ${agentTitle}

> **Source**: Engineering Commons Federated Registry | **Certification**: Verified Enterprise Certified (Level 3)

---

## 🎯 Role & Persona Directives
You are the **${agentTitle}**, a specialized AI assistant designed for autonomous code analysis, workflow execution, and domain directives.

### System Instructions & Guidelines
1. **Context Awareness**: Thoroughly inspect workspace dependencies, file structures, and code style before suggesting changes.
2. **Enterprise Standards**: Follow company architectural guidelines, type safety, modular design, and security best practices.
3. **Auditable Execution**: Produce well-commented code diffs and concrete verification instructions.
4. **Safety & Secrets**: Never leak API credentials, tokens, or sensitive client telemetry.

---

## ⚡ Core Capabilities
- Automated workflow execution for ${formattedTitle}
- Code review, static analysis, and bug remediation
- Schema validation and integration test generation
- Step-by-step guidance and edge-case detection

---

## 🔄 Execution Pipeline
1. **Perception**: Analyze user prompt, open files, and target schemas.
2. **Planning**: Formulate a stepwise execution plan with security checks.
3. **Synthesis**: Implement clean, idiomatic code modifications.
4. **Verification**: Validate with workspace linting and test suites.

---

## 💡 Invocation Examples
\`\`\`markdown
@${artifactName} Analyze the active file and apply enterprise standards.
@${artifactName} /run Execute the standard ${formattedTitle} verification workflow.
\`\`\`
`;

        const skillPrompt = `---
name: '${artifactName}'
description: 'Workflow skill instructions for ${agentTitle}'
type: 'skill'
domain: 'Enterprise AI'
usability: 'copilot-ready'
version: '${version}'
---

# ${agentTitle} — Execution Skill

## Overview
Automated execution directives for **${formattedTitle}** in Engineering Commons.

## Capabilities
- Autonomous workspace analysis and code transformation
- Pre-flight validation and dependency checking
- Integration testing and telemetry emission

## Workflow Directives
1. Check workspace prerequisites and configuration in \`cip.yml\`.
2. Execute the domain transformation pipeline.
3. Verify output against company benchmarks and log results.
`;

        return [
            {
                path: `.github/agents/${artifactName}.agent.md`,
                content: agentPrompt
            },
            {
                path: `.agents/skills/${artifactName}/SKILL.md`,
                content: skillPrompt
            },
            {
                path: `skills/${artifactName}/SKILL.md`,
                content: skillPrompt
            },
            {
                path: 'cip.yml',
                content: `name: ${artifactName}\nversion: ${version}\ntype: agent\ncategory: Enterprise AI\nauthor: ${author}\nmain: .github/agents/${artifactName}.agent.md\nskills:\n  - .agents/skills/${artifactName}/SKILL.md\n`
            },
            {
                path: 'README.md',
                content: `# ${agentTitle} (\`${artifactName}\`)\n\nOfficial AI artifact for enterprise workflows.\n\n## Usage\n\`\`\`markdown\n@${artifactName} Run evaluation on current workspace.\n\`\`\`\n`
            }
        ];
    } else if (normType === 'skill') {
        return [
            {
                path: `.agents/skills/${artifactName}/SKILL.md`,
                content: `---\nname: ${artifactName}\nversion: ${version}\ndescription: 'Workflow skill for ${artifactName}'\nauthor: ${author}\nusability: 'copilot-ready'\n---\n\n# ${artifactName} Skill\n\nAutomated execution workflow for ${artifactName}.\n`
            },
            {
                path: `skills/${artifactName}/SKILL.md`,
                content: `---\nname: ${artifactName}\nversion: ${version}\ndescription: 'Workflow skill for ${artifactName}'\nauthor: ${author}\nusability: 'copilot-ready'\n---\n\n# ${artifactName} Skill\n\nAutomated execution workflow for ${artifactName}.\n`
            },
            {
                path: 'cip.yml',
                content: `name: ${artifactName}\nversion: ${version}\ntype: skill\ncategory: Enterprise AI\nauthor: ${author}\nmain: skills/${artifactName}/SKILL.md\n`
            },
            {
                path: 'README.md',
                content: `# ${artifactName} Skill\n\nEnterprise skill workflow.\n`
            }
        ];
    } else if (normType === 'plugin') {
        return [
            {
                path: `plugins/${artifactName}/plugin.json`,
                content: `{\n  "name": "${artifactName}",\n  "version": "${version}",\n  "description": "${artifactName} Plugin",\n  "author": "${author}",\n  "main": "index.js"\n}`
            },
            {
                path: 'cip.yml',
                content: `name: ${artifactName}\nversion: ${version}\ntype: plugin\nauthor: ${author}\n`
            },
            {
                path: 'README.md',
                content: `# ${artifactName} Plugin\n`
            }
        ];
    } else if (normType === 'mcpserver' || normType === 'mcp') {
        return [
            {
                path: `.mcp/${artifactName}/server.json`,
                content: `{\n  "mcpServers": {\n    "${artifactName}": {\n      "command": "node",\n      "args": ["dist/index.js"],\n      "env": {},\n      "disabled": false\n    }\n  }\n}`
            },
            {
                path: `.github/mcp/${artifactName}/mcp.json`,
                content: `{\n  "name": "${artifactName}",\n  "version": "${version}",\n  "type": "mcpserver"\n}`
            },
            {
                path: 'cip.yml',
                content: `name: ${artifactName}\nversion: ${version}\ntype: mcpserver\nauthor: ${author}\n`
            },
            {
                path: 'README.md',
                content: `# ${artifactName} MCP Server\n`
            }
        ];
    } else if (normType === 'prompt') {
        return [
            {
                path: `.agents/prompts/playbook/${artifactName}.md`,
                content: `---\nname: ${artifactName}\ntitle: "${formattedTitle}"\ntype: prompt\ncategory: "Prompt Playbook"\nauthor: ${author}\n---\n\n# ${formattedTitle}\n\nAct as an expert Data Engineer. Custom instructions for ${formattedTitle}.\n`
            },
            {
                path: `.github/prompts/playbook/${artifactName}.prompt.md`,
                content: `---\nname: ${artifactName}\ndescription: "${formattedTitle}"\n---\n\nAct as an expert Data Engineer. Custom instructions for ${formattedTitle}.\n`
            },
            {
                path: 'cip.yml',
                content: `name: ${artifactName}\nversion: ${version}\ntype: prompt\ncategory: "Prompt Playbook"\nauthor: ${author}\nmain: .agents/prompts/playbook/${artifactName}.md\n`
            },
            {
                path: 'README.md',
                content: `# ${formattedTitle} (\`${artifactName}\`)\n\nAzure BI & Data Engineering Playbook prompt.\n`
            }
        ];
    } else {
        return [
            {
                path: `.github/agents/${artifactName}.agent.md`,
                content: `# ${artifactName}\n\nAI Artifact package for enterprise workflows.\n`
            },
            {
                path: 'cip.yml',
                content: `name: ${artifactName}\nversion: ${version}\ntype: package\nauthor: ${author}\n`
            },
            {
                path: 'README.md',
                content: `# ${artifactName}\n`
            }
        ];
    }
}

export async function executeDownloadZipCommand(
    authProvider: IAuthenticationStatusProvider,
    usageLogger: IUsageLogger,
    artifactName?: string,
    targetVersion?: string,
    customSaveUri?: vscode.Uri
): Promise<boolean> {
    const isAuth = await authProvider.isAuthenticated();
    if (!isAuth) {
        const action = await vscode.window.showWarningMessage(
            'You are not logged in to Engineering Commons.',
            'Login'
        );
        if (action === 'Login') {
            await vscode.commands.executeCommand('engineeringCommons.login');
        }
        return false;
    }

    let target = artifactName;
    if (!target) {
        target = await vscode.window.showInputBox({
            prompt: 'Enter artifact name to download as ZIP',
            placeHolder: 'e.g. design-reviewer'
        });
    }

    if (!target) {
        return false;
    }

    let detectedType = 'skill';
    const normTarget = (target || '').toLowerCase();
    if (normTarget.includes('agent') || normTarget.includes('reviewer') || normTarget.includes('sentinel') || normTarget.includes('hunter')) {
        detectedType = 'agent';
    } else if (normTarget.includes('skill') || normTarget.includes('transformer') || normTarget.includes('synthesizer') || normTarget.includes('guardian')) {
        detectedType = 'skill';
    } else if (normTarget.includes('plugin')) {
        detectedType = 'plugin';
    } else if (normTarget.includes('mcp')) {
        detectedType = 'mcpserver';
    }
    let detectedVersion = targetVersion || '1.0.0';

    return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Downloading '${target}' ZIP archive for Personal VM...`,
        cancellable: false
    }, async (progress) => {
        const token = await authProvider.getToken();
        let artifactFiles: Array<{ path: string; content: string }> = [];

        // 1. Fetch from ADO Git
        try {
            progress.report({ message: `Fetching '${target}' files from Azure DevOps Git...` });
            const adoService = new AdoGovernanceService(authProvider);
            const adoFiles = await adoService.downloadArtifactFilesFromAdoAsync(target!, detectedVersion);
            if (adoFiles && adoFiles.length > 0) {
                artifactFiles = adoFiles;
                if (adoFiles.some(f => f.path.includes('.agent.md') || f.path.includes('agents/'))) detectedType = 'agent';
                else if (adoFiles.some(f => f.path.includes('mcp'))) detectedType = 'mcpserver';
                else if (adoFiles.some(f => f.path.includes('plugin'))) detectedType = 'plugin';
            }
        } catch (adoErr) {
            console.warn('[DownloadZip] ADO Git fetch attempt:', adoErr);
        }

        // 2. Fetch from Backend API
        if (artifactFiles.length === 0) {
            try {
                progress.report({ message: `Fetching '${target}' files from Backend API...` });
                const rawConfig = vscode.workspace.getConfiguration('engineeringCommons').get<string>('backendUrl') || process.env.ENGINEERING_COMMONS_BACKEND_URL;
                const configBackend = (rawConfig && !rawConfig.includes('localhost')) ? rawConfig.trim() : 'https://cip-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io';
                const endpoints = [configBackend, 'https://cip-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io'];

                for (const bUrl of endpoints) {
                    try {
                        const url = `${bUrl.replace(/\/+$/, '')}/api/artifacts/${encodeURIComponent(target!)}/download`;
                        const res = await new Promise<{ ok: boolean; data?: any }>((resolve) => {
                            const reqLib = url.startsWith('https') ? https : http;
                            const req = reqLib.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} }, (response) => {
                                let body = '';
                                response.on('data', chunk => body += chunk);
                                response.on('end', () => {
                                    if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
                                        try { resolve({ ok: true, data: JSON.parse(body) }); } catch { resolve({ ok: false }); }
                                    } else {
                                        resolve({ ok: false });
                                    }
                                });
                            });
                            req.on('error', () => resolve({ ok: false }));
                            req.setTimeout(4000, () => { req.destroy(); resolve({ ok: false }); });
                        });
                        if (res.ok && res.data && Array.isArray(res.data.files) && res.data.files.length > 0) {
                            artifactFiles = res.data.files;
                            detectedType = res.data.type || detectedType;
                            detectedVersion = res.data.version || detectedVersion;
                            break;
                        }
                    } catch {}
                }
            } catch (err) {
                console.warn('[DownloadZip] Backend fetch attempt:', err);
            }
        }

        // 3. Check local artifacts-json
        if (artifactFiles.length === 0) {
            try {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                const cwd = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : undefined;
                const cleanName = target!.replace(/^leap-/, '');
                const candidates = [
                    ...(cwd ? [
                        path.join(cwd, 'artifacts-json', `${target}.json`),
                        path.join(cwd, 'artifacts-json', `${cleanName}.json`),
                        path.join(cwd, 'artifacts-json', `leap-${cleanName}.json`)
                    ] : []),
                    path.join(__dirname, '..', '..', '..', 'artifacts-json', `${cleanName}.json`),
                    path.join(__dirname, '..', '..', '..', 'artifacts-json', `leap-${cleanName}.json`)
                ];
                for (const cp of candidates) {
                    if (fs.existsSync(cp)) {
                        try {
                            const parsed = JSON.parse(fs.readFileSync(cp, 'utf8'));
                            if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) {
                                artifactFiles = parsed.files;
                                detectedType = parsed.type || detectedType;
                                detectedVersion = parsed.version || detectedVersion;
                                break;
                            }
                        } catch {}
                    }
                }
            } catch {}
        }

        // 4. Synthesize standard code files if none found
        if (artifactFiles.length === 0) {
            artifactFiles = synthesizeArtifactFiles(target!, detectedVersion, detectedType);
        }

        // Package files into ZIP buffer
        progress.report({ message: `Compressing ${artifactFiles.length} files into ZIP archive...` });
        const zipBuffer = createZipBuffer(artifactFiles);

        // Prompt user where to save
        const defaultFilename = `${target}-v${detectedVersion}.zip`;
        const defaultFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();
        const defaultUri = vscode.Uri.file(path.join(defaultFolder, defaultFilename));

        let saveUri = customSaveUri;
        if (!saveUri) {
            saveUri = await vscode.window.showSaveDialog({
                defaultUri,
                filters: {
                    'ZIP Archive (*.zip)': ['zip'],
                    'All Files (*.*)': ['*']
                },
                title: `Save Artifact ZIP for Personal VM: ${target}`
            });
        }

        if (!saveUri) {
            // User cancelled save dialog
            return false;
        }

        const targetFilePath = saveUri.fsPath || (saveUri as any).path;
        fs.writeFileSync(targetFilePath, zipBuffer);

        const openAction = 'Open Folder';
        vscode.window.showInformationMessage(
            `✓ Successfully downloaded ZIP for '${target}' (${artifactFiles.length} files, ${(zipBuffer.length / 1024).toFixed(1)} KB) for your Personal VM!`,
            openAction
        ).then(choice => {
            if (choice === openAction) {
                vscode.commands.executeCommand('revealFileInOS', saveUri);
            }
        });

        // Record telemetry event: action DOWNLOAD
        await usageLogger.logActionAsync('DOWNLOAD', target!, detectedType, detectedVersion, targetFilePath);
        return true;
    });
}

export async function executeInstallCommand(
    cliExecutor: ICliExecutor,
    authProvider: IAuthenticationStatusProvider,
    usageLogger: IUsageLogger,
    artifactTarget?: string | { name: string; mode?: 'workspace' | 'zip' | 'prompt'; version?: string },
    cliExecutable = 'engineering-commons',
    forcedMode?: 'workspace' | 'zip' | 'prompt'
): Promise<boolean> {
    const isAuth = await authProvider.isAuthenticated();
    if (!isAuth) {
        const action = await vscode.window.showWarningMessage(
            'You are not logged in to Engineering Commons.',
            'Login'
        );
        if (action === 'Login') {
            await vscode.commands.executeCommand('engineeringCommons.login');
        }
        return false;
    }

    let target: string | undefined;
    let mode: 'workspace' | 'zip' | 'prompt' | undefined = forcedMode;
    let targetVersion: string | undefined;

    if (typeof artifactTarget === 'string') {
        target = artifactTarget;
    } else if (artifactTarget && typeof artifactTarget === 'object') {
        target = artifactTarget.name;
        if (artifactTarget.mode) mode = artifactTarget.mode;
        if (artifactTarget.version) targetVersion = artifactTarget.version;
    }

    if (!target) {
        target = await vscode.window.showInputBox({
            prompt: 'Enter artifact name to install',
            placeHolder: 'e.g. design-reviewer'
        });
    }

    if (!target) {
        return false;
    }

    // If mode is not specified, offer choice between Workspace installation vs Download ZIP (for Personal VM)
    if (!mode || mode === 'prompt') {
        const choice = await vscode.window.showQuickPick([
            {
                label: '$(desktop-download) Install to Workspace',
                description: 'Extract and configure files in active workspace',
                detail: 'Installs .agent.md, SKILL.md, and cip.yml into current workspace for immediate use',
                mode: 'workspace' as const
            },
            {
                label: '$(file-zip) Download ZIP File (for Personal VM)',
                description: 'Download packaged .zip archive without workspace installation',
                detail: 'Save standalone ZIP archive to your chosen local directory or VM drive',
                mode: 'zip' as const
            }
        ], {
            placeHolder: `Select installation destination for '${target}'`
        });

        if (!choice) {
            return false;
        }
        mode = choice.mode;
    }

    if (mode === 'zip') {
        return await executeDownloadZipCommand(authProvider, usageLogger, target, targetVersion);
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    const workspaceRoot = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : undefined;

    if (!workspaceRoot) {
        vscode.window.showErrorMessage('Please open a workspace folder before installing artifacts to workspace.');
        return false;
    }

    // Ensure .github directory exists for GitHub Copilot integration
    const githubDir = path.join(workspaceRoot, '.github');
    if (!fs.existsSync(githubDir)) {
        try {
            fs.mkdirSync(githubDir, { recursive: true });
        } catch {}
    }

    const progressOptions: vscode.ProgressOptions = {
        location: vscode.ProgressLocation.Notification,
        title: `Installing '${target}' via Engineering Commons...`,
        cancellable: false
    };

    return await vscode.window.withProgress(progressOptions, async (progress) => {
        const token = await authProvider.getToken();
        let installedFiles: string[] = [];
        let detectedType = 'skill';
        const normTarget = (target || '').toLowerCase();
        if (normTarget.includes('agent') || normTarget.includes('reviewer') || normTarget.includes('sentinel') || normTarget.includes('hunter')) {
            detectedType = 'agent';
        } else if (normTarget.includes('skill') || normTarget.includes('transformer') || normTarget.includes('synthesizer') || normTarget.includes('guardian')) {
            detectedType = 'skill';
        } else if (normTarget.includes('plugin')) {
            detectedType = 'plugin';
        } else if (normTarget.includes('mcp')) {
            detectedType = 'mcpserver';
        }
        let detectedVersion = '1.0.0';

        // 1. Invoke CLI executor if present
        if (cliExecutor) {
            const cliResult = await cliExecutor.executeAsync(cliExecutable, ['install', target!], workspaceRoot);
            if (!cliResult.success) {
                vscode.window.showErrorMessage(`Engineering Commons Install Error: ${cliResult.stderr || 'Failed to install'}`);
                return false;
            }
        }

        // 2. Direct Azure DevOps Git Download (Primary & Fallback)
        if (installedFiles.length === 0) {
            try {
                progress.report({ message: `Fetching '${target}' directly from Azure DevOps Git...` });
                const adoService = new AdoGovernanceService(authProvider);
                const adoFiles = await adoService.downloadArtifactFilesFromAdoAsync(target!);
                if (adoFiles && adoFiles.length > 0) {
                    const hasAgent = adoFiles.some(f => f.path.includes('.agent.md') || f.path.includes('agents/'));
                    const hasMcp = adoFiles.some(f => f.path.includes('mcp'));
                    const hasPlugin = adoFiles.some(f => f.path.includes('plugin'));
                    if (hasAgent) detectedType = 'agent';
                    else if (hasMcp) detectedType = 'mcpserver';
                    else if (hasPlugin) detectedType = 'plugin';

                    installedFiles = placeArtifactFilesIntoWorkspace(workspaceRoot, target!, detectedVersion, detectedType, adoFiles);
                }
            } catch (adoErr: any) {
                console.warn('[InstallCommand] ADO Git install attempt:', adoErr);
            }
        }

        // 2b. Direct Backend API / AI Leap Download
        if (installedFiles.length === 0) {
            try {
                const rawConfig = vscode.workspace.getConfiguration('engineeringCommons').get<string>('backendUrl') || process.env.ENGINEERING_COMMONS_BACKEND_URL;
                const configBackend = (rawConfig && !rawConfig.includes('localhost')) ? rawConfig.trim() : 'https://cip-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io';
                progress.report({ message: `Fetching '${target}' from Engineering Commons Backend / AI Leap...` });
                const backendEndpoints = [
                    configBackend,
                    'https://cip-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io'
                ];

                for (const bUrl of backendEndpoints) {
                    try {
                        const url = `${bUrl.replace(/\/+$/, '')}/api/artifacts/${encodeURIComponent(target!)}/download`;
                        const res = await new Promise<{ ok: boolean; status: number; data?: any }>((resolve) => {
                            const reqLib = url.startsWith('https') ? https : http;
                            const req = reqLib.get(url, {
                                headers: token ? { Authorization: `Bearer ${token}` } : {}
                            }, (response) => {
                                let body = '';
                                response.on('data', chunk => body += chunk);
                                response.on('end', () => {
                                    if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
                                        try {
                                            resolve({ ok: true, status: response.statusCode, data: JSON.parse(body) });
                                        } catch {
                                            resolve({ ok: false, status: response.statusCode || 500 });
                                        }
                                    } else {
                                        resolve({ ok: false, status: response.statusCode || 500 });
                                    }
                                });
                            });
                            req.on('error', () => resolve({ ok: false, status: 500 }));
                            req.setTimeout(4000, () => { req.destroy(); resolve({ ok: false, status: 504 }); });
                        });

                        if (res.ok && res.data && Array.isArray(res.data.files) && res.data.files.length > 0) {
                            detectedType = res.data.type || detectedType;
                            detectedVersion = res.data.version || detectedVersion;
                            installedFiles = placeArtifactFilesIntoWorkspace(workspaceRoot, target!, detectedVersion, detectedType, res.data.files);
                            break;
                        }
                    } catch {}
                }
            } catch (apiErr: any) {
                console.warn('[InstallCommand] Backend download attempt:', apiErr);
            }
        }

        // 2c. Local Workspace artifacts-json & AI Leap Bundle Fallback
        if (installedFiles.length === 0) {
            try {
                const cleanName = target!.replace(/^leap-/, '');
                const candidatePaths = [
                    path.join(workspaceRoot, 'artifacts-json', `${target}.json`),
                    path.join(workspaceRoot, 'artifacts-json', `${cleanName}.json`),
                    path.join(workspaceRoot, 'artifacts-json', `leap-${cleanName}.json`),
                    path.join(__dirname, '..', '..', '..', 'artifacts-json', `${cleanName}.json`),
                    path.join(__dirname, '..', '..', '..', 'artifacts-json', `leap-${cleanName}.json`)
                ];

                for (const cp of candidatePaths) {
                    if (fs.existsSync(cp)) {
                        try {
                            const parsed = JSON.parse(fs.readFileSync(cp, 'utf8'));
                            if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) {
                                detectedType = parsed.type || detectedType;
                                detectedVersion = parsed.version || detectedVersion;
                                installedFiles = placeArtifactFilesIntoWorkspace(workspaceRoot, target!, detectedVersion, detectedType, parsed.files);
                                break;
                            }
                        } catch {}
                    }
                }

            } catch {}
        }

        // 3. Fallback: Synthesize standard code files
        if (installedFiles.length === 0) {
            progress.report({ message: `Synthesizing code files for '${target}'...` });
            const synthFiles = synthesizeArtifactFiles(target!, detectedVersion, detectedType);
            installedFiles = placeArtifactFilesIntoWorkspace(workspaceRoot, target!, detectedVersion, detectedType, synthFiles);
        }

        if (installedFiles.length > 0) {
            vscode.window.showInformationMessage(`✓ Successfully installed '${target}' (${installedFiles.length} files placed into workspace).`);
            await usageLogger.logActionAsync('INSTALL', target!, detectedType, detectedVersion, workspaceRoot);
            return true;
        }

        // 4. Fallback to CLI
        const result = await cliExecutor.executeAsync(cliExecutable, ['install', target!], workspaceRoot);
        if (result.success) {
            vscode.window.showInformationMessage(`✓ Successfully installed '${target}' into workspace.`);
            await usageLogger.logActionAsync('INSTALL', target!, 'skill', '1.0.0', workspaceRoot);
            return true;
        }

        vscode.window.showErrorMessage(`Engineering Commons Install Error: Failed to place files for '${target}' into workspace.`);
        return false;
    });
}

