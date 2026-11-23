import * as vscode from 'vscode';
import { IBackendUsageClient } from './backendUsageClient';
import { IAuthenticationStatusProvider } from './authenticationStatusProvider';
import { IArtifactUsageCollector, AgentDebugLogCollector, ReliabilityState } from './artifactUsageCollector';
import { IArtifactRegistry, ArtifactRegistry } from './artifactRegistry';

export type PlatformType = 'EngineeringCommons' | 'GitHubCopilot' | 'Claude' | 'Other';
export type UsageEventType = 'INSTALL' | 'UPDATE' | 'UNINSTALL' | 'USE' | 'INVOKE' | 'CONTRIBUTE' | 'SUBMIT' | 'REVIEW' | 'APPROVE';

export interface ArtifactUsageEvent {
    id?: string;
    userId?: string;
    userEmail?: string;
    artifactId: string;
    artifactName: string;
    artifactType?: string;
    artifactVersion?: string;
    eventType?: UsageEventType | string;
    action?: string; // legacy alias
    source?: string; // VS_CODE, CLI, GITHUB_COPILOT, CLAUDE, OTHER
    platform?: PlatformType;
    sessionId?: string;
    metadata?: string;
    workspace?: string;
    timestamp?: string;
}

/**
 * Pluggable provider for detecting and reporting artifact usage.
 */
export interface IArtifactUsageProvider {
    readonly source: string;
    readonly platformName: string;
    isAvailable(): boolean;
    getTelemetryStatus(): string;
    trackAsync(event: ArtifactUsageEvent): Promise<boolean>;
}

export class VsCodeUsageProvider implements IArtifactUsageProvider {
    public readonly source = 'VS_CODE';
    public readonly platformName = 'Engineering Commons (VS Code)';
    private backendClient: IBackendUsageClient;
    private authProvider: IAuthenticationStatusProvider;

    constructor(backendClient: IBackendUsageClient, authProvider: IAuthenticationStatusProvider) {
        this.backendClient = backendClient;
        this.authProvider = authProvider;
    }

    public isAvailable(): boolean {
        return true;
    }

    public getTelemetryStatus(): string {
        return 'Available';
    }

