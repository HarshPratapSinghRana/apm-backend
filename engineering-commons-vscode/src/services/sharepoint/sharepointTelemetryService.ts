/**
 * SharePoint Telemetry & Usage Logging Service.
 * Writes install, invocation, and audit usage events directly to the SharePoint List
 * (Engineering-Commons-Telemetry) in real-time and queries usage metrics for the CIP Dashboard.
 */

import { ArtifactUsageEvent } from '../../models/usageEvent';
import { IBackendUsageClient, HttpBackendUsageClient } from '../backendUsageClient';
import { SharePointClient } from './sharepointClient';
import { IAuthenticationStatusProvider } from '../authenticationStatusProvider';
import { AdoTelemetryService } from '../adoTelemetryService';

export interface UsageSummaryDto {
    totalDownloads: number;
    totalUses: number;
    activeUsers: number;
    artifactsUsed: number;
    mostDownloaded: Array<{ rank: number; artifactId: string; artifactName: string; artifactType: string; count: number }>;
    mostUsed: Array<{ rank: number; artifactId: string; artifactName: string; artifactType: string; count: number }>;
}

export interface ArtifactUsageRowDto {
    artifactId: string;
    artifactName: string;
    artifactType: string;
    currentVersion: string;
    downloads: number;
    uniqueUsers: number;
    usageCount: number;
    usageRate: string;
    lastUsedAt?: string;
    sourceBreakdown: Record<string, number>;
}

export class SharePointTelemetryService implements IBackendUsageClient {
    private client: SharePointClient;
    private authProvider?: IAuthenticationStatusProvider;

    constructor(client?: SharePointClient, authProvider?: IAuthenticationStatusProvider) {
        this.client = client || new SharePointClient();
        this.authProvider = authProvider;
    }

    public async sendUsageEventAsync(event: ArtifactUsageEvent, token?: string): Promise<boolean> {
        // SharePoint requests disabled for now; ADO Git repository is the active destination
        if (!SharePointClient.ENABLE_SHAREPOINT_REQUESTS) {
            return false;
        }
        try {
            const authToken = token || (this.authProvider ? await this.authProvider.getToken() : null);
            if (!authToken) {
                return false;
            }

            const config = this.client.getConfig();
            const userEmail = event.userEmail || (this.authProvider ? await this.authProvider.getEmail() : '') || 'anonymous';

            const displayFields: Record<string, any> = {
                'Title': event.eventType || event.action || 'USE',
                'UserId': event.userId || userEmail,
                'UserEmail': userEmail,
                'ArtifactId': event.artifactId || event.artifactName || 'general',
                'ArtifactName': event.artifactName || event.artifactId || 'general',
                'ArtifactType': event.artifactType || 'skill',
                'ArtifactVersion': event.artifactVersion || '1.0.0',
                'Source': event.source || 'VS_CODE',
                'Platform': event.platform || 'EngineeringCommons',
                'SessionId': event.sessionId || '',
                'Workspace': event.workspace || 'default',
                'Timestamp': event.timestamp || new Date().toISOString(),
                'Metadata': event.metadata || ''
            };

            await this.client.createListItemAsync(authToken, config.telemetryList, displayFields);
            return true;
        } catch (err) {
            console.warn('[SharePointTelemetryService] Failed to log telemetry to SharePoint:', err);
            return false;
        }
    }

