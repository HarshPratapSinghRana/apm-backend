import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { IArtifactRegistry, RegisteredArtifact } from './artifactRegistry';
import { ArtifactUsageEvent } from './usageTracker';

export type ReliabilityState = 'OBSERVED' | 'INFERRED' | 'UNAVAILABLE';

export interface IArtifactUsageCollector {
    readonly name: string;
    readonly source: string;
    isAvailable(): boolean;
    getReliabilityState(): ReliabilityState;
    start(): void;
    stop(): void;
    onDidDetectUsage: vscode.Event<ArtifactUsageEvent>;
}

/**
 * Monitors local VS Code and GitHub Copilot Agent Debug Logs.
 * Strictly adheres to:
 * - Presence != Usage
 * - Discovery scanning != Invocation
 * - Deduplication of multi-line logs
 * - Resolves multi-file sub-paths to logical Engineering Commons artifact
 */
export class AgentDebugLogCollector implements IArtifactUsageCollector {
    public readonly name = 'Agent Debug Log Collector';
    public readonly source = 'GITHUB_COPILOT';

    private _onDidDetectUsage = new vscode.EventEmitter<ArtifactUsageEvent>();
    public readonly onDidDetectUsage: vscode.Event<ArtifactUsageEvent> = this._onDidDetectUsage.event;

    private registry: IArtifactRegistry;
    private logUri?: vscode.Uri;
    private isRunning = false;
    private watchedFiles: Map<string, number> = new Map(); // path -> lastReadByteOffset
    private pollInterval?: NodeJS.Timeout;
    private recentEvents: Set<string> = new Set(); // deduplication cache
    private sessionModes: Map<string, RegisteredArtifact> = new Map(); // session/file -> active artifact
    private reliabilityState: ReliabilityState = 'UNAVAILABLE';

    constructor(registry: IArtifactRegistry, logUri?: vscode.Uri) {
        this.registry = registry;
        this.logUri = logUri;
    }

    public isAvailable(): boolean {
        return this.reliabilityState === 'OBSERVED';
    }

    public getReliabilityState(): ReliabilityState {
        return this.reliabilityState;
    }

    public setLogUri(uri: vscode.Uri): void {
        this.logUri = uri;
        this.checkAvailability();
    }

    public start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.checkAvailability();

        // Initial scan for existing log files (tail-only mode: record current EOF offset)
        this.discoverAndScanLogs(true);

