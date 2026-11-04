import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DefaultCliExecutor } from './services/cliExecutor';
import { SessionFileAuthStatusProvider } from './services/authenticationStatusProvider';
import { HttpBackendUsageClient } from './services/backendUsageClient';
import { BackendUsageLogger } from './services/usageLogger';
import { CompositeArtifactUsageTracker } from './services/usageTracker';
import { HttpReviewThreadService } from './services/reviewThreadService';
import { ReviewCommentService } from './services/reviewCommentService';
import { HttpNotificationService, AppNotification } from './services/notificationService';
import { NotificationCoordinator } from './services/notificationCoordinator';
import { ThreadWebviewProvider } from './views/threadWebviewProvider';
import { ArtifactDetailsWebviewProvider } from './views/artifactDetailsWebviewProvider';
import { ContributeWebviewProvider } from './views/contributeWebviewProvider';
import { UsageDashboardWebviewProvider } from './views/usageDashboardWebviewProvider';
import { executeLoginCommand, executeSsoLoginCommand } from './commands/loginCommand';
import { executeListCommand } from './commands/listCommand';
import { executeInstallCommand, executeDownloadZipCommand } from './commands/installCommand';
import { executeUpdateCommand } from './commands/updateCommand';
import { executeContributeCommand } from './commands/contributeCommand';
import { executeReviewCommand } from './commands/reviewCommand';
import { executeVisibilityCommand } from './commands/visibilityCommand';
import { ReviewContentProvider } from './services/reviewContentProvider';
import { ArtifactRegistry } from './services/artifactRegistry';
import { AgentDebugLogCollector, WorkspaceArtifactActivityCollector } from './services/artifactUsageCollector';
import { ArtifactTreeDataProvider, AppTreeItem } from './views/artifactTreeDataProvider';
import { EngineeringCommonsSidebarWebviewProvider } from './views/engineeringCommonsSidebarWebviewProvider';
import { SharePointClient } from './services/sharepoint/sharepointClient';
import { SharePointArtifactService } from './services/sharepoint/sharepointArtifactService';
import { SharePointTelemetryService, CompositeUsageClient } from './services/sharepoint/sharepointTelemetryService';
import { AutoCliProvisioner } from './services/cliProvisioner';
import { AdvisorHookProvisioner, ADVISOR_SKILL_NAME } from './services/advisorHookProvisioner';

