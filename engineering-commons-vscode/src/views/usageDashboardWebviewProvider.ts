import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IAuthenticationStatusProvider } from '../services/authenticationStatusProvider';
import { SharePointTelemetryService } from '../services/sharepoint/sharepointTelemetryService';
import { AdoTelemetryService } from '../services/adoTelemetryService';
import { ArtifactUsageEvent } from '../models/usageEvent';

export class UsageDashboardWebviewProvider {
    public static currentPanel: vscode.WebviewPanel | undefined;
    public static currentInstance: UsageDashboardWebviewProvider | undefined;
    private readonly _extensionUri: vscode.Uri;
    private _backendUrl: string;
    private _authProvider: IAuthenticationStatusProvider;
    private _spTelemetryService: SharePointTelemetryService;
    private _adoTelemetryService: AdoTelemetryService;
    private _selectedPeriod = 'all';
    private _selectedType = 'all';
    private _onRefresh?: () => void | Promise<void>;
    private _isLoading = false;

    public static async createOrShow(
        extensionUri: vscode.Uri,
        backendUrl: string,
        authProvider: IAuthenticationStatusProvider,
        onRefresh?: () => void | Promise<void>
    ) {
        const isAuth = await authProvider.isAuthenticated();
        if (!isAuth) {
            vscode.window.showWarningMessage('Please sign in to Engineering Commons to view the CIP Usage Dashboard.');
            return;
        }

        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        if (UsageDashboardWebviewProvider.currentPanel) {
            UsageDashboardWebviewProvider.currentPanel.reveal(column);
            if (UsageDashboardWebviewProvider.currentInstance) {
                UsageDashboardWebviewProvider.currentInstance.refresh();
            }
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'engineeringCommonsUsageDashboard',
            'CIP Usage & Analytics',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources')]
            }
        );

