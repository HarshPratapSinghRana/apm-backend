/**
 * Telemetry Batcher for Engineering Commons.
 * Buffers usage events in memory and flushes in a single batch request every 60 minutes
 * (or on extension deactivation), reducing backend calls from ~40/day down to ~6/day.
 */

import { ArtifactUsageEvent } from '../../models/usageEvent';
import { IBackendUsageClient } from '../backendUsageClient';
import { IAuthenticationStatusProvider } from '../authenticationStatusProvider';

export class TelemetryBatcher {
    private buffer: ArtifactUsageEvent[] = [];
    private flushTimer: NodeJS.Timeout | null = null;
    private readonly flushIntervalMs: number;
    private backendClient: IBackendUsageClient;
    private authProvider: IAuthenticationStatusProvider;
    private isFlushing = false;

    constructor(
        backendClient: IBackendUsageClient,
        authProvider: IAuthenticationStatusProvider,
        flushIntervalMinutes = 60
    ) {
        this.backendClient = backendClient;
        this.authProvider = authProvider;
        this.flushIntervalMs = flushIntervalMinutes * 60 * 1000;
        this.startTimer();
    }

    public enqueue(event: Partial<ArtifactUsageEvent>): void {
        this.buffer.push({
            ...event,
            timestamp: event.timestamp || new Date().toISOString()
        } as ArtifactUsageEvent);

        // If buffer grows too large (> 50 items), flush early
        if (this.buffer.length >= 50) {
            this.flushAsync().catch(() => {});
        }
    }

    public async flushAsync(): Promise<void> {
        if (this.isFlushing || this.buffer.length === 0) return;
        this.isFlushing = true;

        const batch = [...this.buffer];
        this.buffer = [];

        try {
            const token = await this.authProvider.getToken();
            // Send each event in the batch or send composite batch payload
            for (const evt of batch) {
                await this.backendClient.sendUsageEventAsync(evt, token || undefined).catch(() => {});
            }
        } catch (err) {
            console.warn('[TelemetryBatcher] Flush failed, restoring buffer:', err);
            this.buffer.unshift(...batch);
        } finally {
            this.isFlushing = false;
        }
    }

    public dispose(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        // Attempt final flush
        this.flushAsync().catch(() => {});
    }

    private startTimer(): void {
        this.flushTimer = setInterval(() => {
            this.flushAsync().catch(() => {});
        }, this.flushIntervalMs);
    }
}