        // Periodic polling to handle file rotation, new sessions, and log appends
        this.pollInterval = setInterval(() => {
            if (this.isRunning) {
                this.discoverAndScanLogs();
                this.cleanDeduplicationCache();
            }
        }, 2000);
    }

    public stop(): void {
        this.isRunning = false;
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = undefined;
        }
        this.watchedFiles.clear();
    }

    public checkAvailability(): void {
        const candidatePaths = this.getCandidateLogDirectories();
        const exists = candidatePaths.some(p => fs.existsSync(p));
        this.reliabilityState = exists ? 'OBSERVED' : 'UNAVAILABLE';
    }

    public getCandidateLogDirectories(): string[] {
        const paths: string[] = [];

        // 1. Extension context log directory
        if (this.logUri && this.logUri.fsPath) {
            const extLogDir = this.logUri.fsPath;
            paths.push(extLogDir);

            // Peer extension host dir
            const extHostDir = path.dirname(extLogDir);
            paths.push(extHostDir);

            // Window root logs dir
            const windowDir = path.dirname(extHostDir);
            paths.push(windowDir);
        }

        // 2. Global VS Code & Cursor logs directory + workspaceStorage chat sessions
        const appData = process.env.APPDATA;
        if (appData) {
            const ideAppRoots = [
                path.join(appData, 'Code'),
                path.join(appData, 'Code - Insiders'),
                path.join(appData, 'Cursor'),
                path.join(appData, 'antigravity-ide')
            ];

            for (const ideRoot of ideAppRoots) {
                const logsDir = path.join(ideRoot, 'logs');
                if (fs.existsSync(logsDir)) {
                    paths.push(logsDir);
                    try {
                        const sessions = fs.readdirSync(logsDir)
                            .map(name => ({ name, fullPath: path.join(logsDir, name) }))
                            .filter(s => {
                                try { return fs.statSync(s.fullPath).isDirectory(); } catch { return false; }
                            })
                            .sort((a, b) => {
                                try { return fs.statSync(b.fullPath).mtimeMs - fs.statSync(a.fullPath).mtimeMs; } catch { return 0; }
                            });

                        for (const s of sessions.slice(0, 5)) {
                            paths.push(s.fullPath);
                            paths.push(path.join(s.fullPath, 'window1'));
                            paths.push(path.join(s.fullPath, 'window1', 'exthost'));
                        }
                    } catch {
                        // ignore
                    }
                }

                // VS Code Chat & Copilot workspace storage
                const wsStorageDir = path.join(ideRoot, 'User', 'workspaceStorage');
                if (fs.existsSync(wsStorageDir)) {
                    paths.push(wsStorageDir);
                }

                const globalStorageDir = path.join(ideRoot, 'User', 'globalStorage');
                if (fs.existsSync(globalStorageDir)) {
                    paths.push(globalStorageDir);
                }
            }
        }

        // 3. User home AI logs (.copilot, .claude, .anthropic)
        const userHome = process.env.USERPROFILE || process.env.HOME;
        if (userHome) {
            const homeLogs = [
                path.join(userHome, '.copilot', 'logs'),
                path.join(userHome, '.copilot', 'session-state'),
                path.join(userHome, '.claude', 'logs'),
                path.join(userHome, '.claude-code', 'logs'),
                path.join(userHome, '.anthropic', 'logs')
            ];
            for (const hl of homeLogs) {
                if (fs.existsSync(hl)) {
                    paths.push(hl);
                }
            }
        }

        return Array.from(new Set(paths));
    }

    public discoverAndScanLogs(isInitialStartup = false): void {
        const candidateDirs = this.getCandidateLogDirectories();
        for (const dir of candidateDirs) {
            if (!fs.existsSync(dir)) continue;
            try {
                this.findAndProcessLogFiles(dir, 0, isInitialStartup);
            } catch {
                // ignore permission errors on system folders
            }
        }
    }

    private findAndProcessLogFiles(dir: string, depth = 0, isInitialStartup = false): void {
        if (depth > 8) return;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    // Traverse AI / agent / extension output / workspaceStorage subdirectories
                    const nameLower = entry.name.toLowerCase();
                    const pathLower = fullPath.toLowerCase();

                    // Never traverse conversation transcripts or prompt chat history
                    if (nameLower === 'brain' || pathLower.includes('.gemini') || pathLower.includes('transcript')) {
                        continue;
                    }

                    if (pathLower.includes('workspacestorage') || pathLower.includes('globalstorage') ||
                        nameLower.includes('copilot') || nameLower.includes('claude') || nameLower.includes('anthropic') ||
                        nameLower.includes('cline') || nameLower.includes('roo') || nameLower.includes('continue') ||
                        nameLower.includes('cursor') || nameLower.includes('agent') ||
                        nameLower.includes('logs') || nameLower.includes('tasks') || nameLower.includes('debug') ||
                        nameLower.startsWith('output_') || nameLower === 'exthost' || nameLower.length === 32) {
                        this.findAndProcessLogFiles(fullPath, depth + 1, isInitialStartup);
                    }
                } else if (entry.isFile()) {
                    const nameLower = entry.name.toLowerCase();
                    if (nameLower.includes('transcript')) {
                        continue;
                    }
                    if (nameLower.endsWith('.log') || nameLower.endsWith('.txt') || nameLower.endsWith('.jsonl') || nameLower.includes('session') || nameLower.endsWith('.json')) {
                        this.processLogFile(fullPath, isInitialStartup);
                    }
                }
            }
        } catch {
            // ignore
        }
    }

    public processLogFile(filePath: string, isInitialStartup = false): void {
        try {
            const stats = fs.statSync(filePath);
            const currentSize = stats.size;
            const hasExistingOffset = this.watchedFiles.has(filePath);
            const lastOffset = this.watchedFiles.get(filePath) || 0;

            // Tail Only Mode on startup: Initialize existing files at current end-of-file
            if (isInitialStartup && !hasExistingOffset) {
                this.watchedFiles.set(filePath, currentSize);
                this.reliabilityState = 'OBSERVED';
                return;
            }

            if (currentSize <= lastOffset) {
                if (currentSize < lastOffset) {
                    // File was truncated or rotated
                    this.watchedFiles.set(filePath, 0);
                }
                return;
            }

            // Read new content chunk
            const fd = fs.openSync(filePath, 'r');
            const buffer = Buffer.alloc(currentSize - lastOffset);
            fs.readSync(fd, buffer, 0, currentSize - lastOffset, lastOffset);
            fs.closeSync(fd);

            this.watchedFiles.set(filePath, currentSize);
            const content = buffer.toString('utf8');
            this.parseLogContent(content, filePath);
            this.reliabilityState = 'OBSERVED';
        } catch {
            // ignore read locks
        }
    }

    public parseLogContent(content: string, logSource: string): void {
        const lines = content.split('\n');
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;

            // Handle structured JSON lines from VS Code chatSessions
            if (line.startsWith('{') && line.endsWith('}')) {
                try {
                    const d = JSON.parse(line);
                    const k = d.k || [];
                    const v = d.v;
                    const dirName = path.basename(path.dirname(logSource));
                    const sid = d.sid || d.sessionId || (dirName.includes('-') ? dirName : path.basename(logSource, '.jsonl'));

                    // 1. Detect agent / skill mode change in chat session
                    if (Array.isArray(k) && k.includes('inputState') && k.includes('mode') && v && typeof v === 'object' && v.id) {
                        const artifact = this.registry.resolveArtifactFromFilePath(v.id) ||
                                         this.registry.resolveArtifactFromSkillName(v.id) ||
                                         this.registry.resolveArtifactFromAgentName(v.id);
                        if (artifact) {
                            this.sessionModes.set(logSource, artifact);
                            if (sid) this.sessionModes.set(sid, artifact);
                        } else if (v.id === 'agent') {
                            this.sessionModes.delete(logSource);
                        }
                    }

                    // 2. Detect chat message request sent to active agent in chat session
                    if (Array.isArray(k) && k[0] === 'requests' && Array.isArray(v) && v.length > 0) {
                        const activeArtifact = this.sessionModes.get(logSource) || this.sessionModes.get(sid);
                        if (activeArtifact) {
                            const req = v[0];
                            const reqId = req?.requestId || `req-${Date.now()}`;
                            this.emitUsageEvent(
                                activeArtifact,
                                'INVOKE',
                                reqId,
                                `Copilot Chat invocation of @${activeArtifact.name}`,
                                logSource,
                                'GITHUB_COPILOT',
                                'GitHubCopilot'
                            );
                            continue;
                        }
                    }
                } catch {
                    // ignore JSON parse errors
                }
            }

            // Check if this line is passive discovery (DO NOT count as usage)
            if (this.isPassiveDiscoveryLine(line)) {
                continue;
            }

            // Check if this line represents an actual invocation / execution
            const detected = this.extractInvocationFromLine(line, logSource);
            if (detected) {
                this.emitUsageEvent(detected.artifact, detected.eventType, detected.sessionId, detected.details, logSource, detected.source, detected.platform);
            }
        }
    }

    public isPassiveDiscoveryLine(line: string): boolean {
        const lower = line.toLowerCase();
        // Discovery / scan / registration keywords that MUST NOT be counted as usage
        const discoveryKeywords = [
            'discovered skill',
            'discovering skills',
            'registered skill',
            'found skill in',
            'scanning skills',
            'indexing agents',
            'listing agents',
            'skills discovered:',
            'available tools:',
            'skills available:',
            'skills registered:'
        ];
        return discoveryKeywords.some(kw => lower.includes(kw));
    }

    public extractInvocationFromLine(line: string, logSource?: string): { artifact: RegisteredArtifact; eventType: string; sessionId?: string; details?: string; source?: string; platform?: any } | undefined {
        // 1. First check if line is structured JSON from Copilot chat sessions or debug logs
        if (line.startsWith('{') && line.endsWith('}')) {
            try {
                const d = JSON.parse(line);
                let targetRef: string | undefined;
                let sessionId: string | undefined = d.sid || d.sessionId;

                // Pattern A: VS Code chatSessions mode/agent selection
                if (d.v && typeof d.v === 'object') {
                    if (d.v.id && typeof d.v.id === 'string' && d.v.kind === 'agent') {
                        targetRef = d.v.id;
                    } else if (Array.isArray(d.v) && d.v.length > 0 && d.v[0]?.agent) {
                        targetRef = d.v[0].agent.id || d.v[0].agent.name;
                    }
                }

                // Pattern B: Copilot debug logs tool_call or turn_start
                if (!targetRef && (d.type === 'tool_call' || d.type === 'skill_execution' || d.type === 'agent_execution')) {
                    targetRef = d.name || d.attrs?.name || d.attrs?.tool || d.attrs?.skill;
                }

                if (!targetRef && d.attrs && typeof d.attrs === 'object') {
                    if (d.attrs.agent) targetRef = d.attrs.agent;
                    else if (d.attrs.skill) targetRef = d.attrs.skill;
                    else if (d.attrs.tool) targetRef = d.attrs.tool;
                }

                if (targetRef) {
                    let artifact = this.registry.resolveArtifactFromFilePath(targetRef) ||
                                   this.registry.resolveArtifactFromSkillName(targetRef) ||
                                   this.registry.resolveArtifactFromAgentName(targetRef);

                    if (artifact) {
                        return {
                            artifact,
                            eventType: 'INVOKE',
                            sessionId,
                            details: targetRef,
                            source: 'GITHUB_COPILOT',
                            platform: 'GitHubCopilot'
                        };
                    }
                }
            } catch {
                // fall through to regex patterns
            }
        }

        const executionPatterns = [
            /loading skill[:\s]+['"]?([a-zA-Z0-9_\-\.\/]+)['"]?/i,
            /invoking skill(?: tool)?[:\s]+['"]?([a-zA-Z0-9_\-\.\/]+)['"]?/i,
            /executing skill(?: tool)?[:\s]+['"]?([a-zA-Z0-9_\-\.\/]+)['"]?/i,
            /invoking (?:custom )?agent[:\s]+['"]?([a-zA-Z0-9_\-\.\/]+)['"]?/i,
            /activated (?:custom )?agent[:\s]+['"]?([a-zA-Z0-9_\-\.\/]+)['"]?/i,
            /running skill script[:\s]+['"]?([^\r\n'"]+)['"]?/i,
            /invoking tool[:\s]+['"]?([a-zA-Z0-9_\-\.\/]+)['"]?/i,
            /tool use[:\s]+['"]?([a-zA-Z0-9_\-\.\/]+)['"]?/i,
            /calling tool[:\s]+['"]?([a-zA-Z0-9_\-\.\/]+)['"]?/i,
            /using tool[:\s]+['"]?([a-zA-Z0-9_\-\.\/]+)['"]?/i,
            /executing tool[:\s]+['"]?([a-zA-Z0-9_\-\.\/]+)['"]?/i,
            /loaded agent prompt[:\s]+['"]?([^\r\n'"]+)['"]?/i,
            /executing tool call[:\s]+['"]?([a-zA-Z0-9_\-\.\/]+)['"]?/i,
            /invoking subagent[:\s]+['"]?([a-zA-Z0-9_\-\.\/]+)['"]?/i,
            /reading skill file[:\s]+['"]?([^\r\n'"]+)['"]?/i,
            /viewing skill file[:\s]+['"]?([^\r\n'"]+)['"]?/i,
            /using skill[:\s]+['"]?([a-zA-Z0-9_\-\.\/]+)['"]?/i,
            /"AbsolutePath":\s*"([^"]+)"/i,
            /"CommandLine":\s*"([^"]+)"/i,
            /"tool_calls":\s*\[\s*\{\s*"name":\s*"(?:default_api:)?([^"]+)"/i,
            /agent[:\s]+['"]?([a-zA-Z0-9_\-\.]+)['"]?/i,
            /skill[:\s]+['"]?([a-zA-Z0-9_\-\.]+)['"]?/i,
            /@([a-zA-Z0-9_\-\.]+)/i
        ];

        for (const pattern of executionPatterns) {
            const match = line.match(pattern);
            if (match && match[1]) {
                const targetRef = match[1].trim();

                // 1. Try resolving as direct file path
                let artifact = this.registry.resolveArtifactFromFilePath(targetRef);

                // 2. Try resolving as skill name
                if (!artifact) {
                    artifact = this.registry.resolveArtifactFromSkillName(targetRef);
                }

                // 3. Try resolving as agent name
                if (!artifact) {
                    artifact = this.registry.resolveArtifactFromAgentName(targetRef);
                }

                if (artifact) {
                    const sessionIdMatch = line.match(/session[_\-]?id[:\s]+['"]?([a-zA-Z0-9_\-]+)['"]?/i);
                    const sessionId = sessionIdMatch ? sessionIdMatch[1] : undefined;

                    // Determine source and platform
                    let source = 'GITHUB_COPILOT';
                    let platform: any = 'GitHubCopilot';

                    const lowerSrc = (logSource || '').toLowerCase() + ' ' + line.toLowerCase();
                    if (lowerSrc.includes('claude') || lowerSrc.includes('anthropic') || lowerSrc.includes('cline') || lowerSrc.includes('roo')) {
                        source = 'CLAUDE';
                        platform = 'Claude';
                    } else if (lowerSrc.includes('antigravity') || lowerSrc.includes('gemini') || lowerSrc.includes('brain')) {
                        source = 'ANTIGRAVITY';
                        platform = 'Antigravity';
                    } else if (lowerSrc.includes('cursor')) {
                        source = 'CURSOR';
                        platform = 'Cursor';
                    }

                    return {
                        artifact,
                        eventType: 'INVOKE',
                        sessionId,
                        details: targetRef,
                        source,
                        platform
                    };
                }
            }
        }

        return undefined;
    }

    private emitUsageEvent(
        artifact: RegisteredArtifact,
        eventType: string,
        sessionId?: string,
        details?: string,
        logSource?: string,
        source = 'GITHUB_COPILOT',
        platform = 'GitHubCopilot'
    ): void {
        // Deduplication key: artifactId + eventType + sessionId + 5-second time window bucket
        const now = Date.now();
        const timeBucket = Math.floor(now / 5000); // 5-second deduplication window
        const dedupKey = `${artifact.id}:${eventType}:${sessionId || 'default'}:${timeBucket}`;

        if (this.recentEvents.has(dedupKey)) {
            return; // Duplicate within window
        }

        this.recentEvents.add(dedupKey);

        const event: ArtifactUsageEvent = {
            artifactId: artifact.id,
            artifactName: artifact.name,
            artifactType: artifact.type,
            artifactVersion: artifact.version || '1.0.0',
            eventType,
            source,
            platform: platform as any,
            sessionId: sessionId || `agent-${Date.now()}`,
            metadata: details ? `Triggered: ${details} (from ${path.basename(logSource || 'log')})` : undefined,
            timestamp: new Date().toISOString()
        };

        this._onDidDetectUsage.fire(event);
    }

    private cleanDeduplicationCache(): void {
        if (this.recentEvents.size > 1000) {
            this.recentEvents.clear();
        }
    }
}

/**
 * Real-time workspace document & activity listener for AI artifact usage.
 */
export class WorkspaceArtifactActivityCollector implements IArtifactUsageCollector {
    public readonly name = 'Workspace Activity Collector';
    public readonly source = 'VS_CODE';

    private _onDidDetectUsage = new vscode.EventEmitter<ArtifactUsageEvent>();
    public readonly onDidDetectUsage: vscode.Event<ArtifactUsageEvent> = this._onDidDetectUsage.event;

    private registry: IArtifactRegistry;
    private disposables: vscode.Disposable[] = [];
    private isRunning = false;
    private recentAccesses: Map<string, number> = new Map();

    constructor(registry: IArtifactRegistry) {
        this.registry = registry;
    }

    public isAvailable(): boolean {
        return true;
    }

    public getReliabilityState(): ReliabilityState {
        return 'OBSERVED';
    }

    public start(): void {
        if (this.isRunning) return;
        this.isRunning = true;

        if (vscode.workspace && vscode.workspace.onDidOpenTextDocument) {
            this.disposables.push(
                vscode.workspace.onDidOpenTextDocument(doc => {
                    this.checkAndReportDocumentAccess(doc.uri.fsPath, 'OPEN');
                })
            );
        }

        if (vscode.workspace && vscode.workspace.onDidSaveTextDocument) {
            this.disposables.push(
                vscode.workspace.onDidSaveTextDocument(doc => {
                    this.checkAndReportDocumentAccess(doc.uri.fsPath, 'SAVE');
                })
            );
        }

        if (vscode.workspace && vscode.workspace.createFileSystemWatcher) {
            const watcher = vscode.workspace.createFileSystemWatcher('**/{.github,.agents,skills,agents,prompts,plugins,.mcp}/**');
            watcher.onDidChange(uri => this.checkAndReportDocumentAccess(uri.fsPath, 'MODIFY'));
            watcher.onDidCreate(uri => this.checkAndReportDocumentAccess(uri.fsPath, 'CREATE'));
            this.disposables.push(watcher);
        }

        if (vscode.window && vscode.window.onDidChangeActiveTextEditor) {
            this.disposables.push(
                vscode.window.onDidChangeActiveTextEditor(editor => {
                    if (editor && editor.document) {
                        this.checkAndReportDocumentAccess(editor.document.uri.fsPath, 'FOCUS');
                    }
                })
            );
        }
    }

    public stop(): void {
        this.isRunning = false;
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        this.recentAccesses.clear();
    }

    public checkAndReportDocumentAccess(filePath: string, action = 'ACCESS'): void {
        if (!this.isRunning || !filePath) return;

        const artifact = this.registry.resolveArtifactFromFilePath(filePath);
        if (!artifact) return;

        const now = Date.now();
        const lastAccess = this.recentAccesses.get(artifact.id) || 0;
        if (now - lastAccess < 5000) {
            return; // 5s deduplication
        }

        this.recentAccesses.set(artifact.id, now);

        const event: ArtifactUsageEvent = {
            artifactId: artifact.id,
            artifactName: artifact.name,
            artifactType: artifact.type,
            artifactVersion: artifact.version || '1.0.0',
            eventType: 'USE',
            source: 'VS_CODE',
            platform: 'EngineeringCommons',
            sessionId: `doc-${Date.now()}`,
            metadata: `Workspace ${action}: ${path.basename(filePath)}`,
            timestamp: new Date().toISOString()
        };

        this._onDidDetectUsage.fire(event);
    }
}

/**
 * OpenTelemetry usage collector for listening to agent trace spans.
 */
export class OpenTelemetryUsageCollector implements IArtifactUsageCollector {
    public readonly name = 'OpenTelemetry Agent Collector';
    public readonly source = 'OPEN_TELEMETRY';

    private _onDidDetectUsage = new vscode.EventEmitter<ArtifactUsageEvent>();
    public readonly onDidDetectUsage: vscode.Event<ArtifactUsageEvent> = this._onDidDetectUsage.event;
    private isRunning = false;

    public isAvailable(): boolean {
        // Active when OTEL endpoint is configured
        const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.VSCODE_OTEL_TRACES_PORT;
        return Boolean(otelEndpoint);
    }

    public getReliabilityState(): ReliabilityState {
        return this.isAvailable() ? 'OBSERVED' : 'UNAVAILABLE';
    }

    public start(): void {
        this.isRunning = true;
    }

    public stop(): void {
        this.isRunning = false;
    }

    public processSpan(spanName: string, attributes: Record<string, any>, registry: IArtifactRegistry): void {
        if (!this.isRunning) return;

        // Check if span corresponds to tool or agent invocation
        const toolName = attributes['gen_ai.tool.name'] || attributes['tool.name'] || attributes['agent.name'] || spanName;
        if (!toolName) return;

        const artifact = registry.resolveArtifactFromSkillName(toolName) || registry.resolveArtifactFromAgentName(toolName);
        if (artifact) {
            const event: ArtifactUsageEvent = {
                artifactId: artifact.id,
                artifactName: artifact.name,
                artifactType: artifact.type,
                artifactVersion: artifact.version || '1.0.0',
                eventType: 'INVOKE',
                source: 'GITHUB_COPILOT',
                platform: 'GitHubCopilot',
                sessionId: attributes['session.id'] || attributes['gen_ai.session.id'],
                metadata: `OTel Span: ${spanName}`,
                timestamp: new Date().toISOString()
            };
            this._onDidDetectUsage.fire(event);
        }
    }
}