    public async getTelemetryEventsAsync(graphToken: string): Promise<ArtifactUsageEvent[]> {
        // SharePoint requests disabled for now; ADO Git repository is the active source
        if (!SharePointClient.ENABLE_SHAREPOINT_REQUESTS) {
            return [];
        }
        const config = this.client.getConfig();
        try {
            const rawItems = await this.client.getAllListItemsMappedAsync(graphToken, config.telemetryList, 1000);
            if (!Array.isArray(rawItems) || rawItems.length === 0) {
                return [];
            }
            return rawItems.map(item => ({
                action: String(item.Title || item.Action || item.action || 'USE'),
                eventType: String(item.Title || item.Action || item.action || 'USE'),
                userEmail: String(item.UserEmail || item.UserId || item.userEmail || item.userId || 'user@maqsoftware.com'),
                userId: String(item.UserId || item.UserEmail || item.userId || item.userEmail || 'user@maqsoftware.com'),
                artifactId: String(item.ArtifactId || item.ArtifactName || item.artifactId || item.artifactName || ''),
                artifactName: String(item.ArtifactName || item.ArtifactId || item.artifactName || item.artifactId || ''),
                artifactType: String(item.ArtifactType || item.artifactType || 'skill'),
                artifactVersion: String(item.ArtifactVersion || item.artifactVersion || '1.0.0'),
                source: String(item.Source || item.source || 'VS_CODE'),
                platform: String(item.Platform || item.platform || 'EngineeringCommons'),
                workspace: String(item.Workspace || item.workspace || 'default'),
                timestamp: String(item.Timestamp || item.Created || item.timestamp || new Date().toISOString()),
                metadata: String(item.Metadata || item.metadata || '')
            }));
        } catch (err) {
            console.warn('[SharePointTelemetryService] Failed to query SharePoint telemetry:', err);
            return [];
        }
    }

    public filterEvents(events: ArtifactUsageEvent[], period = 'all', artifactType = 'all'): ArtifactUsageEvent[] {
        const now = Date.now();
        let minTime = 0;
        if (period === 'today') {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            minTime = d.getTime();
        } else if (period === '7d') {
            minTime = now - 7 * 86400000;
        } else if (period === '30d') {
            minTime = now - 30 * 86400000;
        }

        return events.filter(e => {
            const t = e.timestamp ? new Date(e.timestamp).getTime() : now;
            if (minTime > 0 && t < minTime) {
                return false;
            }
            if (artifactType && artifactType !== 'all') {
                const normType = (e.artifactType || '').toLowerCase();
                const normFilter = artifactType.toLowerCase();
                if (normFilter === 'mcpserver' || normFilter === 'mcp') {
                    if (!normType.includes('mcp') && !normType.includes('server')) return false;
                } else if (!normType.includes(normFilter)) {
                    return false;
                }
            }
            return true;
        });
    }

    public calculateSummary(events: ArtifactUsageEvent[], period = 'all', artifactType = 'all'): UsageSummaryDto {
        const filtered = this.filterEvents(events, period, artifactType);

        // 1. Identify all artifacts that were explicitly downloaded from the marketplace
        const downloadedSet = new Set<string>();
        for (const e of filtered) {
            const rawId = (e.artifactId || e.artifactName || '').trim().toLowerCase();
            if (!rawId || rawId === 'system' || rawId === 'unknown' || rawId === 'engineering-commons') continue;
            const action = (e.action || e.eventType || '').toUpperCase();
            if (action === 'INSTALL' || action === 'DOWNLOAD' || action === 'CLONE') {
                downloadedSet.add(e.artifactId || e.artifactName || rawId);
                downloadedSet.add(rawId);
            }
        }

        let totalDownloads = 0;
        let totalUses = 0;
        const activeUsersSet = new Set<string>();
        const artifactsUsedSet = new Set<string>();

        const downloadsByArtifact: Record<string, { count: number; name: string; type: string }> = {};
        const usesByArtifact: Record<string, { count: number; name: string; type: string }> = {};

        for (const e of filtered) {
            const rawId = (e.artifactId || e.artifactName || '').trim().toLowerCase();
            const rawName = (e.artifactName || e.artifactId || '').trim();
            if (!rawId || rawId === 'system' || rawId === 'unknown' || rawName === 'system' || rawName.toLowerCase() === 'unknown' || rawId === 'engineering-commons') {
                continue;
            }
            const artName = rawName;
            const artId = e.artifactId || artName;

            // ONLY include artifacts that were explicitly downloaded from the marketplace
            if (!downloadedSet.has(artId) && !downloadedSet.has(rawId)) {
                continue;
            }

            const action = (e.action || e.eventType || '').toUpperCase();
            const artType = (e.artifactType || 'skill').toLowerCase();
            const user = (e.userEmail || e.userId || '').toLowerCase();

            if (user) activeUsersSet.add(user);

            if (action === 'INSTALL' || action === 'DOWNLOAD' || action === 'CLONE') {
                totalDownloads++;
                if (!downloadsByArtifact[artId]) {
                    downloadsByArtifact[artId] = { count: 0, name: artName, type: artType };
                }
                downloadsByArtifact[artId].count++;
            } else {
                totalUses++;
                artifactsUsedSet.add(artName);
                if (!usesByArtifact[artId]) {
                    usesByArtifact[artId] = { count: 0, name: artName, type: artType };
                }
                usesByArtifact[artId].count++;
            }
        }

        const mostDownloaded = Object.entries(downloadsByArtifact)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([id, info], idx) => ({
                rank: idx + 1,
                artifactId: id,
                artifactName: info.name,
                artifactType: info.type,
                count: info.count
            }));

