import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ICliExecutor } from '../services/cliExecutor';
import { IAuthenticationStatusProvider } from '../services/authenticationStatusProvider';
import { IUsageLogger } from '../services/usageLogger';
import { discoverLocalArtifacts, getDiscoveredArtifacts, DiscoveredLocalArtifact } from '../commands/contributeCommand';

export class ContributeWebviewProvider {
    public static currentPanel: vscode.WebviewPanel | undefined;
    private static cliExecutor: ICliExecutor;
    private static authProvider: IAuthenticationStatusProvider;
    private static usageLogger: IUsageLogger;
    private static cliExecutable: string;
    private static onSubmittedCallback?: () => void;

    public static async show(
        extensionUri: vscode.Uri,
        cliExecutor: ICliExecutor,
        authProvider: IAuthenticationStatusProvider,
        usageLogger: IUsageLogger,
        cliExecutable = 'engineering-commons',
        onSubmittedCallback?: () => void
    ): Promise<void> {
        this.cliExecutor = cliExecutor;
        this.authProvider = authProvider;
        this.usageLogger = usageLogger;
        this.cliExecutable = cliExecutable;
        this.onSubmittedCallback = onSubmittedCallback;

        const isAuth = await authProvider.isAuthenticated();
        if (!isAuth) {
            const action = await vscode.window.showWarningMessage(
                'You must be logged in to contribute artifacts to Engineering Commons.',
                'Login'
            );
            if (action === 'Login') {
                await vscode.commands.executeCommand('engineeringCommons.login');
            }
            return;
        }

        const role = (await authProvider.getRole?.()) || 'CONTRIBUTOR';
        /* Commented out: Everyone logging in with MAQ SSO automatically has Contributor privileges
        if (role === 'CONSUMER') {
            const action = await vscode.window.showWarningMessage(
                'You currently have the Consumer role. Contributing and publishing AI artifacts requires the Contributor role.',
                'Request Contributor Role',
                'Cancel'
            );
            if (action === 'Request Contributor Role') {
                await vscode.commands.executeCommand('engineeringCommons.requestAccess');
            }
            return;
        }
        */

        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceRoot = (workspaceFolders && workspaceFolders.length > 0) ? workspaceFolders[0].uri.fsPath : process.cwd();
        const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : vscode.ViewColumn.One;

        if (ContributeWebviewProvider.currentPanel) {
            ContributeWebviewProvider.currentPanel.reveal(column);
            await ContributeWebviewProvider.refresh(workspaceRoot);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'engineeringCommonsContribute',
            'Contribute AI Artifact',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        ContributeWebviewProvider.currentPanel = panel;

        panel.onDidDispose(() => {
            ContributeWebviewProvider.currentPanel = undefined;
        });

        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'selectCustomFile':
                    const chosen = await vscode.window.showOpenDialog({
                        canSelectFiles: true,
                        canSelectFolders: true,
                        canSelectMany: false,
                        defaultUri: vscode.Uri.file(workspaceRoot),
                        title: 'Select AI Artifact File or Directory to Contribute'
                    });

                    if (chosen && chosen.length > 0) {
                        const chosenPath = chosen[0].fsPath;
                        const relPath = path.relative(workspaceRoot, chosenPath).replace(/\\/g, '/');
                        const name = path.basename(chosenPath).replace(/\.agent\.md$/i, '').replace(/\.prompt\.md$/i, '').replace(/\.md$/i, '').replace(/\.json$/i, '');
                        
                        let files: string[] = [relPath];
                        try {
                            if (fs.statSync(chosenPath).isDirectory()) {
                                files = fs.readdirSync(chosenPath)
                                    .filter(f => !f.startsWith('.'))
                                    .map(f => path.join(relPath, f).replace(/\\/g, '/'));
                            }
                        } catch { }

                        panel.webview.postMessage({
                            command: 'customFileSelected',
                            artifact: {
                                name: name || 'custom-artifact',
                                type: detectTypeFromPath(relPath),
                                version: '1.0.0',
                                path: relPath,
                                files: files,
                                description: `Custom workspace path: ${relPath}`
                            }
                        });
                    }
                    break;

                case 'submitContribute':
                    await ContributeWebviewProvider.handleSubmit(panel, workspaceRoot, message.payload);
                    break;

                case 'openThread':
                    if (message.reviewId) {
                        await vscode.commands.executeCommand('engineeringCommons.openThread', message.reviewId, message.artifactName);
                    }
                    break;

                case 'showDetails':
                    if (message.artifactName) {
                        await vscode.commands.executeCommand('engineeringCommons.showArtifactDetails', message.artifactName);
                    }
                    break;

                case 'refresh':
                    await ContributeWebviewProvider.refresh(workspaceRoot);
                    break;
            }
        });

        await ContributeWebviewProvider.refresh(workspaceRoot);
    }

    private static async refresh(workspaceRoot: string) {
        if (!this.currentPanel) return;
        const discovered = await getDiscoveredArtifacts(this.cliExecutor, this.cliExecutable, workspaceRoot);
        const userEmail = (await this.authProvider.getEmail()) || 'developer@company.com';
        this.currentPanel.webview.html = this.renderHtml(discovered, userEmail, workspaceRoot);
    }

    private static async handleSubmit(panel: vscode.WebviewPanel, workspaceRoot: string, payload: any) {
        const targetPath = payload.path || payload.name;
        if (!targetPath) {
            panel.webview.postMessage({
                command: 'submitResult',
                success: false,
                error: 'Please select or specify an artifact to contribute.'
            });
            return;
        }

        panel.webview.postMessage({ command: 'submitProgress', inProgress: true });

        const cliArgs = ['contribute', targetPath];
        if (payload.isPrivate) {
            cliArgs.push('--private');
            if (payload.allowedContributors) {
                cliArgs.push('--contributors', payload.allowedContributors);
            }
            if (payload.allowedReviewers) {
                cliArgs.push('--reviewers', payload.allowedReviewers);
            }
            if (payload.allowedConsumers) {
                cliArgs.push('--consumers', payload.allowedConsumers);
            }
        }

        const result = await this.cliExecutor.executeAsync(this.cliExecutable, cliArgs, workspaceRoot);

        if (result.success) {
            const stdout = result.stdout || '';
            const isDuplicate = stdout.includes('Artifact Already Exists') || 
                                stdout.includes('No changes were detected') || 
                                stdout.includes('identical artifact already exists') ||
                                stdout.includes('DuplicateUnchanged');

            // Try to extract review ID if generated
            const revMatch = stdout.match(/Review ID:\s*([a-zA-Z0-9_-]+)/i) || 
                             stdout.match(/Submission ID:\s*([a-zA-Z0-9_-]+)/i) ||
                             stdout.match(/id:\s*([a-zA-Z0-9_-]+)/i);
            const reviewId = revMatch ? revMatch[1] : undefined;

            const verMatch = stdout.match(/Existing Version:\s*([^\r\n│]+)/);
            const existingVersion = verMatch ? verMatch[1].trim() : '';

            // Log CONTRIBUTE usage event
            await this.usageLogger.logActionAsync(
                'CONTRIBUTE',
                payload.name || targetPath,
                payload.type || 'artifact',
                payload.version || '1.0.0',
                workspaceRoot
            ).catch(() => {});

            if (this.onSubmittedCallback) {
                this.onSubmittedCallback();
            }

            panel.webview.postMessage({
                command: 'submitResult',
                success: true,
                isDuplicate: isDuplicate,
                existingVersion: existingVersion,
                reviewId: reviewId,
                artifactName: payload.name || targetPath,
                output: stdout
            });
        } else {
            panel.webview.postMessage({
                command: 'submitResult',
                success: false,
                error: result.stderr || result.stdout || 'Contribution failed during packaging or API submission.'
            });
        }
    }

    private static renderHtml(discovered: DiscoveredLocalArtifact[], userEmail: string, workspaceRoot: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contribute AI Artifact</title>
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src https: data:; font-src https:; connect-src https: http:;">
    <style>
        :root {
            --bg-color: var(--vscode-editor-background, #1e1e1e);
            --fg-color: var(--vscode-editor-foreground, #cccccc);
            --card-bg: var(--vscode-sideBar-background, #252526);
            --card-border: var(--vscode-panel-border, #333333);
            --primary: var(--vscode-button-background, #007acc);
            --primary-fg: var(--vscode-button-foreground, #ffffff);
            --primary-hover: var(--vscode-button-hoverBackground, #0062a3);
            --muted-fg: var(--vscode-descriptionForeground, #8b949e);
            --tag-agent-bg: #064e3b;
            --tag-agent-fg: #a7f3d0;
            --tag-skill-bg: #312e81;
            --tag-skill-fg: #c7d2fe;
            --tag-plugin-bg: #3b0764;
            --tag-plugin-fg: #d8b4fe;
            --tag-mcp-bg: #7c2d12;
            --tag-mcp-fg: #fed7aa;
            --tag-pkg-bg: #1f293d;
            --tag-pkg-fg: #58a6ff;
            --input-bg: var(--vscode-input-background, #2d2d2d);
            --input-border: var(--vscode-input-border, #3c3c3c);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--fg-color);
            padding: 24px 32px;
            font-size: 13px;
            line-height: 1.5;
        }

        .header-title-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--card-border);
            margin-bottom: 24px;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .header-icon {
            font-size: 28px;
        }
        .header-title {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: -0.3px;
        }
        .header-desc {
            font-size: 12px;
            color: var(--muted-fg);
        }
        .user-badge {
            font-size: 11.5px;
            color: var(--muted-fg);
            background-color: var(--card-bg);
            border: 1px solid var(--card-border);
            padding: 4px 10px;
            border-radius: 12px;
        }

        /* 2-Column Grid Layout */
        .contribute-layout {
            display: grid;
            grid-template-columns: 1.1fr 1fr;
            gap: 24px;
        }

        @media (max-width: 800px) {
            .contribute-layout {
                grid-template-columns: 1fr;
            }
        }

        /* Panel Box */
        .panel-box {
            background-color: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 8px;
            padding: 16px 18px;
            display: flex;
            flex-direction: column;
            gap: 14px;
        }
        .panel-heading {
            font-size: 13.5px;
            font-weight: 700;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--card-border);
            padding-bottom: 8px;
        }

        /* Discovered List */
        .artifacts-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 480px;
            overflow-y: auto;
            padding-right: 4px;
        }
        .artifact-card {
            background-color: var(--bg-color);
            border: 1px solid var(--card-border);
            border-radius: 6px;
            padding: 10px 12px;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .artifact-card:hover {
            border-color: var(--primary);
        }
        .artifact-card.selected {
            border-color: var(--primary);
            box-shadow: none;
            background-color: rgba(0, 122, 204, 0.08);
        }
        .card-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .type-badge {
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 8px;
            text-transform: uppercase;
        }
        .badge-agent { background-color: var(--tag-agent-bg); color: var(--tag-agent-fg); }
        .badge-skill { background-color: var(--tag-skill-bg); color: var(--tag-skill-fg); }
        .badge-plugin { background-color: var(--tag-plugin-bg); color: var(--tag-plugin-fg); }
        .badge-mcpserver { background-color: var(--tag-mcp-bg); color: var(--tag-mcp-fg); }
        .badge-package { background-color: var(--tag-pkg-bg); color: var(--tag-pkg-fg); }
        .badge-prompt { background-color: #064e3b; color: #6ee7b7; }

        .card-name {
            font-weight: 600;
            font-size: 13px;
        }
        .card-path {
            font-family: ui-monospace, monospace;
            font-size: 11px;
            color: var(--muted-fg);
        }
        .card-files-count {
            font-size: 11px;
            color: var(--muted-fg);
        }

        /* Form Group */
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .form-label {
            font-size: 11.5px;
            font-weight: 600;
            color: var(--fg-color);
        }
        .form-input, .form-select, .form-textarea {
            width: 100%;
            background-color: var(--input-bg);
            border: 1px solid var(--input-border);
            color: var(--fg-color);
            padding: 8px 10px;
            border-radius: 5px;
            font-size: 12.5px;
            font-family: inherit;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
            outline: none;
            border-color: var(--primary);
        }
        .form-textarea {
            resize: vertical;
            min-height: 60px;
        }

        /* Files Inspector */
        .files-box {
            background-color: var(--bg-color);
            border: 1px solid var(--card-border);
            border-radius: 6px;
            padding: 8px 10px;
            max-height: 140px;
            overflow-y: auto;
            font-family: ui-monospace, monospace;
            font-size: 11px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .file-entry {
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--fg-color);
        }

        /* Action Buttons */
        .btn-primary {
            background-color: var(--primary);
            color: var(--primary-fg);
            border: none;
            border-radius: 6px;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.15s ease;
        }
        .btn-primary:hover {
            background-color: var(--primary-hover);
        }
        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .btn-secondary {
            background-color: transparent;
            border: 1px solid var(--card-border);
            color: var(--fg-color);
            padding: 6px 12px;
            border-radius: 5px;
            font-size: 11.5px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }
        .btn-secondary:hover {
            border-color: var(--primary);
            color: var(--primary);
        }

        /* Visibility Radio Card Selector */
        .visibility-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 4px;
        }
        .visibility-option {
            position: relative;
            cursor: pointer;
        }
        .visibility-option input[type="radio"] {
            position: absolute;
            top: 10px;
            left: 10px;
            cursor: pointer;
        }
        .visibility-card {
            border: 1px solid var(--card-border);
            background-color: var(--bg-color);
            border-radius: 6px;
            padding: 10px 10px 10px 30px;
            transition: all 0.15s ease;
            height: 100%;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .visibility-option input[type="radio"]:checked + .visibility-card {
            border-color: var(--primary);
            background-color: rgba(59, 130, 246, 0.08);
        }
        .visibility-title {
            font-size: 12px;
            font-weight: 600;
            color: var(--fg-color);
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .visibility-desc {
            font-size: 10.5px;
            color: var(--muted-fg);
            line-height: 1.3;
        }

        /* Result Alerts */
        .alert-box {
            padding: 12px 14px;
            border-radius: 6px;
            font-size: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            line-height: 1.4;
            width: 100%;
        }
        .alert-success {
            background-color: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.4);
            color: #10b981;
        }
        .alert-info {
            background-color: rgba(59, 130, 246, 0.12);
            border: 1px solid rgba(59, 130, 246, 0.4);
            color: #60a5fa;
        }
        .alert-error {
            background-color: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.4);
            color: #ef4444;
        }

        /* ── Responsive Breakpoints ─────────────── */
        @media (max-width: 850px) {
            body {
                padding: 16px 18px 40px;
            }
            .header-title-bar {
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;
            }
            .contribute-layout {
                grid-template-columns: 1fr;
                gap: 16px;
            }
        }

        @media (max-width: 480px) {
            body {
                padding: 10px 10px 30px;
                font-size: 12px;
            }
            .header-title {
                font-size: 15px;
            }
            .visibility-container {
                grid-template-columns: 1fr;
            }
            .panel-box {
                padding: 12px 14px;
            }
        }
    </style>
</head>
<body>
    <!-- Top Header -->
    <div class="header-title-bar">
        <div class="header-left">
            <span class="header-icon">🚀</span>
            <div>
                <div class="header-title">Engineering Commons: Contribute AI Artifact</div>
                <div class="header-desc">Package and publish AI agents, skills, plugins, and prompts from your workspace for automated peer review.</div>
            </div>
        </div>
        <div class="user-badge">👤 ${userEmail}</div>
    </div>

    <!-- 2-Column Grid -->
    <div class="contribute-layout">
        <!-- Left: Workspace Artifacts Discovery & File Selector -->
        <div class="panel-box">
            <div class="panel-heading">
                <span>📁 Select Workspace Artifact</span>
                <button class="btn-secondary" onclick="selectCustomFile()">📂 Browse Custom File/Folder...</button>
            </div>

            <div class="artifacts-list" id="artifacts-list-container">
                ${discovered.length > 0 ? discovered.map((art, idx) => {
                    const badgeClass = getBadgeClass(art.type);
                    return `
                    <div class="artifact-card ${idx === 0 ? 'selected' : ''}" 
                         onclick="selectArtifact(${idx})" 
                         id="card-${idx}"
                         data-idx="${idx}">
                        <div class="card-top">
                            <span class="type-badge ${badgeClass}">${art.type}</span>
                            <span class="card-files-count">${art.files.length} file${art.files.length === 1 ? '' : 's'}</span>
                        </div>
                        <div class="card-name">${art.name}</div>
                        <div class="card-path">${art.path}</div>
                    </div>`;
                }).join('\n') : '<div style="color: var(--muted-fg); padding: 20px 0; text-align: center;">No standard AI artifacts automatically detected. Click "Browse Custom File/Folder..." to select.</div>'}
            </div>
        </div>

        <!-- Right: Artifact Metadata & Submission Form -->
        <div class="panel-box">
            <div class="panel-heading">
                <span>⚙️ Artifact Package Details</span>
            </div>

            <div class="form-group">
                <label class="form-label">Artifact Identifier / Name</label>
                <input type="text" class="form-input" id="input-name" placeholder="e.g. design-reviewer" />
            </div>

            <div class="form-group">
                <label class="form-label">Artifact Type</label>
                <select class="form-select" id="select-type">
                    <option value="agent">Agent (.agent.md)</option>
                    <option value="skill">Skill (SKILL.md)</option>
                    <option value="plugin">Plugin (plugin.json)</option>
                    <option value="mcpserver">MCP Server (server.json)</option>
                    <option value="prompt">Prompt (.prompt.md)</option>
                    <option value="package">CIP Package (cip.yml)</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Version</label>
                <input type="text" class="form-input" id="input-version" value="1.0.0" />
            </div>

            <div class="form-group">
                <label class="form-label">Visibility & Access Control</label>
                <div class="visibility-container">
                    <label class="visibility-option">
                        <input type="radio" name="visibility" value="public" id="vis-public" checked onchange="toggleVisibilityDetails()" />
                        <div class="visibility-card">
                            <div class="visibility-title">🌐 Public (Marketplace)</div>
                            <div class="visibility-desc">Publish to team catalog. Available to all developers upon peer review approval.</div>
                        </div>
                    </label>
                    <label class="visibility-option">
                        <input type="radio" name="visibility" value="private" id="vis-private" onchange="toggleVisibilityDetails()" />
                        <div class="visibility-card">
                            <div class="visibility-title">🔒 Private (Development)</div>
                            <div class="visibility-desc">Keep private during active development with fine-grained team whitelists.</div>
                        </div>
                    </label>
                </div>
            </div>

            <!-- Dynamic RBAC Permissions Whitelist Card (Visible when Private is chosen) -->
            <div class="form-group" id="private-permissions-card" style="display: none; background: rgba(255, 170, 0, 0.05); border: 1px solid rgba(255, 170, 0, 0.3); border-radius: 8px; padding: 14px 16px; margin-top: -6px;">
                <div style="font-weight: 600; font-size: 12px; color: var(--warning-color, #e5a00d); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                    <span>🔒</span>
                    <span>Private Artifact Permissions Whitelist</span>
                </div>
                <div style="font-size: 11.5px; color: var(--muted-fg); margin-bottom: 12px; line-height: 1.4;">
                    Configure who can collaborate on, review, and install this private artifact while it is under development. Enter comma-separated email addresses.
                </div>

                <div style="margin-bottom: 10px;">
                    <label class="form-label" style="font-size: 11.5px; margin-bottom: 4px;">1. Allowed Contributors <span style="font-weight: normal; color: var(--muted-fg);">(Can submit changes & push new versions)</span></label>
                    <input type="text" class="form-input" id="input-contributors" placeholder="e.g. dev1@company.com, dev2@company.com (Leave empty for producer only)" style="font-size: 12px;" />
                </div>

                <div style="margin-bottom: 10px;">
                    <label class="form-label" style="font-size: 11.5px; margin-bottom: 4px;">2. Designated Reviewer(s) <span style="font-weight: normal; color: var(--muted-fg);">(Only assigned reviewers can approve or reject)</span></label>
                    <input type="text" class="form-input" id="input-reviewers" placeholder="e.g. lead-reviewer@company.com (Leave empty for standard reviewers)" style="font-size: 12px;" />
                </div>

                <div>
                    <label class="form-label" style="font-size: 11.5px; margin-bottom: 4px;">3. Allowed Consumers / Installers <span style="font-weight: normal; color: var(--muted-fg);">(Can view details & install this private package)</span></label>
                    <input type="text" class="form-input" id="input-consumers" placeholder="e.g. tester1@company.com, qa@company.com (Leave empty for producer only)" style="font-size: 12px;" />
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Source Path in Workspace</label>
                <input type="text" class="form-input" id="input-path" placeholder="e.g. .github/agents/accessibility-fix.agent.md or skills/my-skill" />
            </div>

            <div class="form-group">
                <label class="form-label">Included Files in Package</label>
                <div class="files-box" id="files-list-box">
                    <div style="color: var(--muted-fg);">Select an artifact to preview included files.</div>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Review Summary / Notes (Optional)</label>
                <textarea class="form-textarea" id="input-notes" placeholder="Describe the capabilities, improvements, or instructions for the reviewer..."></textarea>
            </div>

            <!-- Submit Action -->
            <button class="btn-primary" id="btn-submit" onclick="submitForm()">
                <span>🚀</span>
                <span id="btn-text">Submit for Peer Review & Publish</span>
            </button>

            <!-- Live Result Status Area -->
            <div id="result-status-area" style="display: none;"></div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const discoveredArtifacts = ${JSON.stringify(discovered)};
        let currentArtifact = discoveredArtifacts.length > 0 ? discoveredArtifacts[0] : null;

        function toggleVisibilityDetails() {
            const isPrivate = document.getElementById('vis-private')?.checked === true;
            const rbacCard = document.getElementById('private-permissions-card');
            if (rbacCard) {
                rbacCard.style.display = isPrivate ? 'block' : 'none';
            }
        }

        function populateForm(art) {
            if (!art) return;
            currentArtifact = art;
            document.getElementById('input-name').value = art.name || '';
            document.getElementById('select-type').value = (art.type || 'agent').toLowerCase();
            document.getElementById('input-version').value = art.version || '1.0.0';
            document.getElementById('input-path').value = art.path || '';

            const filesBox = document.getElementById('files-list-box');
            if (art.files && art.files.length > 0) {
                filesBox.innerHTML = art.files.map(f => \`
                    <div class="file-entry">
                        <span>📄</span>
                        <span>\${f}</span>
                    </div>
                \`).join('');
            } else {
                filesBox.innerHTML = '<div style="color: var(--muted-fg);">No files specified.</div>';
            }
        }

        function selectArtifact(idx) {
            document.querySelectorAll('.artifact-card').forEach(c => c.classList.remove('selected'));
            const selectedCard = document.getElementById('card-' + idx);
            if (selectedCard) selectedCard.classList.add('selected');
            if (discoveredArtifacts[idx]) {
                populateForm(discoveredArtifacts[idx]);
            }
        }

        function selectCustomFile() {
            vscode.postMessage({ command: 'selectCustomFile' });
        }

        function submitForm() {
            const name = (document.getElementById('input-name')?.value || '').trim();
            const type = document.getElementById('select-type')?.value || 'agent';
            const version = (document.getElementById('input-version')?.value || '1.0.0').trim();
            const path = (document.getElementById('input-path')?.value || name).trim();
            const notes = (document.getElementById('input-notes')?.value || '').trim();
            const isPrivate = document.getElementById('vis-private')?.checked === true;
            const allowedContributors = (document.getElementById('input-contributors')?.value || '').trim();
            const allowedReviewers = (document.getElementById('input-reviewers')?.value || '').trim();
            const allowedConsumers = (document.getElementById('input-consumers')?.value || '').trim();

            const statusArea = document.getElementById('result-status-area');

            if (!name || !path) {
                if (statusArea) {
                    statusArea.style.display = 'block';
                    statusArea.innerHTML = \`
                    <div class="alert-box alert-error">
                        <strong>✕ Incomplete Details</strong>
                        <div>Please enter an artifact name and select/enter its workspace source path.</div>
                    </div>\`;
                }
                return;
            }

            const btn = document.getElementById('btn-submit');
            if (btn) btn.disabled = true;
            const btnText = document.getElementById('btn-text');
            if (btnText) btnText.innerText = 'Packaging & Submitting to Engineering Commons...';

            if (statusArea) statusArea.style.display = 'none';

            vscode.postMessage({
                command: 'submitContribute',
                payload: {
                    name: name,
                    type: type,
                    version: version,
                    path: path,
                    notes: notes,
                    isPrivate: isPrivate,
                    allowedContributors: allowedContributors,
                    allowedReviewers: allowedReviewers,
                    allowedConsumers: allowedConsumers
                }
            });
        }

        function openReviewThread(id, name) {
            vscode.postMessage({ command: 'openThread', reviewId: id, artifactName: name });
        }

        function viewArtifactDetails(name) {
            vscode.postMessage({ command: 'showDetails', artifactName: name });
        }

        window.addEventListener('message', event => {
            const msg = event.data;
            if (msg.command === 'customFileSelected') {
                discoveredArtifacts.unshift(msg.artifact);
                currentArtifact = msg.artifact;
                populateForm(msg.artifact);
                
                // Add to list UI
                const container = document.getElementById('artifacts-list-container');
                const newCardHtml = \`
                <div class="artifact-card selected" onclick="populateForm(\${JSON.stringify(msg.artifact)})">
                    <div class="card-top">
                        <span class="type-badge badge-\${msg.artifact.type}">\${msg.artifact.type}</span>
                        <span class="card-files-count">\${msg.artifact.files.length} file\${msg.artifact.files.length === 1 ? '' : 's'}</span>
                    </div>
                    <div class="card-name">\${msg.artifact.name}</div>
                    <div class="card-path">\${msg.artifact.path}</div>
                </div>\`;
                container.innerHTML = newCardHtml + container.innerHTML;
            } else if (msg.command === 'submitResult') {
                const btn = document.getElementById('btn-submit');
                btn.disabled = false;
                document.getElementById('btn-text').innerText = 'Submit for Peer Review & Publish';

                const statusArea = document.getElementById('result-status-area');
                statusArea.style.display = 'block';

                if (msg.success) {
                    if (msg.isDuplicate) {
                        statusArea.innerHTML = \`
                        <div class="alert-box alert-info">
                            <strong>ℹ️ Artifact Already Exists</strong>
                            <div>An identical artifact already exists in the marketplace\${msg.existingVersion ? ' (v' + msg.existingVersion + ')' : ''}. No changes were detected. Review request was not duplicated.</div>
                            <button class="btn-secondary" style="align-self: flex-start; margin-top: 4px;" onclick="viewArtifactDetails('\${msg.artifactName}')">👁️ View in Marketplace</button>
                        </div>\`;
                    } else {
                        const visLabel = msg.isPrivate ? '🔒 Private (Development)' : '🌐 Public (Marketplace)';
                        statusArea.innerHTML = \`
                        <div class="alert-box alert-success">
                            <strong>✓ Submitted Successfully for Review! [\${visLabel}]</strong>
                            <div>Artifact '<strong>\${msg.artifactName}</strong>' was packaged and submitted to Engineering Commons as <strong>\${visLabel}</strong>.</div>
                            \${msg.reviewId ? \`<button class="btn-primary" style="padding: 6px 12px; font-size: 11.5px; align-self: flex-start; margin-top: 4px;" onclick="openReviewThread('\${msg.reviewId}', '\${msg.artifactName}')">👁️ Open PR Diff Review Thread</button>\` : ''}
                        </div>\`;
                    }
                } else {
                    statusArea.innerHTML = \`
                    <div class="alert-box alert-error">
                        <strong>✕ Contribution Failed</strong>
                        <div>\${msg.error || 'An error occurred during submission.'}</div>
                    </div>\`;
                }
            }
        });

        // Initialize first item
        if (discoveredArtifacts.length > 0) {
            populateForm(discoveredArtifacts[0]);
        }
    </script>
</body>
</html>`;
    }
}

function detectTypeFromPath(relPath: string): string {
    const lower = relPath.toLowerCase();
    if (lower.includes('agent')) return 'agent';
    if (lower.includes('skill')) return 'skill';
    if (lower.includes('plugin')) return 'plugin';
    if (lower.includes('mcp')) return 'mcpserver';
    if (lower.includes('prompt')) return 'prompt';
    if (lower.endsWith('cip.yml')) return 'package';
    return 'agent';
}

function getBadgeClass(type: string): string {
    const norm = (type || 'agent').toLowerCase();
    if (norm === 'agent') return 'badge-agent';
    if (norm === 'skill') return 'badge-skill';
    if (norm === 'plugin') return 'badge-plugin';
    if (norm === 'mcpserver') return 'badge-mcpserver';
    if (norm === 'package') return 'badge-package';
    if (norm === 'prompt') return 'badge-prompt';
    return 'badge-agent';
}
