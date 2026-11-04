/**
 * Azure DevOps Telemetry Client for Engineering Commons.
 * Writes usage & telemetry logs into the Azure DevOps Git repository (/telemetry/usage-events.json)
 * for automated ingestion by Power Automate into SharePoint Online.
 */

import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { ArtifactUsageEvent } from '../models/usageEvent';
import { IBackendUsageClient } from './backendUsageClient';
import { IAuthenticationStatusProvider } from './authenticationStatusProvider';

export interface AdoConfig {
    organization: string;
    project: string;
    repository: string;
    branch: string;
    pat?: string;
}

export const DEFAULT_ADO_CONFIG: AdoConfig = {
    organization: process.env.AZURE_DEVOPS_ORG || 'MAQInternalCIP-Engineering-Commons',
    project: process.env.AZURE_DEVOPS_PROJECT || 'Engineering Commons',
    repository: process.env.AZURE_DEVOPS_REPO || 'Engineering Commons',
    branch: 'main',
    pat: process.env.AZURE_DEVOPS_PAT || 'A2RW5UcHDolfE7HztH9l9Ktj2kDF7Rzka3azqA39eTJR6EGFU9lbJQQJ99CJACAAAAAqDT5DAAASAZDO2Izl'
};

export class AdoTelemetryService implements IBackendUsageClient {
    private config: AdoConfig;
    private queuePath: string;
    private isFlushing = false;
    private flushTimer?: NodeJS.Timeout;
    private authProvider?: IAuthenticationStatusProvider;
    private cachedTelemetryEvents: ArtifactUsageEvent[] = [];
    private lastTelemetryFetchMs = 0;

    constructor(config?: Partial<AdoConfig>, authProvider?: IAuthenticationStatusProvider) {
        this.config = { ...DEFAULT_ADO_CONFIG, ...config };
        this.authProvider = authProvider;
        const homeDir = os.homedir();
        const cipDir = path.join(homeDir, '.engineering-commons');
        if (!fs.existsSync(cipDir)) {
            try { fs.mkdirSync(cipDir, { recursive: true }); } catch {}
        }
        this.queuePath = path.join(cipDir, 'ado_telemetry_queue.json');

        // Auto-flush every 60 seconds if authenticated and events exist
        this.flushTimer = setInterval(async () => {
            if (await this.isAuthenticated()) {
                this.flushQueueAsync().catch(() => {});
            }
        }, 60000);
        if (this.flushTimer && typeof (this.flushTimer as any).unref === 'function') {
            (this.flushTimer as any).unref();
        }
    }

    public setAuthProvider(authProvider: IAuthenticationStatusProvider): void {
        this.authProvider = authProvider;
    }

    public async isAuthenticated(): Promise<boolean> {
        if (this.authProvider) {
            return await this.authProvider.isAuthenticated();
        }
        try {
            const home = os.homedir();
            const engToken = path.join(home, '.engineering-commons', 'token.json');
            if (fs.existsSync(engToken)) {
                const data = JSON.parse(fs.readFileSync(engToken, 'utf-8'));
                if (data?.access_token) return true;
            }
            const sessFile = path.join(home, '.engineering-commons', 'session.json');
            if (fs.existsSync(sessFile)) {
                const data = JSON.parse(fs.readFileSync(sessFile, 'utf-8'));
                if (data?.token || data?.ssoToken) return true;
            }
        } catch {}
        return false;
    }

    public dispose(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
    }

    public async sendUsageEventAsync(event: ArtifactUsageEvent, token?: string): Promise<boolean> {
        try {
            this.enqueueEvent(event);
            // Trigger background flush without blocking UI
            setTimeout(() => {
                this.flushQueueAsync().catch(() => {});
            }, 1000);
            return true;
        } catch (err) {
            console.warn('[AdoTelemetryService] Error enqueuing event:', err);
            return false;
        }
    }

    private enqueueEvent(event: ArtifactUsageEvent): void {
        let queue: ArtifactUsageEvent[] = [];
        try {
            if (fs.existsSync(this.queuePath)) {
                const content = fs.readFileSync(this.queuePath, 'utf8');
                queue = JSON.parse(content);
            }
        } catch {}

        queue.push({
            ...event,
            timestamp: event.timestamp || new Date().toISOString()
        });

        try {
            fs.writeFileSync(this.queuePath, JSON.stringify(queue, null, 2), 'utf8');
        } catch {}
    }