        const mostUsed = Object.entries(usesByArtifact)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([id, info], idx) => ({
                rank: idx + 1,
                artifactId: id,
                artifactName: info.name,
                artifactType: info.type,
                count: info.count
            }));

        return {
            totalDownloads,
            totalUses,
            activeUsers: activeUsersSet.size,
            artifactsUsed: artifactsUsedSet.size,
            mostDownloaded,
            mostUsed
        };
    }

    public calculateArtifactBreakdown(events: ArtifactUsageEvent[], period = 'all', artifactType = 'all'): ArtifactUsageRowDto[] {
        const filtered = this.filterEvents(events, period, artifactType);
        const map: Record<string, {
            artifactId: string;
            artifactName: string;
            artifactType: string;
            currentVersion: string;
            downloads: number;
            uniqueUsers: Set<string>;
            usageCount: number;
            lastUsedMs: number;
            sourceBreakdown: Record<string, number>;
        }> = {};

        for (const e of filtered) {
            const rawId = (e.artifactId || e.artifactName || '').trim().toLowerCase();
            const rawName = (e.artifactName || e.artifactId || '').trim();
            if (!rawId || rawId === 'system' || rawId === 'unknown' || rawName === 'system' || rawName.toLowerCase() === 'unknown' || rawId === 'engineering-commons') {
                continue;
            }
            const artId = e.artifactId || e.artifactName || rawName;
            const artName = rawName;
            const artType = (e.artifactType || 'skill').toLowerCase();
            const version = e.artifactVersion || '1.0.0';
            const action = (e.action || e.eventType || '').toUpperCase();
            const user = (e.userEmail || e.userId || '').toLowerCase();
            const source = e.source || 'VS_CODE';
            const tMs = e.timestamp ? new Date(e.timestamp).getTime() : Date.now();

            if (!map[artId]) {
                map[artId] = {
                    artifactId: artId,
                    artifactName: artName,
                    artifactType: artType,
                    currentVersion: version,
                    downloads: 0,
                    uniqueUsers: new Set<string>(),
                    usageCount: 0,
                    lastUsedMs: 0,
                    sourceBreakdown: {}
                };
            }

            if (user) map[artId].uniqueUsers.add(user);
            if (tMs > map[artId].lastUsedMs) map[artId].lastUsedMs = tMs;

            map[artId].sourceBreakdown[source] = (map[artId].sourceBreakdown[source] || 0) + 1;

            if (action === 'INSTALL' || action === 'DOWNLOAD' || action === 'CLONE') {
                map[artId].downloads++;
            } else {
                map[artId].usageCount++;
            }
        }

        return Object.values(map)
            .filter(item => item.downloads > 0)
            .sort((a, b) => (b.usageCount + b.downloads) - (a.usageCount + a.downloads))
            .map(item => {
                const uCount = item.uniqueUsers.size;
                const rate = uCount > 0 ? (item.usageCount / uCount).toFixed(1) + '/user' : '0/user';
                return {
                    artifactId: item.artifactId,
                    artifactName: item.artifactName,
                    artifactType: item.artifactType,
                    currentVersion: item.currentVersion,
                    downloads: item.downloads,
                    uniqueUsers: uCount,
                    usageCount: item.usageCount,
                    usageRate: rate,
                    lastUsedAt: item.lastUsedMs > 0 ? new Date(item.lastUsedMs).toISOString() : undefined,
                    sourceBreakdown: item.sourceBreakdown
                };
            });
    }

    public calculateArtifactUsers(events: ArtifactUsageEvent[], artifactId: string): any[] {
        const matched = events.filter(e => (e.artifactId || e.artifactName || '').toLowerCase() === artifactId.toLowerCase());
        const userMap: Record<string, {
            userId: string;
            userEmail: string;
            userName?: string;
            totalUses: number;
            totalDownloads: number;
            lastUsedMs: number;
            sources: Set<string>;
        }> = {};

        for (const e of matched) {
            const user = e.userEmail || e.userId || 'anonymous';
            const action = (e.action || e.eventType || '').toUpperCase();
            const source = e.source || 'VS_CODE';
            const tMs = e.timestamp ? new Date(e.timestamp).getTime() : Date.now();

            if (!userMap[user]) {
                userMap[user] = {
                    userId: user,
                    userEmail: user,
                    userName: user.split('@')[0],
                    totalUses: 0,
                    totalDownloads: 0,
                    lastUsedMs: 0,
                    sources: new Set<string>()
                };
            }

            userMap[user].sources.add(source);
            if (tMs > userMap[user].lastUsedMs) userMap[user].lastUsedMs = tMs;

            if (action === 'INSTALL' || action === 'DOWNLOAD') {
                userMap[user].totalDownloads++;
            } else {
                userMap[user].totalUses++;
            }
        }

        return Object.values(userMap)
            .filter(u => (u.totalDownloads > 0 || u.totalUses > 0))
            .sort((a, b) => b.totalUses - a.totalUses)
            .map(u => ({
                userId: u.userId,
                userEmail: u.userEmail,
                userName: u.userName,
                totalUses: u.totalUses,
                totalDownloads: u.totalDownloads,
                downloads: u.totalDownloads,
                uses: u.totalUses,
                lastUsedAt: u.lastUsedMs > 0 ? new Date(u.lastUsedMs).toISOString() : new Date().toISOString(),
                lastActiveAt: u.lastUsedMs > 0 ? new Date(u.lastUsedMs).toISOString() : new Date().toISOString(),
                sources: Array.from(u.sources)
            }));
    }

    public getDefaultTelemetryEvents(): ArtifactUsageEvent[] {
        // Strictly return empty list: no fake mock data is ever injected
        return [];
    }
}

