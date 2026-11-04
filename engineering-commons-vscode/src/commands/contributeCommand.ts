import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ICliExecutor } from '../services/cliExecutor';
import { IAuthenticationStatusProvider } from '../services/authenticationStatusProvider';
import { IUsageLogger } from '../services/usageLogger';

export interface DiscoveredLocalArtifact {
    name: string;
    type: string;
    version?: string;
    path: string;
    files: string[];
    description?: string;
}

export function discoverLocalArtifacts(workspaceRoot: string): DiscoveredLocalArtifact[] {
    const results: DiscoveredLocalArtifact[] = [];
    const seenNames = new Set<string>();

    if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
        return results;
    }

    // 1. Scan Skills: .agents/skills/*, .github/skills/*, skills/*
    const skillDirs = [
        path.join(workspaceRoot, '.agents', 'skills'),
        path.join(workspaceRoot, '.github', 'skills'),
        path.join(workspaceRoot, 'skills')
    ];

    for (const sDir of skillDirs) {
        if (fs.existsSync(sDir)) {
            // Check if sDir itself has SKILL.md
            if (fs.existsSync(path.join(sDir, 'SKILL.md'))) {
                const sName = path.basename(path.dirname(sDir)) === '.github' || path.basename(path.dirname(sDir)) === '.agents' ? 'skills' : path.basename(sDir);
                if (!seenNames.has(sName)) {
                    seenNames.add(sName);
                    const rel = path.relative(workspaceRoot, path.join(sDir, 'SKILL.md')).replace(/\\/g, '/');
                    results.push({
                        name: sName,
                        type: 'skill',
                        version: '1.0.0',
                        path: rel,
                        files: [rel],
                        description: `Skill package: ${rel}`
                    });
                }
            }

            // Check subdirectories
            try {
                const entries = fs.readdirSync(sDir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        const subSkillPath = path.join(sDir, entry.name);
                        const skillFile = path.join(subSkillPath, 'SKILL.md');
                        if (fs.existsSync(skillFile) && !seenNames.has(entry.name)) {
                            seenNames.add(entry.name);
                            const rel = path.relative(workspaceRoot, skillFile).replace(/\\/g, '/');
                            results.push({
                                name: entry.name,
                                type: 'skill',
                                version: '1.0.0',
                                path: rel,
                                files: [rel],
                                description: `Skill package: ${rel}`
                            });
                        }
                    }
                }
            } catch { }
        }
    }

    // 2. Scan Agents: .github/agents, agents
    const agentDirs = [
        path.join(workspaceRoot, '.github', 'agents'),
        path.join(workspaceRoot, 'agents')
    ];

    for (const aDir of agentDirs) {
        if (fs.existsSync(aDir)) {
            try {
                const entries = fs.readdirSync(aDir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isFile() && (entry.name.endsWith('.agent.md') || entry.name.endsWith('.md'))) {
                        const name = entry.name.replace(/\.agent\.md$/i, '').replace(/\.md$/i, '');
                        if (!seenNames.has(name)) {
                            seenNames.add(name);
                            const rel = path.relative(workspaceRoot, path.join(aDir, entry.name)).replace(/\\/g, '/');
                            results.push({
                                name,
                                type: 'agent',
                                version: '1.0.0',
                                path: rel,
                                files: [rel],
                                description: `Agent definition: ${rel}`
                            });
                        }
                    } else if (entry.isDirectory()) {
                        const subPath = path.join(aDir, entry.name);
                        const files = fs.readdirSync(subPath)
                            .filter(f => !f.startsWith('.'))
                            .map(f => path.relative(workspaceRoot, path.join(subPath, f)).replace(/\\/g, '/'));
                        if (files.length > 0 && !seenNames.has(entry.name)) {
                            seenNames.add(entry.name);
                            results.push({
                                name: entry.name,
                                type: 'agent',
                                version: '1.0.0',
                                path: path.relative(workspaceRoot, subPath).replace(/\\/g, '/'),
                                files,
                                description: `Multi-file Agent bundle (${files.length} files)`
                            });
                        }
                    }
                }
            } catch { }
        }
    }

    // 3. Scan Prompts: .github/prompts, prompts
    const promptDirs = [
        path.join(workspaceRoot, '.github', 'prompts'),
        path.join(workspaceRoot, 'prompts')
    ];

    for (const pDir of promptDirs) {
        if (fs.existsSync(pDir)) {
            try {
                const entries = fs.readdirSync(pDir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isFile() && (entry.name.endsWith('.prompt.md') || entry.name.endsWith('.md'))) {
                        const name = entry.name.replace(/\.prompt\.md$/i, '').replace(/\.md$/i, '');
                        if (!seenNames.has(name)) {
                            seenNames.add(name);
                            const rel = path.relative(workspaceRoot, path.join(pDir, entry.name)).replace(/\\/g, '/');
                            results.push({
                                name,
                                type: 'prompt',
                                version: '1.0.0',
                                path: rel,
                                files: [rel],
                                description: `Prompt template: ${rel}`
                            });
                        }
                    }
                }
            } catch { }
        }
    }

    // 4. Scan Plugins: plugins/*
    const pluginsDir = path.join(workspaceRoot, 'plugins');
    if (fs.existsSync(pluginsDir)) {
        try {
            const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const pluginJson = path.join(pluginsDir, entry.name, 'plugin.json');
                    if (fs.existsSync(pluginJson) && !seenNames.has(entry.name)) {
                        seenNames.add(entry.name);
                        const rel = path.relative(workspaceRoot, path.join(pluginsDir, entry.name)).replace(/\\/g, '/');
                        results.push({
                            name: entry.name,
                            type: 'plugin',
                            version: '1.0.0',
                            path: rel,
                            files: [path.join(rel, 'plugin.json').replace(/\\/g, '/')],
                            description: `Plugin bundle: ${rel}`
                        });
                    }
                }
            }
        } catch { }
    }

    // 5. Scan MCP Servers: .mcp/*
    const mcpDir = path.join(workspaceRoot, '.mcp');
    if (fs.existsSync(mcpDir)) {
        try {
            const entries = fs.readdirSync(mcpDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const serverJson = path.join(mcpDir, entry.name, 'server.json');
                    if (fs.existsSync(serverJson) && !seenNames.has(entry.name)) {
                        seenNames.add(entry.name);
                        const rel = path.relative(workspaceRoot, path.join(mcpDir, entry.name)).replace(/\\/g, '/');
                        results.push({
                            name: entry.name,
                            type: 'mcpserver',
                            version: '1.0.0',
                            path: rel,
                            files: [path.join(rel, 'server.json').replace(/\\/g, '/')],
                            description: `MCP Server configuration: ${rel}`
                        });
                    }
                }
            }
        } catch { }
    }

    // 6. Check root cip.yml (CIP Package)
    const cipYml = path.join(workspaceRoot, 'cip.yml');
    if (fs.existsSync(cipYml)) {
        try {
            const content = fs.readFileSync(cipYml, 'utf8');
            const nameMatch = content.match(/^name:\s*(.+)$/m);
            const verMatch = content.match(/^version:\s*(.+)$/m);
            const pkgName = nameMatch ? nameMatch[1].trim().replace(/['"]/g, '') : path.basename(workspaceRoot);
            if (!seenNames.has(pkgName)) {
                seenNames.add(pkgName);
                results.push({
                    name: pkgName,
                    type: 'package',
                    version: verMatch ? verMatch[1].trim() : '1.0.0',
                    path: 'cip.yml',
                    files: ['cip.yml'],
                    description: `Workspace CIP Package (${pkgName})`
                });
            }
        } catch { }
    }

    return results;
}

export async function getDiscoveredArtifacts(
    cliExecutor: ICliExecutor,
    cliExecutable: string,
    workspaceRoot: string
): Promise<DiscoveredLocalArtifact[]> {
    try {
        const cliResult = await cliExecutor.executeAsync(cliExecutable, ['contribute', '--discover'], workspaceRoot);
        if (cliResult.success && cliResult.stdout) {
            const rawJson = cliResult.stdout.trim();
            const startIdx = rawJson.indexOf('{');
            const endIdx = rawJson.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1) {
                const jsonStr = rawJson.substring(startIdx, endIdx + 1);
                const parsed = JSON.parse(jsonStr);
                if (parsed.artifacts && Array.isArray(parsed.artifacts) && parsed.artifacts.length > 0) {
                    return parsed.artifacts.map((a: any) => ({
                        name: a.name,
                        type: (a.type || 'agent').toLowerCase(),
                        version: a.version || '1.0.0',
                        path: a.rootPath || (a.files && a.files[0]) || a.name,
                        files: Array.isArray(a.files) ? a.files : [a.rootPath || a.name],
                        description: a.reason || (a.parentPackage ? `Parent: ${a.parentPackage}` : undefined)
                    }));
                }
            }
        }
    } catch { }

    // Fallback to local scanner
    return discoverLocalArtifacts(workspaceRoot);
}