export function activate(context: vscode.ExtensionContext) {
    const DEFAULT_VERCEL_BACKEND = 'https://ecommerce-app-chi-wine.vercel.app';

    // 0. Silently auto-provision / verify global CIP CLI in background
    AutoCliProvisioner.ensureInstalled(context).catch(() => {});

    // 0b. Silently auto-provision Engineering Commons Advisor skill, prompt & Copilot instructions (ZERO network calls)
    const getActiveWorkspaceRoot = (): string | undefined => {
        return (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0)
            ? vscode.workspace.workspaceFolders[0].uri.fsPath
            : undefined;
    };

    const initialWorkspace = getActiveWorkspaceRoot();
    if (initialWorkspace) {
        AdvisorHookProvisioner.provisionWorkspaceHooks(initialWorkspace, context.extensionUri);
    }

    if (vscode.workspace && vscode.workspace.onDidChangeWorkspaceFolders) {
        context.subscriptions.push(
            vscode.workspace.onDidChangeWorkspaceFolders((e) => {
                for (const added of e.added) {
                    AdvisorHookProvisioner.provisionWorkspaceHooks(added.uri.fsPath, context.extensionUri);
                }
            })
        );
    }

    const config = vscode.workspace.getConfiguration('engineeringCommons');
    const customCliPath = config.get<string>('cliPath') || '';
    const rawBackend = (config.get<string>('backendUrl') || '').trim();
    const backendUrl = (!rawBackend || rawBackend.includes('localhost'))
        ? DEFAULT_VERCEL_BACKEND
        : rawBackend.replace(/\/+$/, '');

    // Ensure the setting is permanently aligned to the Vercel backend if unconfigured or stale
    if (!rawBackend || rawBackend.includes('localhost')) {
        config.update('backendUrl', DEFAULT_VERCEL_BACKEND, vscode.ConfigurationTarget.Global).then(undefined, () => {});
    }

    const pollingMinutes = config.get<number>('notificationPollingIntervalMinutes') || 5;

    // 1. Initialize Service Layer
    const cliExecutable = customCliPath.trim() || 'engineering-commons';
    const cliExecutor = new DefaultCliExecutor(cliExecutable);
    const authProvider = new SessionFileAuthStatusProvider();
    const spClient = new SharePointClient();
    const spTelemetry = new SharePointTelemetryService(spClient, authProvider);
    const httpUsageClient = new HttpBackendUsageClient(backendUrl);
    const backendUsageClient = new CompositeUsageClient(spTelemetry, httpUsageClient, undefined, authProvider);
    const usageLogger = new BackendUsageLogger(backendUsageClient, authProvider);

    const artifactRegistry = new ArtifactRegistry();
    artifactRegistry.scanWorkspaceArtifacts().catch(() => {});

    const usageTracker = new CompositeArtifactUsageTracker(backendUsageClient, authProvider, artifactRegistry);
    const agentDebugLogCollector = new AgentDebugLogCollector(artifactRegistry, context.logUri);
    const workspaceActivityCollector = new WorkspaceArtifactActivityCollector(artifactRegistry);
    usageTracker.registerCollector(agentDebugLogCollector);
    usageTracker.registerCollector(workspaceActivityCollector);
    usageTracker.startCollectors();

    const reviewContentProvider = new ReviewContentProvider();
    const reviewThreadService = new HttpReviewThreadService(backendUrl, authProvider);
    const reviewCommentService = new ReviewCommentService(authProvider, backendUrl);
    const threadWebviewProvider = new ThreadWebviewProvider(reviewThreadService, reviewCommentService, authProvider);
    const notificationService = new HttpNotificationService(backendUrl, authProvider);
    const notificationCoordinator = new NotificationCoordinator(
        notificationService,
        authProvider,
        pollingMinutes * 60 * 1000
    );

    let treeDataProvider: ArtifactTreeDataProvider;
    let sidebarWebviewProvider: EngineeringCommonsSidebarWebviewProvider;

    const artifactDetailsWebviewProvider = new ArtifactDetailsWebviewProvider(
        authProvider,
        cliExecutor,
        cliExecutable,
        backendUrl,
        usageTracker,
        () => {
            if (treeDataProvider) treeDataProvider.refresh();
            if (sidebarWebviewProvider) sidebarWebviewProvider.refresh(true);
        }
    );

    // Start background notification coordinator
    notificationCoordinator.start();

    // Register TextDocumentContentProvider for cip-review:// diffs
    const providerDisposable = vscode.workspace.registerTextDocumentContentProvider(
        ReviewContentProvider.scheme,
        reviewContentProvider
    );

    // 2. Initialize Views
    treeDataProvider = new ArtifactTreeDataProvider(cliExecutor, authProvider, cliExecutable, backendUrl, notificationService);
    sidebarWebviewProvider = new EngineeringCommonsSidebarWebviewProvider(
        context.extensionUri,
        authProvider,
        cliExecutor,
        cliExecutable,
        backendUrl,
        notificationService,
        reviewCommentService,
        usageTracker,
        artifactDetailsWebviewProvider,
        threadWebviewProvider
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('engineering-commons-explorer', sidebarWebviewProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    let refreshTimer: NodeJS.Timeout | undefined;
    let isRefreshing = false;

    const debouncedRefreshAllViews = (delayMs: number = 2500) => {
        if (refreshTimer) {
            clearTimeout(refreshTimer);
        }
        refreshTimer = setTimeout(async () => {
            if (isRefreshing) return;
            isRefreshing = true;
            try {
                await refreshAllViews();
            } finally {
                isRefreshing = false;
            }
        }, delayMs);
    };

    const shouldIgnorePath = (uri?: vscode.Uri): boolean => {
        if (!uri || !uri.fsPath) return false;
        const norm = uri.fsPath.replace(/\\/g, '/').toLowerCase();
        // Ignore internal metadata, cache files, reference catalogs, and telemetry queues to avoid feedback loops
        if (
            norm.includes('/references/catalog.json') ||
            norm.includes('/catalog-cache.json') ||
            norm.includes('/telemetry/') ||
            norm.includes('/ado_telemetry_queue.json') ||
            norm.includes('/.git/') ||
            norm.endsWith('.log')
        ) {
            return true;
        }
        return false;
    };

    const refreshAllViews = async () => {
        await artifactRegistry.scanWorkspaceArtifacts().catch(() => {});
        if (treeDataProvider) treeDataProvider.refresh(false);
        if (sidebarWebviewProvider) await sidebarWebviewProvider.refresh(false);
        if (artifactDetailsWebviewProvider) await artifactDetailsWebviewProvider.refreshIfOpen(false);
    };

    if (vscode.workspace && vscode.workspace.createFileSystemWatcher) {
        const artifactWatcher = vscode.workspace.createFileSystemWatcher('**/{.cip,.github,.agents,skills,agents,prompts,plugins,.mcp}/**');
        artifactWatcher.onDidCreate((uri) => { if (!shouldIgnorePath(uri)) debouncedRefreshAllViews(); });
        artifactWatcher.onDidDelete((uri) => { if (!shouldIgnorePath(uri)) debouncedRefreshAllViews(); });
        artifactWatcher.onDidChange((uri) => { if (!shouldIgnorePath(uri)) debouncedRefreshAllViews(); });
        context.subscriptions.push(artifactWatcher);

        const ymlWatcher = vscode.workspace.createFileSystemWatcher('**/cip.yml');
        ymlWatcher.onDidCreate((uri) => { if (!shouldIgnorePath(uri)) debouncedRefreshAllViews(); });
        ymlWatcher.onDidDelete((uri) => { if (!shouldIgnorePath(uri)) debouncedRefreshAllViews(); });
        ymlWatcher.onDidChange((uri) => { if (!shouldIgnorePath(uri)) debouncedRefreshAllViews(); });
        context.subscriptions.push(ymlWatcher);
    }

    // Configuration change listener: dynamically update all live services
    const configListener = vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('engineeringCommons.backendUrl')) {
            const rawUrl = (vscode.workspace.getConfiguration('engineeringCommons').get<string>('backendUrl') || '').trim();
            const newUrl = (!rawUrl || rawUrl.includes('localhost')) ? DEFAULT_VERCEL_BACKEND : rawUrl.replace(/\/+$/, '');
            AutoCliProvisioner.seedUserBackendConfig(newUrl);
            backendUsageClient.setBackendUrl(newUrl);
            reviewThreadService.setBackendUrl(newUrl);
            reviewCommentService.setBackendUrl(newUrl);
            notificationService.setBackendUrl(newUrl);
            artifactDetailsWebviewProvider.setBackendUrl(newUrl);
            treeDataProvider.setBackendUrl(newUrl);
            sidebarWebviewProvider.setBackendUrl(newUrl);
            if (UsageDashboardWebviewProvider.currentInstance) {
                UsageDashboardWebviewProvider.currentInstance.setBackendUrl(newUrl);
            }
            await refreshAllViews();
        }
    });
    context.subscriptions.push(configListener);

    // 3. Register Commands
    const setBackendUrlDisposable = vscode.commands.registerCommand('engineeringCommons.setBackendUrl', async () => {
        const currentUrl = vscode.workspace.getConfiguration('engineeringCommons').get<string>('backendUrl') || DEFAULT_VERCEL_BACKEND;
        const newUrl = await vscode.window.showInputBox({
            prompt: 'Enter Engineering Commons Backend Server or Cloudflare Tunnel URL',
            placeHolder: `e.g. ${DEFAULT_VERCEL_BACKEND}`,
            value: currentUrl,
            validateInput: (val) => {
                if (!val || !val.trim()) return 'Backend URL cannot be empty';
                if (!val.startsWith('http://') && !val.startsWith('https://')) {
                    return 'URL must start with http:// or https://';
                }
                return null;
            }
        });

        if (newUrl && newUrl.trim()) {
            const cleanUrl = newUrl.trim().replace(/\/+$/, '');
            await vscode.workspace.getConfiguration('engineeringCommons').update('backendUrl', cleanUrl, vscode.ConfigurationTarget.Global);
            AutoCliProvisioner.seedUserBackendConfig(cleanUrl);
            vscode.window.showInformationMessage(`✓ Engineering Commons Backend URL updated to: ${cleanUrl}`);
            await refreshAllViews();
        }
    });
    const showArtifactDetailsDisposable = vscode.commands.registerCommand('engineeringCommons.showArtifactDetails', async (artifact: any, version?: string) => {
        if (!artifact) return;
        const artItem = typeof artifact === 'string' ? { name: artifact, type: 'agent', version: version || '1.0.0' } : artifact;
        await artifactDetailsWebviewProvider.showArtifactDetails(artItem, version);
    });

    const loginDisposable = vscode.commands.registerCommand('engineeringCommons.login', async () => {
        const loggedIn = await executeLoginCommand(cliExecutor, authProvider, usageTracker, cliExecutable);
        if (loggedIn) {
            await refreshAllViews();
            await notificationCoordinator.checkNotifications();
        }
    });

    const loginSsoDisposable = vscode.commands.registerCommand('engineeringCommons.loginSso', async () => {
        const loggedIn = await executeSsoLoginCommand(authProvider, usageTracker);
        if (loggedIn) {
            await refreshAllViews();
            await notificationCoordinator.checkNotifications();
        }
    });

    const logoutDisposable = vscode.commands.registerCommand('engineeringCommons.logout', async () => {
        if (typeof authProvider.logout === 'function') {
            await authProvider.logout();
        }
        try {
            await cliExecutor.executeAsync(cliExecutable, ['logout']);
        } catch {}
        ArtifactDetailsWebviewProvider.closeIfOpen();
        ThreadWebviewProvider.closeIfOpen();
        vscode.window.showInformationMessage('Successfully logged out of Engineering Commons.');
        await refreshAllViews();
    });

    const listDisposable = vscode.commands.registerCommand('engineeringCommons.list', async () => {
        await executeListCommand(cliExecutor, authProvider, usageLogger, cliExecutable);
    });

    const installDisposable = vscode.commands.registerCommand('engineeringCommons.install', async (target?: any) => {
        let artifactName: string | undefined;
        let mode: 'workspace' | 'zip' | 'prompt' | undefined;
        let version: string | undefined;
        if (typeof target === 'string') {
            artifactName = target;
        } else if (target && typeof target === 'object') {
            mode = target.mode;
            version = target.version;
            if (target.artifact && typeof target.artifact.name === 'string') {
                artifactName = target.artifact.name;
            } else if (typeof target.name === 'string') {
                artifactName = target.name;
            } else if (typeof target.label === 'string') {
                artifactName = target.label;
            }
        }
        await executeInstallCommand(cliExecutor, authProvider, usageLogger, artifactName ? { name: artifactName, mode, version } : undefined, cliExecutable);
        await refreshAllViews();
    });

    const downloadZipDisposable = vscode.commands.registerCommand('engineeringCommons.downloadZip', async (target?: any) => {
        let artifactName: string | undefined;
        let version: string | undefined;
        if (typeof target === 'string') {
            artifactName = target;
        } else if (target && typeof target === 'object') {
            version = target.version;
            if (target.artifact && typeof target.artifact.name === 'string') {
                artifactName = target.artifact.name;
            } else if (typeof target.name === 'string') {
                artifactName = target.name;
            } else if (typeof target.label === 'string') {
                artifactName = target.label;
            }
        }
        await executeDownloadZipCommand(authProvider, usageLogger, artifactName, version);
        await refreshAllViews();
    });

    const updateDisposable = vscode.commands.registerCommand('engineeringCommons.update', async (target?: any) => {
        let artifactName: string | undefined;
        if (typeof target === 'string') {
            artifactName = target;
        } else if (target && typeof target === 'object') {
            if (target.artifact && typeof target.artifact.name === 'string') {
                artifactName = target.artifact.name;
            } else if (typeof target.name === 'string') {
                artifactName = target.name;
            } else if (typeof target.label === 'string') {
                artifactName = target.label;
            }
        }
        await executeUpdateCommand(cliExecutor, authProvider, usageLogger, artifactName, cliExecutable);
        await refreshAllViews();
    });

    const contributeDisposable = vscode.commands.registerCommand('engineeringCommons.contribute', async (targetArtifact?: string) => {
        if (targetArtifact && typeof targetArtifact === 'string') {
            await executeContributeCommand(cliExecutor, authProvider, usageLogger, targetArtifact, cliExecutable);
            treeDataProvider.refresh();
            if (sidebarWebviewProvider) sidebarWebviewProvider.refresh();
        } else {
            await ContributeWebviewProvider.show(
                context.extensionUri,
                cliExecutor,
                authProvider,
                usageLogger,
                cliExecutable,
                () => {
                    treeDataProvider.refresh();
                    if (sidebarWebviewProvider) sidebarWebviewProvider.refresh();
                }
            );
        }
    });

    const reviewDisposable = vscode.commands.registerCommand('engineeringCommons.review', async () => {
        await executeReviewCommand(authProvider, reviewContentProvider, backendUrl);
    });

    const openThreadDisposable = vscode.commands.registerCommand('engineeringCommons.openThread', async (reviewId: string, artifactName?: string) => {
        if (!reviewId) {
            const inputId = await vscode.window.showInputBox({
                prompt: 'Enter Review/Submission ID to open discussion thread',
                placeHolder: 'e.g. rev-abc-123'
            });
            if (!inputId) return;
            reviewId = inputId;
        }
        await threadWebviewProvider.showThread(reviewId, artifactName);
    });

    const openNotificationDisposable = vscode.commands.registerCommand('engineeringCommons.openNotification', async (notifOrItem: any) => {
        const notif: AppNotification = notifOrItem?.notification ? notifOrItem.notification : notifOrItem;
        if (!notif) return;
        // Mark notification as read on backend
        await notificationService.markAsRead(notif.id).catch(() => {});
        treeDataProvider.refresh();

        const targetSubmissionId = notif.submissionId || notif.threadId;

        if (notif.type === 'AccessRequested' || notif.title?.includes('Access Request')) {
            const choice = await vscode.window.showInformationMessage(
                notif.message || notif.title,
                'Approve Access',
                'Reject Access',
                'Manage Access'
            );
            if (choice === 'Approve Access') {
                await vscode.commands.executeCommand('engineeringCommons.approveAccessRequest', targetSubmissionId);
            } else if (choice === 'Reject Access') {
                await vscode.commands.executeCommand('engineeringCommons.rejectAccessRequest', targetSubmissionId);
            } else if (choice === 'Manage Access') {
                await vscode.commands.executeCommand('engineeringCommons.manageAccessRequests');
            }
            return;
        }

        if (targetSubmissionId) {
            const initialTab: 'diff' | 'general' = (notif.type === 'FeedbackAdded' || notif.type === 'ProducerReplied') ? 'general' : 'diff';
            await threadWebviewProvider.showThread(targetSubmissionId, notif.artifactName, undefined, undefined, initialTab);
        } else {
            await vscode.commands.executeCommand('engineeringCommons.review');
        }
    });

    const deleteNotificationDisposable = vscode.commands.registerCommand('engineeringCommons.deleteNotification', async (notifOrItem: any) => {
        const notif: AppNotification = notifOrItem?.notification ? notifOrItem.notification : notifOrItem;
        if (!notif || !notif.id) return;
        const deleted = await notificationService.deleteNotification(notif.id).catch(() => false);
        if (deleted) {
            vscode.window.showInformationMessage(`✓ Notification deleted.`);
        }
        treeDataProvider.refresh();
    });

    const clearNotificationsDisposable = vscode.commands.registerCommand('engineeringCommons.clearNotifications', async () => {
        const cleared = await notificationService.clearNotifications().catch(() => false);
        if (cleared) {
            vscode.window.showInformationMessage(`✓ All notifications cleared.`);
        }
        treeDataProvider.refresh();
    });

    const mySubmissionsDisposable = vscode.commands.registerCommand('engineeringCommons.mySubmissions', async () => {
        const isAuth = await authProvider.isAuthenticated();
        if (!isAuth) {
            vscode.window.showErrorMessage('You must be logged in to view your submissions. Run "Engineering Commons: Login" first.');
            return;
        }
        const res = await cliExecutor.executeAsync(cliExecutable, ['status']);
        if (res.exitCode === 0) {
            const channel = vscode.window.createOutputChannel('Engineering Commons Submissions');
            channel.clear();
            channel.appendLine(res.stdout);
            channel.show(true);
        } else {
            vscode.window.showErrorMessage(`Failed to fetch submissions: ${res.stderr || res.stdout}`);
        }
    });

    const refreshDisposable = vscode.commands.registerCommand('engineeringCommons.refreshTree', async () => {
        await artifactRegistry.scanWorkspaceArtifacts().catch(() => {});
        treeDataProvider.refresh(true);
        if (sidebarWebviewProvider) {
            await sidebarWebviewProvider.refresh(true);
        }
        if (artifactDetailsWebviewProvider) {
            await artifactDetailsWebviewProvider.refreshIfOpen(true);
        }
        if (UsageDashboardWebviewProvider.currentInstance) {
            await UsageDashboardWebviewProvider.currentInstance.refresh();
        }
        await notificationCoordinator.checkNotifications().catch(() => {});
    });

    const refreshAliasDisposable = vscode.commands.registerCommand('engineeringCommons.refresh', async () => {
        await vscode.commands.executeCommand('engineeringCommons.refreshTree');
    });

    const openUsageDashboardDisposable = vscode.commands.registerCommand('engineeringCommons.openUsageDashboard', async () => {
        const isAuth = await authProvider.isAuthenticated();
        if (!isAuth) {
            vscode.window.showWarningMessage('Please sign in to Engineering Commons to access the usage dashboard.');
            return;
        }
        await UsageDashboardWebviewProvider.createOrShow(
            context.extensionUri,
            backendUrl,
            authProvider,
            async () => {
                await artifactRegistry.scanWorkspaceArtifacts().catch(() => {});
                treeDataProvider.refresh();
                if (sidebarWebviewProvider) {
                    await sidebarWebviewProvider.refresh();
                }
                await notificationCoordinator.checkNotifications().catch(() => {});
            }
        );
    });

    const openNotificationsTabDisposable = vscode.commands.registerCommand('engineeringCommons.openNotificationsTab', async () => {
        if (sidebarWebviewProvider) {
            (sidebarWebviewProvider as any).currentTab = 'notifications';
            await sidebarWebviewProvider.refresh();
        }
    });

    const visibilityDisposable = vscode.commands.registerCommand('engineeringCommons.visibility', async (artifactName?: string, visibility?: 'public' | 'private', options?: any) => {
        await executeVisibilityCommand(cliExecutor, authProvider, artifactName, visibility, options, cliExecutable);
        treeDataProvider.refresh();
        if (sidebarWebviewProvider) sidebarWebviewProvider.refresh();
    });

    const checkCertificationDisposable = vscode.commands.registerCommand('engineeringCommons.checkCertification', async (artifactName?: string) => {
        if (!artifactName) {
            artifactName = await vscode.window.showInputBox({
                prompt: 'Enter artifact name to evaluate certification criteria',
                placeHolder: 'e.g. design-reviewer'
            });
        }
        if (!artifactName) return;
        const res = await cliExecutor.executeAsync(cliExecutable, ['certification', 'check', artifactName]);
        const channel = vscode.window.createOutputChannel('Engineering Commons Certification');
        channel.clear();
        channel.appendLine(res.stdout || res.stderr);
        channel.show(true);
    });

    const certifyArtifactDisposable = vscode.commands.registerCommand('engineeringCommons.certifyArtifact', async (artifactName?: string) => {
        if (!artifactName) {
            artifactName = await vscode.window.showInputBox({
                prompt: 'Enter artifact name to certify (Reviewer/Admin only)',
                placeHolder: 'e.g. design-reviewer'
            });
        }
        if (!artifactName) return;
        const res = await cliExecutor.executeAsync(cliExecutable, ['certification', 'certify', artifactName]);
        if (res.exitCode === 0) {
            vscode.window.showInformationMessage(`✓ Artifact '${artifactName}' certified successfully!`);
            treeDataProvider.refresh();
            if (sidebarWebviewProvider) sidebarWebviewProvider.refresh();
        } else {
            vscode.window.showErrorMessage(`Failed to certify artifact: ${res.stderr || res.stdout}`);
        }
    });

    const revokeCertificationDisposable = vscode.commands.registerCommand('engineeringCommons.revokeCertification', async (artifactName?: string) => {
        if (!artifactName) {
            artifactName = await vscode.window.showInputBox({
                prompt: 'Enter artifact name to revoke certification',
                placeHolder: 'e.g. design-reviewer'
            });
        }
        if (!artifactName) return;
        const reason = await vscode.window.showInputBox({
            prompt: `Enter reason for revoking certification of '${artifactName}'`,
            placeHolder: 'e.g. Security vulnerability identified'
        });
        if (!reason) return;
        const res = await cliExecutor.executeAsync(cliExecutable, ['certification', 'revoke', artifactName, '--reason', reason]);
        if (res.exitCode === 0) {
            vscode.window.showWarningMessage(`✓ Certification for '${artifactName}' has been revoked.`);
            treeDataProvider.refresh();
            if (sidebarWebviewProvider) sidebarWebviewProvider.refresh();
        } else {
            vscode.window.showErrorMessage(`Failed to revoke certification: ${res.stderr || res.stdout}`);
        }
    });

    const installCliDisposable = vscode.commands.registerCommand('engineeringCommons.installCli', async () => {
        const res = await AutoCliProvisioner.ensureInstalled(context, true);
        if (res.success) {
            vscode.window.showInformationMessage(res.message);
        } else {
            vscode.window.showErrorMessage(res.message);
        }
    });

    const requestAccessDisposable = vscode.commands.registerCommand('engineeringCommons.requestAccess', async () => {
        const isAuth = await authProvider.isAuthenticated();
        if (!isAuth) {
            vscode.window.showErrorMessage('You must be logged in to request access. Run "Engineering Commons: Login" first.');
            return;
        }

        const rolePick = await vscode.window.showQuickPick([
            { label: 'CONTRIBUTOR', description: 'Publish and contribute AI artifacts (Agents, Skills, Prompts, MCP Servers) to marketplace' },
            { label: 'REVIEWER', description: 'Review AI artifacts, inspect diffs, and leave feedback' },
            { label: 'CERTIFIED_REVIEWER', description: 'Lead reviewer authorized to grant official certifications' }
        ], { placeHolder: 'Select the role you wish to request' });
        if (!rolePick) return;

        const reason = await vscode.window.showInputBox({
            prompt: `Reason / justification for requesting ${rolePick.label} access:`,
            placeHolder: 'e.g. Assigned to AI Leap reviewer panel'
        });
        if (reason === undefined) return;

        const res = await cliExecutor.executeAsync(cliExecutable, [
            'request-access',
            rolePick.label.toLowerCase(),
            '--reason',
            reason
        ]);

        if (res.exitCode === 0) {
            vscode.window.showInformationMessage(`✓ Access request for ${rolePick.label} submitted! Admin harsh.rana@maqsoftware.com has been notified.`);
            await refreshAllViews();
        } else {
            vscode.window.showErrorMessage(`Failed to submit access request: ${res.stderr || res.stdout}`);
        }
    });

    const accessStatusDisposable = vscode.commands.registerCommand('engineeringCommons.accessStatus', async () => {
        const isAuth = await authProvider.isAuthenticated();
        if (!isAuth) {
            vscode.window.showErrorMessage('You must be logged in to check access status.');
            return;
        }

        const res = await cliExecutor.executeAsync(cliExecutable, ['access-status']);
        if (res.exitCode === 0) {
            const channel = vscode.window.createOutputChannel('Engineering Commons Access Status');
            channel.clear();
            channel.appendLine(res.stdout);
            channel.show(true);
        } else {
            vscode.window.showErrorMessage(`Could not retrieve access status: ${res.stderr || res.stdout}`);
        }
    });

    const manageAccessRequestsDisposable = vscode.commands.registerCommand('engineeringCommons.manageAccessRequests', async () => {
        if (sidebarWebviewProvider) {
            await sidebarWebviewProvider.switchTab('my-work');
        }
    });

    const approveAccessRequestDisposable = vscode.commands.registerCommand('engineeringCommons.approveAccessRequest', async (targetId?: string) => {
        let reqId = targetId;
        if (!reqId) {
            reqId = await vscode.window.showInputBox({
                prompt: 'Enter Access Request ID to approve:',
                placeHolder: 'e.g. 550e8400-e29b-41d4-a716-446655440000'
            });
        }
        if (!reqId) return;

        const notes = await vscode.window.showInputBox({
            prompt: `Admin approval notes for request '${reqId}' (optional):`,
            placeHolder: 'e.g. Approved reviewer privileges'
        });

        const args = ['approve-access', reqId];
        if (notes) {
            args.push('--notes', notes);
        }

        const res = await cliExecutor.executeAsync(cliExecutable, args);
        if (res.exitCode === 0) {
            vscode.window.showInformationMessage(`✓ Access request '${reqId}' approved successfully.`);
            await refreshAllViews();
        } else {
            vscode.window.showErrorMessage(`Failed to approve request: ${res.stderr || res.stdout}`);
        }
    });

    const rejectAccessRequestDisposable = vscode.commands.registerCommand('engineeringCommons.rejectAccessRequest', async (targetId?: string) => {
        let reqId = targetId;
        if (!reqId) {
            reqId = await vscode.window.showInputBox({
                prompt: 'Enter Access Request ID to reject:',
                placeHolder: 'e.g. 550e8400-e29b-41d4-a716-446655440000'
            });
        }
        if (!reqId) return;

        const notes = await vscode.window.showInputBox({
            prompt: `Reason for rejection (optional):`,
            placeHolder: 'e.g. Insufficient justification'
        });

        const args = ['reject-access', reqId];
        if (notes) {
            args.push('--notes', notes);
        }

        const res = await cliExecutor.executeAsync(cliExecutable, args);
        if (res.exitCode === 0) {
            vscode.window.showInformationMessage(`Access request '${reqId}' rejected.`);
            await refreshAllViews();
        } else {
            vscode.window.showErrorMessage(`Failed to reject request: ${res.stderr || res.stdout}`);
        }
    });

    const revokeAccessDisposable = vscode.commands.registerCommand('engineeringCommons.revokeAccess', async () => {
        const email = await vscode.window.showInputBox({
            prompt: 'Enter employee email to revoke reviewer privileges:',
            placeHolder: 'developer@maqsoftware.com'
        });
        if (!email) return;

        const notes = await vscode.window.showInputBox({
            prompt: 'Reason for revocation (optional):',
            placeHolder: 'e.g. Role reassigned'
        });

        const args = ['revoke-access', email];
        if (notes) {
            args.push('--notes', notes);
        }

        const res = await cliExecutor.executeAsync(cliExecutable, args);
        if (res.exitCode === 0) {
            vscode.window.showInformationMessage(`✓ Reviewer privileges for '${email}' revoked. Reverted to PRODUCER.`);
            await refreshAllViews();
        } else {
            vscode.window.showErrorMessage(`Failed to revoke access: ${res.stderr || res.stdout}`);
        }
    });

    const certifyReviewerDisposable = vscode.commands.registerCommand('engineeringCommons.certifyReviewer', async () => {
        const email = await vscode.window.showInputBox({
            prompt: 'Enter reviewer email to promote to Certified Reviewer:',
            placeHolder: 'lead@maqsoftware.com'
        });
        if (!email) return;

        const notes = await vscode.window.showInputBox({
            prompt: 'Certification notes (optional):',
            placeHolder: 'e.g. Completed evaluation framework'
        });

        const args = ['certify-reviewer', email];
        if (notes) {
            args.push('--notes', notes);
        }

        const res = await cliExecutor.executeAsync(cliExecutable, args);
        if (res.exitCode === 0) {
            vscode.window.showInformationMessage(`✓ User '${email}' is now a Certified Reviewer.`);
            await refreshAllViews();
        } else {
            vscode.window.showErrorMessage(`Failed to certify reviewer: ${res.stderr || res.stdout}`);
        }
    });

    const checkEmailStatusDisposable = vscode.commands.registerCommand('engineeringCommons.checkEmailStatus', async () => {
        const isAuth = await authProvider.isAuthenticated();
        if (!isAuth) {
            vscode.window.showWarningMessage('Please sign in to Engineering Commons first.');
            return;
        }
        const token = await authProvider.getToken();
        let statusInfo: any = null;
        try {
            const resp = await fetch(`${backendUrl}/api/admin/emails/status`, {
                headers: {
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            if (resp.ok) {
                statusInfo = await resp.json();
            }
        } catch {}

        const mode = statusInfo?.deliveryMode || 'PickupDirectory + SMTP (Auto)';
        const host = statusInfo?.host || '(Local EML Outbox Mode)';
        const dir = statusInfo?.pickupDirectoryPath || './mail_outbox';
        const dispatched = statusInfo?.totalDispatchedCount ?? 0;

        const choice = await vscode.window.showInformationMessage(
            `Email Notification Engine: ${mode}\n• Host: ${host}\n• Pickup Outbox: ${dir}\n• Dispatched: ${dispatched} email(s)`,
            'Send Test Email',
            'Open Outbox Folder'
        );

        if (choice === 'Send Test Email') {
            const recipient = await vscode.window.showInputBox({
                prompt: 'Recipient email address for test notification:',
                value: 'harsh.rana@maqsoftware.com'
            });
            if (!recipient) return;
            try {
                const testResp = await fetch(`${backendUrl}/api/admin/emails/test`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ recipient })
                });
                if (testResp.ok) {
                    vscode.window.showInformationMessage(`✓ Test notification dispatched to ${recipient}.`);
                } else {
                    vscode.window.showErrorMessage(`Failed to send test email.`);
                }
            } catch {
                vscode.window.showErrorMessage(`Could not contact backend at ${backendUrl}.`);
            }
        } else if (choice === 'Open Outbox Folder') {
            if (fs.existsSync(dir)) {
                vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(dir));
            } else {
                vscode.window.showInformationMessage(`Mail outbox path: ${dir}`);
            }
        }
    });

    const deleteArtifactDisposable = vscode.commands.registerCommand('engineeringCommons.deleteArtifact', async (target?: any) => {
        const isAuth = await authProvider.isAuthenticated();
        if (!isAuth) {
            vscode.window.showWarningMessage('Please sign in to Engineering Commons first.');
            return;
        }
        let artifactName: string | undefined;
        if (typeof target === 'string') {
            artifactName = target;
        } else if (target && typeof target === 'object') {
            if (target.artifact && typeof target.artifact.name === 'string') {
                artifactName = target.artifact.name;
            } else if (typeof target.name === 'string') {
                artifactName = target.name;
            } else if (typeof target.label === 'string') {
                artifactName = target.label;
            }
        }
        if (!artifactName) {
            artifactName = await vscode.window.showInputBox({
                prompt: 'Enter name of the artifact to permanently delete (ADO & SharePoint):',
                placeHolder: 'e.g. sample-agent'
            });
            if (!artifactName) return;
        }

        const role = (await authProvider.getRole?.()) || 'CONSUMER';
        const email = (await authProvider.getEmail()) || '';
        const isAdmin = role.toUpperCase() === 'ADMIN' || email.toLowerCase() === 'harsh.rana@maqsoftware.com' || email.toLowerCase().includes('admin');
        if (!isAdmin) {
            vscode.window.showErrorMessage('Permission denied: Only administrators can permanently delete artifacts.');
            return;
        }

        const choice = await vscode.window.showWarningMessage(
            `Are you sure you want to permanently delete artifact '${artifactName}'? This will completely remove it from Azure DevOps Git repository. This action cannot be undone.`,
            { modal: true },
            'Delete Permanently'
        );
        if (choice !== 'Delete Permanently') return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Permanently deleting artifact '${artifactName}' from Azure DevOps...`,
            cancellable: false
        }, async (progress) => {
            const token = await authProvider.getToken();
            let adoSuccess = false;

            progress.report({ message: 'Removing from Azure DevOps Git repository...' });
            try {
                const deleteResp = await fetch(`${backendUrl}/api/admin/artifacts/${encodeURIComponent(artifactName!)}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    }
                });
                if (deleteResp.ok) {
                    adoSuccess = true;
                }
            } catch (adoErr) {
                console.warn('[Extension] Backend ADO delete error:', adoErr);
            }

            ArtifactDetailsWebviewProvider.closeIfOpen();
            if (adoSuccess) {
                vscode.window.showInformationMessage(`✓ Artifact '${artifactName}' was permanently deleted from Azure DevOps.`);
            } else {
                vscode.window.showErrorMessage(`Failed to delete artifact '${artifactName}'. Ensure you are an Admin and backend is reachable.`);
            }
            await refreshAllViews();
        });
    });

    // Register Advisor live catalog sync (runs ONLY after user logs in)
    AdvisorHookProvisioner.registerAuthSync(authProvider, backendUrl, getActiveWorkspaceRoot, context);

    // Command to find and match artifacts from Copilot or user palette
    const findArtifactDisposable = vscode.commands.registerCommand('engineeringCommons.findArtifact', async (userQuery?: string) => {
        let query = userQuery;
        if (!query) {
            query = await vscode.window.showInputBox({
                prompt: 'Describe your requirement or technical challenge:',
                placeHolder: 'e.g. automated xUnit API tests, database migration safety, FinOps cost audit'
            });
        }
        if (!query) return;

        const wsRoot = getActiveWorkspaceRoot();
        let catalog: any[] = [];
        if (wsRoot) {
            const catPath = path.join(wsRoot, '.github', 'skills', ADVISOR_SKILL_NAME, 'references', 'catalog.json');
            if (fs.existsSync(catPath)) {
                try { catalog = JSON.parse(fs.readFileSync(catPath, 'utf8')); } catch {}
            }
        }
        if (catalog.length === 0) {
            const bundledPath = path.join(context.extensionUri.fsPath, 'resources', 'catalog', 'masterCatalog.json');
            if (fs.existsSync(bundledPath)) {
                try { catalog = JSON.parse(fs.readFileSync(bundledPath, 'utf8')); } catch {}
            }
        }

        const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        const scored = catalog.map(item => {
            let score = 0;
            const text = `${item.name} ${item.title} ${item.description} ${(item.tags || []).join(' ')} ${(item.useCases || []).join(' ')} ${item.domain || ''}`.toLowerCase();
            for (const t of terms) {
                if (item.name.toLowerCase().includes(t)) score += 10;
                if ((item.title || '').toLowerCase().includes(t)) score += 8;
                if ((item.tags || []).some((tag: string) => tag.toLowerCase().includes(t))) score += 7;
                if ((item.useCases || []).some((uc: string) => uc.toLowerCase().includes(t))) score += 6;
                if (text.includes(t)) score += 3;
            }
            return { item, score };
        }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

        if (scored.length === 0) {
            vscode.window.showInformationMessage(`No matching Engineering Commons artifacts found for "${query}". Try different keywords or browse the marketplace.`);
            return;
        }

        const topPicks = scored.slice(0, 10).map(s => ({
            label: `$(star) ${s.item.title || s.item.name}`,
            description: `[${(s.item.type || 'skill').toUpperCase()}] ${s.item.domain || s.item.category || ''}`,
            detail: `${s.item.description || ''} — Click to install (${s.item.installCommand})`,
            artifact: s.item
        }));

        const selected = await vscode.window.showQuickPick(topPicks, {
            placeHolder: `Top matches for "${query}" (Select to install into workspace)`
        });

        if (selected) {
            await executeInstallCommand(cliExecutor, authProvider, usageLogger, selected.artifact.name, cliExecutable, 'workspace');
            await refreshAllViews();
        }
    });

    context.subscriptions.push(
        findArtifactDisposable,
        setBackendUrlDisposable,
        providerDisposable,
        showArtifactDetailsDisposable,
        loginDisposable,
        loginSsoDisposable,
        logoutDisposable,
        listDisposable,
        installDisposable,
        downloadZipDisposable,
        updateDisposable,
        contributeDisposable,
        visibilityDisposable,
        checkCertificationDisposable,
        certifyArtifactDisposable,
        revokeCertificationDisposable,
        installCliDisposable,
        reviewDisposable,
        openThreadDisposable,
        openNotificationDisposable,
        deleteNotificationDisposable,
        clearNotificationsDisposable,
        mySubmissionsDisposable,
        refreshDisposable,
        refreshAliasDisposable,
        openUsageDashboardDisposable,
        openNotificationsTabDisposable,
        requestAccessDisposable,
        accessStatusDisposable,
        manageAccessRequestsDisposable,
        approveAccessRequestDisposable,
        rejectAccessRequestDisposable,
        revokeAccessDisposable,
        certifyReviewerDisposable,
        checkEmailStatusDisposable,
        deleteArtifactDisposable,
        { dispose: () => notificationCoordinator.stop() },
        { dispose: () => usageTracker.stopCollectors() }
    );
}

export function deactivate() {}