    public async flushQueueAsync(): Promise<boolean> {
        if (!(await this.isAuthenticated())) return false;
        if (this.isFlushing) return false;
        if (!fs.existsSync(this.queuePath)) return true;

        let pendingEvents: ArtifactUsageEvent[] = [];
        try {
            const content = fs.readFileSync(this.queuePath, 'utf8');
            pendingEvents = JSON.parse(content);
        } catch {
            return false;
        }

        if (!Array.isArray(pendingEvents) || pendingEvents.length === 0) {
            return true;
        }

        this.isFlushing = true;
        try {
            const pat = this.getEffectivePat();
            if (!pat) {
                this.isFlushing = false;
                return false;
            }

            // 1. Fetch current telemetry file from ADO
            const existingEvents = await this.fetchAdoTelemetryEventsAsync(pat);
            
            // 2. Merge new events (avoid duplicates by id/timestamp+user+artifact)
            const eventMap = new Map<string, ArtifactUsageEvent>();
            existingEvents.forEach(e => {
                const key = `${e.timestamp}_${e.userEmail || e.userId}_${e.artifactId || e.artifactName}_${e.action || e.eventType}`;
                eventMap.set(key, e);
            });
            pendingEvents.forEach(e => {
                const key = `${e.timestamp}_${e.userEmail || e.userId}_${e.artifactId || e.artifactName}_${e.action || e.eventType}`;
                eventMap.set(key, e);
            });

            const merged = Array.from(eventMap.values());

            // 3. Push updated telemetry file to ADO
            const success = await this.pushToAdoAsync(merged, pat);
            if (success) {
                // Clear queue
                try { fs.unlinkSync(this.queuePath); } catch {}
            }
            this.isFlushing = false;
            return success;
        } catch (err) {
            console.warn('[AdoTelemetryService] Flush to ADO failed:', err);
            this.isFlushing = false;
            return false;
        }
    }

    public async getTelemetryEventsAsync(force = false): Promise<ArtifactUsageEvent[]> {
        if (!(await this.isAuthenticated())) {
            return [];
        }
        const now = Date.now();
        if (!force && this.cachedTelemetryEvents.length > 0 && (now - this.lastTelemetryFetchMs < 60000)) {
            return this.cachedTelemetryEvents;
        }
        const pat = this.getEffectivePat();
        if (!pat) {
            return [];
        }
        const events = await this.fetchAdoTelemetryEventsAsync(pat);
        if (events && events.length > 0) {
            this.cachedTelemetryEvents = events;
            this.lastTelemetryFetchMs = now;
        }
        return events;
    }

    private getEffectivePat(): string {
        if (this.config.pat && this.config.pat.length > 0) return this.config.pat;
        if (process.env.AZURE_DEVOPS_PAT) return process.env.AZURE_DEVOPS_PAT;

        // Check ~/.engineering-commons/session.json or .env
        const sessionFile = path.join(os.homedir(), '.engineering-commons', 'session.json');
        if (fs.existsSync(sessionFile)) {
            try {
                const sess = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
                if (sess.adoPat || sess.pat) return sess.adoPat || sess.pat;
            } catch {}
        }
        return 'A2RW5UcHDolfE7HztH9l9Ktj2kDF7Rzka3azqA39eTJR6EGFU9lbJQQJ99CJACAAAAAqDT5DAAASAZDO2Izl';
    }

