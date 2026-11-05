import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { ArtifactUsageEvent } from '../models/usageEvent';

export interface IBackendUsageClient {
    sendUsageEventAsync(event: ArtifactUsageEvent, token?: string): Promise<boolean>;
    setBackendUrl?(url: string): void;
    getBackendUrl?(): string;
}

export class HttpBackendUsageClient implements IBackendUsageClient {
    private baseUrl: string;
    private queue: Array<{ event: ArtifactUsageEvent; token?: string }> = [];
    private flushTimer?: NodeJS.Timeout;
    private isFlushing = false;
    private readonly batchThreshold = 25; // Efficient batching to minimize backend HTTP traffic
    private readonly flushIntervalMs = 60000; // 60-second telemetry aggregation window

    constructor(baseUrl = 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io') {
        this.baseUrl = (baseUrl || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/+$/, '');
    }

    public setBackendUrl(url: string): void {
        this.baseUrl = (url || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/+$/, '');
    }

    public getBackendUrl(): string {
        return this.baseUrl;
    }

    public async sendUsageEventAsync(event: ArtifactUsageEvent, token?: string): Promise<boolean> {
        if (!token) {
            return false;
        }

        this.queue.push({ event, token });

        if (this.queue.length >= this.batchThreshold) {
            this.flushQueueAsync().catch(() => {});
        } else if (!this.flushTimer) {
            this.flushTimer = setTimeout(() => {
                this.flushTimer = undefined;
                this.flushQueueAsync().catch(() => {});
            }, this.flushIntervalMs);
        }

        return true;
    }

    public async flushQueueAsync(): Promise<boolean> {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = undefined;
        }

        if (this.isFlushing || this.queue.length === 0) {
            return true;
        }

        this.isFlushing = true;
        const batch = this.queue.splice(0, this.queue.length);
        const token = batch[batch.length - 1]?.token;

        return new Promise<boolean>((resolve) => {
            try {
                const targetUrl = new URL('/api/usage/events', this.baseUrl);
                const isHttps = targetUrl.protocol === 'https:';
                const client = isHttps ? https : http;

                const eventsArray = batch.map(b => ({
                    artifactId: b.event.artifactId || b.event.artifactName,
                    artifactName: b.event.artifactName || b.event.artifactId,
                    artifactType: b.event.artifactType,
                    artifactVersion: b.event.artifactVersion || '1.0.0',
                    eventType: b.event.eventType || b.event.action || 'USE',
                    action: b.event.action || b.event.eventType || 'USE',
                    platform: b.event.platform || 'EngineeringCommons',
                    source: b.event.source || 'VS_CODE',
                    sessionId: b.event.sessionId,
                    metadata: b.event.metadata,
                    timestamp: b.event.timestamp || new Date().toISOString(),
                    workspace: b.event.workspace
                }));

                const payload = JSON.stringify(eventsArray.length === 1 ? eventsArray[0] : eventsArray);

                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload).toString(),
                    'User-Agent': 'engineering-commons-vscode'
                };

                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const req = client.request(
                    {
                        hostname: targetUrl.hostname,
                        port: targetUrl.port || (isHttps ? 443 : 80),
                        path: targetUrl.pathname,
                        method: 'POST',
                        headers,
                        timeout: 5000
                    },
                    (res) => {
                        const success = !!(res.statusCode && res.statusCode >= 200 && res.statusCode < 300);
                        res.resume(); // Drain stream
                        resolve(success);
                    }
                );

                req.on('error', () => {
                    resolve(false);
                });

                req.on('timeout', () => {
                    req.destroy();
                    resolve(false);
                });

                req.write(payload);
                req.end();
            } catch {
                resolve(false);
            } finally {
                this.isFlushing = false;
            }
        });
    }
}