export class CompositeUsageClient implements IBackendUsageClient {
    private spTelemetry: SharePointTelemetryService;
    private httpBackend: HttpBackendUsageClient;
    private adoTelemetry: AdoTelemetryService;

    constructor(
        spTelemetry: SharePointTelemetryService,
        httpBackend: HttpBackendUsageClient,
        adoTelemetry?: AdoTelemetryService,
        authProvider?: IAuthenticationStatusProvider
    ) {
        this.spTelemetry = spTelemetry;
        this.httpBackend = httpBackend;
        this.adoTelemetry = adoTelemetry || new AdoTelemetryService(undefined, authProvider);
    }

    public async sendUsageEventAsync(event: ArtifactUsageEvent, token?: string): Promise<boolean> {
        // 1. Save to ADO telemetry queue (flushes to Git repo /telemetry/usage-events.json)
        const adoResult = await this.adoTelemetry.sendUsageEventAsync(event, token).catch(() => false);
        // 2. Also send to HTTP backend if running (which also syncs with ADO)
        const httpResult = await this.httpBackend.sendUsageEventAsync(event, token).catch(() => false);
        return adoResult || httpResult;
    }

    public getAdoTelemetryService(): AdoTelemetryService {
        return this.adoTelemetry;
    }

    public setBackendUrl(url: string): void {
        this.httpBackend.setBackendUrl(url);
    }

    public getBackendUrl(): string {
        return this.httpBackend.getBackendUrl();
    }
}
