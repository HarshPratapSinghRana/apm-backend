import * as vscode from 'vscode';
import { ICliExecutor, CliExecutionResult } from '../src/services/cliExecutor';
import { IAuthenticationStatusProvider } from '../src/services/authenticationStatusProvider';
import { IUsageLogger } from '../src/services/usageLogger';
import { IBackendUsageClient } from '../src/services/backendUsageClient';
import { ArtifactUsageEvent } from '../src/models/usageEvent';
import { IReviewThreadService, ReviewThreadDto, ReviewMessageDto } from '../src/services/reviewThreadService';

export class MockCliExecutor implements ICliExecutor {
    public executedCalls: { command: string; args: string[]; cwd?: string }[] = [];
    public mockResult: CliExecutionResult = {
        exitCode: 0,
        stdout: 'Success',
        stderr: '',
        success: true
    };

    public async executeAsync(command: string, args: string[], cwd?: string): Promise<CliExecutionResult> {
        this.executedCalls.push({ command, args, cwd });
        return this.mockResult;
    }
}

export class MockAuthProvider implements IAuthenticationStatusProvider {
    private _onDidChangeAuthentication = new vscode.EventEmitter<boolean>();
    public readonly onDidChangeAuthentication = this._onDidChangeAuthentication.event;

    constructor(
        public authenticated: boolean = true,
        public token: string | undefined = 'mock-session-token-123',
        public email: string | undefined = 'mockuser@company.com',
        public role: string | undefined = 'PRODUCER'
    ) {}

    public async isAuthenticated(): Promise<boolean> {
        return this.authenticated;
    }

    public async getToken(): Promise<string | undefined> {
        return this.authenticated ? this.token : undefined;
    }

    public async getEmail(): Promise<string | undefined> {
        return this.authenticated ? this.email : undefined;
    }

    public async getRole(): Promise<string | undefined> {
        return this.authenticated ? (this.role || 'PRODUCER') : undefined;
    }

    public notifyAuthChanged(): void {
        this._onDidChangeAuthentication.fire(this.authenticated);
    }

    public setAuthenticated(authenticated: boolean, token?: string, email?: string, role?: string): void {
        this.authenticated = authenticated;
        this.token = token;
        this.email = email;
        if (role !== undefined) {
            this.role = role;
        }
        this._onDidChangeAuthentication.fire(this.authenticated);
    }
}

export { MockAuthProvider as MockAuthStatusProvider };

export class MockUsageLogger implements IUsageLogger {
    public loggedEvents: ArtifactUsageEvent[] = [];
    public loggedActions: { action: string; artifactName?: string; artifactType?: string; artifactVersion?: string; workspace?: string; platform?: string }[] = [];
    public shouldThrow = false;

    public async logUsageAsync(event: ArtifactUsageEvent): Promise<void> {
        if (this.shouldThrow) {
            throw new Error('Network error logging usage');
        }
        this.loggedEvents.push(event);
    }

    public async logActionAsync(
        action: string,
        artifactName?: string,
        artifactType?: string,
        artifactVersion?: string,
        workspace?: string,
        platform?: string
    ): Promise<void> {
        if (this.shouldThrow) {
            throw new Error('Network error logging action');
        }
        this.loggedActions.push({ action, artifactName, artifactType, artifactVersion, workspace, platform });
        this.loggedEvents.push({
            action,
            artifactName,
            artifactType,
            artifactVersion,
            workspace,
            platform: platform || 'EngineeringCommons',
            source: 'vscode',
            timestamp: new Date().toISOString()
        });
    }
}

export class MockBackendUsageClient implements IBackendUsageClient {
    public sentEvents: { event: ArtifactUsageEvent; token?: string }[] = [];
    public shouldFail = false;

    public async sendUsageEventAsync(event: ArtifactUsageEvent, token?: string): Promise<boolean> {
        if (this.shouldFail) {
            return false;
        }
        this.sentEvents.push({ event, token });
        return true;
    }

    public async recordUsageAsync(payload: any, token?: string): Promise<boolean> {
        if (this.shouldFail) {
            return false;
        }
        this.sentEvents.push({ event: payload, token });
        return true;
    }
}

export class MockReviewThreadService implements IReviewThreadService {
    public threads: Map<string, ReviewThreadDto> = new Map();

    public async getThreadAsync(reviewId: string): Promise<ReviewThreadDto | null> {
        return this.threads.get(reviewId) || null;
    }

    public async sendMessageAsync(reviewId: string, message: string): Promise<ReviewMessageDto | null> {
        const thread = this.threads.get(reviewId);
        if (!thread) return null;

        const newMsg: ReviewMessageDto = {
            id: `msg-${Date.now()}`,
            threadId: thread.id,
            authorEmail: 'mockreviewer@company.com',
            authorRole: 'Reviewer',
            message,
            createdAt: new Date().toISOString()
        };
        thread.messages.push(newMsg);
        return newMsg;
    }

    public async updateStatusAsync(reviewId: string, status: string): Promise<ReviewThreadDto | null> {
        const thread = this.threads.get(reviewId);
        if (!thread) return null;
        thread.status = status;
        return thread;
    }
}