        UsageDashboardWebviewProvider.currentPanel = panel;
        const provider = new UsageDashboardWebviewProvider(extensionUri, backendUrl, authProvider, panel, onRefresh);
        UsageDashboardWebviewProvider.currentInstance = provider;
        provider.init();
    }

    private constructor(
        extensionUri: vscode.Uri,
        backendUrl: string,
        authProvider: IAuthenticationStatusProvider,
        private readonly panel: vscode.WebviewPanel,
        onRefresh?: () => void | Promise<void>
    ) {
        this._extensionUri = extensionUri;
        this._backendUrl = backendUrl.replace(/\/+$/, '');
        this._authProvider = authProvider;
        this._spTelemetryService = new SharePointTelemetryService(undefined, authProvider);
        this._adoTelemetryService = new AdoTelemetryService(undefined, authProvider);
        this._onRefresh = onRefresh;

        // Immediately paint local telemetry so panel opens instantly with 0ms delay without blank hang
        try {
            const localEvents = this.loadLocalTelemetryEvents();
            const initialSummary = this._spTelemetryService.calculateSummary(localEvents, this._selectedPeriod, this._selectedType);
            const initialArtifacts = this._spTelemetryService.calculateArtifactBreakdown(localEvents, this._selectedPeriod, this._selectedType);
            this.panel.webview.html = this.renderHtml('User', initialSummary, initialArtifacts);
        } catch (err) {
            console.warn('[UsageDashboard] Failed to render initial local telemetry:', err);
        }

        this.panel.onDidDispose(() => {
            UsageDashboardWebviewProvider.currentPanel = undefined;
            UsageDashboardWebviewProvider.currentInstance = undefined;
        });

        this.panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'changeFilter':
                    this._selectedPeriod = message.period || this._selectedPeriod;
                    this._selectedType = message.artifactType || this._selectedType;
                    await this.loadAndRender();
                    break;
                case 'refresh':
                    await this.loadAndRender();
                    if (this._onRefresh) {
                        try {
                            await this._onRefresh();
                        } catch {
                            // ignore
                        }
                    }
                    break;
                case 'viewArtifactDetails':
                    if (message.artifactId) {
                        vscode.commands.executeCommand('engineeringCommons.showArtifactDetails', { name: message.artifactId, type: message.artifactType || 'agent', version: message.version || '1.0.0' });
                    }
                    break;
                case 'viewUserUsage':
                    if (message.artifactId) {
                        await this.showUserUsageDialog(message.artifactId, message.artifactType);
                    }
                    break;
                case 'login':
                    await vscode.commands.executeCommand('engineeringCommons.login');
                    await this.loadAndRender();
                    break;
            }
        });

        this._authProvider.onDidChangeAuthentication(() => {
            this.loadAndRender();
        });
    }

    public async init() {
        const userEmail = (await this._authProvider.getEmail()) || 'User';
        const localEvents = this.loadLocalTelemetryEvents();
        const initialSummary = this._spTelemetryService.calculateSummary(localEvents, this._selectedPeriod, this._selectedType);
        const initialArtifacts = this._spTelemetryService.calculateArtifactBreakdown(localEvents, this._selectedPeriod, this._selectedType);
        if (this.panel) {
            this.panel.webview.html = this.renderHtml(userEmail, initialSummary, initialArtifacts);
        }
        this.loadAndRender().catch(() => {});
    }

    public async refresh() {
        await this.loadAndRender();
    }

    public setBackendUrl(url: string) {
        this._backendUrl = (url || 'https://ecommerce-app-chi-wine.vercel.app').replace(/\/+$/, '');
        this.loadAndRender().catch(() => {});
    }

    private loadLocalTelemetryEvents(): ArtifactUsageEvent[] {
        const events: ArtifactUsageEvent[] = [];
        try {
            // 1. Check workspace telemetry/usage-events.json
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders) {
                for (const folder of workspaceFolders) {
                    const wsFile = path.join(folder.uri.fsPath, 'telemetry', 'usage-events.json');
                    if (fs.existsSync(wsFile)) {
                        const content = fs.readFileSync(wsFile, 'utf8');
                        const parsed = JSON.parse(content);
                        if (Array.isArray(parsed)) {
                            events.push(...parsed);
                        }
                    }
                }
            }
            // 2. Check ~/.engineering-commons/ado_telemetry_queue.json
            const queueFile = path.join(os.homedir(), '.engineering-commons', 'ado_telemetry_queue.json');
            if (fs.existsSync(queueFile)) {
                const content = fs.readFileSync(queueFile, 'utf8');
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    events.push(...parsed);
                }
            }
        } catch {}
        return events;
    }

    private async showUserUsageDialog(artifactId: string, artifactType = 'agent') {
        const token = await this._authProvider.getToken();
        const allEvents: ArtifactUsageEvent[] = [];

        // 1. Central ADO Git Telemetry Repository
        try {
            const adoEvents = await this._adoTelemetryService.getTelemetryEventsAsync();
            if (adoEvents && adoEvents.length > 0) {
                allEvents.push(...adoEvents);
            }
        } catch {}

        // 2. Local Telemetry Log
        const localEvents = this.loadLocalTelemetryEvents();
        if (localEvents.length > 0) {
            allEvents.push(...localEvents);
        }

        // Deduplicate
        const eventMap = new Map<string, ArtifactUsageEvent>();
        for (const e of allEvents) {
            const key = `${e.timestamp}_${e.userEmail || e.userId}_${e.artifactId || e.artifactName}_${e.action || e.eventType}`;
            eventMap.set(key, e);
        }
        const merged = Array.from(eventMap.values());
        let users = this._spTelemetryService.calculateArtifactUsers(merged, artifactId);

        // Fallback to backend if users list still empty
        if (users.length === 0 && token) {
            try {
                const res = await this.makeRequest(`${this._backendUrl}/api/usage/artifacts/${encodeURIComponent(artifactId)}/users`, token);
                if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
                    users = res.data;
                }
            } catch {}
        }

        if (this.panel) {
            this.panel.webview.postMessage({
                command: 'showUserModal',
                artifactId: artifactId,
                artifactType: artifactType,
                users: users
            });
        }
    }

    private async loadAndRender() {
        if (this._isLoading) return;
        this._isLoading = true;
        try {
            const isAuth = await this._authProvider.isAuthenticated();
            if (!isAuth) {
                if (this.panel) {
                    this.panel.webview.html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:32px;text-align:center;color:var(--vscode-foreground);"><h3>Authentication Required</h3><p>Please sign in to Engineering Commons to access the usage dashboard.</p></body></html>`;
                }
                return;
            }

            const token = await this._authProvider.getToken();
            const userEmail = (await this._authProvider.getEmail()) || 'User';

            let summaryData: any = null;
            let artifactsData: any[] = [];
            const allEvents: ArtifactUsageEvent[] = [];

            // 1. Fetch Central Azure DevOps Git Telemetry with 3.5s timeout guarantee
            try {
                const adoEventsPromise = this._adoTelemetryService.getTelemetryEventsAsync();
                const timeoutPromise = new Promise<ArtifactUsageEvent[]>((resolve) => setTimeout(() => resolve([]), 3500));
                const adoEvents = await Promise.race([adoEventsPromise, timeoutPromise]);
                if (adoEvents && adoEvents.length > 0) {
                    allEvents.push(...adoEvents);
                }
            } catch (err) {
                console.warn('[UsageDashboard] ADO telemetry query failed:', err);
            }

            // 3. Direct SharePoint Telemetry Query (Bypassed: SharePoint requests disabled for now, ADO is single source of truth)

            // 4. Merge Local Workspace & User Telemetry Queue events
            const localEvents = this.loadLocalTelemetryEvents();
            if (localEvents.length > 0) {
                allEvents.push(...localEvents);
                // Trigger asynchronous background flush to ADO Git so teammates immediately receive new local activity
                this._adoTelemetryService.flushQueueAsync().catch(() => {});
            }

            // Deduplicate all events across datasets
            const eventMap = new Map<string, ArtifactUsageEvent>();
            for (const e of allEvents) {
                const rawId = (e.artifactId || e.artifactName || '').trim().toLowerCase();
                const rawName = (e.artifactName || e.artifactId || '').trim();
                if (!rawId || rawId === 'system' || rawId === 'unknown' || rawName === 'system' || rawName.toLowerCase() === 'unknown') {
                    continue;
                }
                const act = (e.action || e.eventType || '').toUpperCase();
                const usr = (e.userEmail || e.userId || '').toLowerCase();
                const ts = e.timestamp || '';
                const key = `${ts}_${usr}_${rawId}_${act}`;
                eventMap.set(key, { ...e, artifactId: rawId, artifactName: rawName, action: act, eventType: act });
            }

            const mergedEvents = Array.from(eventMap.values());
            summaryData = this._spTelemetryService.calculateSummary(mergedEvents, this._selectedPeriod, this._selectedType);
            artifactsData = this._spTelemetryService.calculateArtifactBreakdown(mergedEvents, this._selectedPeriod, this._selectedType);

            // 5. Backend API Fallback Check (if summary has zero counts)
            if (!summaryData || (summaryData.totalDownloads === 0 && summaryData.totalUses === 0)) {
                try {
                    const summaryRes = await this.makeRequest(
                        `${this._backendUrl}/api/usage/summary?period=${encodeURIComponent(this._selectedPeriod)}&artifactType=${encodeURIComponent(this._selectedType)}`,
                        token
                    );
                    if (summaryRes.status === 200 && summaryRes.data && (summaryRes.data.totalDownloads > 0 || summaryRes.data.totalUses > 0 || summaryRes.data.activeUsers > 0)) {
                        summaryData = summaryRes.data;
                    }

                    const artifactsRes = await this.makeRequest(
                        `${this._backendUrl}/api/usage/artifacts?period=${encodeURIComponent(this._selectedPeriod)}&artifactType=${encodeURIComponent(this._selectedType)}`,
                        token
                    );
                    if (artifactsRes.status === 200 && Array.isArray(artifactsRes.data) && artifactsRes.data.length > 0) {
                        artifactsData = artifactsRes.data;
                    }
                } catch {
                    // fallback
                }
            }

            artifactsData = (artifactsData || []).filter(a => a.downloads > 0);

            if (this.panel) {
                this.panel.webview.html = this.renderHtml(userEmail, summaryData, artifactsData);
            }
        } finally {
            this._isLoading = false;
        }
    }

    private renderHtml(userEmail: string, summary: any, artifacts: any[]): string {
        const periodLabels: Record<string, string> = {
            'all': 'All Time',
            '30d': 'Last 30 Days',
            '7d': 'Last 7 Days',
            'today': 'Today'
        };

        const periodButtons = ['all', '30d', '7d', 'today'].map(p => {
            const active = this._selectedPeriod === p ? 'active' : '';
            return `<button class="tab-btn ${active}" onclick="setPeriod('${p}')">${periodLabels[p]}</button>`;
        }).join('');

        const typeOptions = [
            { id: 'all', label: 'All Artifact Types' },
            { id: 'agent', label: 'Agents' },
            { id: 'skill', label: 'Skills' },
            { id: 'plugin', label: 'Plugins' },
            { id: 'mcpserver', label: 'MCP Servers' },
            { id: 'prompt', label: 'Prompts' },
            { id: 'command', label: 'Commands' },
            { id: 'package', label: 'CIP Packages' }
        ].map(t => {
            const sel = this._selectedType === t.id ? 'selected' : '';
            return `<option value="${t.id}" ${sel}>${t.label}</option>`;
        }).join('');

        const mostDownloadedRows = (summary && summary.mostDownloaded && summary.mostDownloaded.length > 0)
            ? summary.mostDownloaded.filter((item: any) => item.count > 0).map((item: any) => {
                const medal = item.rank === 1 ? '🥇' : (item.rank === 2 ? '🥈' : (item.rank === 3 ? '🥉' : `#${item.rank}`));
                return `
                <div class="leaderboard-item" onclick="openArtifact('${item.artifactId}', '${item.artifactType}')">
                    <span class="rank-medal">${medal}</span>
                    <span class="art-name">${item.artifactName} <span class="badge ${item.artifactType}">${item.artifactType}</span></span>
                    <span class="metric-count">${item.count} <small>downloads</small></span>
                </div>`;
            }).join('')
            : `<div class="empty-state">No download events recorded in this period.</div>`;

        const mostUsedRows = (summary && summary.mostUsed && summary.mostUsed.length > 0)
            ? summary.mostUsed.filter((item: any) => item.count > 0).map((item: any) => {
                const medal = item.rank === 1 ? '🥇' : (item.rank === 2 ? '🥈' : (item.rank === 3 ? '🥉' : `#${item.rank}`));
                return `
                <div class="leaderboard-item" onclick="openArtifact('${item.artifactId}', '${item.artifactType}')">
                    <span class="rank-medal">${medal}</span>
                    <span class="art-name">${item.artifactName} <span class="badge ${item.artifactType}">${item.artifactType}</span></span>
                    <span class="metric-count">${item.count} <small>uses</small></span>
                </div>`;
            }).join('')
            : `<div class="empty-state">No invocation events recorded in this period.</div>`;

        const activeArtifacts = (artifacts || []).filter(a => a.downloads > 0);
        const artifactTableRows = activeArtifacts.length > 0
            ? activeArtifacts.map(a => {
                const lastUsedStr = a.lastUsedAt ? new Date(a.lastUsedAt).toLocaleDateString() : 'Never';
                const breakdown = a.sourceBreakdown || {};
                const sourceTags = Object.keys(breakdown).length > 0
                    ? Object.entries(breakdown).map(([src, count]) => `<span class="source-tag">${src}: ${count}</span>`).join('')
                    : `<span class="source-tag">None</span>`;
                return `
                <tr>
                    <td>
                        <strong class="clickable-link" onclick="openArtifact('${a.artifactId}', '${a.artifactType}')">${a.artifactName}</strong>
                        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">v${a.currentVersion}</div>
                    </td>
                    <td><span class="badge ${a.artifactType}">${a.artifactType}</span></td>
                    <td class="num-cell"><strong>${a.downloads}</strong></td>
                    <td class="num-cell">${a.uniqueUsers}</td>
                    <td class="num-cell" style="color: var(--accent); font-weight: 700;">${a.usageCount}</td>
                    <td class="num-cell">${a.usageRate}</td>
                    <td>${lastUsedStr}</td>
                    <td>
                        <div class="source-breakdown-tags">
                            ${sourceTags}
                        </div>
                    </td>
                    <td>
                        <button class="btn-action-users" onclick="showUsers('${a.artifactId}', '${a.artifactType}')" title="View User Usage">👥 Users</button>
                    </td>
                </tr>`;
            }).join('')
            : `<tr><td colspan="9" class="empty-state">No real artifact telemetry recorded yet. Only artifacts with active installations or invocations are displayed.</td></tr>`;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CIP Usage & Analytics</title>
    <style>
        :root {
            --page-bg: #0f0f12;
            --panel-bg: #16161a;
            --header-bg: #16161a;
            --card-bg: #1c1c22;
            --card-border: #2a2a33;
            --card-hover-border: #444452;
            --border: #24242c;
            --border-strong: #33333e;
            --text-primary: #f4f4f6;
            --text-secondary: #9ea0aa;
            --text-muted: #6b6d77;
            --accent: #818cf8;
            --accent-bg: rgba(129, 140, 248, 0.12);
            --btn-bg: #22222a;
            --btn-border: #33333e;
            --btn-text: #f4f4f6;
            --btn-hover: #2c2c36;
            --tab-bg: #1b1b20;
            --tab-border: #292930;
            --tab-active-bg: #26262e;
            --tab-active-border: #52525e;
            --tab-active-text: #f4f4f6;
            --agent-bg: #2a2238;
            --agent-fg: #d8b4fe;
            --skill-bg: #142822;
            --skill-fg: #6ee7b7;
            --plugin-bg: #302816;
            --plugin-fg: #fde68a;
            --mcp-bg: #182632;
            --mcp-fg: #7dd3fc;
            --pkg-bg: #14281c;
            --pkg-fg: #86efac;
            --prompt-bg: #1c2826;
            --prompt-fg: #6ee7b7;
            --command-bg: #2b1f1d;
            --command-fg: #fdba74;
        }

        :root[data-theme="light"], .theme-light, body.vscode-light {
            --page-bg: #f4f6fb;
            --panel-bg: #ffffff;
            --header-bg: #ffffff;
            --card-bg: #ffffff;
            --card-border: #e2e8f0;
            --card-hover-border: #cbd5e1;
            --border: #e2e8f0;
            --border-strong: #cbd5e1;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --text-muted: #94a3b8;
            --accent: #6366f1;
            --accent-bg: rgba(99, 102, 241, 0.08);
            --btn-bg: #f8fafc;
            --btn-border: #cbd5e1;
            --btn-text: #1e293b;
            --btn-hover: #e2e8f0;
            --tab-bg: #f1f5f9;
            --tab-border: #e2e8f0;
            --tab-active-bg: #ffffff;
            --tab-active-border: #cbd5e1;
            --tab-active-text: #1e293b;
            --agent-bg: #f5f3ff;
            --agent-fg: #7c3aed;
            --skill-bg: #f0fdf4;
            --skill-fg: #15803d;
            --plugin-bg: #fefce8;
            --plugin-fg: #a16207;
            --mcp-bg: #f0f9ff;
            --mcp-fg: #0369a1;
            --pkg-bg: #f0fdf4;
            --pkg-fg: #166534;
            --prompt-bg: #f0fdf4;
            --prompt-fg: #15803d;
            --command-bg: #fff7ed;
            --command-fg: #c2410c;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            background-color: var(--page-bg);
            color: var(--text-primary);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 24px;
            line-height: 1.5;
        }

        .header-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--border);
        }

        .header-title {
            font-size: 1.35rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--text-primary);
            letter-spacing: -0.3px;
        }

        .controls-row {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        .tab-btn {
            background: var(--tab-bg);
            border: 1px solid var(--tab-border);
            color: var(--text-secondary);
            padding: 6px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 11.5px;
            font-weight: 600;
            transition: all 0.16s ease;
            letter-spacing: 0.1px;
        }

        .tab-btn:hover {
            color: var(--text-primary);
            border-color: var(--border-strong);
            background: var(--btn-hover);
        }

        .tab-btn.active {
            background: var(--tab-active-bg);
            color: var(--tab-active-text);
            border: 1.5px solid var(--tab-active-border);
            font-weight: 700;
        }

        select {
            background: var(--tab-bg);
            color: var(--text-primary);
            border: 1px solid var(--border-strong);
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 11.5px;
            font-weight: 600;
            cursor: pointer;
            outline: none;
            transition: border-color 0.15s ease;
        }

        select:focus {
            border-color: var(--accent);
        }

        .btn-refresh {
            background: var(--btn-bg);
            border: 1px solid var(--btn-border);
            color: var(--btn-text);
            padding: 6px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 11.5px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.16s ease;
        }

        .btn-refresh:hover {
            background: var(--btn-hover);
            border-color: var(--border-strong);
            color: var(--text-primary);
        }

        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .kpi-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 10px;
            padding: 18px 20px;
            position: relative;
            box-shadow: none;
            transition: border-color 0.15s ease;
        }

        .kpi-card:hover {
            border-color: var(--card-hover-border);
        }

        .kpi-label {
            font-size: 11px;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .kpi-value {
            font-size: 2rem;
            font-weight: 800;
            color: var(--text-primary);
            letter-spacing: -0.5px;
            line-height: 1.1;
        }

        .kpi-sub {
            font-size: 11px;
            color: var(--text-secondary);
            margin-top: 6px;
        }

        .rankings-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
        }

        @media (max-width: 800px) {
            .rankings-grid { grid-template-columns: 1fr; }
        }

        .panel-box {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 10px;
            padding: 18px 20px;
            box-shadow: none;
        }

        .panel-title {
            font-size: 13px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 10px;
            letter-spacing: -0.1px;
        }

        .leaderboard-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 10px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s ease;
            margin-bottom: 4px;
            background: transparent;
            border: 1px solid transparent;
        }

        .leaderboard-item:hover {
            background: var(--accent-bg);
            border-color: transparent;
        }

        .rank-medal {
            font-size: 13px;
            font-weight: 700;
            color: var(--text-muted);
            margin-right: 10px;
            min-width: 24px;
            text-align: center;
        }

        .art-name {
            font-weight: 600;
            font-size: 12.5px;
            flex: 1;
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-primary);
        }

        .metric-count {
            font-weight: 700;
            font-size: 12px;
            color: var(--text-secondary);
        }

        .badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            line-height: 1.3;
        }

        .badge.agent { background: var(--agent-bg); color: var(--agent-fg); border: 1px solid rgba(129, 140, 248, 0.25); }
        .badge.skill { background: var(--skill-bg); color: var(--skill-fg); border: 1px solid rgba(52, 211, 153, 0.25); }
        .badge.plugin { background: var(--plugin-bg); color: var(--plugin-fg); border: 1px solid rgba(251, 191, 36, 0.25); }
        .badge.mcpserver, .badge.mcp { background: var(--mcp-bg); color: var(--mcp-fg); border: 1px solid rgba(125, 211, 252, 0.25); }
        .badge.prompt { background: var(--prompt-bg); color: var(--prompt-fg); border: 1px solid rgba(52, 211, 153, 0.25); }
        .badge.command { background: var(--command-bg); color: var(--command-fg); border: 1px solid rgba(253, 186, 116, 0.25); }
        .badge.package, .badge.cippackage { background: var(--pkg-bg); color: var(--pkg-fg); border: 1px solid rgba(134, 239, 172, 0.25); }

        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 12.5px;
            min-width: 700px;
        }

        .table-responsive {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            border-radius: 6px;
        }

        th, td {
            text-align: left;
            padding: 10px 14px;
            border-bottom: 1px solid var(--border);
        }

        th {
            color: var(--text-muted);
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10.5px;
            letter-spacing: 0.5px;
            background: var(--header-bg);
            white-space: nowrap;
        }

        td {
            color: var(--text-primary);
            vertical-align: middle;
        }

        tbody tr {
            transition: background-color 0.15s ease;
        }

        tbody tr:hover {
            background-color: rgba(255, 255, 255, 0.02);
        }

        .num-cell {
            text-align: right;
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
        }

        .clickable-link {
            color: var(--text-primary);
            cursor: pointer;
            font-weight: 700;
            text-decoration: none;
            transition: color 0.15s ease;
        }

        .clickable-link:hover {
            color: var(--accent);
        }

        .source-breakdown-tags {
            display: flex;
            gap: 5px;
            flex-wrap: wrap;
            max-width: 260px;
        }

        .source-tag {
            font-size: 10.5px;
            font-weight: 500;
            background: var(--btn-bg);
            color: var(--text-secondary);
            padding: 2px 8px;
            border-radius: 12px;
            border: 1px solid var(--border-strong);
            white-space: nowrap;
        }

        .btn-action-users, .btn-sm {
            background: var(--btn-bg);
            border: 1px solid var(--btn-border);
            color: var(--btn-text);
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: all 0.15s ease;
            outline: none;
            white-space: nowrap;
        }

        .btn-action-users:hover, .btn-sm:hover {
            background: var(--btn-hover);
            border-color: var(--border-strong);
            color: var(--text-primary);
        }

        .empty-state {
            text-align: center;
            color: var(--text-muted);
            padding: 28px;
            font-style: italic;
            font-size: 12px;
        }

        .telemetry-notice {
            background: var(--panel-bg);
            border: 1px solid var(--border);
            border-left: 3px solid var(--accent);
            border-radius: 8px;
            padding: 14px 16px;
            font-size: 12px;
            margin-top: 20px;
            line-height: 1.5;
            color: var(--text-secondary);
            width: 100%;
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        .spinning .spin-icon {
            display: inline-block;
            animation: spin 0.8s linear infinite;
        }

        /* User Usage Breakdown In-Page Modal Dialog */
        .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(10, 10, 14, 0.75);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        .modal-backdrop.active {
            display: flex;
            opacity: 1;
        }

        .modal-dialog {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            width: 580px;
            max-width: 95vw;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            box-shadow: none;
            transform: translateY(12px) scale(0.98);
            transition: transform 0.2s ease;
            overflow: hidden;
        }

        .modal-backdrop.active .modal-dialog {
            transform: translateY(0) scale(1);
        }

        .modal-header {
            padding: 16px 20px;
            background: var(--header-bg);
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
        }

        .modal-title {
            font-size: 14px;
            font-weight: 700;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 8px;
            letter-spacing: -0.2px;
        }

        .modal-subtitle {
            font-size: 11.5px;
            color: var(--text-secondary);
            margin-top: 3px;
        }

        .modal-close-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 14px;
            transition: all 0.15s ease;
        }

        .modal-close-btn:hover {
            color: var(--text-primary);
            background: var(--btn-hover);
        }

        .modal-body {
            padding: 18px 20px;
            overflow-y: auto;
            flex: 1;
        }

        .modal-footer {
            padding: 12px 20px;
            background: var(--header-bg);
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: flex-end;
        }

        .user-card-item {
            background: var(--panel-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px 14px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            transition: all 0.15s ease;
        }

        .user-card-item:hover {
            border-color: var(--border-strong);
            background: var(--btn-hover);
        }

        .user-info-col {
            display: flex;
            flex-direction: column;
            gap: 3px;
            min-width: 0;
            flex: 1;
        }

        .user-email-text {
            font-size: 12.5px;
            font-weight: 600;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 6px;
            word-break: break-all;
        }

        .user-time-text {
            font-size: 11px;
            color: var(--text-muted);
        }

        .user-stats-col {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
            flex-wrap: wrap;
        }

        .stat-pill {
            font-size: 11px;
            font-weight: 600;
            padding: 3px 9px;
            border-radius: 12px;
            border: 1px solid var(--border-strong);
            background: var(--card-bg);
            color: var(--text-secondary);
            white-space: nowrap;
        }

        .stat-pill.uses-pill {
            color: var(--accent);
            border-color: rgba(129, 140, 248, 0.3);
            background: var(--accent-bg);
        }

        /* ── Responsive Breakpoints ─────────────── */
        @media (max-width: 768px) {
            body {
                padding: 14px 16px 40px;
            }
            .header-bar {
                flex-direction: column;
                align-items: stretch;
                gap: 12px;
            }
            .controls-row {
                width: 100%;
                justify-content: flex-start;
            }
            .kpi-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
            }
            .kpi-card {
                padding: 14px 16px;
            }
            .kpi-value {
                font-size: 1.6rem;
            }
            .rankings-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 480px) {
            body {
                padding: 10px 10px 30px;
            }
            .kpi-grid {
                grid-template-columns: 1fr;
            }
            .user-card-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
            .modal-header, .modal-body, .modal-footer {
                padding: 12px 14px;
            }
        }
    </style>