    public async trackAsync(event: ArtifactUsageEvent): Promise<boolean> {
        try {
            const token = await this.authProvider.getToken();
            if (!token) {
                return false;
            }

            let email: string | undefined;
            try {
                email = (await this.authProvider.getEmail()) || undefined;
            } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }

            // Zero prompt body, zero PATs, zero secret capture
            const payload = {
                userId: event.userId || event.userEmail || email,
                userEmail: event.userEmail || event.userId || email,
                artifactId: event.artifactId || event.artifactName,
                artifactName: event.artifactName || event.artifactId,
                artifactType: event.artifactType || 'agent',
                artifactVersion: event.artifactVersion || '1.0.0',
                eventType: event.eventType || 'USE',
                action: event.eventType || 'USE',
                source: (event.source || 'VS_CODE') as any,
                platform: (event.platform || 'EngineeringCommons') as any,
                sessionId: event.sessionId,
                metadata: event.metadata,
                workspace: event.workspace || (vscode.workspace.workspaceFolders?.[0]?.name ?? 'default'),
                timestamp: event.timestamp || new Date().toISOString()
            };

            await this.backendClient.sendUsageEventAsync(payload, token);
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * GitHub Copilot telemetry provider.
 * Strictly adheres to rule:
 * - Records GITHUB_COPILOT usage events when Agent Debug Log or OTel detects an invocation
 * - Returns EXTERNAL_USAGE_UNAVAILABLE when debug logging is inactive / not available
 * - Never fabricates fake events
 */
export class CopilotUsageProvider implements IArtifactUsageProvider {
    public readonly source = 'GITHUB_COPILOT';
    public readonly platformName = 'GitHub Copilot';

    private backendClient?: IBackendUsageClient;
    private authProvider?: IAuthenticationStatusProvider;
    private collector?: AgentDebugLogCollector;

    constructor(
        backendClient?: IBackendUsageClient,
        authProvider?: IAuthenticationStatusProvider,
        collector?: AgentDebugLogCollector
    ) {
        this.backendClient = backendClient;
        this.authProvider = authProvider;
        this.collector = collector;
    }

    public setCollector(collector: AgentDebugLogCollector): void {
        this.collector = collector;
    }

    public isAvailable(): boolean {
        if (this.collector) {
            return this.collector.isAvailable();
        }
        return false;
    }

    public getTelemetryStatus(): string {
        if (this.collector && this.collector.isAvailable()) {
            return 'OBSERVED';
        }
        return 'EXTERNAL_USAGE_UNAVAILABLE';
    }

    public async trackAsync(event: ArtifactUsageEvent): Promise<boolean> {
        if (!this.backendClient || !this.authProvider) {
            return false;
        }

        if (!this.isAvailable()) {
            return false;
        }

        try {
            const token = await this.authProvider.getToken();
            if (!token) return false;

            const payload = {
                artifactId: event.artifactId || event.artifactName,
                artifactName: event.artifactName || event.artifactId,
                artifactType: event.artifactType || 'agent',
                artifactVersion: event.artifactVersion || '1.0.0',
                eventType: event.eventType || 'INVOKE',
                action: event.eventType || 'INVOKE',
                source: (event.source || 'GITHUB_COPILOT') as any,
                platform: (event.platform || 'GitHubCopilot') as any,
                sessionId: event.sessionId,
                metadata: event.metadata,
                workspace: event.workspace || (vscode.workspace.workspaceFolders?.[0]?.name ?? 'default'),
                timestamp: event.timestamp || new Date().toISOString()
            };

            await this.backendClient.sendUsageEventAsync(payload, token);
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Claude/Anthropic telemetry provider.
 */
export class ClaudeUsageProvider implements IArtifactUsageProvider {
    public readonly source = 'CLAUDE';
    public readonly platformName = 'Claude';

    private backendClient?: IBackendUsageClient;
    private authProvider?: IAuthenticationStatusProvider;
    private collector?: AgentDebugLogCollector;

    constructor(
        backendClient?: IBackendUsageClient,
        authProvider?: IAuthenticationStatusProvider,
        collector?: AgentDebugLogCollector
    ) {
        this.backendClient = backendClient;
        this.authProvider = authProvider;
        this.collector = collector;
    }

    public setCollector(collector: AgentDebugLogCollector): void {
        this.collector = collector;
    }

    public isAvailable(): boolean {
        if (this.collector) {
            return this.collector.isAvailable();
        }
        return false;
    }

    public getTelemetryStatus(): string {
        if (this.collector && this.collector.isAvailable()) {
            return 'OBSERVED';
        }
        return 'EXTERNAL_USAGE_UNAVAILABLE';
    }

    public async trackAsync(event: ArtifactUsageEvent): Promise<boolean> {
        if (!this.backendClient || !this.authProvider || !this.isAvailable()) return false;
        try {
            const token = await this.authProvider.getToken();
            if (!token) return false;

            const payload = {
                artifactId: event.artifactId || event.artifactName,
                artifactName: event.artifactName || event.artifactId,
                artifactType: event.artifactType || 'agent',
                artifactVersion: event.artifactVersion || '1.0.0',
                eventType: event.eventType || 'INVOKE',
                action: event.eventType || 'INVOKE',
                source: (event.source || 'CLAUDE') as any,
                platform: (event.platform || 'Claude') as any,
                sessionId: event.sessionId,
                metadata: event.metadata,
                workspace: event.workspace || (vscode.workspace.workspaceFolders?.[0]?.name ?? 'default'),
                timestamp: event.timestamp || new Date().toISOString()
            };

            await this.backendClient.sendUsageEventAsync(payload, token);
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Antigravity / Gemini telemetry provider.
 */
export class AntigravityUsageProvider implements IArtifactUsageProvider {
    public readonly source = 'ANTIGRAVITY';
    public readonly platformName = 'Antigravity';

    private backendClient?: IBackendUsageClient;
    private authProvider?: IAuthenticationStatusProvider;
    private collector?: AgentDebugLogCollector;

    constructor(
        backendClient?: IBackendUsageClient,
        authProvider?: IAuthenticationStatusProvider,
        collector?: AgentDebugLogCollector
    ) {
        this.backendClient = backendClient;
        this.authProvider = authProvider;
        this.collector = collector;
    }

    public setCollector(collector: AgentDebugLogCollector): void {
        this.collector = collector;
    }

    public isAvailable(): boolean {
        if (this.collector) {
            return this.collector.isAvailable();
        }
        return false;
    }

    public getTelemetryStatus(): string {
        if (this.collector && this.collector.isAvailable()) {
            return 'OBSERVED';
        }
        return 'EXTERNAL_USAGE_UNAVAILABLE';
    }

    public async trackAsync(event: ArtifactUsageEvent): Promise<boolean> {
        if (!this.backendClient || !this.authProvider || !this.isAvailable()) return false;
        try {
            const token = await this.authProvider.getToken();
            if (!token) return false;

            const payload = {
                artifactId: event.artifactId || event.artifactName,
                artifactName: event.artifactName || event.artifactId,
                artifactType: event.artifactType || 'agent',
                artifactVersion: event.artifactVersion || '1.0.0',
                eventType: event.eventType || 'INVOKE',
                action: event.eventType || 'INVOKE',
                source: (event.source || 'ANTIGRAVITY') as any,
                platform: (event.platform || 'Antigravity') as any,
                sessionId: event.sessionId,
                metadata: event.metadata,
                workspace: event.workspace || (vscode.workspace.workspaceFolders?.[0]?.name ?? 'default'),
                timestamp: event.timestamp || new Date().toISOString()
            };

            await this.backendClient.sendUsageEventAsync(payload, token);
            return true;
        } catch {
            return false;
        }
    }
}

export class GenericUsageProvider implements IArtifactUsageProvider {
    public readonly source = 'OTHER';
    public readonly platformName = 'Generic AI';

    constructor(_backendClient?: IBackendUsageClient, _authProvider?: IAuthenticationStatusProvider) {}

    public isAvailable(): boolean {
        return false;
    }

    public getTelemetryStatus(): string {
        return 'EXTERNAL_USAGE_UNAVAILABLE';
    }

    public async trackAsync(_event: ArtifactUsageEvent): Promise<boolean> {
        return false;
    }
}

/**
 * Central usage tracking manager
 */
export class ArtifactUsageTracker {
    private providers: Map<string, IArtifactUsageProvider> = new Map();
    private defaultProvider: IArtifactUsageProvider;
    private copilotProvider: CopilotUsageProvider;
    private claudeProvider: ClaudeUsageProvider;
    private antigravityProvider: AntigravityUsageProvider;
    private collectors: IArtifactUsageCollector[] = [];
    private registry: IArtifactRegistry;

    constructor(
        backendClient: IBackendUsageClient,
        authProvider: IAuthenticationStatusProvider,
        registry?: IArtifactRegistry
    ) {
        this.registry = registry || new ArtifactRegistry();
        this.defaultProvider = new VsCodeUsageProvider(backendClient, authProvider);
        this.copilotProvider = new CopilotUsageProvider(backendClient, authProvider);
        this.claudeProvider = new ClaudeUsageProvider(backendClient, authProvider);
        this.antigravityProvider = new AntigravityUsageProvider(backendClient, authProvider);

        this.registerProvider(this.defaultProvider);
        this.registerProvider(this.copilotProvider);
        this.registerProvider(this.claudeProvider);
        this.registerProvider(this.antigravityProvider);
        this.registerProvider(new GenericUsageProvider());
    }

    public getRegistry(): IArtifactRegistry {
        return this.registry;
    }

    public registerCollector(collector: IArtifactUsageCollector): void {
        this.collectors.push(collector);

        if (collector instanceof AgentDebugLogCollector) {
            this.copilotProvider.setCollector(collector);
            this.claudeProvider.setCollector(collector);
            this.antigravityProvider.setCollector(collector);
        }

        collector.onDidDetectUsage(async (event) => {
            await this.trackAsync(event);
        });
    }

    public startCollectors(): void {
        for (const c of this.collectors) {
            c.start();
        }
    }

    public stopCollectors(): void {
        for (const c of this.collectors) {
            c.stop();
        }
    }

    public getCollectorStatus(): { name: string; source: string; status: ReliabilityState; available: boolean }[] {
        return this.collectors.map(c => ({
            name: c.name,
            source: c.source,
            status: c.getReliabilityState(),
            available: c.isAvailable()
        }));
    }

    public registerProvider(provider: IArtifactUsageProvider): void {
        this.providers.set(provider.source.toUpperCase(), provider);
    }

    public getProvider(source = 'VS_CODE'): IArtifactUsageProvider {
        return this.providers.get(source.toUpperCase()) || this.defaultProvider;
    }

    public getAllProviders(): IArtifactUsageProvider[] {
        return Array.from(this.providers.values());
    }

    public async trackAsync(event: ArtifactUsageEvent): Promise<boolean> {
        const source = event.source || 'VS_CODE';
        const provider = this.getProvider(source);
        if (provider && provider.isAvailable()) {
            return await provider.trackAsync(event);
        }
        return await this.defaultProvider.trackAsync(event);
    }

    public async trackInstallAsync(
        artifactName: string,
        artifactVersion = '1.0.0',
        artifactType = 'agent',
        sessionId?: string
    ): Promise<boolean> {
        return await this.trackAsync({
            artifactId: artifactName,
            artifactName,
            artifactType,
            artifactVersion,
            eventType: 'INSTALL',
            source: 'VS_CODE',
            sessionId
        });
    }

    public async trackUseAsync(
        artifactName: string,
        artifactVersion = '1.0.0',
        artifactType = 'agent',
        sessionId?: string,
        metadata?: string
    ): Promise<boolean> {
        return await this.trackAsync({
            artifactId: artifactName,
            artifactName,
            artifactType,
            artifactVersion,
            eventType: 'USE',
            source: 'VS_CODE',
            sessionId,
            metadata
        });
    }

    public async trackInvokeAsync(
        artifactName: string,
        artifactVersion = '1.0.0',
        artifactType = 'agent',
        sessionId?: string,
        source = 'GITHUB_COPILOT'
    ): Promise<boolean> {
        return await this.trackAsync({
            artifactId: artifactName,
            artifactName,
            artifactType,
            artifactVersion,
            eventType: 'INVOKE',
            source,
            sessionId
        });
    }

    public async logOperationAsync(
        action: UsageEventType | string,
        artifactName: string,
        artifactType = 'agent',
        artifactVersion = '1.0.0',
        _platformOverride?: PlatformType
    ): Promise<boolean> {
        return await this.trackAsync({
            artifactId: artifactName,
            artifactName,
            artifactType,
            artifactVersion,
            eventType: action as UsageEventType,
            source: 'VS_CODE'
        });
    }
}

// Backward-compatibility exports
export const CompositeArtifactUsageTracker = ArtifactUsageTracker;
export type CompositeArtifactUsageTracker = ArtifactUsageTracker;
export const EngineeringCommonsUsageTracker = VsCodeUsageProvider;
export type EngineeringCommonsUsageTracker = VsCodeUsageProvider;
export const GitHubCopilotUsageTracker = CopilotUsageProvider;
export type GitHubCopilotUsageTracker = CopilotUsageProvider;
export const ClaudeUsageTracker = ClaudeUsageProvider;
export type ClaudeUsageTracker = ClaudeUsageProvider;
export const OtherPlatformUsageTracker = GenericUsageProvider;
export type OtherPlatformUsageTracker = GenericUsageProvider;
export type UsageActionType = UsageEventType;
export type IArtifactUsageTracker = IArtifactUsageProvider;