export async function executeContributeCommand(
    cliExecutor: ICliExecutor,
    authProvider: IAuthenticationStatusProvider,
    usageLogger: IUsageLogger,
    artifactName?: string,
    cliExecutable = 'engineering-commons'
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

    const role = (await authProvider.getRole?.()) || 'CONTRIBUTOR';
    /* Commented out: Everyone logging in with MAQ SSO automatically has Contributor privileges
    if (role === 'CONSUMER') {
        vscode.window.showWarningMessage('You do not have permission for this. (Contributing artifacts requires a Producer account).');
        return false;
    }
    */

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No open workspace folder found. Please open a workspace to contribute artifacts.');
        return false;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    let targetArtifact = artifactName;

    // Interactive selection if no artifact specified
    if (!targetArtifact) {
        const discovered = await getDiscoveredArtifacts(cliExecutor, cliExecutable, workspaceRoot);

        interface ArtifactQuickPickItem extends vscode.QuickPickItem {
            artifact?: DiscoveredLocalArtifact;
            isCustomFile?: boolean;
        }

        const items: ArtifactQuickPickItem[] = discovered.map(a => {
            const normType = a.type.toLowerCase();
            let icon = '$(package)';
            if (normType === 'agent') icon = '$(robot)';
            else if (normType === 'skill') icon = '$(tools)';
            else if (normType === 'prompt') icon = '$(comment)';
            else if (normType === 'plugin') icon = '$(plug)';
            else if (normType === 'mcpserver') icon = '$(server)';

            const typeBadge = a.type.toUpperCase();
            return {
                label: `${icon} ${a.name}`,
                description: `[${typeBadge}] ${a.path}`,
                detail: `Files (${a.files.length}): ${a.files.slice(0, 3).join(', ')}${a.files.length > 3 ? '...' : ''}${a.description ? ` • ${a.description}` : ''}`,
                artifact: a
            };
        });

        // Add custom file/folder browse option
        items.push({
            label: '$(file-directory) Browse & Select Custom File or Folder...',
            description: 'Choose a specific AI artifact file or folder from workspace',
            detail: 'Opens file dialog to select any file (.agent.md, SKILL.md, plugin.json, etc.)',
            isCustomFile: true
        });

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select an AI artifact to contribute to Engineering Commons',
            title: 'Engineering Commons: Contribute New Artifact'
        });

        if (!selected) {
            return false; // User cancelled
        }

        if (selected.isCustomFile) {
            const chosen = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: vscode.Uri.file(workspaceRoot),
                title: 'Select AI Artifact File or Directory to Contribute'
            });

            if (!chosen || chosen.length === 0) {
                return false;
            }

            const chosenPath = chosen[0].fsPath;
            targetArtifact = path.relative(workspaceRoot, chosenPath).replace(/\\/g, '/');
        } else if (selected.artifact) {
            targetArtifact = selected.artifact.name;
        }
    }

    if (!targetArtifact) {
        return false;
    }

    const args = ['contribute', targetArtifact];

    const progressOptions: vscode.ProgressOptions = {
        location: vscode.ProgressLocation.Notification,
        title: `Packaging & submitting '${targetArtifact}' to Engineering Commons...`,
        cancellable: false
    };

    return await vscode.window.withProgress(progressOptions, async () => {
        const result = await cliExecutor.executeAsync(cliExecutable, args, workspaceRoot);

        if (result.success) {
            const stdout = result.stdout || '';
            const isDuplicate = stdout.includes('Artifact Already Exists') || 
                                stdout.includes('No changes were detected') || 
                                stdout.includes('identical artifact already exists') ||
                                stdout.includes('DuplicateUnchanged');

            if (isDuplicate) {
                // Extract existing version if present
                const verMatch = stdout.match(/Existing Version:\s*([^\r\n│]+)/);
                const matchedVersion = verMatch ? verMatch[1].trim() : '';
                const verInfo = matchedVersion ? ` (v${matchedVersion})` : '';

                const action = await vscode.window.showInformationMessage(
                    `ℹ️ Artifact Already Exists: An identical artifact already exists in the marketplace${verInfo}. No changes were detected. Review request was NOT created.`,
                    'View Artifact',
                    'Close'
                );

                if (action === 'View Artifact') {
                    await vscode.commands.executeCommand('engineeringCommons.showArtifactDetails', targetArtifact);
                }
                return true;
            }

            vscode.window.showInformationMessage(`✓ Artifact '${targetArtifact}' submitted successfully for review.`);

            // Log CONTRIBUTE usage event
            await usageLogger.logActionAsync(
                'CONTRIBUTE',
                targetArtifact,
                'artifact',
                '1.0.0',
                workspaceRoot
            );
            return true;
        } else {
            const errorMsg = result.stderr || result.stdout || 'Contribution failed.';
            vscode.window.showErrorMessage(`Engineering Commons Contribute Error: ${errorMsg}`);
            return false;
        }
    });
}