</head>
<body>
    <div class="header-bar">
        <div class="header-title">
            <span>📊</span> Engineering Commons Usage & Analytics
        </div>
        <div class="controls-row">
            ${periodButtons}
            <select onchange="setType(this.value)">
                ${typeOptions}
            </select>
            <button class="btn-refresh" id="btn-refresh-dash" onclick="refreshData()">
                <span class="spin-icon">🔄</span>
                <span id="btn-refresh-text">Refresh</span>
            </button>
        </div>
    </div>

    <!-- KPI Overview Cards -->
    <div class="kpi-grid">
        <div class="kpi-card">
            <div class="kpi-label">Total Downloads</div>
            <div class="kpi-value">${summary.totalDownloads}</div>
            <div class="kpi-sub">Total artifact package downloads</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Total Invocations</div>
            <div class="kpi-value">${summary.totalUses}</div>
            <div class="kpi-sub">Observed AI agent invocations</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Active Users</div>
            <div class="kpi-value">${summary.activeUsers}</div>
            <div class="kpi-sub">Unique developer accounts</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Artifacts Used</div>
            <div class="kpi-value">${summary.artifactsUsed}</div>
            <div class="kpi-sub">Distinct active AI artifacts</div>
        </div>
    </div>

    <!-- Agent Telemetry Status Notice -->
    <div class="telemetry-notice">
        <strong>⚡ Agent Telemetry & Usage Tracking</strong>:
        Observed agent and skill invocations are monitored via local VS Code and GitHub Copilot Agent Debug Logs.
        <em>Note: Agent usage tracking requires Agent Debug Log / telemetry support. If disabled, external Copilot executions will report as unavailable.</em>
    </div>

    <!-- Rankings Leaderboards -->
    <div class="rankings-grid" style="margin-top: 24px;">
        <div class="panel-box">
            <div class="panel-title">
                <span>📥</span> Most Downloaded
            </div>
            ${mostDownloadedRows}
        </div>
        <div class="panel-box">
            <div class="panel-title">
                <span>🚀</span> Most Used
            </div>
            ${mostUsedRows}
        </div>
    </div>

    <!-- Full Artifacts Table -->
    <div class="panel-box" style="margin-top: 24px;">
        <div class="panel-title">
            <span>📦</span> Artifact Usage Breakdown
        </div>
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Artifact</th>
                        <th>Type</th>
                        <th class="num-cell">Downloads</th>
                        <th class="num-cell">Unique Users</th>
                        <th class="num-cell">Invocations</th>
                        <th class="num-cell">Usage Rate</th>
                        <th>Last Used</th>
                        <th>Recorded Sources</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${artifactTableRows}
                </tbody>
            </table>
        </div>
    </div>

    <!-- Privacy & Telemetry Invariant Notice -->
    <div class="telemetry-notice">
        <strong>🔒 Telemetry Integrity & Privacy Policy:</strong>
        <ul style="margin: 6px 0 0 0; padding-left: 18px;">
            <li><strong>Downloads</strong> represent verified CIP package installations from VS Code & CLI.</li>
            <li><strong>Usage/Invocations</strong> represent explicit artifact executions tracked via VS Code and GitHub Copilot Agent Debug Logs (<code>OBSERVED</code>).</li>
            <li><strong>Unmonitored External AI Telemetry:</strong> Unmonitored third-party extensions or disabled debug logs are marked as <code>EXTERNAL_USAGE_UNAVAILABLE</code>. Zero fake data is fabricated.</li>
            <li><strong>Zero Sensitive Data:</strong> No prompt content, code snippets, or API secrets are stored.</li>
        </ul>
    </div>

    <!-- User Usage Breakdown In-Page Modal -->
    <div id="user-modal-backdrop" class="modal-backdrop" onclick="onBackdropClick(event)">
        <div class="modal-dialog" id="user-modal-dialog">
            <div class="modal-header">
                <div>
                    <div class="modal-title" id="modal-title-text">
                        <span>👥</span> User Usage Breakdown
                    </div>
                    <div class="modal-subtitle" id="modal-subtitle-text">
                        Artifact: <strong id="modal-art-name">...</strong>
                    </div>
                </div>
                <button class="modal-close-btn" onclick="closeUserModal()" title="Close">✕</button>
            </div>
            <div class="modal-body" id="modal-body-content">
                <!-- Injected dynamically -->
            </div>
            <div class="modal-footer">
                <button class="btn-action-users" style="padding: 6px 16px; font-weight: 600;" onclick="closeUserModal()">Close</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function setPeriod(period) {
            vscode.postMessage({ command: 'changeFilter', period: period });
        }

        function setType(type) {
            vscode.postMessage({ command: 'changeFilter', artifactType: type });
        }

        function refreshData() {
            const btn = document.getElementById('btn-refresh-dash');
            if (btn) {
                btn.classList.add('spinning');
                const text = document.getElementById('btn-refresh-text');
                if (text) text.innerText = 'Refreshing...';
            }
            vscode.postMessage({ command: 'refresh' });
        }

        function openArtifact(id, type) {
            vscode.postMessage({ command: 'viewArtifactDetails', artifactId: id, artifactType: type });
        }

        function showUsers(id, type) {
            vscode.postMessage({ command: 'viewUserUsage', artifactId: id, artifactType: type });
        }

        // Listen for messages from extension host
        window.addEventListener('message', event => {
            const msg = event.data;
            if (msg.command === 'showUserModal') {
                renderUsersInModal(msg.artifactId, msg.artifactType, msg.users);
            }
        });

        function renderUsersInModal(artifactId, artifactType, users) {
            const backdrop = document.getElementById('user-modal-backdrop');
            const artNameSpan = document.getElementById('modal-art-name');
            const bodyContent = document.getElementById('modal-body-content');

            if (artNameSpan) {
                artNameSpan.innerHTML = artifactId + ' <span class="badge ' + (artifactType || 'agent') + '">' + (artifactType || 'agent') + '</span>';
            }

            const activeUsers = (users || []).filter(u => ((u.totalDownloads || u.downloads || 0) > 0 || (u.totalUses || u.uses || 0) > 0));

            if (!activeUsers || activeUsers.length === 0) {
                bodyContent.innerHTML = '<div class="empty-state">No individual developer usage events recorded yet for <strong>' + artifactId + '</strong>.</div>';
            } else {
                const totalDownloads = activeUsers.reduce((s, u) => s + (u.totalDownloads || u.downloads || 0), 0);
                const totalUses = activeUsers.reduce((s, u) => s + (u.totalUses || u.uses || 0), 0);

                const summaryBar =
                    '<div style="display: flex; gap: 10px; margin-bottom: 14px;">' +
                        '<div style="flex: 1; background: var(--panel-bg); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; text-align: center;">' +
                            '<div style="font-size: 10.5px; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Developers</div>' +
                            '<div style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-top: 2px;">' + activeUsers.length + '</div>' +
                        '</div>' +
                        '<div style="flex: 1; background: var(--panel-bg); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; text-align: center;">' +
                            '<div style="font-size: 10.5px; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Invocations</div>' +
                            '<div style="font-size: 16px; font-weight: 700; color: var(--accent); margin-top: 2px;">' + totalUses + '</div>' +
                        '</div>' +
                        '<div style="flex: 1; background: var(--panel-bg); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; text-align: center;">' +
                            '<div style="font-size: 10.5px; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Downloads</div>' +
                            '<div style="font-size: 16px; font-weight: 700; color: var(--text-secondary); margin-top: 2px;">' + totalDownloads + '</div>' +
                        '</div>' +
                    '</div>';

                const rows = activeUsers.map(u => {
                    const time = u.lastActiveAt || u.lastUsedAt;
                    const timeStr = time ? new Date(time).toLocaleString() : 'N/A';
                    const dlCount = u.totalDownloads || u.downloads || 0;
                    const useCount = u.totalUses || u.uses || 0;
                    return (
                        '<div class="user-card-item">' +
                            '<div class="user-info-col">' +
                                '<span class="user-email-text">👤 ' + (u.userEmail || u.userId || 'User') + '</span>' +
                                '<span class="user-time-text">🕒 Last active: ' + timeStr + '</span>' +
                            '</div>' +
                            '<div class="user-stats-col">' +
                                '<span class="stat-pill">' + dlCount + ' downloads</span>' +
                                '<span class="stat-pill uses-pill">' + useCount + ' uses</span>' +
                            '</div>' +
                        '</div>'
                    );
                }).join('');

                bodyContent.innerHTML = summaryBar + rows;
            }

            backdrop.classList.add('active');
        }

        function closeUserModal() {
            const backdrop = document.getElementById('user-modal-backdrop');
            if (backdrop) {
                backdrop.classList.remove('active');
            }
        }

        function onBackdropClick(event) {
            if (event.target && event.target.id === 'user-modal-backdrop') {
                closeUserModal();
            }
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeUserModal();
            }
        });
    </script>
</body>
</html>`;
    }

    private makeRequest(urlString: string, token?: string): Promise<{ status: number; data: any }> {
        if (!token) {
            return Promise.resolve({ status: 401, data: null });
        }
        return new Promise((resolve) => {
            try {
                const url = new URL(urlString);
                const client = url.protocol === 'https:' ? https : http;
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const req = client.request(url, { method: 'GET', headers, timeout: 3500 }, (res) => {
                    let raw = '';
                    res.on('data', chunk => raw += chunk);
                    res.on('end', () => {
                        try {
                            const parsed = raw ? JSON.parse(raw) : null;
                            resolve({ status: res.statusCode || 500, data: parsed });
                        } catch {
                            resolve({ status: res.statusCode || 500, data: null });
                        }
                    });
                });

                req.on('error', () => resolve({ status: 500, data: null }));
                req.on('timeout', () => {
                    req.destroy();
                    resolve({ status: 408, data: null });
                });
                req.end();
            } catch {
                resolve({ status: 500, data: null });
            }
        });
    }
}
