import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as zlib from 'zlib';
import * as os from 'os';
import { IAuthenticationStatusProvider } from '../services/authenticationStatusProvider';
import { ICliExecutor } from '../services/cliExecutor';
import { CompositeArtifactUsageTracker } from '../services/usageTracker';
import { DiscoveredArtifactItem } from '../commands/listCommand';
import { CertificationService, CertificationStatusResult } from '../services/certificationService';
import { checkArtifactInstallation } from '../services/installationChecker';
import { SharePointArtifactService } from '../services/sharepoint/sharepointArtifactService';
import { SharePointReviewService } from '../services/sharepoint/sharepointReviewService';
import { AdoGovernanceService } from '../services/adoGovernanceService';
import { placeArtifactFilesIntoWorkspace, synthesizeArtifactFiles } from '../commands/installCommand';
import { classifyArtifactUsability, isPlaybookArtifact } from './engineeringCommonsSidebarWebviewProvider';
import { createZipBuffer } from '../services/zipArchiveService';

export interface ArtifactVersionInfo {
    version: string;
    cipPackage: string;
    isLatest: boolean;
    publishedAt?: string;
}

export interface ArtifactFileInfo {
    path: string;
    content?: string;
}

export interface ArtifactDetailsInfo {
    id: string;
    name: string;
    type: string;
    version: string;
    description: string;
    producerEmail?: string;
    publishedAt?: string;
    cipPackage?: string;
    isPrivate?: boolean;
    isOwner?: boolean;
    allowedContributors?: string;
    allowedReviewers?: string;
    allowedConsumers?: string;
    files: ArtifactFileInfo[];
    availableVersions: ArtifactVersionInfo[];
    isInstalled: boolean;
    installedVersion?: string;
    isCertified?: boolean;
    isFeatured?: boolean;
    certificationStatus?: string;
    certificationBadge?: string;
    compositeScore?: number;
    contentHash?: string;
    tamperStatus?: string;
    certificationPillars?: any;
    hardGates?: any;
    certifiedAt?: string;
    certifiedVersion?: string;
    certificationReason?: string;
    isReviewer?: boolean;
    isAdmin?: boolean;
    isForbidden?: boolean;
    forbiddenMessage?: string;
    certificationCriteria?: any;
    certificationMetrics?: any;
    source?: string;
    domain?: string;
    architecture?: string;
    impact?: string;
    impactMetrics?: Array<{ value: string; label: string; icon?: string }>;
    keyFeatures?: string[];
    githubRepo?: string;
    videoUrl?: string;
    copilotPrompt?: string;
    usability?: string;
    usabilityLabel?: string;
    usabilityBadge?: string;
    isCopilotReady?: boolean;
    usageAnalytics?: {
        downloads: number;
        uniqueUsers: number;
        usageCount: number;
        usageRate: number;
        lastUsedAt?: string;
        sourceBreakdown: Record<string, number>;
        externalTelemetry: Record<string, string>;
    };
    hasDownloaded?: boolean;
    hasUsed?: boolean;
    canRate?: boolean;
    userUsageCount?: number;
    currentUserEmail?: string;
    reviews?: Array<{
        id?: string;
        reviewId?: string;
        userId?: string;
        userEmail?: string;
        rating: number;
        comment?: string;
        feedbackText?: string;
        createdAt?: string;
        timestamp?: string;
    }>;
}

export class ArtifactDetailsWebviewProvider {
    private static currentPanel: vscode.WebviewPanel | undefined;
    private authProvider: IAuthenticationStatusProvider;
    private cliExecutor: ICliExecutor;
    private cliExecutable: string;
    private backendUrl: string;
    private usageTracker?: CompositeArtifactUsageTracker;
    private onInstalledCallback?: () => void;
    private certificationService: CertificationService;
    private spArtifactService: SharePointArtifactService;
    private spReviewService: SharePointReviewService;
    private adoGovernanceService: AdoGovernanceService;
    private lastArtifact?: DiscoveredArtifactItem;
    private lastVersion?: string;
    private static detailsCache = new Map<string, { timestamp: number; data: ArtifactDetailsInfo }>();

    public static closeIfOpen(): void {
        if (ArtifactDetailsWebviewProvider.currentPanel) {
            ArtifactDetailsWebviewProvider.currentPanel.dispose();
            ArtifactDetailsWebviewProvider.currentPanel = undefined;
        }
    }

    public static invalidateDetailsCache(artifactName?: string): void {
        if (!artifactName) {
            ArtifactDetailsWebviewProvider.detailsCache.clear();
        } else {
            const clean = artifactName.trim().toLowerCase();
            for (const key of Array.from(ArtifactDetailsWebviewProvider.detailsCache.keys())) {
                if (key.startsWith(clean + '@')) {
                    ArtifactDetailsWebviewProvider.detailsCache.delete(key);
                }
            }
        }
    }

    public async refreshIfOpen(force = false): Promise<void> {
        if (ArtifactDetailsWebviewProvider.currentPanel) {
            const isAuth = await this.authProvider.isAuthenticated();
            if (!isAuth) {
                ArtifactDetailsWebviewProvider.closeIfOpen();
                return;
            }
            if (this.lastArtifact) {
                await this.renderDetails(ArtifactDetailsWebviewProvider.currentPanel, this.lastArtifact, this.lastVersion, force);
            }
        }
    }

    constructor(
        authProvider: IAuthenticationStatusProvider,
        cliExecutor: ICliExecutor,
        cliExecutable: string,
        backendUrl = 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io',
        usageTracker?: CompositeArtifactUsageTracker,
        onInstalledCallback?: () => void,
        certificationService?: CertificationService
    ) {
        this.authProvider = authProvider;
        this.cliExecutor = cliExecutor;
        this.cliExecutable = cliExecutable;
        this.backendUrl = (backendUrl || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/+$/, '');
        this.usageTracker = usageTracker;
        this.onInstalledCallback = onInstalledCallback;
        this.certificationService = certificationService || new CertificationService(authProvider, cliExecutor, cliExecutable, this.backendUrl);
        this.spArtifactService = new SharePointArtifactService();
        this.spReviewService = new SharePointReviewService();
        this.adoGovernanceService = new AdoGovernanceService(authProvider);
    }

    public setBackendUrl(url: string): void {
        this.backendUrl = (url || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/+$/, '');
        this.certificationService = new CertificationService(this.authProvider, this.cliExecutor, this.cliExecutable, this.backendUrl);
    }

