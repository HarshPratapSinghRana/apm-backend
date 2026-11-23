import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import * as zlib from 'zlib';
import { ICliExecutor } from '../services/cliExecutor';
import { IAuthenticationStatusProvider } from '../services/authenticationStatusProvider';
import { INotificationService, AppNotification } from '../services/notificationService';
import { parseListOutput, DiscoveredArtifactItem } from '../commands/listCommand';
import { SharePointArtifactService } from '../services/sharepoint/sharepointArtifactService';
import { AdoGovernanceService } from '../services/adoGovernanceService';
import { isProperAiArtifact } from './engineeringCommonsSidebarWebviewProvider';

export class AppTreeItem extends vscode.TreeItem {
    public category?: string;
    public artifact?: DiscoveredArtifactItem;
    public reviewId?: string;
    public notification?: AppNotification;

    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
    ) {
        super(label, collapsibleState);
    }
}

export class ArtifactTreeDataProvider implements vscode.TreeDataProvider<AppTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<AppTreeItem | undefined | null | void> = new vscode.EventEmitter<AppTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AppTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private cliExecutor: ICliExecutor;
    private authProvider: IAuthenticationStatusProvider;
    private notificationService?: INotificationService;
    private spArtifactService: SharePointArtifactService;
    private cliExecutable: string;
    private backendUrl: string;

    private cachedArtifacts: DiscoveredArtifactItem[] = [];
    private lastArtifactsFetchMs = 0;
    private cachedUsageSummary: any = null;
    private lastUsageSummaryFetchMs = 0;
    private cachedMostDownloaded: any[] | null = null;
    private lastMostDownloadedFetchMs = 0;
    private cachedMostUsed: any[] | null = null;
    private lastMostUsedFetchMs = 0;
    private cachedUsageArtifacts: any[] | null = null;
    private lastUsageArtifactsFetchMs = 0;
    private cachedPendingReviews: any[] | null = null;
    private lastPendingReviewsFetchMs = 0;

    constructor(
        cliExecutor: ICliExecutor,
        authProvider: IAuthenticationStatusProvider,
        cliExecutable = 'engineering-commons',
        backendUrl = 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io',
        notificationService?: INotificationService
    ) {
        this.cliExecutor = cliExecutor;
        this.authProvider = authProvider;
        this.cliExecutable = cliExecutable;
        this.backendUrl = (backendUrl || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/+$/, '');
        this.notificationService = notificationService;
        this.spArtifactService = new SharePointArtifactService();

        // Listen for authentication status changes and refresh automatically
        this.authProvider.onDidChangeAuthentication(() => {
            this.refresh(true);
        });
    }

    public setNotificationService(notificationService: INotificationService): void {
        this.notificationService = notificationService;
    }

    public setBackendUrl(url: string): void {
        this.backendUrl = (url || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/+$/, '');
        this.refresh(true);
    }

    public refresh(force = false): void {
        if (force) {
            this.cachedArtifacts = [];
            this.lastArtifactsFetchMs = 0;
            this.cachedUsageSummary = null;
            this.lastUsageSummaryFetchMs = 0;
            this.cachedMostDownloaded = null;
            this.lastMostDownloadedFetchMs = 0;
            this.cachedMostUsed = null;
            this.lastMostUsedFetchMs = 0;
            this.cachedUsageArtifacts = null;
            this.lastUsageArtifactsFetchMs = 0;
            this.cachedPendingReviews = null;
            this.lastPendingReviewsFetchMs = 0;
        }
        this._onDidChangeTreeData.fire();
    }

    public getTreeItem(element: AppTreeItem): vscode.TreeItem {
        return element;
    }

    public async getChildren(element?: AppTreeItem): Promise<AppTreeItem[]> {
        const isAuth = await this.authProvider.isAuthenticated();

        // 1. Logged Out State
        if (!isAuth) {
            if (element) return [];

            const noticeItem = new AppTreeItem('You are not logged in.', vscode.TreeItemCollapsibleState.None);
            noticeItem.iconPath = new vscode.ThemeIcon('info');
            noticeItem.description = 'Authentication required';

            const loginItem = new AppTreeItem('Login to Engineering Commons', vscode.TreeItemCollapsibleState.None);
            loginItem.iconPath = new vscode.ThemeIcon('account');
            loginItem.description = 'Invoke CLI login flow';
            loginItem.command = {
                command: 'engineeringCommons.login',
                title: 'Engineering Commons: Login'
            };

            return [noticeItem, loginItem];
        }

        const userEmail = (await this.authProvider.getEmail()) || 'User';

        // 2. Root Level for Authenticated User
        if (!element) {
            const userHeader = new AppTreeItem(`👤 ${userEmail}`, vscode.TreeItemCollapsibleState.None);
            userHeader.tooltip = `Logged in as ${userEmail} (Click to Switch Account / Log In)`;
            userHeader.description = 'Switch Account';
            userHeader.iconPath = new vscode.ThemeIcon('account');
            userHeader.command = {
                command: 'engineeringCommons.login',
                title: 'Engineering Commons: Login / Switch Account'
            };
            userHeader.contextValue = 'userHeader';

            // Notifications Section
            const notifs = this.notificationService ? await this.notificationService.getNotifications(false).catch(() => []) : [];
            const unreadCount = notifs.filter(n => !n.isRead).length;
            const notifsLabel = unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications';
            const notifsRoot = new AppTreeItem(notifsLabel, vscode.TreeItemCollapsibleState.Expanded);
            notifsRoot.iconPath = new vscode.ThemeIcon(unreadCount > 0 ? 'bell-dot' : 'bell');
            notifsRoot.category = 'notifications';

            const marketplaceRoot = new AppTreeItem('Marketplace', vscode.TreeItemCollapsibleState.Expanded);
            marketplaceRoot.iconPath = new vscode.ThemeIcon('store');
            marketplaceRoot.category = 'marketplace';

            const myArtifactsRoot = new AppTreeItem('My Artifacts', vscode.TreeItemCollapsibleState.Expanded);
            myArtifactsRoot.iconPath = new vscode.ThemeIcon('folder');
            myArtifactsRoot.category = 'myArtifacts';

            const reviewsRoot = new AppTreeItem('Reviews', vscode.TreeItemCollapsibleState.Expanded);
            reviewsRoot.iconPath = new vscode.ThemeIcon('comment-discussion');
            reviewsRoot.category = 'reviews';

            const usageRoot = new AppTreeItem('Usage', vscode.TreeItemCollapsibleState.Collapsed);
            usageRoot.iconPath = new vscode.ThemeIcon('graph');
            usageRoot.category = 'usage';

            return [userHeader, notifsRoot, marketplaceRoot, myArtifactsRoot, reviewsRoot, usageRoot];
        }

        // 3. Section Children
        if (element.category === 'notifications') {
            return this.getNotificationItems();
        }

        if (element.category === 'marketplace') {
            return this.getMarketplaceCategories();
        }

        if (element.category?.startsWith('marketplace:')) {
            const targetType = element.category.replace('marketplace:', '');
            return this.getArtifactsByType(targetType);
        }

        if (element.category === 'myArtifacts') {
            return this.getMyArtifactsItems();
        }

        if (element.category === 'myArtifacts:installed') {
            return this.getInstalledArtifacts();
        }

        if (element.category === 'reviews') {
            return this.getReviewSectionItems();
        }

        if (element.category === 'reviews:mySubmissions') {
            return this.getMySubmissions();
        }

        if (element.category === 'reviews:pending') {
            return this.getPendingReviews();
        }

        if (element.category === 'usage') {
            return this.getUsageRootCategories();
        }

        if (element.category === 'usage:overview') {
            return this.getUsageOverviewDetails();
        }

        if (element.category === 'usage:mostDownloaded') {
            return this.getMostDownloadedTreeItems();
        }

        if (element.category === 'usage:mostUsed') {
            return this.getMostUsedTreeItems();
        }

        if (element.category === 'usage:artifacts') {
            return this.getArtifactUsageTableTreeItems();
        }

        return [];
    }

    private async getNotificationItems(): Promise<AppTreeItem[]> {
        if (!this.notificationService) {
            return [new AppTreeItem('No notifications available', vscode.TreeItemCollapsibleState.None)];
        }

        try {
            const notifs = await this.notificationService.getNotifications(false);
            if (!notifs || notifs.length === 0) {
                const empty = new AppTreeItem('No notifications yet', vscode.TreeItemCollapsibleState.None);
                empty.iconPath = new vscode.ThemeIcon('check');
                return [empty];
            }

            return notifs.map(n => {
                const bullet = n.isRead ? '○' : '●';
                const typeLabel = this.formatNotificationTypeLabel(n.type);
                const relTime = this.formatRelativeTime(n.createdAt);
                const label = `${bullet} ${typeLabel}`;
                const item = new AppTreeItem(label, vscode.TreeItemCollapsibleState.None);
                const msgSnippet = n.message ? (n.message.length > 40 ? n.message.substring(0, 37) + '...' : n.message) : '';
                item.description = msgSnippet ? `${n.artifactName} v${n.version} • "${msgSnippet}" • ${relTime}` : `${n.artifactName} v${n.version} • ${relTime}`;
                item.tooltip = `Engineering Commons Notification\nArtifact: ${n.artifactName} (v${n.version})\nEvent: ${typeLabel}\nMessage: ${n.message}\nReceived: ${new Date(n.createdAt).toLocaleString()}\nStatus: ${n.isRead ? 'Read' : 'Unread'}\n\nClick to open message thread directly`;
                item.iconPath = new vscode.ThemeIcon(n.isRead ? 'bell' : 'bell-dot');
                item.notification = n;
                item.contextValue = 'notificationItem';
                item.command = {
                    command: 'engineeringCommons.openNotification',
                    title: 'Open Notification',
                    arguments: [n]
                };
                return item;
            });
        } catch {
            return [new AppTreeItem('Could not load notifications', vscode.TreeItemCollapsibleState.None)];
        }
    }

    private formatNotificationTypeLabel(type: string): string {
        switch (type) {
            case 'ReviewAssigned': return 'New Review Assigned';
            case 'FeedbackAdded': return 'New Feedback Added';
            case 'ProducerReplied': return 'Producer Replied';
            case 'ChangesRequested': return 'Changes Requested';
            case 'Resubmitted': return 'Artifact Resubmitted';
            case 'ReviewApproved': return 'Review Approved';
            case 'ReviewRejected': return 'Review Rejected';
            case 'ReviewCompleted': return 'Review Completed';
            default: return type;
        }
    }

    private formatRelativeTime(dateStr: string): string {
        try {
            const now = Date.now();
            const created = new Date(dateStr).getTime();
            const diffSeconds = Math.max(0, Math.floor((now - created) / 1000));
            if (diffSeconds < 60) return 'Just now';
            const diffMinutes = Math.floor(diffSeconds / 60);
            if (diffMinutes < 60) return `${diffMinutes}m ago`;
            const diffHours = Math.floor(diffMinutes / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays}d ago`;
            return new Date(dateStr).toLocaleDateString();
        } catch {
            return '';
        }
    }

    private getMarketplaceCategories(): AppTreeItem[] {
        const categories = [
            { name: 'Browse All Artifacts', id: 'all', icon: 'list-unordered' },
            { name: '⚡ Token Optimization', id: 'token-optimization', icon: 'zap' },
            { name: '🚀 AI Leap Artifacts', id: 'leap', icon: 'rocket' },
            { name: 'Agents', id: 'agent', icon: 'robot' },
            { name: 'Skills', id: 'skill', icon: 'tools' },
            { name: 'Prompts', id: 'prompt', icon: 'comment-discussion' },
            { name: 'Commands', id: 'command', icon: 'terminal' },
            { name: 'Plugins', id: 'plugin', icon: 'plug' },
            { name: 'MCP Servers', id: 'mcpserver', icon: 'server' },
            { name: 'CIP Packages', id: 'cippackage', icon: 'package' },
            { name: 'Other / Unknown', id: 'unknown', icon: 'question' }
        ];

        return categories.map(c => {
            const item = new AppTreeItem(c.name, vscode.TreeItemCollapsibleState.Collapsed);
            item.iconPath = new vscode.ThemeIcon(c.icon);
            item.category = `marketplace:${c.id}`;
            return item;
        });
    }

    private async getArtifactsByType(typeFilter: string): Promise<AppTreeItem[]> {
        const now = Date.now();
        let items: DiscoveredArtifactItem[] = [];

        if (this.cachedArtifacts.length > 0 && (now - this.lastArtifactsFetchMs < 5 * 60 * 1000)) {
            items = [...this.cachedArtifacts];
        } else {
            if (this.cliExecutor) {
                try {
                    const result = await this.cliExecutor.executeAsync(this.cliExecutable, ['list']);
                    if (result.success && result.stdout && result.stdout.includes('---')) {
                        items = parseListOutput(result.stdout);
                    }
                } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }
            }

            if (items.length === 0) {
                try {
                    const adoService = new AdoGovernanceService();
                    const adoCatalog = await adoService.fetchAdoJsonFile('/catalog.json');
                    const catItems = adoCatalog?.artifacts || (Array.isArray(adoCatalog) ? adoCatalog : []);
                    if (Array.isArray(catItems) && catItems.length > 0) {
                        items = catItems.map((item: any) => ({
                            name: item.name || item.id,
                            type: item.type || item.artifactType || 'skill',
                            version: item.version || '1.0.0',
                            isPrivate: Boolean(item.isPrivate || item.visibility === 'Private'),
                            isCertified: Boolean(item.isCertified || item.certified)
                        }));
                    }
                } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }
            }

            // Query hosted Azure Container Apps backend API dynamically
            try {
                const rawConfig = vscode.workspace.getConfiguration('engineeringCommons').get<string>('backendUrl') || process.env.ENGINEERING_COMMONS_BACKEND_URL;
                const backendUrl = rawConfig ? rawConfig.trim() : (this.backendUrl || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io');
                const res = await this.makeRequest(`${backendUrl}/api/artifacts`);
                    if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
                        for (const item of res.data) {
                            const clean = (item.name || item.id || '').replace(/^leap-/, '').toLowerCase();
                            const existingIdx = items.findIndex(a => (a.name || '').replace(/^leap-/, '').toLowerCase() === clean);
                            const mapped = {
                                name: item.name || item.id,
                                title: item.title || item.name,
                                type: item.type || 'agent',
                                version: item.version || '1.0.0',
                                isPrivate: Boolean(item.isPrivate),
                                isCertified: Boolean(item.isCertified),
                                source: item.source || 'CIP',
                                domain: item.domain || 'General'
                            };
                            if (existingIdx >= 0) {
                                items[existingIdx] = { ...items[existingIdx], ...mapped };
                            } else if (items.length === 0) {
                                items.push(mapped);
                            }
                        }
                    }
            } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }

            items = items.filter(a => isProperAiArtifact(a));

            if (items.length > 0) {
                this.cachedArtifacts = [...items];
                this.lastArtifactsFetchMs = now;
            }
        }

        if (typeFilter !== 'all') {
            items = items.filter(a => {
                if (typeFilter === 'token-optimization') {
                    const cat = (a as any).category ? String((a as any).category).toLowerCase() : '';
                    const dom = (a as any).domain ? String((a as any).domain).toLowerCase() : '';
                    const nm = (a.name || '').toLowerCase();
                    const t = a.type.toLowerCase();
                    return t === 'token-optimization' || cat.includes('token') || dom.includes('token') ||
                        ['ponytail', 'caveman', 'token-optimization', 'token-hygiene', 'token-optimizer', 'rtk', 'token-coach', 'token-optimization-advanced', 'squeez'].includes(nm);
                }
                if (typeFilter === 'leap') {
                    return a.source === 'AI_LEAP' || a.name.startsWith('leap-');
                }
                const t = a.type.toLowerCase();
                if (typeFilter === 'agent') return t === 'agent';
                if (typeFilter === 'skill') return t === 'skill';
                if (typeFilter === 'prompt') return t === 'prompt' || t === 'command';
                if (typeFilter === 'command') return t === 'command';
                if (typeFilter === 'plugin') return t === 'plugin' || t === 'mcpserver' || t === 'mcp';
                if (typeFilter === 'mcpserver') return t === 'mcpserver' || t === 'mcp' || t === 'mcp-server' || t === 'plugin' || t === 'tool';
                if (typeFilter === 'cippackage') return t === 'cippackage' || t === 'cip-package' || t === 'package';
                if (typeFilter === 'certified') return Boolean(a.isCertified);
                if (typeFilter === 'unknown') return t === 'unknown' || t === 'other' || t === 'normalfile' || (!['agent', 'skill', 'prompt', 'command', 'plugin', 'mcpserver', 'mcp', 'mcp-server', 'cippackage', 'cip-package', 'package'].includes(t));
                return t === typeFilter.toLowerCase();
            });
        }

        if (items.length === 0) {
            const empty = new AppTreeItem(`No ${typeFilter === 'all' ? '' : typeFilter} artifacts available`, vscode.TreeItemCollapsibleState.None);
            empty.iconPath = new vscode.ThemeIcon('info');
            return [empty];
        }

        return items.map(a => {
            const item = new AppTreeItem(a.name, vscode.TreeItemCollapsibleState.None);
            item.artifact = a;
            const isLeap = a.source === 'AI_LEAP' || a.name.startsWith('leap-');
            item.description = isLeap ? `🚀 [AI Leap${a.domain ? ' · ' + a.domain : ''}] v${a.version}` : `[${a.type}] v${a.version}`;

            // Rich Markdown Tooltip for VS Code TreeItem
            const md = new vscode.MarkdownString(undefined, true);
            md.isTrusted = true;
            md.supportHtml = true;

            const iconPrefix = isLeap ? '🚀' : (a.isCertified ? '🛡️' : '📦');
            const certBadge = a.isCertified ? ' `✓ Certified`' : '';
            const featuredBadge = a.isFeatured ? ' `⭐ Featured`' : '';
            const copilotBadge = a.isCopilotReady ? ' `🤖 Copilot Ready`' : '';

            md.appendMarkdown(`### ${iconPrefix} **${a.title || a.name}** \`v${a.version}\`${certBadge}${featuredBadge}${copilotBadge}\n\n`);
            md.appendMarkdown(`| Property | Details |\n|:---|:---|\n`);
            md.appendMarkdown(`| **Identifier** | \`${a.name}\` |\n`);
            md.appendMarkdown(`| **Type** | \`${a.type}\` |\n`);
            if (a.domain) {
                md.appendMarkdown(`| **Domain** | ${a.domain} |\n`);
            }
            if (a.usabilityLabel || a.usability) {
                md.appendMarkdown(`| **Usability** | ${a.usabilityLabel || a.usability} |\n`);
            }
            if (a.source) {
                md.appendMarkdown(`| **Source** | ${a.source === 'AI_LEAP' ? 'AI Leap Federated' : 'Engineering Commons'} |\n`);
            }
            if (a.isPrivate) {
                md.appendMarkdown(`| **Visibility** | 🔒 Private Enterprise |\n`);
            }

            if (a.description) {
                md.appendMarkdown(`\n---\n**Summary:**  \n${a.description.trim()}\n`);
            }
            if (a.keyFeatures && a.keyFeatures.length > 0) {
                md.appendMarkdown(`\n**Highlights:**\n`);
                a.keyFeatures.slice(0, 3).forEach(f => md.appendMarkdown(`- ${f}\n`));
            }
            if (a.githubRepo) {
                md.appendMarkdown(`\n🔗 **Source:** [GitHub Repository](${a.githubRepo})\n`);
            }
            md.appendMarkdown(`\n---\n*💡 Click to view full details, source files, and usage metrics.*`);

            item.tooltip = md;
            item.contextValue = 'artifactItem';

            const t = (a.type || 'package').toLowerCase().trim();
            item.iconPath = isLeap ? new vscode.ThemeIcon('rocket') : this.getThemeIconForType(t);

            item.command = {
                command: 'engineeringCommons.showArtifactDetails',
                title: 'Show Artifact Details',
                arguments: [a]
            };

            return item;
        });
    }

    private getThemeIconForType(type: string): vscode.ThemeIcon {
        const t = (type || 'package').toLowerCase().trim();
        if (t === 'agent') return new vscode.ThemeIcon('robot');
        if (t === 'skill') return new vscode.ThemeIcon('tools');
        if (t === 'prompt') return new vscode.ThemeIcon('comment-discussion');
        if (t === 'command') return new vscode.ThemeIcon('terminal');
        if (t === 'plugin') return new vscode.ThemeIcon('plug');
        if (t === 'mcpserver' || t === 'mcp' || t === 'mcp-server') return new vscode.ThemeIcon('server');
        if (t === 'cippackage' || t === 'cip-package' || t === 'package') return new vscode.ThemeIcon('package');
        return new vscode.ThemeIcon('package');
    }

    private async getMyArtifactsItems(): Promise<AppTreeItem[]> {
        const installedItem = new AppTreeItem('Installed Artifacts', vscode.TreeItemCollapsibleState.Collapsed);
        installedItem.iconPath = new vscode.ThemeIcon('check');
        installedItem.category = 'myArtifacts:installed';

        const contributeItem = new AppTreeItem('Contribute New Artifact', vscode.TreeItemCollapsibleState.None);
        contributeItem.iconPath = new vscode.ThemeIcon('cloud-upload');
        contributeItem.command = {
            command: 'engineeringCommons.contribute',
            title: 'Engineering Commons: Contribute'
        };

        return [installedItem, contributeItem];
    }

    private async getInstalledArtifacts(): Promise<AppTreeItem[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return [new AppTreeItem('No open workspace', vscode.TreeItemCollapsibleState.None)];
        }

        const root = workspaceFolders[0].uri.fsPath;
        const cipYmlPath = path.join(root, 'cip.yml');

        if (!fs.existsSync(cipYmlPath)) {
            const noCip = new AppTreeItem('No cip.yml in workspace', vscode.TreeItemCollapsibleState.None);
            noCip.iconPath = new vscode.ThemeIcon('info');
            return [noCip];
        }

        try {
            const content = fs.readFileSync(cipYmlPath, 'utf-8');
            const lines = content.split('\n');
            const deps: AppTreeItem[] = [];

            let inDeps = false;
            for (const line of lines) {
                if (line.trim().startsWith('dependencies:')) {
                    inDeps = true;
                    continue;
                }
                if (inDeps) {
                    if (line.startsWith(' ') || line.startsWith('\t')) {
                        const dep = line.trim().replace(/^-\s*/, '').trim();
                        if (dep.length > 0) {
                            const artType = this.detectInstalledArtifactType(root, dep);
                            const item = new AppTreeItem(dep, vscode.TreeItemCollapsibleState.None);
                            item.description = `[${artType}]`;
                            item.iconPath = this.getThemeIconForType(artType);
                            item.contextValue = 'installedItem';

                            // Rich Markdown Tooltip for Installed TreeItem
                            const md = new vscode.MarkdownString(undefined, true);
                            md.isTrusted = true;
                            md.supportHtml = true;
                            md.appendMarkdown(`### 📦 **${dep}** \`[Installed]\`\n\n`);
                            md.appendMarkdown(`| Property | Details |\n|:---|:---|\n`);
                            md.appendMarkdown(`| **Artifact Type** | \`${artType}\` |\n`);
                            md.appendMarkdown(`| **Status** | ✅ Installed in Current Workspace |\n`);
                            md.appendMarkdown(`| **Config Source** | \`cip.yml\` |\n\n`);
                            md.appendMarkdown(`*💡 Click to inspect installed manifest, files, or verify updates.*`);

                            item.tooltip = md;
                            item.command = {
                                command: 'engineeringCommons.showArtifactDetails',
                                title: 'Show Artifact Details',
                                arguments: [{ name: dep, type: artType, version: '1.0.0' }]
                            };
                            deps.push(item);
                        }
                    } else if (line.trim().length > 0) {
                        break;
                    }
                }
            }

            if (deps.length === 0) {
                return [new AppTreeItem('No dependencies declared in cip.yml', vscode.TreeItemCollapsibleState.None)];
            }
            return deps;
        } catch {
            return [new AppTreeItem('Could not read cip.yml', vscode.TreeItemCollapsibleState.None)];
        }
    }

    private detectInstalledArtifactType(root: string, name: string): string {
        const manifestPath = path.join(root, '.cip', 'installed', `${name}.json`);
        if (fs.existsSync(manifestPath)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                if (parsed.type && parsed.type !== 'normalfile' && parsed.type !== 'unknown') {
                    return parsed.type.toLowerCase();
                }
            } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }
        }

        if (fs.existsSync(path.join(root, '.github', 'agents', name)) || fs.existsSync(path.join(root, '.github', 'agents', `${name}.agent.md`)) || fs.existsSync(path.join(root, 'agents', name))) {
            return 'agent';
        }
        if (fs.existsSync(path.join(root, 'skills', name)) || fs.existsSync(path.join(root, '.github', 'skills', name)) || fs.existsSync(path.join(root, '.agents', 'skills', name))) {
            return 'skill';
        }
        if (fs.existsSync(path.join(root, 'plugins', name)) || fs.existsSync(path.join(root, '.github', 'plugins', name))) {
            return 'plugin';
        }
        if (fs.existsSync(path.join(root, '.mcp', name)) || fs.existsSync(path.join(root, '.github', 'mcp', name))) {
            return 'mcpserver';
        }
        if (fs.existsSync(path.join(root, '.github', 'prompts', `${name}.prompt.md`)) || fs.existsSync(path.join(root, 'prompts', name))) {
            return 'prompt';
        }
        if (fs.existsSync(path.join(root, '.github', 'commands', `${name}.command.md`)) || fs.existsSync(path.join(root, 'commands', name))) {
            return 'command';
        }

        const lower = name.toLowerCase();
        if (lower.includes('agent') || lower.includes('reviewer') || lower.includes('fix') || lower.includes('chat') || lower.includes('copilot') || lower.includes('launch')) return 'agent';
        if (lower.includes('skill') || lower.includes('refactor')) return 'skill';
        if (lower.includes('plugin') || lower.includes('assistant')) return 'plugin';
        if (lower.includes('mcp') || lower.includes('server') || lower.includes('postgres')) return 'mcpserver';
        if (lower.includes('prompt')) return 'prompt';
        if (lower.includes('command') || lower.includes('lint')) return 'command';
        return 'package';
    }

    private getReviewSectionItems(): AppTreeItem[] {
        const mySubs = new AppTreeItem('My Submissions', vscode.TreeItemCollapsibleState.Collapsed);
        mySubs.iconPath = new vscode.ThemeIcon('git-pull-request');
        mySubs.category = 'reviews:mySubmissions';

        const pending = new AppTreeItem('Pending Reviews', vscode.TreeItemCollapsibleState.Collapsed);
        pending.iconPath = new vscode.ThemeIcon('inbox');
        pending.category = 'reviews:pending';

        return [mySubs, pending];
    }

    private async getMySubmissions(): Promise<AppTreeItem[]> {
        const res = await this.cliExecutor.executeAsync(this.cliExecutable, ['status']);
        if (!res.success) {
            const err = new AppTreeItem('Could not fetch submissions', vscode.TreeItemCollapsibleState.None);
            err.iconPath = new vscode.ThemeIcon('error');
            return [err];
        }

        const lines = res.stdout.split('\n').filter(l => l.includes(' | '));
        if (lines.length <= 1) {
            const empty = new AppTreeItem('No active submissions', vscode.TreeItemCollapsibleState.None);
            empty.iconPath = new vscode.ThemeIcon('info');
            return [empty];
        }

        const items: AppTreeItem[] = [];
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split('|').map(p => p.trim());
            if (parts.length >= 3) {
                const subId = parts[0];
                const artId = parts[1];
                const status = parts[2];
                const feedback = parts.length >= 5 ? parts[4] : '';

                const item = new AppTreeItem(`${artId} [${status}]`, vscode.TreeItemCollapsibleState.None);
                item.description = feedback ? `Feedback: ${feedback}` : undefined;
                item.tooltip = `Submission: ${subId}\nArtifact: ${artId}\nStatus: ${status}\nClick to open conversation thread`;
                item.iconPath = new vscode.ThemeIcon(
                    status === 'Approved' ? 'pass' : (status === 'Rejected' ? 'error' : 'clock')
                );
                item.command = {
                    command: 'engineeringCommons.openThread',
                    title: 'Open Review Thread',
                    arguments: [subId, artId]
                };
                items.push(item);
            }
        }
        return items.length > 0 ? items : [new AppTreeItem('No active submissions', vscode.TreeItemCollapsibleState.None)];
    }

    private async getPendingReviews(): Promise<AppTreeItem[]> {
        const token = await this.authProvider.getToken();
        if (!token) {
            return [new AppTreeItem('Not authenticated', vscode.TreeItemCollapsibleState.None)];
        }

        const now = Date.now();
        let reviewsData: any[] = [];
        if (this.cachedPendingReviews && (now - this.lastPendingReviewsFetchMs < 180000)) {
            reviewsData = this.cachedPendingReviews;
        } else {
            const res = await this.makeRequest(`${this.backendUrl}/api/reviews/pending`, token);
            if (res.status !== 200 || !Array.isArray(res.data)) {
                const err = new AppTreeItem(
                    res.status === 403 ? 'Reviewer role required' : 'Could not fetch pending reviews',
                    vscode.TreeItemCollapsibleState.None
                );
                err.iconPath = new vscode.ThemeIcon(res.status === 403 ? 'lock' : 'error');
                return [err];
            }
            reviewsData = res.data;
            this.cachedPendingReviews = reviewsData;
            this.lastPendingReviewsFetchMs = now;
        }

        if (reviewsData.length === 0) {
            const empty = new AppTreeItem('No pending reviews', vscode.TreeItemCollapsibleState.None);
            empty.iconPath = new vscode.ThemeIcon('check');
            return [empty];
        }

        return reviewsData.map((r: any) => {
            const item = new AppTreeItem(r.artifactId, vscode.TreeItemCollapsibleState.None);
            let slaText = r.slaRemainingFormatted;
            let isBreached = r.isSlaBreached;
            let isWarning = r.isSlaWarning;

            if (r.slaDeadline) {
                const diffMs = new Date(r.slaDeadline).getTime() - Date.now();
                const totalMins = Math.round(diffMs / (60 * 1000));
                if (totalMins < 0) {
                    const overdue = Math.abs(totalMins);
                    const h = Math.floor(overdue / 60);
                    const m = overdue % 60;
                    slaText = `Breached by ${h}h ${m}m (${overdue}m)`;
                    isBreached = true;
                } else {
                    const h = Math.floor(totalMins / 60);
                    const m = totalMins % 60;
                    slaText = h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
                    if (totalMins <= 60) isWarning = true;
                }
            } else if (!slaText) {
                slaText = r.slaRemainingMinutes !== undefined ? `${r.slaRemainingMinutes}m remaining` : '';
            }
            
            if (isBreached) {
                item.description = `🚨 SLA BREACHED (${slaText}) • from ${r.producerEmail}`;
                item.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
            } else if (isWarning) {
                item.description = `⚠️ ${slaText} • from ${r.producerEmail}`;
                item.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
            } else {
                item.description = `⏱️ ${slaText} • from ${r.producerEmail}`;
                item.iconPath = new vscode.ThemeIcon('git-pull-request');
            }

            item.tooltip = `Review ID: ${r.id}\nArtifact: ${r.artifactId}\nProducer: ${r.producerEmail}\nStatus: ${r.status || 'Submitted'}\nSLA Target: ${r.slaTargetMinutes || 1440} minutes\nSLA Remaining: ${slaText}\nSLA Deadline: ${r.slaDeadline ? new Date(r.slaDeadline).toLocaleString() : 'N/A'}\nClick to open review thread & diff`;
            item.command = {
                command: 'engineeringCommons.openThread',
                title: 'Open Review Thread',
                arguments: [r.id, r.artifactId]
            };
            return item;
        });
    }

    private async getUsageRootCategories(): Promise<AppTreeItem[]> {
        const token = await this.authProvider.getToken();
        if (!token) {
            return [new AppTreeItem('Login to view usage analytics', vscode.TreeItemCollapsibleState.None)];
        }

        const now = Date.now();
        let data: any;
        if (this.cachedUsageSummary && (now - this.lastUsageSummaryFetchMs < 300000)) {
            data = this.cachedUsageSummary;
        } else {
            const res = await this.makeRequest(`${this.backendUrl}/api/usage/summary?period=all`, token);
            data = (res.status === 200 && res.data) ? res.data : { totalDownloads: 0, activeUsers: 0, totalUses: 0, artifactsUsed: 0 };
            this.cachedUsageSummary = data;
            this.lastUsageSummaryFetchMs = now;
        }

        const overview = new AppTreeItem(`Overview: ${data.totalDownloads} DL • ${data.activeUsers} Users • ${data.totalUses} Uses`, vscode.TreeItemCollapsibleState.Collapsed);
        overview.iconPath = new vscode.ThemeIcon('dashboard');
        overview.category = 'usage:overview';

        const topDownloaded = new AppTreeItem('Most Downloaded', vscode.TreeItemCollapsibleState.Collapsed);
        topDownloaded.iconPath = new vscode.ThemeIcon('cloud-download');
        topDownloaded.category = 'usage:mostDownloaded';

        const topUsed = new AppTreeItem('Most Used', vscode.TreeItemCollapsibleState.Collapsed);
        topUsed.iconPath = new vscode.ThemeIcon('zap');
        topUsed.category = 'usage:mostUsed';

        const artBreakdown = new AppTreeItem('Artifact Usage Breakdown', vscode.TreeItemCollapsibleState.Collapsed);
        artBreakdown.iconPath = new vscode.ThemeIcon('list-ordered');
        artBreakdown.category = 'usage:artifacts';

        const openDashboard = new AppTreeItem('Open Full Analytics Dashboard', vscode.TreeItemCollapsibleState.None);
        openDashboard.iconPath = new vscode.ThemeIcon('graph-line');
        openDashboard.description = 'Interactive Webview';
        openDashboard.command = {
            command: 'engineeringCommons.openUsageDashboard',
            title: 'Open Usage Analytics Dashboard'
        };

        return [overview, topDownloaded, topUsed, artBreakdown, openDashboard];
    }

    private async getUsageOverviewDetails(): Promise<AppTreeItem[]> {
        const token = await this.authProvider.getToken();
        if (!token) return [];

        const now = Date.now();
        let d: any;
        if (this.cachedUsageSummary && (now - this.lastUsageSummaryFetchMs < 300000)) {
            d = this.cachedUsageSummary;
        } else {
            const res = await this.makeRequest(`${this.backendUrl}/api/usage/summary?period=all`, token);
            if (res.status !== 200 || !res.data) {
                return [new AppTreeItem('Could not load summary metrics', vscode.TreeItemCollapsibleState.None)];
            }
            d = res.data;
            this.cachedUsageSummary = d;
            this.lastUsageSummaryFetchMs = now;
        }

        const dlItem = new AppTreeItem(`Total Downloads: ${d.totalDownloads ?? 0}`, vscode.TreeItemCollapsibleState.None);
        dlItem.iconPath = new vscode.ThemeIcon('cloud-download');

        const usersItem = new AppTreeItem(`Active Users: ${d.activeUsers ?? 0}`, vscode.TreeItemCollapsibleState.None);
        usersItem.iconPath = new vscode.ThemeIcon('organization');

        const usesItem = new AppTreeItem(`Total Usage (Invocations): ${d.totalUses ?? 0}`, vscode.TreeItemCollapsibleState.None);
        usesItem.iconPath = new vscode.ThemeIcon('pulse');

        const artsItem = new AppTreeItem(`Artifacts Invoked: ${d.artifactsUsed ?? 0}`, vscode.TreeItemCollapsibleState.None);
        artsItem.iconPath = new vscode.ThemeIcon('package');

        return [dlItem, usersItem, usesItem, artsItem];
    }

    private async getMostDownloadedTreeItems(): Promise<AppTreeItem[]> {
        const token = await this.authProvider.getToken();
        if (!token) return [];

        const now = Date.now();
        let list: any[] = [];
        if (this.cachedMostDownloaded && (now - this.lastMostDownloadedFetchMs < 300000)) {
            list = this.cachedMostDownloaded;
        } else {
            const res = await this.makeRequest(`${this.backendUrl}/api/usage/most-downloaded?limit=5`, token);
            if (res.status !== 200 || !Array.isArray(res.data) || res.data.length === 0) {
                return [new AppTreeItem('No download events recorded', vscode.TreeItemCollapsibleState.None)];
            }
            list = res.data;
            this.cachedMostDownloaded = list;
            this.lastMostDownloadedFetchMs = now;
        }

        return list.map((item: any) => {
            const medal = item.rank === 1 ? '🥇' : (item.rank === 2 ? '🥈' : (item.rank === 3 ? '🥉' : `#${item.rank}`));
            const treeItem = new AppTreeItem(`${medal} ${item.artifactName}`, vscode.TreeItemCollapsibleState.None);
            treeItem.description = `${item.count} downloads [${item.artifactType}]`;
            treeItem.iconPath = new vscode.ThemeIcon('cloud-download');
            treeItem.command = {
                command: 'engineeringCommons.showArtifactDetails',
                title: 'Show Artifact Details',
                arguments: [{ name: item.artifactName, type: item.artifactType, version: '1.0.0' }]
            };
            return treeItem;
        });
    }

    private async getMostUsedTreeItems(): Promise<AppTreeItem[]> {
        const token = await this.authProvider.getToken();
        if (!token) return [];

        const now = Date.now();
        let list: any[] = [];
        if (this.cachedMostUsed && (now - this.lastMostUsedFetchMs < 300000)) {
            list = this.cachedMostUsed;
        } else {
            const res = await this.makeRequest(`${this.backendUrl}/api/usage/most-used?limit=5`, token);
            if (res.status !== 200 || !Array.isArray(res.data) || res.data.length === 0) {
                return [new AppTreeItem('No usage events recorded', vscode.TreeItemCollapsibleState.None)];
            }
            list = res.data;
            this.cachedMostUsed = list;
            this.lastMostUsedFetchMs = now;
        }

        return list.map((item: any) => {
            const medal = item.rank === 1 ? '🥇' : (item.rank === 2 ? '🥈' : (item.rank === 3 ? '🥉' : `#${item.rank}`));
            const treeItem = new AppTreeItem(`${medal} ${item.artifactName}`, vscode.TreeItemCollapsibleState.None);
            treeItem.description = `${item.count} uses [${item.artifactType}]`;
            treeItem.iconPath = new vscode.ThemeIcon('zap');
            treeItem.command = {
                command: 'engineeringCommons.showArtifactDetails',
                title: 'Show Artifact Details',
                arguments: [{ name: item.artifactName, type: item.artifactType, version: '1.0.0' }]
            };
            return treeItem;
        });
    }

    private async getArtifactUsageTableTreeItems(): Promise<AppTreeItem[]> {
        const token = await this.authProvider.getToken();
        if (!token) return [];

        const now = Date.now();
        let list: any[] = [];
        if (this.cachedUsageArtifacts && (now - this.lastUsageArtifactsFetchMs < 300000)) {
            list = this.cachedUsageArtifacts;
        } else {
            const res = await this.makeRequest(`${this.backendUrl}/api/usage/artifacts?period=all`, token);
            if (res.status !== 200 || !Array.isArray(res.data) || res.data.length === 0) {
                return [new AppTreeItem('No artifact analytics recorded', vscode.TreeItemCollapsibleState.None)];
            }
            list = res.data;
            this.cachedUsageArtifacts = list;
            this.lastUsageArtifactsFetchMs = now;
        }

        return list.map((a: any) => {
            const item = new AppTreeItem(a.artifactName, vscode.TreeItemCollapsibleState.None);
            item.description = `${a.downloads} DL • ${a.uniqueUsers} Users • ${a.usageCount} Uses`;
            item.tooltip = `Artifact: ${a.artifactName}\nType: ${a.artifactType}\nDownloads: ${a.downloads}\nUnique Users: ${a.uniqueUsers}\nTotal Invocations: ${a.usageCount}\nUsage Rate: ${a.usageRate} uses/user\nLast Used: ${a.lastUsedAt ? new Date(a.lastUsedAt).toLocaleString() : 'Never'}`;
            item.iconPath = new vscode.ThemeIcon('symbol-property');
            item.command = {
                command: 'engineeringCommons.showArtifactDetails',
                title: 'Show Artifact Details',
                arguments: [{ name: a.artifactName, type: a.artifactType, version: a.currentVersion || '1.0.0' }]
            };
            return item;
        });
    }

    private inFlightRequests = new Map<string, Promise<{ status: number; data: any }>>();

    private makeRequest(urlString: string, token?: string): Promise<{ status: number; data: any }> {
        const cacheKey = `${token ? 'auth:' : 'anon:'}${urlString}`;
        if (this.inFlightRequests.has(cacheKey)) {
            return this.inFlightRequests.get(cacheKey)!;
        }

        const promise = new Promise<{ status: number; data: any }>((resolve) => {
            try {
                const url = new URL(urlString);
                const client = url.protocol === 'https:' ? https : http;
                const headers: Record<string, string> = { 
                    'Content-Type': 'application/json',
                    'Accept-Encoding': 'gzip, deflate'
                };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const req = client.request(url, { method: 'GET', headers }, (res) => {
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
                            this.inFlightRequests.delete(cacheKey);
                        }
                    });
                });

                req.setTimeout(3000, () => {
                    req.destroy();
                    this.inFlightRequests.delete(cacheKey);
                    resolve({ status: 504, data: null });
                });

                req.on('error', () => {
                    this.inFlightRequests.delete(cacheKey);
                    resolve({ status: 500, data: null });
                });
                req.end();
            } catch {
                this.inFlightRequests.delete(cacheKey);
                resolve({ status: 500, data: null });
            }
        });

        this.inFlightRequests.set(cacheKey, promise);
        return promise;
    }
}