    private async fetchAdoTelemetryEventsAsync(pat: string): Promise<ArtifactUsageEvent[]> {
        const org = this.config.organization;
        const project = encodeURIComponent(this.config.project);
        const repo = encodeURIComponent(this.config.repository);
        const branch = this.config.branch;

        const candidatePaths = ['/telemetry/usage-events.json', '/governance/usage-events.json'];
        for (const itemPath of candidatePaths) {
            const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/items?path=${encodeURIComponent(itemPath)}&versionDescriptor.version=${branch}&includeContent=true&api-version=7.0`;
            try {
                const res = await this.httpGetJsonAsync<any>(url, pat);
                if (res) {
                    let parsed = res;
                    if (typeof res === 'string') {
                        try { parsed = JSON.parse(res); } catch {}
                    } else if (res && typeof res.content === 'string') {
                        try { parsed = JSON.parse(res.content); } catch {}
                    }
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed;
                    }
                }
            } catch (err) {
                console.warn(`[AdoTelemetryService] Error reading ${itemPath}:`, err);
            }
        }
        return [];
    }

    private async pushToAdoAsync(events: ArtifactUsageEvent[], pat: string): Promise<boolean> {
        const org = this.config.organization;
        const project = encodeURIComponent(this.config.project);
        const repo = encodeURIComponent(this.config.repository);
        const branch = this.config.branch;

        // 1. Get latest commit on branch
        const refsUrl = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/refs?filter=heads/${branch}&api-version=7.0`;
        const refsRes = await this.httpGetJsonAsync<any>(refsUrl, pat);
        if (!refsRes || !refsRes.value || refsRes.value.length === 0) {
            return false;
        }
        const oldObjectId = refsRes.value[0].objectId;

        // 2. Check if file exists to determine changeType
        let changeType = 'add';
        try {
            const checkUrl = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/items?path=/telemetry/usage-events.json&versionDescriptor.version=${branch}&api-version=7.0`;
            const checkRes = await this.httpGetJsonAsync<any>(checkUrl, pat);
            if (checkRes) changeType = 'edit';
        } catch {}

        // 3. Create Git push commit
        const jsonContent = JSON.stringify(events, null, 2);
        const pushPayload = {
            refUpdates: [
                {
                    name: `refs/heads/${branch}`,
                    oldObjectId: oldObjectId
                }
            ],
            commits: [
                {
                    comment: `Telemetry: sync usage events [${events.length} records]`,
                    changes: [
                        {
                            changeType: changeType,
                            item: {
                                path: '/telemetry/usage-events.json'
                            },
                            newContent: {
                                content: jsonContent,
                                contentType: 'rawtext'
                            }
                        },
                        {
                            changeType: changeType,
                            item: {
                                path: '/governance/usage-events.json'
                            },
                            newContent: {
                                content: jsonContent,
                                contentType: 'rawtext'
                            }
                        }
                    ]
                }
            ]
        };

        const pushesUrl = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/pushes?api-version=7.0`;
        const pushRes = await this.httpPostJsonAsync<any>(pushesUrl, pushPayload, pat);
        return Boolean(pushRes && pushRes.pushId);
    }

    private async httpGetJsonAsync<T>(urlStr: string, pat: string): Promise<T | null> {
        if (!(await this.isAuthenticated())) return null;
        return new Promise((resolve) => {
            try {
                const url = new URL(urlStr);
                const auth = Buffer.from(':' + pat).toString('base64');
                const req = https.request(
                    url,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Basic ${auth}`,
                            'Accept': 'application/json',
                            'User-Agent': 'EngineeringCommons-VSCode-AdoTelemetry/1.2.0'
                        },
                        timeout: 3500
                    },
                    (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            try {
                                resolve(data ? JSON.parse(data) : null);
                            } catch {
                                resolve(null);
                            }
                        });
                    }
                );
                req.on('error', () => resolve(null));
                req.on('timeout', () => { req.destroy(); resolve(null); });
                req.end();
            } catch {
                resolve(null);
            }
        });
    }

    private async httpPostJsonAsync<T>(urlStr: string, body: any, pat: string): Promise<T | null> {
        if (!(await this.isAuthenticated())) return null;
        return new Promise((resolve) => {
            try {
                const url = new URL(urlStr);
                const auth = Buffer.from(':' + pat).toString('base64');
                const payload = JSON.stringify(body);
                const req = https.request(
                    url,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Basic ${auth}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Content-Length': Buffer.byteLength(payload).toString(),
                            'User-Agent': 'EngineeringCommons-VSCode-AdoTelemetry/1.2.0'
                        },
                        timeout: 10000
                    },
                    (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            try {
                                resolve(data ? JSON.parse(data) : null);
                            } catch {
                                resolve(null);
                            }
                        });
                    }
                );
                req.on('error', () => resolve(null));
                req.on('timeout', () => { req.destroy(); resolve(null); });
                req.write(payload);
                req.end();
            } catch {
                resolve(null);
            }
        });
    }
}