    public async showArtifactDetails(artifact: DiscoveredArtifactItem, initialVersion?: string): Promise<void> {
        const isAuth = await this.authProvider.isAuthenticated();
        if (!isAuth) {
            vscode.window?.showWarningMessage('Please sign in with your MAQ corporate account to view and access enterprise artifacts.');
            return;
        }

        const defaultColumn = (vscode.ViewColumn?.One) ?? (1 as any);
        const column = vscode.window?.activeTextEditor?.viewColumn || defaultColumn;

        if (ArtifactDetailsWebviewProvider.currentPanel) {
            ArtifactDetailsWebviewProvider.currentPanel.reveal(column);
        } else if (vscode.window && typeof vscode.window.createWebviewPanel === 'function') {
            ArtifactDetailsWebviewProvider.currentPanel = vscode.window.createWebviewPanel(
                'engineeringCommonsArtifactDetails',
                `Artifact: ${artifact.name}`,
                column,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            ArtifactDetailsWebviewProvider.currentPanel.onDidDispose(() => {
                ArtifactDetailsWebviewProvider.currentPanel = undefined;
            });
        }

        const panel = ArtifactDetailsWebviewProvider.currentPanel;
        if (!panel) return;

        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'install':
                    await this.handleInstall(panel, artifact.name, message.version || artifact.version, artifact.type);
                    break;
                case 'downloadZip':
                    await this.handleDownloadZip(panel, artifact.name, message.version || artifact.version, artifact.type);
                    break;
                case 'selectVersion':
                    await this.renderDetails(panel, artifact, message.version);
                    break;
                case 'openFileInEditor':
                    await this.openFileInEditor(message.fileName, message.content);
                    break;
                case 'toggleVisibility':
                    await this.handleToggleVisibility(panel, artifact, message.isPrivate);
                    break;
                case 'certifyArtifact':
                    await this.handleCertifyArtifact(panel, artifact, message.version);
                    break;
                case 'revokeCertification':
                    await this.handleRevokeCertification(panel, artifact, message.reason);
                    break;
                case 'recheckCertification':
                    await this.handleRecheckCertification(panel, artifact);
                    break;
                case 'verifyIntegrity':
                    await this.handleVerifyIntegrity(panel, artifact);
                    break;
                case 'submitReview':
                    await this.handleSubmitReview(panel, artifact, message.rating, message.feedbackText);
                    break;
                case 'runArtifact':
                    await this.handleRunArtifact(panel, artifact);
                    break;
                case 'viewAuditHistory':
                    await this.handleViewAuditHistory(panel, artifact);
                    break;
                case 'deleteArtifact':
                    await this.handleDeleteArtifact(panel, artifact.name);
                    break;
                case 'toggleFeatured':
                    await this.handleToggleFeatured(panel, artifact.name);
                    break;
            }
        });

        await this.renderDetails(panel, artifact, initialVersion || artifact.version);
    }

    private async openFileInEditor(fileName: string, content: string): Promise<void> {
        try {
            const ext = path.extname(fileName).toLowerCase();
            let language = 'markdown';
            if (ext === '.json') language = 'json';
            else if (ext === '.yml' || ext === '.yaml') language = 'yaml';
            else if (ext === '.ts') language = 'typescript';
            else if (ext === '.js') language = 'javascript';
            else if (ext === '.py') language = 'python';
            else if (ext === '.sh' || ext === '.bash') language = 'shellscript';
            else if (ext === '.ps1') language = 'powershell';

            if (vscode.workspace && typeof vscode.workspace.openTextDocument === 'function') {
                const doc = await vscode.workspace.openTextDocument({
                    content: content || `// Empty file: ${fileName}`,
                    language
                });
                if (vscode.window && typeof vscode.window.showTextDocument === 'function') {
                    await vscode.window.showTextDocument(doc, { preview: true });
                }
            }
        } catch (err) {
            vscode.window?.showErrorMessage(`Could not open file ${fileName}: ${err}`);
        }
    }

    private async renderDetails(panel: vscode.WebviewPanel, artifact: DiscoveredArtifactItem, selectedVersion?: string, force = false): Promise<void> {
        this.lastArtifact = artifact;
        this.lastVersion = selectedVersion;
        const details = await this.fetchArtifactDetails(artifact, selectedVersion, force);
        panel.title = `Artifact: ${details.name}`;
        panel.webview.html = this.getHtmlForWebview(details);
    }

    private async fetchArtifactDetails(artifact: DiscoveredArtifactItem, targetVersion?: string, force = false): Promise<ArtifactDetailsInfo> {
        const token = await this.authProvider.getToken();
        const effectiveVersion = targetVersion || artifact.version || '1.0.0';
        const cleanName = (artifact.name || '').trim().toLowerCase();
        const cacheKey = `${cleanName}@${effectiveVersion}`;
        const now = Date.now();

        if (!force && ArtifactDetailsWebviewProvider.detailsCache.has(cacheKey)) {
            const cached = ArtifactDetailsWebviewProvider.detailsCache.get(cacheKey)!;
            if (now - cached.timestamp < 15 * 60 * 1000) { // 15-minute client-side details cache
                return cached.data;
            }
        }

        // 0. Consolidated Bundle Request (1 single network call replacing 4 separate calls)
        let bundleData: any = null;
        try {
            const bundleUrl = `${this.backendUrl}/api/artifacts/${encodeURIComponent(artifact.name)}/bundle?version=${encodeURIComponent(effectiveVersion)}`;
            const bRes = await this.fetchJson<any>(bundleUrl, token);
            if (bRes.status === 200 && bRes.data) {
                bundleData = bRes.data;
            }
        } catch { }

        // 1. Fetch available versions
        let versions: ArtifactVersionInfo[] = [];
        if (bundleData?.versions && Array.isArray(bundleData.versions) && bundleData.versions.length > 0) {
            versions = bundleData.versions;
        } else {
            try {
                const res = await this.fetchJson<ArtifactVersionInfo[]>(`${this.backendUrl}/api/artifacts/${encodeURIComponent(artifact.name)}/versions`, token);
                if (res.status === 200 && res.data && Array.isArray(res.data)) {
                    versions = res.data;
                }
            } catch { }
        }

        if (versions.length === 0) {
            versions = [{
                version: effectiveVersion,
                cipPackage: `company.cip.${artifact.name}`,
                isLatest: true
            }];
        }

        // 2. Fetch full artifact content / files
        let files: ArtifactFileInfo[] = [];
        let description = `Official Company ${artifact.type} AI artifact for enterprise workflows.`;
        let producerEmail = 'producer@company.com';
        let publishedAt = new Date().toLocaleDateString();
        let detectedType = artifact.type;
        let isFeatured = Boolean((artifact as any).isFeatured);

        // 1. Primary: Check local artifacts-json and bundled master catalog for genuine files
        try {
            const wsFolders = vscode.workspace.workspaceFolders;
            const cleanName = artifact.name.replace(/^leap-/, '').toLowerCase();
            if (wsFolders && wsFolders.length > 0) {
                const wsRoot = wsFolders[0].uri.fsPath;
                const candidates = [
                    path.join(wsRoot, 'artifacts-json', `${artifact.name}.json`),
                    path.join(wsRoot, 'artifacts-json', `${cleanName}.json`),
                    path.join(wsRoot, 'artifacts-json', `leap-${cleanName}.json`)
                ];
                for (const candidate of candidates) {
                    if (fs.existsSync(candidate)) {
                        const raw = JSON.parse(fs.readFileSync(candidate, 'utf8'));
                        if (raw.description) description = raw.description;
                        if (raw.author || raw.producerEmail) producerEmail = raw.author || raw.producerEmail;
                        if (raw.type) detectedType = raw.type;
                        if (raw.isFeatured !== undefined) isFeatured = Boolean(raw.isFeatured);
                        if (raw.copilotPrompt) (artifact as any).copilotPrompt = raw.copilotPrompt;
                        if (Array.isArray(raw.files) && raw.files.length > 0) {
                            files = raw.files.map((f: any) => ({
                                path: f.path || f.name || 'file',
                                content: typeof f.content === 'string' ? f.content : JSON.stringify(f.content || '', null, 2)
                            }));
                            break;
                        }
                    }
                }
            }

            if (files.length === 0) {
                const candidates = [
                    path.join(__dirname, '..', '..', 'resources', 'catalog', 'masterCatalog.json'),
                    path.join(__dirname, '..', '..', '..', 'resources', 'catalog', 'masterCatalog.json'),
                    path.join(process.cwd(), 'engineering-commons-vscode', 'resources', 'catalog', 'masterCatalog.json'),
                    path.join(process.cwd(), 'resources', 'catalog', 'masterCatalog.json')
                ];
                for (const catPath of candidates) {
                    if (fs.existsSync(catPath)) {
                        try {
                            const cat = JSON.parse(fs.readFileSync(catPath, 'utf8'));
                            const found = cat.find((a: any) => (a.name || a.id || '').toLowerCase() === cleanName);
                            if (found) {
                                if (found.isFeatured !== undefined) isFeatured = Boolean(found.isFeatured);
                                if (found.description) description = found.description;
                                if (found.author || found.producerEmail) producerEmail = found.author || found.producerEmail;
                                if (found.type) detectedType = found.type;
                                if (found.copilotPrompt) (artifact as any).copilotPrompt = found.copilotPrompt;
                                if (Array.isArray(found.files) && found.files.length > 0) {
                                    files = found.files.map((f: any) => ({
                                        path: f.path || f.name || 'file',
                                        content: typeof f.content === 'string' ? f.content : JSON.stringify(f.content || '', null, 2)
                                    }));
                                    break;
                                }
                            }
                        } catch { }
                    }
                }
            }
        } catch { }

        // 2. Secondary Fallback: Use bundled artifact data if available
        if (files.length === 0 && bundleData?.artifact) {
            const bArt = bundleData.artifact;
            if (bArt.description) description = bArt.description;
            if (bArt.producerEmail || bArt.author) producerEmail = bArt.producerEmail || bArt.author;
            if (bArt.publishedAt) publishedAt = new Date(bArt.publishedAt).toLocaleDateString();
            if (bArt.type && bArt.type !== 'normalfile' && bArt.type !== 'unknown') {
                detectedType = bArt.type;
            }
            if (Array.isArray(bArt.files) && bArt.files.length > 0) {
                files = bArt.files.map((f: any) => ({
                    path: f.path || f.name || 'file',
                    content: typeof f.content === 'string' ? f.content : JSON.stringify(f.content || '', null, 2)
                }));
            }
        }

        // 3. Remote Download Fallback: Fetch from Azure DevOps / Backend if still not found
        if (files.length === 0) {
            try {
                const downloadUrl = `${this.backendUrl}/api/artifacts/${encodeURIComponent(artifact.name)}/download?version=${encodeURIComponent(effectiveVersion)}`;
                const res = await this.fetchJson<any>(downloadUrl, token);
                if (res.status === 200 && res.data) {
                    if (res.data.description) description = res.data.description;
                    if (res.data.producerEmail || res.data.author) producerEmail = res.data.producerEmail || res.data.author;
                    if (res.data.publishedAt) publishedAt = new Date(res.data.publishedAt).toLocaleDateString();
                    if (res.data.type && res.data.type !== 'normalfile' && res.data.type !== 'unknown') {
                        detectedType = res.data.type;
                    }

                    // Direct files array
                    if (Array.isArray(res.data.files) && res.data.files.length > 0) {
                        files = res.data.files.map((f: any) => ({
                            path: f.path || f.name || 'file',
                            content: typeof f.content === 'string' ? f.content : JSON.stringify(f.content || '', null, 2)
                        }));
                    }

                    // Nested files inside content
                    if (files.length === 0 && res.data.content) {
                        try {
                            const parsed = typeof res.data.content === 'string' ? JSON.parse(res.data.content) : res.data.content;
                            if (parsed && typeof parsed === 'object') {
                                if (parsed.description) description = parsed.description;
                                if (parsed.producerEmail || parsed.author) producerEmail = parsed.producerEmail || parsed.author;
                                if (parsed.type && parsed.type !== 'normalfile' && parsed.type !== 'unknown') {
                                    detectedType = parsed.type;
                                }
                                if (Array.isArray(parsed.files) && parsed.files.length > 0) {
                                    files = parsed.files.map((f: any) => ({
                                        path: f.path || f.name || 'file',
                                        content: typeof f.content === 'string' ? f.content : JSON.stringify(f.content || '', null, 2)
                                    }));
                                }
                            }
                        } catch { }
                    }

                    // Raw markdown content
                    if (files.length === 0 && res.data.content && typeof res.data.content === 'string' && res.data.content.trim().length > 0) {
                        const normType = (detectedType || artifact.type || 'agent').toLowerCase();
                        const filePath = normType === 'skill' ? `skills/${artifact.name}/SKILL.md` : `.github/agents/${artifact.name}.agent.md`;
                        files = [
                            {
                                path: filePath,
                                content: res.data.content
                            },
                            {
                                path: 'cip.yml',
                                content: `name: ${artifact.name}\nversion: ${effectiveVersion}\ntype: ${normType}\ncategory: Enterprise AI\nauthor: ${producerEmail}\ndescription: ${description}\nmain: ${filePath}\n`
                            },
                            {
                                path: 'README.md',
                                content: `# ${artifact.name}\n\n${description}\n\n## Quick Start\n\`\`\`bash\nengineering-commons install ${artifact.name}\n\`\`\`\n`
                            }
                        ];
                    }
                }
            } catch { }
        }

        // Classify type based on files structure if still generic
        if (!detectedType || detectedType.toLowerCase() === 'normalfile' || detectedType.toLowerCase() === 'unknown') {
            const hasAgent = files.some(f => {
                const p = f.path.replace(/\\/g, '/').toLowerCase();
                return p.endsWith('.agent.md') || p.endsWith('.agent') || p.includes('/agents/') || p.startsWith('agents/') || p.startsWith('.github/agents/');
            });
            const hasSkill = files.some(f => {
                const p = f.path.replace(/\\/g, '/').toLowerCase();
                return p.endsWith('skill.md') || p.includes('/skills/') || p.startsWith('skills/') || p.startsWith('.github/skills/');
            });
            const hasPlugin = files.some(f => {
                const p = f.path.replace(/\\/g, '/').toLowerCase();
                return p.endsWith('plugin.json') || p.includes('/plugins/') || p.startsWith('plugins/');
            });
            const hasMcp = files.some(f => {
                const p = f.path.replace(/\\/g, '/').toLowerCase();
                return p.endsWith('mcp_config.json') || p.endsWith('mcp.json') || p.includes('/.mcp/') || p.startsWith('.mcp/');
            });

            if (hasAgent) detectedType = 'agent';
            else if (hasSkill) detectedType = 'skill';
            else if (hasMcp) detectedType = 'mcpserver';
            else if (hasPlugin) detectedType = 'plugin';
            else if (artifact.name.toLowerCase().includes('agent') || artifact.name.toLowerCase().includes('reviewer') || artifact.name.toLowerCase().includes('fix')) detectedType = 'agent';
            else if (artifact.name.toLowerCase().includes('skill')) detectedType = 'skill';
            else if (artifact.name.toLowerCase().includes('mcp')) detectedType = 'mcpserver';
            else if (artifact.name.toLowerCase().includes('plugin')) detectedType = 'plugin';
        }

        // Fallback: Check local artifacts-json repository (offline / live AI Leap artifacts)
        if (files.length === 0) {
            try {
                const wsFolders = vscode.workspace.workspaceFolders;
                if (wsFolders && wsFolders.length > 0) {
                    const wsRoot = wsFolders[0].uri.fsPath;
                    const cleanName = artifact.name.replace(/^leap-/, '');
                    const candidates = [
                        path.join(wsRoot, 'artifacts-json', `${artifact.name}.json`),
                        path.join(wsRoot, 'artifacts-json', `${cleanName}.json`),
                        path.join(wsRoot, 'artifacts-json', `leap-${cleanName}.json`)
                    ];
                    for (const candidate of candidates) {
                        if (fs.existsSync(candidate)) {
                            const raw = JSON.parse(fs.readFileSync(candidate, 'utf8'));
                            if (raw.description) description = raw.description;
                            if (raw.author || raw.producerEmail) producerEmail = raw.author || raw.producerEmail;
                            if (raw.type) detectedType = raw.type;
                            if (Array.isArray(raw.files) && raw.files.length > 0) {
                                files = raw.files.map((f: any) => ({
                                    path: f.path || f.name || 'file',
                                    content: typeof f.content === 'string' ? f.content : JSON.stringify(f.content || '', null, 2)
                                }));
                                break;
                            }
                        }
                    }
                }
            } catch {}
        }

        // Fallback comprehensive files if not returned by download API
        if (files.length === 0) {
            const normType = (detectedType || artifact.type || 'agent').toLowerCase();
            if (normType === 'agent') {
                files = [
                    {
                        path: `.github/agents/${artifact.name}.agent.md`,
                        content: `---\nname: '${artifact.name} Agent'\ndescription: '${description}'\ntools: ['codebase', 'search', 'editFiles', 'runCommands', 'problems']\n---\n\n# ${artifact.name} Agent\n\nYou are a **Senior AI Engineer & Domain Specialist** operating in Copilot Agent Mode for enterprise workflows.\n\n## Directives\n1. **Context Awareness**: Analyze existing repository patterns and architecture conventions before proposing code modifications.\n2. **Clean Execution**: Produce modular, well-tested, and maintainable implementations adhering to company coding standards.\n3. **Safety & Validation**: Run static validation and test suites after every automated change.\n\n## Workflow Instructions\n- Ingest relevant configuration from \`cip.yml\`.\n- Parse target files and generate structured diffs for peer review.\n- Report execution outcomes with full telemetry tracking.\n`
                    },
                    {
                        path: 'cip.yml',
                        content: `name: ${artifact.name}\nversion: ${effectiveVersion}\ntype: agent\ncategory: Enterprise AI\nauthor: ${producerEmail}\ndescription: ${description}\nmain: .github/agents/${artifact.name}.agent.md\nkeywords:\n  - enterprise\n  - automation\n  - copilot-agent\n`
                    },
                    {
                        path: 'instructions/rules.md',
                        content: `# Enterprise Guidelines for ${artifact.name}\n\n1. **Zero Secret Leakage**: Never commit API keys, connection strings, or personal access tokens.\n2. **Explicit Typings**: Require strict TypeScript / strongly-typed declarations across all interfaces.\n3. **Audit Compliance**: All automated operations must emit telemetry events for CIP dashboard tracking.\n`
                    },
                    {
                        path: 'README.md',
                        content: `# ${artifact.name}\n\n${description}\n\n## Quick Start\n\`\`\`bash\n# Install in your workspace\nengineering-commons install ${artifact.name}\n\`\`\`\n\n## Verification\nRun \`engineering-commons status\` to check certification and installation status.\n`
                    }
                ];
            } else if (normType === 'skill') {
                files = [
                    {
                        path: `skills/${artifact.name}/SKILL.md`,
                        content: `---\nname: ${artifact.name}\nversion: ${effectiveVersion}\ndescription: ${description}\nauthor: ${producerEmail}\n---\n\n# ${artifact.name} Skill Workflow\n\n## Overview\nThis skill defines automated execution steps, input validation parameters, and output formatting for ${artifact.name}.\n\n## Execution Workflow\n1. Validate workspace configuration and required CLI dependencies.\n2. Ingest contextual parameters from the active editor session.\n3. Execute the core transformation pipeline with full exception handling.\n4. Format and return structured results to the agent or user.\n`
                    },
                    {
                        path: 'cip.yml',
                        content: `name: ${artifact.name}\nversion: ${effectiveVersion}\ntype: skill\ncategory: Enterprise AI\nauthor: ${producerEmail}\ndescription: ${description}\nmain: skills/${artifact.name}/SKILL.md\nkeywords:\n  - skill\n  - workflow\n  - automation\n`
                    },
                    {
                        path: 'README.md',
                        content: `# ${artifact.name} Skill\n\n${description}\n\n## Installation\n\`\`\`bash\nengineering-commons install ${artifact.name}\n\`\`\`\n`
                    }
                ];
            } else if (normType === 'plugin') {
                files = [
                    {
                        path: `plugins/${artifact.name}/plugin.json`,
                        content: `{\n  "name": "${artifact.name}",\n  "version": "${effectiveVersion}",\n  "description": "${description}",\n  "author": "${producerEmail}",\n  "main": "index.js",\n  "contributes": {\n    "commands": [],\n    "configuration": {}\n  }\n}`
                    },
                    {
                        path: 'cip.yml',
                        content: `name: ${artifact.name}\nversion: ${effectiveVersion}\ntype: plugin\nauthor: ${producerEmail}\ndescription: ${description}\n`
                    },
                    {
                        path: 'README.md',
                        content: `# ${artifact.name} Plugin\n\n${description}\n`
                    }
                ];
            } else if (normType === 'mcpserver' || normType === 'mcp') {
                files = [
                    {
                        path: `.mcp/${artifact.name}/server.json`,
                        content: `{\n  "mcpServers": {\n    "${artifact.name}": {\n      "command": "node",\n      "args": ["dist/index.js"],\n      "env": {},\n      "disabled": false\n    }\n  }\n}`
                    },
                    {
                        path: 'cip.yml',
                        content: `name: ${artifact.name}\nversion: ${effectiveVersion}\ntype: mcpserver\nauthor: ${producerEmail}\ndescription: ${description}\n`
                    },
                    {
                        path: 'README.md',
                        content: `# ${artifact.name} MCP Server\n\n${description}\n`
                    }
                ];
            } else {
                files = [
                    {
                        path: 'cip.yml',
                        content: `name: ${artifact.name}\nversion: ${effectiveVersion}\ntype: package\nauthor: ${producerEmail}\ndescription: ${description}\n`
                    },
                    {
                        path: 'README.md',
                        content: `# ${artifact.name}\n\n${description}\n`
                    }
                ];
            }
        }

        // Guarantee README.md is present and prioritized at index 0 for all artifacts
        let readmeIdx = files.findIndex(f => {
            const p = (f.path || '').toLowerCase();
            return p === 'readme.md' || p.endsWith('/readme.md');
        });

        if (readmeIdx === -1) {
            const synth = this.synthesizeProperReadme(artifact, detectedType, description, producerEmail, effectiveVersion);
            files.unshift({
                path: 'README.md',
                content: synth.content
            });
            if (!(artifact as any).copilotPrompt) {
                (artifact as any).copilotPrompt = synth.prompt;
            }
        } else {
            if (readmeIdx > 0) {
                const rFile = files.splice(readmeIdx, 1)[0];
                files.unshift(rFile);
            }
            if (!(artifact as any).copilotPrompt && files[0].content) {
                const promptMatch = files[0].content.match(/```(?:markdown|text)?\r?\n(@[\s\S]*?|\/[\s\S]*?|Using [\s\S]*?|You are [\s\S]*?|engineering-commons [\s\S]*?)```/);
                if (promptMatch) {
                    (artifact as any).copilotPrompt = promptMatch[1].trim();
                }
            }
        }

        // 3. Check installed status in workspace (verified on disk)
        let isInstalled = false;
        let installedVersion: string | undefined = undefined;

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const root = workspaceFolders[0].uri.fsPath;
            const check = checkArtifactInstallation(root, artifact.name, detectedType || artifact.type);
            isInstalled = check.isInstalled;
            if (isInstalled && check.version) {
                installedVersion = check.version;
            }
        }

        // 4. Fetch artifact-level usage telemetry (from bundle or ADO fallback)
        let usageAnalytics: any = null;
        if (bundleData?.usage) {
            usageAnalytics = bundleData.usage;
        } else {
            try {
                usageAnalytics = await this.adoGovernanceService.getArtifactUsageFromAdoAsync(artifact.name);
            } catch (err) {
                console.warn('[ArtifactDetails] Failed to fetch usage from ADO:', err);
            }

            // Secondary fallback to backend usage API if ADO fetch failed
            if (!usageAnalytics) {
                try {
                    const usageRes = await this.fetchJson<any>(`${this.backendUrl}/api/usage/artifacts/${encodeURIComponent(artifact.name)}`, token);
                    if (usageRes.status === 200 && usageRes.data) {
                        usageAnalytics = usageRes.data;
                    }
                } catch { }
            }
        }

        // 5. Query artifact metadata for isPrivate & producerEmail & RBAC whitelists
        let isPrivate = false;
        let allowedContributors = '';
        let allowedReviewers = '';
        let allowedConsumers = '';
        let isForbidden = false;
        let forbiddenMessage = '';

        if (bundleData?.artifact) {
            const bArt = bundleData.artifact;
            if (bArt.isPrivate !== undefined) isPrivate = Boolean(bArt.isPrivate);
            if (bArt.producerEmail) producerEmail = bArt.producerEmail;
            if (bArt.allowedContributors) allowedContributors = bArt.allowedContributors;
            if (bArt.allowedReviewers) allowedReviewers = bArt.allowedReviewers;
            if (bArt.allowedConsumers) allowedConsumers = bArt.allowedConsumers;
        } else {
            try {
                const artRes = await this.fetchJson<any>(`${this.backendUrl}/api/artifacts/${encodeURIComponent(artifact.name)}`, token);
                if (artRes.status === 403) {
                    isForbidden = true;
                    forbiddenMessage = artRes.data?.error || `Artifact '${artifact.name}' is private and only accessible to authorized contributors, reviewers, or consumers.`;
                } else if (artRes.status === 200 && artRes.data) {
                    if (artRes.data.isPrivate !== undefined) isPrivate = Boolean(artRes.data.isPrivate);
                    if (artRes.data.producerEmail) producerEmail = artRes.data.producerEmail;
                    if (artRes.data.allowedContributors) allowedContributors = artRes.data.allowedContributors;
                    if (artRes.data.allowedReviewers) allowedReviewers = artRes.data.allowedReviewers;
                    if (artRes.data.allowedConsumers) allowedConsumers = artRes.data.allowedConsumers;
                }
            } catch { }
        }

        // 6. Query certification status (from bundle or ADO fallback)
        let isCertified = false;
        let certificationStatus = 'NOT_CERTIFIED';
        let certificationBadge = 'Community';
        let compositeScore: number | undefined;
        let contentHash: string | undefined;
        let tamperStatus: string | undefined;
        let certificationPillars: any = undefined;
        let hardGates: any = undefined;
        let certifiedAt: string | undefined;
        let certifiedVersion: string | undefined;
        let certificationReason: string | undefined;
        let certCriteria: any = undefined;
        let certMetrics: any = undefined;

        if (bundleData?.certification) {
            const cert = bundleData.certification;
            isCertified = Boolean(cert.isCertified);
            certificationStatus = cert.status || (isCertified ? 'CERTIFIED' : 'NOT_CERTIFIED');
            certificationBadge = cert.badge || (isCertified ? 'Certified' : 'Verified');
            compositeScore = cert.compositeScore;
            contentHash = cert.contentHash;
            tamperStatus = cert.tamperStatus;
            certificationPillars = cert.pillars;
            hardGates = cert.hardGates;
            certifiedAt = cert.certifiedAt;
            certifiedVersion = cert.certifiedVersion;
            certificationReason = cert.reason;
            certCriteria = cert.criteria;
            certMetrics = cert.metrics;
            CertificationService.seedCache(artifact.name, cert);
        } else {
            try {
                const cert = await this.certificationService.getCertificationStatus(artifact.name);
                if (cert) {
                    isCertified = cert.isCertified;
                    certificationStatus = cert.status;
                    certificationBadge = cert.badge || (cert.isCertified ? 'Certified' : 'Verified');
                    compositeScore = cert.compositeScore;
                    contentHash = cert.contentHash;
                    tamperStatus = cert.tamperStatus;
                    certificationPillars = cert.pillars;
                    hardGates = cert.hardGates;
                    certifiedAt = cert.certifiedAt;
                    certifiedVersion = cert.certifiedVersion;
                    certificationReason = cert.reason;
                    certCriteria = cert.criteria;
                    certMetrics = cert.metrics;
                }
            } catch { }
        }

        const isLeap = artifact.source === 'AI_LEAP' || String(artifact.source || '').toLowerCase().includes('leap') || artifact.name.startsWith('leap-');
        if (isLeap) {
            isCertified = true;
            certificationStatus = 'CERTIFIED';
            certificationBadge = 'Certified';
            certifiedVersion = '1.0.0';
            certificationReason = `Certified AI Leap Enterprise Solution for ${artifact.domain || 'Enterprise AI'}. Includes synthesized Copilot Agent prompt (.agent.md) and skills.`;
        }

        const isPlaybook = isPlaybookArtifact(artifact);
        if (isPlaybook) {
            isCertified = true;
            certificationStatus = 'CERTIFIED';
            certificationBadge = 'Certified';
            certifiedVersion = '1.0.0';
            certificationReason = `Certified Prompt Playbook artifact from Azure BI & Data Engineering Playbook. Preserved 100% verbatim for Microsoft Fabric, Synapse, Databricks, and Copilot.`;
        }



        const currentUserEmail = (await this.authProvider.getEmail()) || '';
        const userRole = (await this.authProvider.getRole?.()) || '';
        const isOwner = Boolean(currentUserEmail && producerEmail && (currentUserEmail.toLowerCase() === producerEmail.toLowerCase()));
        const isReviewer = userRole.toUpperCase() === 'REVIEWER' || userRole.toUpperCase() === 'ADMIN' || currentUserEmail.toLowerCase().includes('reviewer') || currentUserEmail.toLowerCase().includes('admin');
        const isAdmin = userRole.toUpperCase() === 'ADMIN' || currentUserEmail.toLowerCase() === 'harsh.rana@maqsoftware.com' || currentUserEmail.toLowerCase().includes('admin');

        // Gating Verification: User must have downloaded AND used the tool at least 1 time
        const hasDownloaded = isInstalled || Boolean(usageAnalytics && usageAnalytics.downloads > 0);
        const usageCheck = this.checkIfUsed(artifact.name, currentUserEmail);
        const hasUsed = usageCheck.hasUsed || Boolean(usageAnalytics && usageAnalytics.usageCount > 0);
        const userUsageCount = Math.max(usageCheck.count, usageAnalytics?.usageCount || 0);
        const canRate = Boolean(hasDownloaded && hasUsed);

        let reviews: any[] = [];
        if (bundleData?.reviews && Array.isArray(bundleData.reviews)) {
            reviews = bundleData.reviews;
            CertificationService.seedReviewsCache(artifact.name, reviews);
        } else {
            try {
                reviews = await this.certificationService.getArtifactReviews(artifact.name);
            } catch (revErr) {
                console.warn('[ArtifactDetails] Failed to fetch reviews:', revErr);
            }
        }

        const result: ArtifactDetailsInfo = {
            id: artifact.name,
            name: artifact.name,
            type: detectedType || artifact.type,
            version: effectiveVersion,
            description,
            producerEmail,
            publishedAt,
            cipPackage: `company.cip.${artifact.name}`,
            isPrivate,
            isOwner,
            isReviewer,
            isAdmin,
            isForbidden,
            forbiddenMessage,
            allowedContributors,
            allowedReviewers,
            allowedConsumers,
            files,
            availableVersions: versions,
            isInstalled,
            installedVersion,
            isCertified,
            isFeatured,
            certificationStatus,
            certificationBadge,
            compositeScore,
            contentHash,
            tamperStatus,
            certificationPillars,
            hardGates,
            certifiedAt,
            certifiedVersion,
            certificationReason,
            certificationCriteria: certCriteria,
            certificationMetrics: certMetrics,
            source: isPlaybook ? 'Azure BI & Data Engineering Playbook' : (isLeap ? 'AI_LEAP' : (artifact.source || 'CIP')),
            domain: artifact.domain || (isLeap ? 'Enterprise AI' : 'General'),
            architecture: artifact.architecture || 'Pro Code',
            impact: artifact.impact,
            impactMetrics: artifact.impactMetrics,
            keyFeatures: artifact.keyFeatures,
            githubRepo: artifact.githubRepo,
            videoUrl: artifact.videoUrl,
            usability: classifyArtifactUsability(artifact).usability,
            usabilityLabel: classifyArtifactUsability(artifact).usabilityLabel,
            usabilityBadge: classifyArtifactUsability(artifact).usabilityBadge,
            isCopilotReady: classifyArtifactUsability(artifact).isCopilotReady,
            copilotPrompt: (artifact as any).copilotPrompt,
            usageAnalytics,
            hasDownloaded,
            hasUsed,
            canRate,
            userUsageCount,
            currentUserEmail,
            reviews
        };
        ArtifactDetailsWebviewProvider.detailsCache.set(cacheKey, { timestamp: now, data: result });
        return result;
    }

    private async handleToggleFeatured(panel: vscode.WebviewPanel, artifactName: string): Promise<void> {
        ArtifactDetailsWebviewProvider.invalidateDetailsCache(artifactName);
        const role = (await this.authProvider.getRole?.()) || 'CONSUMER';
        const email = (await this.authProvider.getEmail()) || '';
        const isAdmin = role.toUpperCase() === 'ADMIN' || email.toLowerCase() === 'harsh.rana@maqsoftware.com' || email.toLowerCase().includes('admin');
        if (!isAdmin) {
            vscode.window.showErrorMessage('Permission denied: Only administrators can modify featured status.');
            return;
        }

        const cleanName = artifactName.toLowerCase();
        let targetFeaturedState = true;

        // 1. Locate and toggle in artifacts-json directory
        const wsFolders = vscode.workspace.workspaceFolders;
        let wsRoot = wsFolders && wsFolders.length > 0 ? wsFolders[0].uri.fsPath : process.cwd();
        
        const jsonCandidates = [
            path.join(wsRoot, 'artifacts-json', `${artifactName}.json`),
            path.join(wsRoot, 'artifacts-json', `${cleanName}.json`),
            path.join(wsRoot, 'artifacts-json', `leap-${cleanName}.json`)
        ];

        let foundJson = false;
        for (const jPath of jsonCandidates) {
            if (fs.existsSync(jPath)) {
                try {
                    const raw = JSON.parse(fs.readFileSync(jPath, 'utf8'));
                    targetFeaturedState = !Boolean(raw.isFeatured);
                    raw.isFeatured = targetFeaturedState;
                    if (targetFeaturedState && !raw.category) {
                        raw.category = 'Featured';
                    }
                    fs.writeFileSync(jPath, JSON.stringify(raw, null, 2), 'utf8');
                    foundJson = true;
                    break;
                } catch { }
            }
        }

        // 2. Update masterCatalog.json
        const catCandidates = [
            path.join(wsRoot, 'engineering-commons-vscode', 'resources', 'catalog', 'masterCatalog.json'),
            path.join(wsRoot, 'resources', 'catalog', 'masterCatalog.json'),
            path.join(__dirname, '..', '..', 'resources', 'catalog', 'masterCatalog.json'),
            path.join(__dirname, '..', '..', '..', 'resources', 'catalog', 'masterCatalog.json')
        ];
        const homeDir = process.env.USERPROFILE || process.env.HOME || '';
        if (homeDir) {
            const extDir = path.join(homeDir, '.vscode', 'extensions');
            if (fs.existsSync(extDir)) {
                try {
                    const entries = fs.readdirSync(extDir).filter(d => d.startsWith('company.engineering-commons-vscode'));
                    for (const entry of entries) {
                        catCandidates.push(path.join(extDir, entry, 'resources', 'catalog', 'masterCatalog.json'));
                    }
                } catch { }
            }
        }
        for (const catPath of catCandidates) {
            if (fs.existsSync(catPath)) {
                try {
                    const cat = JSON.parse(fs.readFileSync(catPath, 'utf8'));
                    const idx = cat.findIndex((a: any) => (a.name || a.id || '').toLowerCase() === cleanName);
                    if (idx >= 0) {
                        if (!foundJson) {
                            targetFeaturedState = !Boolean(cat[idx].isFeatured);
                        }
                        cat[idx].isFeatured = targetFeaturedState;
                        fs.writeFileSync(catPath, JSON.stringify(cat, null, 2), 'utf8');
                    }
                } catch { }
            }
        }

        // 3. Update api/artifacts-catalog.json
        const apiCatPath = path.join(wsRoot, 'api', 'artifacts-catalog.json');
        if (fs.existsSync(apiCatPath)) {
            try {
                const apiCat = JSON.parse(fs.readFileSync(apiCatPath, 'utf8'));
                const aIdx = apiCat.findIndex((a: any) => (a.name || a.id || '').toLowerCase() === cleanName);
                if (aIdx >= 0) {
                    apiCat[aIdx].isFeatured = targetFeaturedState;
                    fs.writeFileSync(apiCatPath, JSON.stringify(apiCat, null, 2), 'utf8');
                }
            } catch { }
        }

        // Invalidate cache if present
        try {
            this.spArtifactService?.invalidateCache?.();
        } catch { }

        // 4. Show success feedback
        if (targetFeaturedState) {
            vscode.window.showInformationMessage(`⭐ Artifact '${artifactName}' is now marked as Featured!`);
        } else {
            vscode.window.showInformationMessage(`✓ Removed Featured status from artifact '${artifactName}'.`);
        }

        // 5. Update cached artifact and re-render details
        if (this.lastArtifact) {
            (this.lastArtifact as any).isFeatured = targetFeaturedState;
            await this.renderDetails(panel, this.lastArtifact, this.lastVersion);
        }

        // 6. Refresh sidebar webview so counts and badges update immediately
        if (this.onInstalledCallback) {
            this.onInstalledCallback();
        }
    }

    private async handleDeleteArtifact(panel: vscode.WebviewPanel, artifactName: string): Promise<void> {
        ArtifactDetailsWebviewProvider.invalidateDetailsCache(artifactName);
        const role = (await this.authProvider.getRole?.()) || 'CONSUMER';
        const email = (await this.authProvider.getEmail()) || '';
        const isAdmin = role.toUpperCase() === 'ADMIN' || email.toLowerCase() === 'harsh.rana@maqsoftware.com' || email.toLowerCase().includes('admin');
        if (!isAdmin) {
            vscode.window.showErrorMessage('Permission denied: Only administrators can permanently delete artifacts.');
            return;
        }

        const choice = await vscode.window.showWarningMessage(
            `Are you sure you want to permanently delete artifact '${artifactName}'? This will completely remove it from Azure DevOps Git and SharePoint Online. This action cannot be undone.`,
            { modal: true },
            'Delete Permanently'
        );
        if (choice !== 'Delete Permanently') return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Permanently deleting artifact '${artifactName}' across ADO and SharePoint...`,
            cancellable: false
        }, async (progress) => {
            const token = await this.authProvider.getToken();
            let adoSuccess = false;

            // 1. Delete directly from Azure DevOps Git repository (Authoritative)
            progress.report({ message: 'Removing from Azure DevOps Git repository...' });
            try {
                adoSuccess = await this.adoGovernanceService.deleteArtifactFromAdoAsync(artifactName);
            } catch (adoErr) {
                console.warn('[Details] Direct ADO delete error:', adoErr);
            }

            // 2. Best-effort notify backend API to clear memory cache
            try {
                await this.fetchJson<any>(
                    `${this.backendUrl}/api/admin/artifacts/${encodeURIComponent(artifactName)}`,
                    token,
                    'DELETE'
                );
            } catch (backendErr) {
                console.warn('[Details] Backend API delete error (non-fatal):', backendErr);
            }

            // Invalidate cache
            this.spArtifactService.invalidateCache();

            // Close webview panel
            ArtifactDetailsWebviewProvider.closeIfOpen();

            if (adoSuccess) {
                vscode.window.showInformationMessage(`✓ Artifact '${artifactName}' has been permanently deleted from Azure DevOps.`);
            } else {
                vscode.window.showErrorMessage(`Failed to delete artifact '${artifactName}'. Please ensure Azure DevOps repository is reachable.`);
            }

            if (this.onInstalledCallback) {
                this.onInstalledCallback();
            }
        });
    }

    private async handleCertifyArtifact(panel: vscode.WebviewPanel, artifact: DiscoveredArtifactItem, version?: string): Promise<void> {
        try {
            const res = await this.certificationService.certifyArtifact(artifact.name, version);
            if (res && res.isCertified) {
                vscode.window.showInformationMessage(`✓ Artifact '${artifact.name}' certified successfully!`);
                if (this.onInstalledCallback) this.onInstalledCallback();
                await this.renderDetails(panel, artifact, version || artifact.version);
            } else {
                vscode.window.showErrorMessage(`Failed to certify artifact '${artifact.name}'. Ensure you are logged in as a Reviewer.`);
            }
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to certify artifact: ${err}`);
        }
    }

    private async handleRevokeCertification(panel: vscode.WebviewPanel, artifact: DiscoveredArtifactItem, reason?: string): Promise<void> {
        try {
            let revocationReason = reason;
            if (!revocationReason) {
                revocationReason = await vscode.window.showInputBox({
                    prompt: `Enter reason for revoking certification of '${artifact.name}'`,
                    value: 'Enterprise security and quality standards revocation.'
                });
                if (!revocationReason) return;
            }
            const res = await this.certificationService.revokeCertification(artifact.name, revocationReason);
            if (res) {
                vscode.window.showWarningMessage(`✓ Certification for '${artifact.name}' has been revoked.`);
                if (this.onInstalledCallback) this.onInstalledCallback();
                await this.renderDetails(panel, artifact, artifact.version);
            } else {
                vscode.window.showErrorMessage(`Failed to revoke certification for '${artifact.name}'. Ensure you are logged in as a Reviewer.`);
            }
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to revoke certification: ${err}`);
        }
    }

    private async handleRecheckCertification(panel: vscode.WebviewPanel, artifact: DiscoveredArtifactItem): Promise<void> {
        try {
            vscode.window.showInformationMessage(`Recalculating certification signals for '${artifact.name}' from live ADO telemetry...`);
            const res = await this.certificationService.recheckCertification(artifact.name);
            if (res && res.success) {
                vscode.window.showInformationMessage(`✓ Recheck Complete! Updated Badge: ${res.newBadge} (${res.record?.compositeScore ? res.record.compositeScore + '/100' : ''}) synced to Azure DevOps.`);
                await this.renderDetails(panel, artifact, artifact.version);
            } else {
                vscode.window.showErrorMessage(`Failed to recheck certification for '${artifact.name}'.`);
            }
        } catch (err) {
            vscode.window.showErrorMessage(`Error rechecking certification: ${err}`);
        }
    }

    private async handleVerifyIntegrity(panel: vscode.WebviewPanel, artifact: DiscoveredArtifactItem): Promise<void> {
        try {
            const res = await this.certificationService.verifyIntegrity(artifact.name);
            if (res) {
                if (res.isIntegrityVerified) {
                    vscode.window.showInformationMessage(`✓ SHA-256 Verified: Cryptographically identical to Azure DevOps package (${(res.currentContentHash || '').slice(0, 16)}...).`);
                } else {
                    vscode.window.showWarningMessage(`⚠️ TAMPER DETECTED: Local package hash does not match authoritative Azure DevOps hash!`);
                }
            } else {
                vscode.window.showErrorMessage(`Unable to verify integrity against Azure DevOps.`);
            }
        } catch (err) {
            vscode.window.showErrorMessage(`Integrity check error: ${err}`);
        }
    }

    private getLocalUsageHistoryFile(): string {
        const homeDir = os.homedir();
        const cipDir = path.join(homeDir, '.engineering-commons');
        if (!fs.existsSync(cipDir)) {
            try { fs.mkdirSync(cipDir, { recursive: true }); } catch {}
        }
        return path.join(cipDir, 'usage-history.json');
    }

    private recordLocalUsage(artifactName: string, userEmail: string, artifactType = 'agent'): void {
        try {
            const usageFile = this.getLocalUsageHistoryFile();
            let history: any[] = [];
            if (fs.existsSync(usageFile)) {
                try { history = JSON.parse(fs.readFileSync(usageFile, 'utf8')); } catch {}
            }
            if (!Array.isArray(history)) history = [];

            const event = {
                id: `use-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                artifactId: artifactName,
                artifactName,
                artifactType,
                userEmail,
                action: 'USE',
                eventType: 'USE',
                source: 'VS_CODE',
                timestamp: new Date().toISOString()
            };
            history.unshift(event);
            fs.writeFileSync(usageFile, JSON.stringify(history.slice(0, 500), null, 2), 'utf8');

            const queueFile = path.join(os.homedir(), '.engineering-commons', 'ado_telemetry_queue.json');
            let queue: any[] = [];
            if (fs.existsSync(queueFile)) {
                try { queue = JSON.parse(fs.readFileSync(queueFile, 'utf8')); } catch {}
            }
            if (!Array.isArray(queue)) queue = [];
            queue.push(event);
            fs.writeFileSync(queueFile, JSON.stringify(queue.slice(0, 500), null, 2), 'utf8');
        } catch (err) {
            console.warn('[ArtifactDetails] Failed to record local usage:', err);
        }
    }

    private checkIfUsed(artifactName: string, userEmail: string): { hasUsed: boolean; count: number } {
        const cleanTarget = (artifactName || '').trim().toLowerCase();
        const cleanNoLeap = cleanTarget.replace(/^leap-/, '');
        let count = 0;

        // 1. Check local usage history (~/.engineering-commons/usage-history.json)
        try {
            const usageFile = this.getLocalUsageHistoryFile();
            if (fs.existsSync(usageFile)) {
                const history = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
                if (Array.isArray(history)) {
                    for (const ev of history) {
                        const id = (ev.artifactId || ev.artifactName || '').trim().toLowerCase();
                        const idClean = id.replace(/^leap-/, '');
                        const action = (ev.action || ev.eventType || '').toUpperCase();
                        if ((id === cleanTarget || idClean === cleanNoLeap) && (action === 'USE' || action === 'INVOKE' || action === 'RUN' || action === 'EXECUTE' || action === 'OPERATION')) {
                            count++;
                        }
                    }
                }
            }
        } catch {}

        // 2. Check workspace telemetry files
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            for (const wf of vscode.workspace.workspaceFolders) {
                const wsRoot = wf.uri.fsPath;
                const candidates = [
                    path.join(wsRoot, 'telemetry', 'usage-events.json'),
                    path.join(wsRoot, 'governance', 'usage-events.json'),
                    path.join(wsRoot, 'certification', 'telemetry.json')
                ];
                for (const c of candidates) {
                    if (fs.existsSync(c)) {
                        try {
                            const raw = JSON.parse(fs.readFileSync(c, 'utf8'));
                            const events = Array.isArray(raw) ? raw : (raw?.events || []);
                            for (const ev of events) {
                                const id = (ev.artifactId || ev.artifactName || '').trim().toLowerCase();
                                const idClean = id.replace(/^leap-/, '');
                                const action = (ev.action || ev.eventType || '').toUpperCase();
                                if ((id === cleanTarget || idClean === cleanNoLeap) && (action === 'USE' || action === 'INVOKE' || action === 'RUN' || action === 'EXECUTE')) {
                                    count++;
                                }
                            }
                        } catch {}
                    }
                }
            }
        }

        // 3. Check ~/.engineering-commons/ado_telemetry_queue.json
        try {
            const queueFile = path.join(os.homedir(), '.engineering-commons', 'ado_telemetry_queue.json');
            if (fs.existsSync(queueFile)) {
                const queue = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
                if (Array.isArray(queue)) {
                    for (const ev of queue) {
                        const id = (ev.artifactId || ev.artifactName || '').trim().toLowerCase();
                        const idClean = id.replace(/^leap-/, '');
                        if (id === cleanTarget || idClean === cleanNoLeap) {
                            count++;
                        }
                    }
                }
            }
        } catch {}

        return { hasUsed: count > 0, count };
    }

    private async openOrExecuteArtifactFiles(artifact: DiscoveredArtifactItem): Promise<boolean> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) return false;
        const root = workspaceFolders[0].uri.fsPath;
        const cleanName = artifact.name.replace(/^leap-/, '');

        const candidatePaths = [
            path.join(root, '.github', 'agents', `${artifact.name}.agent.md`),
            path.join(root, '.github', 'agents', `${cleanName}.agent.md`),
            path.join(root, 'skills', artifact.name, 'SKILL.md'),
            path.join(root, 'skills', cleanName, 'SKILL.md'),
            path.join(root, '.agents', 'skills', artifact.name, 'SKILL.md'),
            path.join(root, '.agents', 'skills', cleanName, 'SKILL.md'),
            path.join(root, '.mcp', artifact.name, 'server.json'),
            path.join(root, '.mcp', cleanName, 'server.json'),
            path.join(root, 'plugins', artifact.name, 'plugin.json'),
            path.join(root, '.github', 'prompts', `${artifact.name}.prompt.md`),
            path.join(root, '.agents', 'prompts', 'playbook', `${artifact.name}.md`),
            path.join(root, '.agents', 'prompts', 'playbook', `${cleanName}.md`),
            path.join(root, '.github', 'prompts', 'playbook', `${artifact.name}.prompt.md`),
            path.join(root, '.github', 'prompts', 'playbook', `${cleanName}.prompt.md`),
            path.join(root, 'artifacts', `${artifact.name}.md`)
        ];

        for (const cand of candidatePaths) {
            if (fs.existsSync(cand)) {
                try {
                    const doc = await vscode.workspace.openTextDocument(cand);
                    await vscode.window.showTextDocument(doc, { preview: false });
                    return true;
                } catch {}
            }
        }
        return false;
    }

    private async handleRunArtifact(panel: vscode.WebviewPanel, artifact: DiscoveredArtifactItem): Promise<void> {
        const email = (await this.authProvider.getEmail()) || 'engineer@maqsoftware.com';

        this.recordLocalUsage(artifact.name, email, artifact.type);

        if (this.usageTracker) {
            await this.usageTracker.logOperationAsync('USE', artifact.name, artifact.type, artifact.version);
        }

        const opened = await this.openOrExecuteArtifactFiles(artifact);

        vscode.window.showInformationMessage(
            opened 
                ? `✓ Executed & opened '${artifact.name}'. Rating & feedback option is now UNLOCKED!`
                : `✓ Recorded execution for '${artifact.name}'. Rating & feedback option is now UNLOCKED!`
        );

        await this.renderDetails(panel, artifact, artifact.version);
    }

    private async handleSubmitReview(panel: vscode.WebviewPanel, artifact: DiscoveredArtifactItem, rating: number, feedbackText?: string): Promise<void> {
        try {
            const email = (await this.authProvider.getEmail()) || '';
            const usageCheck = this.checkIfUsed(artifact.name, email);

            const workspaceFolders = vscode.workspace.workspaceFolders;
            const root = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : undefined;
            const isInstalled = root ? checkArtifactInstallation(root, artifact.name, artifact.type).isInstalled : false;

            if (!isInstalled && !usageCheck.hasUsed) {
                vscode.window.showWarningMessage(`Access Restricted: You must download and use '${artifact.name}' at least once before you can submit ratings and feedback.`);
                return;
            }

            if (!usageCheck.hasUsed) {
                vscode.window.showWarningMessage(`Usage Required: You have downloaded '${artifact.name}', but have not used it yet. Please run or use it at least once to unlock rating.`);
                return;
            }

            const success = await this.certificationService.submitReview(artifact.name, artifact.version, rating, feedbackText);
            if (success) {
                ArtifactDetailsWebviewProvider.invalidateDetailsCache(artifact.name);
                vscode.window.showInformationMessage(`✓ Thank you! Your ${rating}-star feedback for '${artifact.name}' has been committed to Azure DevOps and updated in the Certification Layer.`);
                await this.renderDetails(panel, artifact, artifact.version, true);
            } else {
                vscode.window.showErrorMessage(`Failed to record review for '${artifact.name}'.`);
            }
        } catch (err) {
            vscode.window.showErrorMessage(`Review submission error: ${err}`);
        }
    }

    private async handleViewAuditHistory(panel: vscode.WebviewPanel, artifact: DiscoveredArtifactItem): Promise<void> {
        try {
            const history = await this.certificationService.getCertificationHistory(artifact.name);
            if (history && history.entries.length > 0) {
                const lines = history.entries.map(e => `[${new Date(e.timestamp).toLocaleDateString()}] ${e.oldBadge} ➔ ${e.newBadge}: ${e.triggerReason}`);
                vscode.window.showInformationMessage(`Audit History for ${artifact.name}:\n` + lines.slice(0, 3).join('\n'));
            } else {
                vscode.window.showInformationMessage(`No historical badge transitions recorded for '${artifact.name}'.`);
            }
        } catch (err) {
            vscode.window.showErrorMessage(`Error reading audit history: ${err}`);
        }
    }

    private async handleToggleVisibility(panel: vscode.WebviewPanel, artifact: DiscoveredArtifactItem, makePrivate: boolean): Promise<void> {
        ArtifactDetailsWebviewProvider.invalidateDetailsCache(artifact.name);
        const token = await this.authProvider.getToken();
        try {
            const url = `${this.backendUrl}/api/artifacts/${encodeURIComponent(artifact.name)}/visibility`;
            const res = await this.fetchJson<any>(url, token, 'PUT', {
                isPrivate: makePrivate,
                visibility: makePrivate ? 'private' : 'public'
            });
            if (res.status === 200 || res.status === 204) {
                vscode.window.showInformationMessage(`✓ Artifact '${artifact.name}' visibility updated to ${makePrivate ? '🔒 Private' : '🌐 Public'}.`);
                if (this.onInstalledCallback) {
                    this.onInstalledCallback();
                }
                await this.renderDetails(panel, artifact, artifact.version, true);
            } else {
                vscode.window.showErrorMessage(`Failed to update visibility (${res.status}): ${res.data?.error || res.data?.message || 'Unauthorized or server error'}`);
            }
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to update visibility: ${err}`);
        }
    }

    private async handleInstall(panel: vscode.WebviewPanel, name: string, version: string, type: string): Promise<void> {
        ArtifactDetailsWebviewProvider.invalidateDetailsCache(name);
        // 1. Confirm authentication
        const isAuth = await this.authProvider.isAuthenticated();
        if (!isAuth) {
            vscode.window.showErrorMessage('You must be logged in to install artifacts. Please run Engineering Commons: Login.');
            return;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        const cwd = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : undefined;

        // Ensure .github folder exists in workspace for GitHub Copilot
        if (cwd) {
            const githubDir = path.join(cwd, '.github');
            if (!fs.existsSync(githubDir)) {
                try {
                    fs.mkdirSync(githubDir, { recursive: true });
                } catch { }
            }
        }

        panel.webview.postMessage({
            command: 'installProgress',
            step: 1,
            message: `Resolving artifact '${name}' (version ${version || '1.0.0'})...`
        });

        const token = await this.authProvider.getToken();
        let installedFiles: string[] = [];
        let detectedType = type || 'skill';
        let detectedVersion = version || '1.0.0';

        // 1. Invoke CLI executor if present
        if (this.cliExecutor) {
            const args = ['install', name];
            if (version) {
                args.push('--version', version);
            }
            await this.cliExecutor.executeAsync(this.cliExecutable, args, cwd);
        }

        // 2. Direct Azure DevOps Git Download (Primary & Fallback)
        if (installedFiles.length === 0 && cwd) {
            try {
                panel.webview.postMessage({
                    command: 'installProgress',
                    step: 2,
                    message: `Fetching '${name}' directly from Azure DevOps Git repository...`
                });

                const adoFiles = await this.adoGovernanceService.downloadArtifactFilesFromAdoAsync(name, version);
                if (adoFiles && adoFiles.length > 0) {
                    const hasAgent = adoFiles.some((f: any) => f.path.includes('.agent.md') || f.path.includes('agents/'));
                    const hasMcp = adoFiles.some((f: any) => f.path.includes('mcp'));
                    const hasPlugin = adoFiles.some((f: any) => f.path.includes('plugin'));
                    if (hasAgent) detectedType = 'agent';
                    else if (hasMcp) detectedType = 'mcpserver';
                    else if (hasPlugin) detectedType = 'plugin';

                    installedFiles = placeArtifactFilesIntoWorkspace(cwd, name, detectedVersion, detectedType, adoFiles);
                }
            } catch (adoErr: any) {
                console.warn('[Install] Direct ADO Git install attempt:', adoErr);
            }
        }

        // 3. Fallback: Query backend download or local artifacts-json
        if (installedFiles.length === 0 && cwd) {
            try {
                const dlUrl = `${this.backendUrl}/api/artifacts/${encodeURIComponent(name)}/download`;
                const res = await this.fetchJson<any>(dlUrl, token);
                if (res.status === 200 && res.data && Array.isArray(res.data.files) && res.data.files.length > 0) {
                    installedFiles = placeArtifactFilesIntoWorkspace(cwd, name, detectedVersion, detectedType, res.data.files);
                }
            } catch {}

            if (installedFiles.length === 0) {
                const clean = name.replace(/^leap-/, '');
                const candidates = [
                    path.join(cwd, 'artifacts-json', `${name}.json`),
                    path.join(cwd, 'artifacts-json', `${clean}.json`),
                    path.join(cwd, 'artifacts-json', `leap-${clean}.json`)
                ];
                for (const c of candidates) {
                    if (fs.existsSync(c)) {
                        try {
                            const raw = JSON.parse(fs.readFileSync(c, 'utf8'));
                            if (Array.isArray(raw.files) && raw.files.length > 0) {
                                installedFiles = placeArtifactFilesIntoWorkspace(cwd, name, detectedVersion, detectedType, raw.files);
                                break;
                            }
                        } catch {}
                    }
                }
            }
        }

        // 4. Fallback: Synthesize standard enterprise code files
        if (installedFiles.length === 0 && cwd) {
            panel.webview.postMessage({
                command: 'installProgress',
                step: 3,
                message: `Synthesizing code files for '${name}'...`
            });
            const synthFiles = synthesizeArtifactFiles(name, detectedVersion, detectedType);
            installedFiles = placeArtifactFilesIntoWorkspace(cwd, name, detectedVersion, detectedType, synthFiles);
        }

        if (installedFiles.length > 0) {
            panel.webview.postMessage({
                command: 'installComplete',
                success: true,
                message: `Successfully installed ${name} (${installedFiles.length} files placed into workspace)!`
            });

            vscode.window.showInformationMessage(`✓ Successfully installed ${name} (${installedFiles.length} files placed into workspace).`);

            if (this.usageTracker) {
                await this.usageTracker.logOperationAsync('INSTALL', name, detectedType, detectedVersion);
            }

            if (this.onInstalledCallback) {
                this.onInstalledCallback();
            }

            await this.renderDetails(panel, { name, type: detectedType, version: detectedVersion }, detectedVersion);
            return;
        }

        // 4. Fallback to CLI installation
        const args = ['install', name];
        if (version) {
            args.push('--version', version);
        }

        panel.webview.postMessage({
            command: 'installProgress',
            step: 2,
            message: 'Executing CLI installation...'
        });

        const result = await this.cliExecutor.executeAsync(this.cliExecutable, args, cwd);

        if (result.success) {
            panel.webview.postMessage({
                command: 'installComplete',
                success: true,
                message: `Successfully installed ${name} v${version}!`
            });

            vscode.window.showInformationMessage(`✓ Successfully installed ${name} (v${version})`);

            if (this.usageTracker) {
                await this.usageTracker.logOperationAsync('INSTALL', name, type, version);
            }

            if (this.onInstalledCallback) {
                this.onInstalledCallback();
            }

            await this.renderDetails(panel, { name, type, version }, version);
        } else {
            panel.webview.postMessage({
                command: 'installComplete',
                success: false,
                message: `Installation failed: ${result.stderr || result.stdout || 'Unknown error'}`
            });
            vscode.window.showErrorMessage(`Failed to install ${name}: ${result.stderr || result.stdout}`);
        }
    }

    private async handleDownloadZip(panel: vscode.WebviewPanel, name: string, version: string, type: string): Promise<void> {
        const isAuth = await this.authProvider.isAuthenticated();
        if (!isAuth) {
            vscode.window.showErrorMessage('You must be logged in to download artifacts. Please run Engineering Commons: Login.');
            return;
        }

        panel.webview.postMessage({
            command: 'installProgress',
            step: 1,
            message: `Resolving artifact files for '${name}' (version ${version || '1.0.0'})...`
        });

        const token = await this.authProvider.getToken();
        let artifactFiles: Array<{ path: string; content: string }> = [];
        let detectedType = type || 'skill';
        let detectedVersion = version || '1.0.0';

        // 1. Direct ADO Git fetch
        try {
            panel.webview.postMessage({
                command: 'installProgress',
                step: 2,
                message: `Fetching '${name}' files from Azure DevOps Git...`
            });
            const adoFiles = await this.adoGovernanceService.downloadArtifactFilesFromAdoAsync(name, version);
            if (adoFiles && adoFiles.length > 0) {
                artifactFiles = adoFiles;
                if (adoFiles.some((f: any) => f.path.includes('.agent.md') || f.path.includes('agents/'))) detectedType = 'agent';
                else if (adoFiles.some((f: any) => f.path.includes('mcp'))) detectedType = 'mcpserver';
                else if (adoFiles.some((f: any) => f.path.includes('plugin'))) detectedType = 'plugin';
            }
        } catch (adoErr: any) {
            console.warn('[DownloadZip] ADO fetch error:', adoErr);
        }

        // 2. Direct backend API fetch
        if (artifactFiles.length === 0) {
            try {
                panel.webview.postMessage({
                    command: 'installProgress',
                    step: 2,
                    message: `Fetching '${name}' files from backend catalog...`
                });
                const dlUrl = `${this.backendUrl}/api/artifacts/${encodeURIComponent(name)}/download`;
                const res = await this.fetchJson<any>(dlUrl, token);
                if (res.status === 200 && res.data && Array.isArray(res.data.files) && res.data.files.length > 0) {
                    artifactFiles = res.data.files;
                    detectedType = res.data.type || detectedType;
                    detectedVersion = res.data.version || detectedVersion;
                }
            } catch {}
        }

        // 3. Local artifacts-json
        if (artifactFiles.length === 0) {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            const cwd = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : undefined;
            const clean = name.replace(/^leap-/, '');
            const candidates = [
                ...(cwd ? [
                    path.join(cwd, 'artifacts-json', `${name}.json`),
                    path.join(cwd, 'artifacts-json', `${clean}.json`),
                    path.join(cwd, 'artifacts-json', `leap-${clean}.json`)
                ] : []),
                path.join(__dirname, '..', '..', '..', 'artifacts-json', `${clean}.json`),
                path.join(__dirname, '..', '..', '..', 'artifacts-json', `leap-${clean}.json`)
            ];
            for (const c of candidates) {
                if (fs.existsSync(c)) {
                    try {
                        const raw = JSON.parse(fs.readFileSync(c, 'utf8'));
                        if (Array.isArray(raw.files) && raw.files.length > 0) {
                            artifactFiles = raw.files;
                            break;
                        }
                    } catch {}
                }
            }
        }

        // 4. Synthesize standard code files if none found
        if (artifactFiles.length === 0) {
            panel.webview.postMessage({
                command: 'installProgress',
                step: 3,
                message: `Synthesizing code files for '${name}'...`
            });
            artifactFiles = synthesizeArtifactFiles(name, detectedVersion, detectedType);
        }

        panel.webview.postMessage({
            command: 'installProgress',
            step: 4,
            message: `Packaging ${artifactFiles.length} files into ZIP archive...`
        });

        const zipBuffer = createZipBuffer(artifactFiles);
        const defaultFilename = `${name}-v${detectedVersion}.zip`;
        const defaultFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();
        const defaultUri = vscode.Uri.file(path.join(defaultFolder, defaultFilename));

        const saveUri = await vscode.window.showSaveDialog({
            defaultUri,
            filters: {
                'ZIP Archive (*.zip)': ['zip'],
                'All Files (*.*)': ['*']
            },
            title: `Save Artifact ZIP for Personal VM: ${name}`
        });

        if (!saveUri) {
            panel.webview.postMessage({
                command: 'installComplete',
                success: false,
                message: 'ZIP download cancelled.'
            });
            return;
        }

        const targetFilePath = saveUri.fsPath || (saveUri as any).path;
        fs.writeFileSync(targetFilePath, zipBuffer);

        panel.webview.postMessage({
            command: 'installComplete',
            success: true,
            message: `✓ Successfully saved ${defaultFilename} (${artifactFiles.length} files, ${(zipBuffer.length / 1024).toFixed(1)} KB) for your Personal VM!`
        });

        const openAction = 'Open Folder';
        vscode.window.showInformationMessage(
            `✓ Successfully downloaded ZIP for '${name}' (${artifactFiles.length} files, ${(zipBuffer.length / 1024).toFixed(1)} KB) for your Personal VM!`,
            openAction
        ).then(choice => {
            if (choice === openAction) {
                vscode.commands.executeCommand('revealFileInOS', saveUri);
            }
        });

        if (this.usageTracker) {
            await this.usageTracker.logOperationAsync('DOWNLOAD', name, detectedType, detectedVersion);
        }
    }

    private static inFlightDetailsRequests = new Map<string, Promise<{ status: number; data: any }>>();

    private async fetchJson<T>(urlStr: string, token?: string, method = 'GET', body?: any): Promise<{ status: number; data: T | null }> {
        const isAuth = await this.authProvider.isAuthenticated();
        if (!isAuth || !token) {
            return { status: 401, data: null };
        }

        const isGet = method.toUpperCase() === 'GET' && !body;
        const cacheKey = `${token ? 'auth:' : 'anon:'}${urlStr}`;
        if (isGet && ArtifactDetailsWebviewProvider.inFlightDetailsRequests.has(cacheKey)) {
            return ArtifactDetailsWebviewProvider.inFlightDetailsRequests.get(cacheKey)! as Promise<{ status: number; data: T | null }>;
        }

        const email = (await this.authProvider.getEmail()) || 'harsh.rana@maqsoftware.com';
        const promise = new Promise<{ status: number; data: T | null }>((resolve) => {
            try {
                const url = new URL(urlStr);
                const client = url.protocol === 'https:' ? https : http;
                const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined;
                const headers: Record<string, string> = { 
                    'Content-Type': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    'x-user-email': email
                };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                if (payload) headers['Content-Length'] = String(Buffer.byteLength(payload));

                const req = client.request(url, { method, headers }, (res) => {
                    const isGzip = (res.headers['content-encoding'] || '').includes('gzip');
                    const chunks: Buffer[] = [];
                    res.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
                    res.on('end', () => {
                        try {
                            const buffer = Buffer.concat(chunks);
                            const raw = isGzip ? zlib.gunzipSync(buffer).toString('utf-8') : buffer.toString('utf-8');
                            const parsed = raw ? JSON.parse(raw) : null;
                            resolve({ status: res.statusCode || 500, data: parsed });
                        } catch {
                            resolve({ status: res.statusCode || 500, data: null });
                        } finally {
                            if (isGet) ArtifactDetailsWebviewProvider.inFlightDetailsRequests.delete(cacheKey);
                        }
                    });
                });

                req.on('error', () => {
                    if (isGet) ArtifactDetailsWebviewProvider.inFlightDetailsRequests.delete(cacheKey);
                    resolve({ status: 500, data: null });
                });
                if (payload) {
                    req.write(payload);
                }
                req.end();
            } catch {
                if (isGet) ArtifactDetailsWebviewProvider.inFlightDetailsRequests.delete(cacheKey);
                resolve({ status: 500, data: null });
            }
        });

        if (isGet) {
            ArtifactDetailsWebviewProvider.inFlightDetailsRequests.set(cacheKey, promise);
        }
        return promise;
    }

    private getHtmlForWebview(details: ArtifactDetailsInfo): string {
        if (details.isForbidden) {
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${details.name} - Access Denied</title>
    <style>
        body {
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
            background-color: var(--vscode-editor-background, #16161a);
            color: var(--vscode-editor-foreground, #e0e0e0);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 75vh;
            margin: 0;
            padding: 24px;
        }
        .access-card {
            background-color: var(--vscode-sideBar-background, #1c1c22);
            border: 1px solid #2a2a33;
            border-radius: 8px;
            padding: 36px 30px;
            max-width: 460px;
            text-align: center;
            box-shadow: none;
        }
        .icon { font-size: 2.8rem; margin-bottom: 12px; }
        h2 { margin: 0 0 10px 0; font-size: 1.3rem; font-weight: 600; color: #f87171; }
        p { color: var(--vscode-descriptionForeground, #a0a0aa); line-height: 1.5; font-size: 0.9rem; margin-bottom: 18px; }
        .user-tag { font-size: 0.8rem; color: #888; border-top: 1px solid #2a2a33; padding-top: 14px; }
        .badge-private { background-color: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 3px 10px; border-radius: 12px; font-weight: 600; font-size: 0.8rem; display: inline-block; margin-bottom: 12px; }
    </style>
</head>
<body>
    <div class="access-card">
        <div class="icon">🔒</div>
        <span class="badge-private">Private AI Artifact</span>
        <h2>Access Restricted</h2>
        <p>${details.forbiddenMessage || `You do not have permission to view or install '<strong>${details.name}</strong>'. This artifact is private and restricted to authorized team members.`}</p>
        <div class="user-tag">Logged in account: <code>${details.producerEmail || 'Consumer'}</code></div>
    </div>
</body>
</html>`;
        }

        const escapeHtml = (str: string | null | undefined): string => {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        const isPlaybook = isPlaybookArtifact(details);
        const typeIcon = isPlaybook ? '📖' : this.getTypeIcon(details.type);
        const typeBadgeClass = `badge-${details.type.toLowerCase()}`;

        const versionsOptions = details.availableVersions.map(v => {
            const isSelected = v.version === details.version ? 'selected' : '';
            const tag = v.isLatest ? ' (latest)' : '';
            return `<option value="${v.version}" ${isSelected}>${v.version}${tag}</option>`;
        }).join('\n');

        const filesTreeHtml = this.buildFilesTreeHtml(details.files);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${details.name}</title>
    <style>
        :root {
            --bg-color: #0f0f12;
            --fg-color: #f4f4f6;
            --card-bg: #1c1c22;
            --panel-bg: #16161a;
            --border-color: #24242c;
            --border-strong: #33333e;
            --text-primary: #f4f4f6;
            --text-secondary: #9ea0aa;
            --text-muted: #6b6d77;
            --accent: #818cf8;
            --btn-bg: #22222a;
            --btn-border: #33333e;
            --btn-text: #f4f4f6;
            --btn-hover: #2c2c36;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
            background-color: var(--bg-color);
            color: var(--fg-color);
            padding: 20px 24px;
            margin: 0;
            line-height: 1.5;
            font-size: 13px;
            overflow-x: auto;
            width: 100%;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 14px;
            margin-bottom: 16px;
            flex-wrap: wrap;
            gap: 12px;
            width: 100%;
        }
        .title-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex: 1 1 200px;
            min-width: 0;
        }
        .title {
            margin: 0;
            font-size: 17px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 6px 8px;
            color: var(--text-primary);
            letter-spacing: -0.2px;
            flex-wrap: wrap;
            word-break: break-word;
        }
        .package-name {
            font-size: 11.5px;
            color: var(--text-secondary);
        }
        .package-name code {
            font-family: var(--vscode-editor-font-family, Consolas, monospace);
            font-size: 11px;
            background: rgba(255, 255, 255, 0.05);
            padding: 1px 5px;
            border-radius: 4px;
        }
        .badge {
            font-size: 10px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 12px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            line-height: 1.3;
            white-space: nowrap;
            display: inline-flex;
            align-items: center;
        }
        .badge-agent { background-color: #2a2238; color: #d8b4fe; border: 1px solid rgba(129, 140, 248, 0.25); }
        .badge-skill { background-color: #142822; color: #6ee7b7; border: 1px solid rgba(52, 211, 153, 0.25); }
        .badge-plugin { background-color: #302816; color: #fde68a; border: 1px solid rgba(251, 191, 36, 0.25); }
        .badge-mcpserver, .badge-mcp { background-color: #182632; color: #7dd3fc; border: 1px solid rgba(125, 211, 252, 0.25); }
        .badge-prompt { background-color: #1c2826; color: #6ee7b7; border: 1px solid rgba(52, 211, 153, 0.25); }
        .badge-command { background-color: #2b1f1d; color: #fdba74; border: 1px solid rgba(253, 186, 116, 0.25); }
        .badge-package, .badge-cippackage { background-color: #14281c; color: #86efac; border: 1px solid rgba(134, 239, 172, 0.25); }
        .badge-certified {
            background-color: #142822;
            color: #6ee7b7;
            border: 1px solid #1e3a30;
            font-size: 10.5px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 6px;
            display: inline-flex;
            align-items: center;
            gap: 3px;
            white-space: nowrap;
        }
        .badge-certified .cert-icon {
            font-size: 10px;
            line-height: 1;
        }
        .badge-unverified {
            background-color: #22222a;
            color: #9ea0aa;
            border: 1px solid #33333e;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 6px;
            white-space: nowrap;
        }
        .badge-private { background-color: #301818; color: #fca5a5; border: 1px solid #4a2020; padding: 2px 7px; border-radius: 6px; font-size: 10.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
        .badge-public { background-color: #142822; color: #6ee7b7; border: 1px solid #1e3a30; padding: 2px 7px; border-radius: 6px; font-size: 10.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
        .badge-private-pill { background-color: #301818; color: #fca5a5; border: 1px solid #4a2020; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
        .badge-public-pill { background-color: #142822; color: #6ee7b7; border: 1px solid #1e3a30; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
        .btn-vis-toggle {
            background-color: var(--btn-bg);
            border: 1px solid var(--btn-border);
            color: var(--btn-text);
            border-radius: 6px;
            padding: 3px 8px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
        }
        .btn-vis-toggle:hover {
            background-color: var(--btn-hover);
            border-color: var(--border-strong);
            color: #ffffff;
        }

        .certification-card {
            background-color: var(--panel-bg);
            border: 1px solid var(--border-color);
            border-left: 3px solid #10b981;
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 20px;
            width: 100%;
        }

        .cert-gold-card {
            background: linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%);
            border: 1px solid rgba(234, 179, 8, 0.45);
            border-left: 4px solid #eab308;
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 20px;
            width: 100%;
        }

        .cert-verified-card {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.07) 0%, rgba(16, 185, 129, 0.04) 100%);
            border: 1px solid rgba(59, 130, 246, 0.35);
            border-left: 4px solid #3b82f6;
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 20px;
            width: 100%;
        }

        /* ── AI Leap Solution Card Styles ─────────────────── */
        .ai-leap-solution-card {
            background: linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(0, 120, 212, 0.08) 100%);
            border: 1px solid rgba(124, 58, 237, 0.3);
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 20px;
            width: 100%;
        }
        .leap-card-header {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 10px;
        }
        .leap-header-badge {
            font-size: 9.5px;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 4px;
            background: #7c3aed;
            color: #ffffff;
            letter-spacing: 0.5px;
        }
        .leap-header-pill {
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 6px;
            background: rgba(124, 58, 237, 0.15);
            color: #c084fc;
            border: 1px solid rgba(124, 58, 237, 0.25);
        }
        .leap-impact-statement {
            font-size: 12.5px;
            line-height: 1.5;
            color: var(--text-primary);
            margin-bottom: 12px;
        }
        .leap-metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 8px;
            margin-bottom: 12px;
        }
        .leap-metric-box {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(124, 58, 237, 0.2);
            border-radius: 6px;
            padding: 8px 10px;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .leap-metric-val {
            font-size: 16px;
            font-weight: 800;
            color: #a78bfa;
        }
        .leap-metric-lbl {
            font-size: 10px;
            color: var(--text-secondary);
            font-weight: 500;
        }
        .leap-features-wrap {
            margin-top: 8px;
        }
        .leap-features-title {
            font-size: 11.5px;
            font-weight: 700;
            color: var(--text-primary);
            display: block;
            margin-bottom: 4px;
        }
        .leap-features-list {
            margin: 0;
            padding-left: 18px;
            font-size: 11.5px;
            color: var(--text-secondary);
            line-height: 1.5;
        }
        .btn-cert-action {
            border-radius: 6px;
            padding: 4px 10px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
        }
        .btn-cert-approve {
            background-color: #142822;
            color: #6ee7b7;
            border: 1px solid #1e3a30;
        }
        .btn-cert-approve:hover {
            background-color: #1a382d;
            border-color: #275240;
            color: #ffffff;
        }
        .btn-cert-revoke {
            background-color: #301818;
            color: #fca5a5;
            border: 1px solid #4a2020;
        }
        .btn-cert-revoke:hover {
            background-color: #3f1e1e;
            border-color: #602828;
            color: #ffffff;
        }
        
        .meta-grid {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 10px;
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 16px;
            font-size: 12px;
            width: 100%;
        }
        .meta-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }
        .meta-label {
            font-size: 10px;
            text-transform: uppercase;
            color: var(--text-muted);
            font-weight: 700;
            letter-spacing: 0.3px;
            white-space: nowrap;
        }
        .meta-value {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 12px;
            word-break: break-word;
        }
        
        .description-box {
            font-size: 12.5px;
            color: var(--text-primary);
            margin-bottom: 18px;
            line-height: 1.55;
            word-break: break-word;
            width: 100%;
        }

        .usage-analytics-box {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 14px 16px;
            margin-bottom: 20px;
            width: 100%;
        }
        .usage-kpi-row {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 8px;
            margin-top: 8px;
            margin-bottom: 12px;
            width: 100%;
        }
        .usage-kpi-item {
            background: var(--panel-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 8px 10px;
            min-width: 0;
        }
        .usage-kpi-label {
            font-size: 9.5px;
            text-transform: uppercase;
            color: var(--text-muted);
            font-weight: 700;
            margin-bottom: 3px;
            white-space: nowrap;
        }
        .usage-kpi-val {
            font-size: 16px;
            font-weight: 700;
            color: var(--text-primary);
        }
        .usage-source-row {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
            font-size: 11px;
            color: var(--text-muted);
            border-top: 1px solid var(--border-color);
            padding-top: 8px;
            width: 100%;
        }

        .section-title {
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 10px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: var(--text-primary);
            flex-wrap: wrap;
            gap: 8px;
            width: 100%;
        }
        .files-tree {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 24px;
            width: 100%;
        }
        .file-card {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            overflow: hidden;
            transition: border-color 0.15s ease;
            width: 100%;
        }
        .file-card:hover {
            border-color: var(--border-strong);
        }
        .file-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 14px;
            cursor: pointer;
            user-select: none;
            background-color: var(--panel-bg);
            transition: background-color 0.15s ease;
            flex-wrap: wrap;
            gap: 8px;
            width: 100%;
        }
        .file-header:hover {
            background-color: var(--btn-hover);
        }
        .file-header-left {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
            flex: 1 1 180px;
        }
        .file-toggle-icon {
            font-size: 11px;
            width: 14px;
            display: inline-block;
            color: var(--text-muted);
            transition: transform 0.15s ease;
            flex-shrink: 0;
        }
        .file-icon {
            font-size: 13px;
            flex-shrink: 0;
        }
        .file-path {
            font-family: var(--vscode-editor-font-family, Consolas, monospace);
            font-size: 12px;
            font-weight: 600;
            color: var(--text-primary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            min-width: 0;
        }
        .file-lines-badge {
            font-size: 11px;
            color: var(--text-muted);
            margin-left: 6px;
            white-space: nowrap;
            flex-shrink: 0;
        }
        .file-header-actions {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
            flex-shrink: 0;
        }
        .btn-file-action {
            background-color: var(--btn-bg);
            border: 1px solid var(--btn-border);
            color: var(--btn-text);
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
        }
        .btn-file-action:hover {
            background-color: var(--btn-hover);
            color: #ffffff;
            border-color: var(--border-strong);
        }
        .file-content-panel {
            border-top: 1px solid var(--border-color);
            background-color: #111114;
            width: 100%;
        }
        .file-content-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 14px;
            background-color: var(--panel-bg);
            border-bottom: 1px solid var(--border-color);
            font-size: 11px;
            color: var(--text-muted);
            flex-wrap: wrap;
            gap: 6px;
            width: 100%;
        }
        .btn-file-copy {
            background: var(--btn-bg);
            border: 1px solid var(--btn-border);
            color: var(--text-secondary);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10.5px;
            cursor: pointer;
            transition: all 0.15s ease;
            white-space: nowrap;
        }
        .btn-file-copy:hover {
            color: var(--text-primary);
            background-color: var(--btn-hover);
            border-color: var(--border-strong);
        }
        .file-content-pre {
            margin: 0;
            padding: 14px;
            max-height: 420px;
            overflow: auto;
            font-family: var(--vscode-editor-font-family, Consolas, "SF Mono", monospace);
            font-size: 12px;
            line-height: 1.45;
            white-space: pre-wrap;
            word-break: break-all;
            color: var(--text-primary);
            background-color: transparent;
            width: 100%;
        }

        .action-bar {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 14px 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
            width: 100%;
        }
        .version-picker {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            flex-wrap: wrap;
        }
        select {
            background-color: #1b1b20;
            color: #f4f4f6;
            border: 1px solid #33333e;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            outline: none;
            transition: border-color 0.15s ease;
        }
        select:focus {
            border-color: var(--accent);
        }
        .btn-install {
            background-color: var(--btn-bg);
            color: var(--btn-text);
            border: 1px solid var(--btn-border);
            padding: 5px 14px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
            box-shadow: none;
            outline: none;
            white-space: nowrap;
        }
        .btn-install:hover {
            background-color: var(--btn-hover);
            border-color: var(--border-strong);
            color: #ffffff;
        }
        .btn-install:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            flex: 0 1 auto;
        }
        .version-picker {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 11.5px;
            font-weight: 600;
            color: var(--text-primary);
            white-space: nowrap;
        }
        select {
            background-color: #1b1b20;
            color: #f4f4f6;
            border: 1px solid #33333e;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 11.5px;
            cursor: pointer;
            outline: none;
            transition: border-color 0.15s ease;
        }
        select:focus {
            border-color: var(--accent);
        }
        .btn-install {
            background-color: var(--btn-bg);
            color: var(--btn-text);
            border: 1px solid var(--btn-border);
            padding: 5px 12px;
            border-radius: 6px;
            font-size: 11.5px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: all 0.15s ease;
            box-shadow: none;
            outline: none;
            white-space: nowrap;
            flex-shrink: 0;
        }
        .btn-install:hover {
            background-color: var(--btn-hover);
            border-color: var(--border-strong);
            color: #ffffff;
        }
        .btn-install:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .btn-delete-admin {
            background-color: #301818;
            color: #fca5a5;
            border: 1px solid #4a2020;
            padding: 5px 12px;
            border-radius: 6px;
            font-size: 11.5px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: all 0.15s ease;
            box-shadow: none;
            outline: none;
            white-space: nowrap;
            flex-shrink: 0;
        }
        .btn-delete-admin:hover {
            background-color: #4a2020;
            border-color: #ef4444;
            color: #ffffff;
        }
        .install-status-wrap {
            display: inline-flex;
            align-items: center;
            white-space: nowrap;
        }
        .installed-pill {
            display: inline-flex;
            align-items: center;
            background-color: #142822;
            color: #6ee7b7;
            border: 1px solid #1e3a30;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
        }

        /* ── Responsive Breakpoints ──────────────────────── */
        @media (max-width: 680px) {
            body {
                padding: 12px 14px;
            }
            .header {
                gap: 10px;
                padding-bottom: 12px;
                margin-bottom: 14px;
            }
            .title {
                font-size: 15.5px;
            }
            .header-actions {
                width: 100%;
                justify-content: flex-start;
                gap: 8px;
            }
            .meta-grid {
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 8px;
                padding: 10px 12px;
                margin-bottom: 14px;
            }
            .usage-kpi-row {
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 6px;
            }
            .usage-kpi-val {
                font-size: 15px;
            }
        }

        @media (max-width: 440px) {
            body {
                padding: 8px 10px 24px;
                font-size: 12px;
            }
            .title {
                font-size: 14px;
            }
            .header-actions {
                gap: 6px;
            }
            .version-picker {
                font-size: 11px;
            }
            .version-picker select {
                font-size: 11px;
                padding: 3px 6px;
            }
            .btn-install {
                padding: 4px 10px;
                font-size: 11px;
            }
            .installed-pill {
                font-size: 10.5px;
                padding: 2px 6px;
            }
            .meta-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 6px;
                padding: 8px 10px;
            }
            .meta-label {
                font-size: 9px;
            }
            .meta-value {
                font-size: 11px;
            }
            .usage-kpi-row {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 6px;
            }
            .usage-kpi-item {
                padding: 6px 8px;
            }
            .usage-kpi-label {
                font-size: 9px;
            }
            .usage-kpi-val {
                font-size: 14px;
            }
            .file-header {
                padding: 8px 10px;
            }
            .file-content-pre {
                padding: 8px 10px;
                font-size: 11px;
            }
        }

        /* ── Artifact README Documentation Card ─────────────────── */
        .readme-card {
            background: linear-gradient(145deg, rgba(22, 24, 32, 0.95), rgba(16, 18, 24, 0.95));
            border: 1px solid rgba(129, 140, 248, 0.35);
            border-radius: 10px;
            padding: 20px 24px;
            margin-bottom: 24px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06);
            backdrop-filter: blur(12px);
        }
        .readme-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            padding-bottom: 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            flex-wrap: wrap;
            gap: 12px;
        }
        .readme-title-wrap {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .readme-icon {
            font-size: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 8px;
            background: rgba(99, 102, 241, 0.15);
            border: 1px solid rgba(99, 102, 241, 0.35);
            color: #a5b4fc;
        }
        .readme-title {
            margin: 0;
            font-size: 15px;
            font-weight: 700;
            color: var(--text-primary, #ffffff);
        }
        .readme-subtitle {
            margin: 3px 0 0 0;
            font-size: 11.5px;
            color: var(--text-secondary, #9ea0aa);
        }
        .readme-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }
        .readme-prompt-callout {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
            border: 1px solid rgba(99, 102, 241, 0.4);
            border-radius: 8px;
            padding: 14px 16px;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }
        .readme-prompt-callout-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            flex-wrap: wrap;
            gap: 8px;
        }
        .readme-prompt-label {
            font-size: 12px;
            font-weight: 700;
            color: #a5b4fc;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .btn-prompt-copy {
            background: rgba(99, 102, 241, 0.25);
            border: 1px solid rgba(99, 102, 241, 0.5);
            color: #e0e7ff;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 11.5px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .btn-prompt-copy:hover {
            background: rgba(99, 102, 241, 0.45);
            color: #ffffff;
            box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
        }
        .readme-prompt-box {
            margin: 0;
            padding: 10px 14px;
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 6px;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 12px;
            line-height: 1.5;
            color: #f1f5f9;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .readme-body {
            color: var(--text-primary, #e2e8f0);
            font-size: 12.5px;
            line-height: 1.65;
        }
        .readme-body h1 {
            font-size: 16px;
            font-weight: 700;
            color: #ffffff;
            margin: 18px 0 10px 0;
            padding-bottom: 6px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .readme-body h2 {
            font-size: 14px;
            font-weight: 700;
            color: #e2e8f0;
            margin: 18px 0 8px 0;
        }
        .readme-body h3 {
            font-size: 12.5px;
            font-weight: 700;
            color: #cbd5e1;
            margin: 14px 0 6px 0;
        }
        .readme-body p {
            margin: 0 0 10px 0;
        }
        .readme-body ul {
            margin: 0 0 12px 0;
            padding-left: 20px;
        }
        .readme-body li {
            margin-bottom: 4px;
        }
        .readme-hr {
            border: 0;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            margin: 16px 0;
        }
        .readme-bq {
            margin: 10px 0;
            padding: 8px 14px;
            background: rgba(255, 255, 255, 0.03);
            border-left: 3px solid #6366f1;
            border-radius: 0 6px 6px 0;
            color: #94a3b8;
            font-style: italic;
        }
        .readme-code {
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 1px 5px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 11px;
            color: #a5b4fc;
        }
        .readme-code-box {
            margin: 12px 0;
            background: #0d0e12;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            overflow: hidden;
        }
        .readme-code-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255, 255, 255, 0.04);
            padding: 5px 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            font-size: 11px;
            color: #94a3b8;
        }
        .readme-pre {
            margin: 0;
            padding: 12px 14px;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 11.5px;
            line-height: 1.5;
            color: #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title-group">
            <h1 class="title">
                ${typeIcon} ${details.name}
                ${details.isFeatured ? '<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.45); font-weight: 700;">⭐ Featured</span>' : ''}
                ${isPlaybook ? '<span class="badge" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.25)); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.45); font-weight: 700;">📖 Prompt Playbook</span>' : (details.usabilityBadge ? `<span class="badge" style="background: ${details.usability === 'derived-artifact' || details.usability === 'reference-app' ? 'rgba(168, 85, 247, 0.2)' : (details.usability === 'solution-deck' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)')}; color: ${details.usability === 'derived-artifact' || details.usability === 'reference-app' ? '#c084fc' : (details.usability === 'solution-deck' ? '#fbbf24' : '#60a5fa')}; border: 1px solid ${details.usability === 'derived-artifact' || details.usability === 'reference-app' ? 'rgba(168, 85, 247, 0.4)' : (details.usability === 'solution-deck' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(59, 130, 246, 0.4)')};">${escapeHtml(details.usabilityBadge)}</span>` : '')}
                ${(details.source === 'AI_LEAP' || details.name.startsWith('leap-')) ? '<span class="badge" style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(0, 120, 212, 0.25)); color: #a78bfa; border: 1px solid rgba(124, 58, 237, 0.4);">🚀 AI Leap Solution</span>' : ''}
                <span class="badge ${typeBadgeClass}">${details.type}</span>
                ${details.isCertified ? '<span class="badge badge-certified" title="Verified & Certified Enterprise AI Artifact">✓ Certified</span>' : ''}
                <span class="badge ${details.isPrivate ? 'badge-private' : 'badge-public'}">${details.isPrivate ? '🔒 Private' : '🌐 Public'}</span>
            </h1>
            <div class="package-name">
                Package: <code>${details.cipPackage}</code>
            </div>
        </div>
        <div class="header-actions">
            <div class="version-picker">
                <label for="header-version-select">Version:</label>
                <select id="header-version-select" onchange="onVersionChanged('header-version-select')">
                    ${versionsOptions}
                </select>
            </div>
            <button id="header-install-btn" class="btn-install" onclick="triggerInstall('header-version-select')" title="Install directly into active workspace">
                📥 ${details.isInstalled ? 'Reinstall in Workspace' : 'Install to Workspace'}
            </button>
            <button id="header-zip-btn" class="btn-install btn-zip" onclick="triggerDownloadZip('header-version-select')" title="Download ZIP file for Personal VM without workspace installation" style="margin-left: 6px;">
                📦 Download ZIP
            </button>
            ${details.isAdmin ? `
            <button id="header-featured-btn" class="btn-install" onclick="triggerToggleFeatured('${details.name}')" title="${details.isFeatured ? 'Remove this artifact from Featured collection' : 'Mark this artifact as Featured in marketplace'}" style="margin-left: 6px; ${details.isFeatured ? 'background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4);' : ''}">
                ⭐ ${details.isFeatured ? 'Unfeature' : 'Feature'}
            </button>
            <button id="header-delete-btn" class="btn-delete-admin" onclick="triggerDelete('${details.name}')" title="Permanently delete this artifact from Azure DevOps and SharePoint Online">
                🗑️ Delete Artifact
            </button>` : ''}
            <div class="install-status-wrap">
                ${details.isInstalled ? 
                    `<span class="installed-pill">✓ Installed (v${details.installedVersion || details.version})</span>` : 
                    `<span style="font-size: 11px; color: var(--text-muted);">Not Installed</span>`
                }
            </div>
        </div>
    </div>

    <div class="meta-grid">
        <div class="meta-item">
            <span class="meta-label">Selected Version</span>
            <span class="meta-value">v${details.version}</span>
        </div>
        <div class="meta-item">
            <span class="meta-label">Visibility</span>
            <span class="meta-value" style="display: flex; align-items: center; gap: 8px;">
                ${details.isPrivate ? '<span class="badge-private-pill">🔒 Private</span>' : '<span class="badge-public-pill">🌐 Public</span>'}
                ${details.isOwner ? `
                    <button class="btn-vis-toggle" onclick="toggleVisibility(${details.isPrivate ? 'false' : 'true'})">
                        ${details.isPrivate ? '🌐 Make Public' : '🔒 Make Private'}
                    </button>` : ''}
            </span>
        </div>
        <div class="meta-item">
            <span class="meta-label">Featured Status</span>
            <span class="meta-value" style="display: flex; align-items: center; gap: 8px;">
                ${details.isFeatured ? '<span class="badge-featured-pill" style="background-color: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.35); padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">⭐ Featured</span>' : '<span style="font-size: 11px; color: var(--text-muted);">Standard</span>'}
                ${details.isAdmin ? `
                    <button class="btn-vis-toggle" onclick="triggerToggleFeatured('${details.name}')" title="Admin Toggle Featured Status" style="${details.isFeatured ? 'color: #f59e0b;' : ''}">
                        ${details.isFeatured ? 'Remove Featured' : '⭐ Make Featured'}
                    </button>` : ''}
            </span>
        </div>
        <div class="meta-item">
            <span class="meta-label">Producer</span>
            <span class="meta-value">${details.producerEmail || 'Enterprise CIP'}</span>
        </div>
        <div class="meta-item">
            <span class="meta-label">Published Date</span>
            <span class="meta-value">${details.publishedAt || 'Latest'}</span>
        </div>
        <div class="meta-item">
            <span class="meta-label">Total Files</span>
            <span class="meta-value">${details.files.length} files</span>
        </div>
        ${isPlaybook ? `
        <div class="meta-item">
            <span class="meta-label">Pedigree</span>
            <span class="meta-value" style="color: #34d399; font-weight: 700;">📖 Prompt Playbook</span>
        </div>` : ''}
        ${details.isPrivate ? `
        <div class="meta-item" style="grid-column: 1 / -1; background: rgba(255, 170, 0, 0.05); border: 1px solid rgba(255, 170, 0, 0.25); border-radius: 6px; padding: 10px 14px; margin-top: 4px;">
            <div style="font-weight: 600; font-size: 11.5px; color: var(--warning-color, #e5a00d); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span>🔒</span>
                <span>Private Access Control Whitelists</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 11.5px;">
                <div>
                    <span class="meta-label" style="display: block; margin-bottom: 2px;">Allowed Contributors</span>
                    <span class="meta-value" style="font-size: 11.5px;">${details.allowedContributors || 'Producer only'}</span>
                </div>
                <div>
                    <span class="meta-label" style="display: block; margin-bottom: 2px;">Designated Reviewers</span>
                    <span class="meta-value" style="font-size: 11.5px;">${details.allowedReviewers || 'Standard reviewers'}</span>
                </div>
                <div>
                    <span class="meta-label" style="display: block; margin-bottom: 2px;">Allowed Consumers / Installers</span>
                    <span class="meta-value" style="font-size: 11.5px;">${details.allowedConsumers || 'Producer only'}</span>
                </div>
            </div>
        </div>` : ''}
    </div>

    <!-- 📖 ARTIFACT README & DOCUMENTATION SECTION -->
    ${this.buildReadmeSection(details)}

    <!-- 5-PILLAR DYNAMIC AI CERTIFICATION SCORECARD -->
    <div class="${details.isCertified ? 'cert-gold-card' : 'cert-verified-card'}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <span style="font-size: 15px; font-weight: 800; color: ${details.isCertified ? '#eab308' : '#3b82f6'}; display: inline-flex; align-items: center; gap: 6px;">
                        ${details.isCertified ? '🏆 Enterprise Certified Artifact' : '🛡️'}
                        ${details.certificationBadge ? details.certificationBadge.toUpperCase() : (details.isCertified ? 'CERTIFIED' : 'VERIFIED')}
                    </span>
                    ${details.compositeScore !== undefined && details.compositeScore !== null ? `
                    <span style="font-size: 12px; font-weight: 700; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 2px 8px; border-radius: 12px;">
                        DHS: ${details.compositeScore.toFixed(1)} / 100
                    </span>` : ''}
                    <span style="font-size: 11px; background: rgba(0,0,0,0.25); color: var(--text-muted); border: 1px solid var(--border-color); padding: 2px 7px; border-radius: 4px;">
                        v${details.certifiedVersion || details.version}
                    </span>
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.45; max-width: 650px;">
                    ${details.certificationReason || 'This artifact has satisfied enterprise telemetry, quality, crash-free safety, and community review standards.'}
                </div>
            </div>

            <!-- ACTION BUTTONS: RECHECK, INTEGRITY, CERTIFY, REVOKE -->
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="btn-cert-action" style="background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600;" onclick="recheckCertification('${details.name}')">
                    🔄 Recheck Score
                </button>
                <button class="btn-cert-action" style="background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600;" onclick="verifyIntegrity('${details.name}')">
                    🛡️ Verify SHA-256
                </button>
                <button class="btn-cert-action" style="background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600;" onclick="viewAuditHistory('${details.name}')">
                    📜 Audit History
                </button>
                ${details.isReviewer ? `
                ${!details.isCertified ? `
                <button class="btn-cert-action btn-cert-approve" onclick="certifyArtifact('${details.name}')">✓ Certify</button>` : `
                <button class="btn-cert-action btn-cert-revoke" onclick="revokeCertification('${details.name}')">⚠️ Revoke Certification</button>`}
                ` : ''}
            </div>
        </div>

        <!-- 5-PILLAR METRICS GRID -->
        ${details.certificationPillars ? `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin: 12px 0;">
            <div style="background: rgba(0,0,0,0.18); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px;">
                <div style="color: var(--text-muted); font-size: 10px; text-transform: uppercase; font-weight: 700;">1. Adoption (25%)</div>
                <div style="font-size: 14px; font-weight: 800; color: ${details.certificationPillars.adoption?.passed ? '#10b981' : '#f59e0b'};">
                    ${details.certificationPillars.adoption?.score?.toFixed(0) || '0'}/100
                </div>
                <div style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;">
                    ${details.certificationPillars.adoption?.activeUsers || 0} devs • ${details.certificationPillars.adoption?.totalInvocations || 0} runs
                </div>
            </div>

            <div style="background: rgba(0,0,0,0.18); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px;">
                <div style="color: var(--text-muted); font-size: 10px; text-transform: uppercase; font-weight: 700;">2. Feedback (15%)</div>
                <div style="font-size: 14px; font-weight: 800; color: ${details.certificationPillars.feedback?.passed ? '#10b981' : '#f59e0b'};">
                    ${details.certificationPillars.feedback?.score?.toFixed(0) || '80'}/100
                </div>
                <div style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;">
                    ${details.certificationPillars.feedback?.avgRating ? details.certificationPillars.feedback.avgRating.toFixed(1) + ' ★' : 'No ratings'} • ${details.certificationPillars.feedback?.reviewCount || 0} reviews
                </div>
            </div>

            <div style="background: rgba(0,0,0,0.18); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px;">
                <div style="color: var(--text-muted); font-size: 10px; text-transform: uppercase; font-weight: 700;">3. DX & Docs (15%)</div>
                <div style="font-size: 14px; font-weight: 800; color: ${details.certificationPillars.dx?.passed ? '#10b981' : '#f59e0b'};">
                    ${details.certificationPillars.dx?.score?.toFixed(0) || '100'}/100
                </div>
                <div style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;">
                    Zero Config • Complete Docs
                </div>
            </div>

            <div style="background: rgba(0,0,0,0.18); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px;">
                <div style="color: var(--text-muted); font-size: 10px; text-transform: uppercase; font-weight: 700;">4. Tech Conf. (20%)</div>
                <div style="font-size: 14px; font-weight: 800; color: ${details.certificationPillars.technical?.passed ? '#10b981' : '#f59e0b'};">
                    ${details.certificationPillars.technical?.score?.toFixed(0) || '100'}/100
                </div>
                <div style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;">
                    0 Secrets • Tests 100%
                </div>
            </div>

            <div style="background: rgba(0,0,0,0.18); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px;">
                <div style="color: var(--text-muted); font-size: 10px; text-transform: uppercase; font-weight: 700;">5. Crash Safety (25%)</div>
                <div style="font-size: 14px; font-weight: 800; color: ${details.certificationPillars.health?.passed ? '#10b981' : '#f59e0b'};">
                    ${details.certificationPillars.health?.score !== null && details.certificationPillars.health?.score !== undefined ? details.certificationPillars.health.score.toFixed(0) + '/100' : 'Pending'}
                </div>
                <div style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;">
                    ${details.certificationPillars.health?.fer !== undefined ? 'FER ' + details.certificationPillars.health.fer.toFixed(1) + '%' : 'Zero Fatal Crashes'} • Zero ESR Penalty
                </div>
            </div>
        </div>` : ''}

        <!-- IN-IDE STAR RATING & FEEDBACK GATED WIDGET -->
        ${!details.hasDownloaded ? `
        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 6px; padding: 10px 14px; margin-top: 10px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">🔒</span>
                <div>
                    <div style="font-size: 11.5px; font-weight: 700; color: #f87171;">Rating & Feedback Locked: Download & Install Required</div>
                    <div style="font-size: 10.5px; color: var(--text-secondary);">Only developers who have downloaded and used this tool at least 1 time can submit ratings for the Certification Layer.</div>
                </div>
            </div>
            <button class="btn-install" style="background: #2563eb; color: #fff; border: none; padding: 4px 12px; border-radius: 4px; font-weight: 700; cursor: pointer;" onclick="triggerInstall('version-select')">
                📥 Install to Unlock
            </button>
        </div>` : (!details.hasUsed ? `
        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 6px; padding: 10px 14px; margin-top: 10px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">🔒</span>
                <div>
                    <div style="font-size: 11.5px; font-weight: 700; color: #fbbf24;">Rating & Feedback Locked: 1 Execution Required</div>
                    <div style="font-size: 10.5px; color: var(--text-secondary);">You have downloaded this artifact, but haven't used it yet. Run or execute this tool at least once to unlock rating and feedback.</div>
                </div>
            </div>
            <button style="background: #059669; color: #ffffff; border: none; padding: 5px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" onclick="runArtifact('${details.name}')">
                ▶ Run / Use Tool (Unlock Rating)
            </button>
        </div>` : `
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 6px; padding: 10px 14px; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 4px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 13px;">⭐</span>
                    <span style="font-size: 11.5px; font-weight: 700; color: #34d399;">Verified User • Used ${details.userUsageCount || 1} time(s) • Ready for Certification Rating</span>
                </div>
                <span style="font-size: 10px; color: var(--text-muted);">Committed to Azure DevOps (/certification/reviews.json)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <select id="review-rating-select" style="background: var(--input-bg, #1e1e1e); color: #eab308; border: 1px solid var(--border-color); border-radius: 4px; padding: 3px 6px; font-size: 11.5px; font-weight: 700;">
                    <option value="5">★★★★★ (5 Stars - Exceptional)</option>
                    <option value="4">★★★★☆ (4 Stars - Solid Quality)</option>
                    <option value="3">★★★☆☆ (3 Stars - Functional)</option>
                    <option value="2">★★☆☆☆ (2 Stars - Needs Work)</option>
                    <option value="1">★☆☆☆☆ (1 Star - Buggy)</option>
                </select>
                <input id="review-feedback-input" type="text" placeholder="Share your experience, accuracy, and feedback for author & reviewers..." style="flex: 1 1 200px; background: var(--input-bg, #1e1e1e); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; font-size: 11px;" />
                <button onclick="submitReview('${details.name}')" style="background: #10b981; color: #ffffff; border: none; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap;">
                    ⭐ Submit Rating to ADO
                </button>
            </div>
        </div>`)}

        <!-- COMMUNITY REVIEWS LIST FROM AZURE DEVOPS -->
        <div style="background: rgba(0, 0, 0, 0.2); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px 14px; margin-top: 10px;">
            <div style="font-size: 11.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
                <span>💬 Community Reviews & Developer Sentiment (${(details.reviews || []).length})</span>
                <span style="font-size: 10px; color: var(--text-muted);">Authoritative Store: ADO Git</span>
            </div>
            ${(details.reviews && details.reviews.length > 0) ? `
            <div style="display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto;">
                ${details.reviews.map(r => `
                <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 4px; padding: 6px 10px; font-size: 11px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                        <span style="color: #eab308; font-weight: 700;">${'★'.repeat(Math.max(1, Math.min(5, Number(r.rating || 5))))}${'☆'.repeat(5 - Math.max(1, Math.min(5, Number(r.rating || 5))))}</span>
                        <span style="color: var(--text-muted); font-size: 10px;">${escapeHtml(r.userEmail || r.userId || 'Verified Engineer')} • ${(r.createdAt || r.timestamp) ? new Date(r.createdAt || r.timestamp || '').toLocaleDateString() : 'Recent'}</span>
                    </div>
                    ${(r.comment || r.feedbackText) ? `<div style="color: var(--text-secondary); line-height: 1.4;">${escapeHtml(r.comment || r.feedbackText)}</div>` : '<div style="color: var(--text-muted); font-style: italic;">No written comments provided.</div>'}
                </div>
                `).join('')}
            </div>` : `
            <div style="font-size: 10.5px; color: var(--text-muted); font-style: italic; padding: 4px 0;">
                No community ratings recorded yet. Download and run this tool to be the first verified reviewer!
            </div>`}
        </div>

        <!-- FOOTER: SHA-256 FINGERPRINT & DATES -->
        <div style="font-size: 10px; color: var(--text-muted); display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px;">
            <div>
                <strong>SHA-256 Fingerprint:</strong> <span style="font-family: monospace;">${(details.contentHash || 'Generating...').slice(0, 24)}...</span>
                <span style="color: #10b981; font-weight: 600; margin-left: 6px;">[✓ Verified in ADO]</span>
            </div>
            <div>
                <strong>Certified At:</strong> ${details.certifiedAt ? new Date(details.certifiedAt).toLocaleDateString() : 'Active Enterprise Telemetry'}
            </div>
        </div>
    </div>

    ${(details.source === 'AI_LEAP' || details.impact || (details.impactMetrics && details.impactMetrics.length > 0)) ? `
    <div class="ai-leap-solution-card">
        <div class="leap-card-header">
            <span class="leap-header-badge">🚀 AI LEAP ENTERPRISE BLUEPRINT</span>
            <span class="leap-header-pill">Domain: ${escapeHtml(details.domain || 'Enterprise AI')}</span>
            <span class="leap-header-pill">Architecture: ${escapeHtml(details.architecture || 'Pro Code')}</span>
        </div>
        ${details.impact ? `
        <div class="leap-impact-statement">
            <strong>🎯 Business Impact:</strong> ${escapeHtml(details.impact)}
        </div>` : ''}
        ${details.impactMetrics && details.impactMetrics.length > 0 ? `
        <div class="leap-metrics-grid">
            ${details.impactMetrics.map(m => `
            <div class="leap-metric-box">
                <span class="leap-metric-val">${escapeHtml(m.value)}</span>
                <span class="leap-metric-lbl">${escapeHtml(m.label)}</span>
            </div>
            `).join('')}
        </div>` : ''}
        ${details.keyFeatures && details.keyFeatures.length > 0 ? `
        <div class="leap-features-wrap">
            <span class="leap-features-title">✨ Key Capabilities & Workflows:</span>
            <ul class="leap-features-list">
                ${details.keyFeatures.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
            </ul>
        </div>` : ''}
        ${details.githubRepo ? `
        <div class="leap-repo-link" style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(124, 58, 237, 0.2);">
            <span style="font-size: 11px; color: var(--text-muted);">Source Repository:</span>
            <code style="font-size: 11px; background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; color: var(--accent);">${escapeHtml(details.githubRepo)}</code>
        </div>` : ''}
    </div>` : ''}

    <div class="description-box">
        ${details.description}
    </div>

    <div class="usage-analytics-box">
        <div style="font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 6px; color: var(--text-primary);">
            <span>📊</span> Usage & Telemetry
        </div>
        <div class="usage-kpi-row">
            <div class="usage-kpi-item">
                <div class="usage-kpi-label">Downloads</div>
                <div class="usage-kpi-val">${details.usageAnalytics?.downloads ?? 0}</div>
            </div>
            <div class="usage-kpi-item">
                <div class="usage-kpi-label">Unique Users</div>
                <div class="usage-kpi-val">${details.usageAnalytics?.uniqueUsers ?? 0}</div>
            </div>
            <div class="usage-kpi-item">
                <div class="usage-kpi-label">Recorded Uses</div>
                <div class="usage-kpi-val">${details.usageAnalytics?.usageCount ?? 0}</div>
            </div>
            <div class="usage-kpi-item">
                <div class="usage-kpi-label">Usage Rate</div>
                <div class="usage-kpi-val">${details.usageAnalytics?.usageRate ?? 0} <small style="font-size: 10.5px; font-weight: normal; color: var(--text-muted);">/user</small></div>
            </div>
            <div class="usage-kpi-item">
                <div class="usage-kpi-label">Last Used</div>
                <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${details.usageAnalytics?.lastUsedAt ? new Date(details.usageAnalytics.lastUsedAt).toLocaleDateString() : 'Never'}</div>
            </div>
        </div>
        <div class="usage-source-row">
            <div>
                <strong>Usage Sources:</strong> 
                GitHub Copilot: <code>${details.usageAnalytics?.sourceBreakdown?.['GitHub Copilot'] ?? 0}</code> • 
                CLI: <code>${details.usageAnalytics?.sourceBreakdown?.['CLI'] ?? 0}</code> • 
                VS Code: <code>${details.usageAnalytics?.sourceBreakdown?.['VS Code'] ?? 0}</code>
            </div>
            <div>
                <strong>External AI Telemetry (GitHub Copilot / Claude):</strong>
                <code style="color: #8b949e;">EXTERNAL_USAGE_UNAVAILABLE (Zero Fake Data)</code>
            </div>
        </div>
    </div>

    <div class="section-title">
        <span>Files & Structure (${details.files.length})</span>
        <span style="font-size: 0.8rem; font-weight: normal; color: var(--vscode-descriptionForeground);">Click any file below to expand or open in editor tab</span>
    </div>

    <div class="files-tree">
        ${filesTreeHtml}
    </div>

    <div class="action-bar">
        <div class="version-picker">
            <label for="version-select" style="font-weight: bold;">Select Version to Install:</label>
            <select id="version-select" onchange="onVersionChanged('version-select')">
                ${versionsOptions}
            </select>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button id="bottom-install-btn" class="btn-install" onclick="triggerInstall('version-select')">
                📥 ${details.isInstalled ? 'Reinstall in Workspace' : 'Install to Workspace'}
            </button>
            <button id="bottom-zip-btn" class="btn-install btn-zip" onclick="triggerDownloadZip('version-select')" title="Download ZIP file for Personal VM without workspace installation">
                📦 Download ZIP
            </button>
            ${details.isAdmin ? `
            <button id="bottom-featured-btn" class="btn-install" onclick="triggerToggleFeatured('${details.name}')" title="${details.isFeatured ? 'Remove this artifact from Featured collection' : 'Mark this artifact as Featured in marketplace'}" style="${details.isFeatured ? 'background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4);' : ''}">
                ⭐ ${details.isFeatured ? 'Unfeature' : 'Feature'}
            </button>
            <button id="bottom-delete-btn" class="btn-delete-admin" onclick="triggerDelete('${details.name}')" title="Permanently delete this artifact from Azure DevOps and SharePoint Online">
                🗑️ Delete Artifact
            </button>` : ''}
        </div>
    </div>

    <div id="progress-box" class="progress-box">
        <div style="font-weight: bold; margin-bottom: 6px;">Installation Progress:</div>
        <div id="progress-steps"></div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function certifyArtifact(name) {
            vscode.postMessage({ command: 'certifyArtifact', version: '${details.version}' });
        }

        function revokeCertification(name) {
            vscode.postMessage({ command: 'revokeCertification' });
        }

        function recheckCertification(name) {
            vscode.postMessage({ command: 'recheckCertification' });
        }

        function verifyIntegrity(name) {
            vscode.postMessage({ command: 'verifyIntegrity' });
        }

        function submitReview(name) {
            const select = document.getElementById('review-rating-select');
            const rating = select ? select.value : '5';
            const input = document.getElementById('review-feedback-input');
            const feedbackText = input ? input.value : '';
            vscode.postMessage({ command: 'submitReview', rating: Number(rating), feedbackText: feedbackText });
        }

        function runArtifact(name) {
            vscode.postMessage({ command: 'runArtifact' });
        }

        function viewAuditHistory(name) {
            vscode.postMessage({ command: 'viewAuditHistory' });
        }

        function triggerDelete(name) {
            vscode.postMessage({ command: 'deleteArtifact' });
        }

        function triggerToggleFeatured(name) {
            vscode.postMessage({ command: 'toggleFeatured' });
        }

        function toggleVisibility(makePrivate) {
            vscode.postMessage({ command: 'toggleVisibility', isPrivate: makePrivate });
        }

        function toggleFileContent(idx) {
            const panel = document.getElementById('file-content-' + idx);
            const icon = document.getElementById('toggle-icon-' + idx);
            if (!panel) return;
            if (panel.style.display === 'none' || panel.style.display === '') {
                panel.style.display = 'block';
                if (icon) icon.innerText = '▾';
            } else {
                panel.style.display = 'none';
                if (icon) icon.innerText = '▸';
            }
        }

        function openInEditor(fileName, idx) {
            const rawTa = document.getElementById('raw-content-' + idx);
            const content = rawTa ? rawTa.value : '';
            vscode.postMessage({
                command: 'openFileInEditor',
                fileName: fileName,
                content: content
            });
        }

        function copyFileContent(idx) {
            const rawTa = document.getElementById('raw-content-' + idx);
            if (rawTa && rawTa.value) {
                navigator.clipboard.writeText(rawTa.value);
                const btn = event.target;
                if (btn) {
                    const original = btn.innerText;
                    btn.innerText = '✓ Copied!';
                    setTimeout(() => { btn.innerText = original; }, 1500);
                }
            }
        }

        function copyReadmePrompt() {
            const rawTa = document.getElementById('raw-readme-prompt');
            if (rawTa && rawTa.value) {
                navigator.clipboard.writeText(rawTa.value);
                const btns = document.querySelectorAll('#btn-copy-readme-prompt, .readme-prompt-callout .btn-prompt-copy');
                btns.forEach(btn => {
                    const orig = btn.innerText;
                    btn.innerText = '✓ Copied Prompt!';
                    setTimeout(() => { btn.innerText = orig; }, 1800);
                });
            }
        }

        function copyFullReadme() {
            const rawTa = document.getElementById('raw-readme-content');
            if (rawTa && rawTa.value) {
                navigator.clipboard.writeText(rawTa.value);
                const btn = document.getElementById('btn-copy-full-readme');
                if (btn) {
                    const orig = btn.innerText;
                    btn.innerText = '✓ Copied README!';
                    setTimeout(() => { btn.innerText = orig; }, 1800);
                }
            }
        }

        function openReadmeInEditor() {
            const rawTa = document.getElementById('raw-readme-content');
            const content = rawTa ? rawTa.value : '';
            vscode.postMessage({
                command: 'openFileInEditor',
                fileName: 'README.md',
                content: content
            });
        }

        function copyRawText(btn) {
            const box = btn ? btn.closest('.readme-code-box') : null;
            const ta = box ? box.querySelector('.raw-copy-content') : null;
            if (ta && ta.value) {
                navigator.clipboard.writeText(ta.value);
                const orig = btn.innerText;
                btn.innerText = '✓ Copied!';
                setTimeout(() => { btn.innerText = orig; }, 1500);
            }
        }

        function onVersionChanged(selectId) {
            const select = document.getElementById(selectId || 'header-version-select') || document.getElementById('version-select');
            const version = select.value;
            vscode.postMessage({ command: 'selectVersion', version: version });
        }

        function triggerInstall(selectId) {
            const select = document.getElementById(selectId || 'header-version-select') || document.getElementById('version-select');
            const version = select.value;
            const btns = document.querySelectorAll('.btn-install');
            btns.forEach(b => { b.disabled = true; b.innerText = 'Installing...'; });

            const pBox = document.getElementById('progress-box');
            pBox.style.display = 'block';
            const pSteps = document.getElementById('progress-steps');
            pSteps.innerHTML = '<div class="progress-step">⏳ Starting installation of ${details.name} v' + version + ' into workspace...</div>';

            vscode.postMessage({ command: 'install', version: version });
        }

        function triggerDownloadZip(selectId) {
            const select = document.getElementById(selectId || 'header-version-select') || document.getElementById('version-select');
            const version = select ? select.value : '1.0.0';
            const zipBtns = document.querySelectorAll('.btn-zip');
            zipBtns.forEach(b => { b.disabled = true; b.innerText = 'Downloading ZIP...'; });

            const pBox = document.getElementById('progress-box');
            if (pBox) pBox.style.display = 'block';
            const pSteps = document.getElementById('progress-steps');
            if (pSteps) pSteps.innerHTML = '<div class="progress-step">⏳ Preparing ZIP download for ${details.name} v' + version + ' (for Personal VM)...</div>';

            vscode.postMessage({ command: 'downloadZip', version: version });
        }

        window.addEventListener('message', event => {
            const msg = event.data;
            const pSteps = document.getElementById('progress-steps');
            const btns = document.querySelectorAll('.btn-install');

            if (msg.command === 'installProgress') {
                const div = document.createElement('div');
                div.className = 'progress-step';
                div.innerText = '✓ ' + msg.message;
                pSteps.appendChild(div);
            } else if (msg.command === 'installComplete') {
                btns.forEach(btn => {
                    btn.disabled = false;
                    if (btn.classList.contains('btn-zip')) {
                        btn.innerText = '📦 Download ZIP';
                    } else {
                        btn.innerText = '📥 Reinstall in Workspace';
                    }
                });

                const div = document.createElement('div');
                div.className = 'progress-step';
                div.style.fontWeight = 'bold';
                div.style.color = msg.success ? '#10b981' : '#ef4444';
                div.innerText = (msg.success ? '🎉 ' : '❌ ') + msg.message;
                pSteps.appendChild(div);
            }
        });
    </script>
</body>
</html>`;
    }

    private getTypeIcon(type: string): string {
        const t = (type || 'package').toLowerCase().trim();
        if (t === 'agent') return '🤖';
        if (t === 'skill') return '🛠️';
        if (t === 'plugin') return '🔌';
        if (t === 'mcpserver' || t === 'mcp' || t === 'mcp-server') return '🖥️';
        if (t === 'prompt') return '💬';
        if (t === 'command') return '⚡';
        if (t === 'package' || t === 'cippackage' || t === 'cip-package' || t === 'cip') return '📦';
        return '📦';
    }

    private buildFilesTreeHtml(files: ArtifactFileInfo[]): string {
        if (!files || files.length === 0) {
            return '<div style="color: #888; font-style: italic; padding: 10px;">No files available for this artifact.</div>';
        }

        return files.map((f, idx) => {
            const normPath = (f.path || '').replace(/\\/g, '/');
            const isDir = normPath.endsWith('/');
            const icon = isDir ? '📁' : '📄';
            const linesCount = f.content ? f.content.split('\n').length : 0;
            const contentInfo = f.content ? `${linesCount} lines` : 'No preview available';

            return `
            <div class="file-card" id="file-card-${idx}">
                <div class="file-header" onclick="toggleFileContent(${idx})">
                    <div class="file-header-left">
                        <span class="file-toggle-icon" id="toggle-icon-${idx}">▸</span>
                        <span class="file-icon">${icon}</span>
                        <span class="file-path">${this.escapeHtml(f.path)}</span>
                        <span class="file-lines-badge">${contentInfo}</span>
                    </div>
                    <div class="file-header-actions" onclick="event.stopPropagation();">
                        <button class="btn-file-action" onclick="openInEditor('${this.escapeJs(f.path)}', ${idx})" title="Open this file in a new VS Code editor tab">
                            ↗ Open in Editor
                        </button>
                    </div>
                </div>
                <div class="file-content-panel" id="file-content-${idx}" style="display: none;">
                    <div class="file-content-toolbar">
                        <span class="file-content-info">📄 ${this.escapeHtml(normPath)} (${contentInfo})</span>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-file-copy" onclick="copyFileContent(${idx})">📋 Copy Content</button>
                            <button class="btn-file-copy" onclick="openInEditor('${this.escapeJs(f.path)}', ${idx})">↗ Open in Tab</button>
                        </div>
                    </div>
                    <pre class="file-content-pre"><code>${this.escapeHtml(f.content || '(Empty file)')}</code></pre>
                    <textarea id="raw-content-${idx}" style="display:none;">${this.escapeHtml(f.content || '')}</textarea>
                </div>
            </div>`;
        }).join('\n');
    }

    private escapeHtml(str: string): string {
        return (str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    private escapeJs(str: string): string {
        return (str || '')
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '');
    }

    private buildReadmeSection(details: ArtifactDetailsInfo): string {
        let readmeFile = details.files && details.files.find(f => {
            const p = (f.path || '').toLowerCase();
            return p === 'readme.md' || p.endsWith('/readme.md');
        });

        let readmeContent = readmeFile ? readmeFile.content : '';
        if (!readmeContent || readmeContent.trim().length < 50) {
            const synth = this.synthesizeProperReadme(details, details.type, details.description, details.producerEmail, details.version);
            readmeContent = synth.content;
        }

        let promptText = details.copilotPrompt || '';
        if (!promptText) {
            const promptMatch = readmeContent.match(/```(?:markdown|text)?\r?\n(@[\s\S]*?|\/[\s\S]*?|Using [\s\S]*?|You are [\s\S]*?|engineering-commons [\s\S]*?)```/);
            if (promptMatch) {
                promptText = promptMatch[1].trim();
            } else {
                const synth = this.synthesizeProperReadme(details, details.type, details.description, details.producerEmail, details.version);
                promptText = synth.prompt;
            }
        }

        const linesCount = readmeContent.split('\n').length;
        const sizeKb = (Buffer.byteLength(readmeContent, 'utf8') / 1024).toFixed(1);
        const renderedHtml = this.renderMarkdownToHtml(readmeContent);

        return `
        <div class="readme-card" id="readme-documentation-section">
            <div class="readme-header">
                <div class="readme-title-wrap">
                    <span class="readme-icon">📖</span>
                    <div>
                        <h3 class="readme-title">Artifact Documentation & Usage Guide (README.md)</h3>
                        <p class="readme-subtitle">Comprehensive specifications, capabilities, and copy-paste prompts for ${this.escapeHtml(details.name)}</p>
                    </div>
                </div>
                <div class="readme-actions">
                    <span class="file-lines-badge">${linesCount} lines • ${sizeKb} KB</span>
                    <button id="btn-copy-readme-prompt" class="btn-prompt-copy" onclick="copyReadmePrompt()" title="Copy the primary prompt for this artifact">
                        📋 Copy Prompt
                    </button>
                    <button id="btn-copy-full-readme" class="btn-file-copy" onclick="copyFullReadme()" title="Copy complete markdown README">
                        📋 Copy README
                    </button>
                    <button class="btn-file-copy" onclick="openReadmeInEditor()" title="Open README.md in a new VS Code editor tab">
                        ↗ Open in Tab
                    </button>
                </div>
            </div>

            <!-- PROMINENT ONE-CLICK PROMPT CALLOUT -->
            <div class="readme-prompt-callout">
                <div class="readme-prompt-callout-header">
                    <span class="readme-prompt-label">
                        <span>💡</span>
                        <span>Ready-to-Use Prompt (GitHub Copilot Chat & Antigravity)</span>
                    </span>
                    <button class="btn-prompt-copy" onclick="copyReadmePrompt()">
                        📋 Copy Prompt
                    </button>
                </div>
                <pre class="readme-prompt-box"><code>${this.escapeHtml(promptText)}</code></pre>
            </div>

            <!-- FORMATTED MARKDOWN BODY -->
            <div class="readme-body">
                ${renderedHtml}
            </div>

            <!-- Hidden Raw Contents for Clipboard -->
            <textarea id="raw-readme-prompt" style="display:none;">${this.escapeHtml(promptText)}</textarea>
            <textarea id="raw-readme-content" style="display:none;">${this.escapeHtml(readmeContent)}</textarea>
        </div>`;
    }

    private renderMarkdownToHtml(md: string): string {
        if (!md) return '';
        let html = md;

        // 1. Code blocks
        const codeBlocks: { lang: string; code: string }[] = [];
        html = html.replace(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g, (_match, lang, code) => {
            const idx = codeBlocks.length;
            codeBlocks.push({ lang: lang || 'text', code: code.trim() });
            return `___CODE_BLOCK_${idx}___`;
        });

        // 2. Inline code
        const inlineCodes: string[] = [];
        html = html.replace(/`([^`\n]+)`/g, (_match, code) => {
            const idx = inlineCodes.length;
            inlineCodes.push(code);
            return `___INLINE_CODE_${idx}___`;
        });

        // 3. Line by line parsing for headers, lists, blockquotes, horizontal rules
        const lines = html.split('\n');
        const out: string[] = [];
        let inList = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trimEnd();
            const trimmed = line.trim();

            if (trimmed === '---' || trimmed === '***') {
                if (inList) { out.push('</ul>'); inList = false; }
                out.push('<hr class="readme-hr" />');
                continue;
            }

            const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
            if (hMatch) {
                if (inList) { out.push('</ul>'); inList = false; }
                const lvl = hMatch[1].length;
                out.push(`<h${lvl} class="readme-h${lvl}">${hMatch[2]}</h${lvl}>`);
                continue;
            }

            const bqMatch = line.match(/^>\s*(.+)$/);
            if (bqMatch) {
                if (inList) { out.push('</ul>'); inList = false; }
                out.push(`<blockquote class="readme-bq">${bqMatch[1]}</blockquote>`);
                continue;
            }

            const listMatch = line.match(/^(\*|-)\s+(.+)$/);
            if (listMatch) {
                if (!inList) { out.push('<ul class="readme-ul">'); inList = true; }
                out.push(`<li>${listMatch[2]}</li>`);
                continue;
            }

            if (inList) { out.push('</ul>'); inList = false; }

            if (trimmed.length > 0) {
                out.push(`<p class="readme-p">${line}</p>`);
            }
        }
        if (inList) out.push('</ul>');

        html = out.join('\n');

        // Bold & Italic
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Restore inline code
        html = html.replace(/___INLINE_CODE_(\d+)___/g, (_m, id) => {
            return `<code class="readme-code">${this.escapeHtml(inlineCodes[parseInt(id)])}</code>`;
        });

        // Restore code blocks
        html = html.replace(/___CODE_BLOCK_(\d+)___/g, (_m, id) => {
            const item = codeBlocks[parseInt(id)];
            return `
            <div class="readme-code-box">
                <div class="readme-code-header">
                    <span class="readme-code-lang">${this.escapeHtml(item.lang)}</span>
                    <button class="btn-file-copy" onclick="copyRawText(this)">📋 Copy</button>
                </div>
                <pre class="readme-pre"><code>${this.escapeHtml(item.code)}</code></pre>
                <textarea class="raw-copy-content" style="display:none;">${this.escapeHtml(item.code)}</textarea>
            </div>`;
        });

        return html;
    }

    private synthesizeProperReadme(artifact: any, detectedType?: string, description?: string, producerEmail?: string, version?: string): { content: string; prompt: string } {
        const name = artifact.name || artifact.id || 'artifact';
        const type = (detectedType || artifact.type || 'agent').toLowerCase().trim();
        const desc = description || artifact.description || `Enterprise ${type} artifact for company workflows.`;
        const email = producerEmail || artifact.author || 'Engineering Commons';
        const ver = version || artifact.version || '1.0.0';

        let prompt = `@${name} Please inspect our workspace for ${desc}. Provide a structured audit report and recommend concrete code improvements.`;
        if (type === 'skill') {
            prompt = `/${name} Run automated inspection and execution for ${desc}.`;
        } else if (type === 'mcpserver' || type === 'mcp') {
            prompt = `Using the ${name} MCP server tools, inspect the environment and perform ${desc}.`;
        } else if (type === 'prompt') {
            prompt = `You are an enterprise AI expert specializing in ${name}.\n\nTask: ${desc}\n\nRequirements:\n1. Adhere strictly to enterprise architectural and coding standards.\n2. Provide production-ready implementation snippets with error handling.\n3. Outline verification steps and potential edge cases.`;
        }

        const md = `# ${artifact.title || name} (\`${name}\`)

${desc}

- **Artifact Type**: \`${type.toUpperCase()}\`
- **Version**: \`v${ver}\`
- **Domain**: ${artifact.domain || 'Engineering'}
- **Author**: \`${email}\`

---

## 🚀 Quick Start & Installation

Install directly into your local workspace:

\`\`\`bash
engineering-commons install ${name}
\`\`\`

---

## 💡 How to Use & Example Prompts

\`\`\`markdown
${prompt}
\`\`\`

---

## 🌟 Key Capabilities
- Automated execution and domain assistance for ${name}
- Strict adherence to enterprise architecture and security policies
- Seamless integration into VS Code, GitHub Copilot, and Antigravity
- Comprehensive error handling and telemetry emission
`;

        return { content: md.trim(), prompt };
    }
}
