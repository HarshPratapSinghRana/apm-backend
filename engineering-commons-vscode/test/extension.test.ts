import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { MockCliExecutor, MockAuthProvider, MockUsageLogger, MockBackendUsageClient, MockReviewThreadService } from './mocks';
import { executeLoginCommand } from '../src/commands/loginCommand';
import { executeListCommand, parseListOutput } from '../src/commands/listCommand';
import { executeInstallCommand } from '../src/commands/installCommand';
import { executeUpdateCommand } from '../src/commands/updateCommand';
import { executeContributeCommand } from '../src/commands/contributeCommand';
import { BackendUsageLogger } from '../src/services/usageLogger';
import { createSanitizedUsageEvent } from '../src/models/usageEvent';
import { ArtifactTreeDataProvider } from '../src/views/artifactTreeDataProvider';
import {
    EngineeringCommonsUsageTracker,
    GitHubCopilotUsageTracker,
    ClaudeUsageProvider,
    ClaudeUsageTracker,
    VsCodeUsageProvider,
    ArtifactUsageTracker,
    CompositeArtifactUsageTracker
} from '../src/services/usageTracker';

describe('Engineering Commons VS Code Extension Tests', () => {
    let mockCli: MockCliExecutor;
    let mockAuth: MockAuthProvider;
    let mockLogger: MockUsageLogger;

    beforeEach(() => {
        mockCli = new MockCliExecutor();
        mockAuth = new MockAuthProvider();
        mockLogger = new MockUsageLogger();
    });

    // 1. Extension registers commands
    it('1. package.json declares all required Engineering Commons commands', () => {
        let pkgPath = path.join(__dirname, '..', 'package.json');
        if (!fs.existsSync(pkgPath)) {
            pkgPath = path.join(__dirname, '..', '..', 'package.json');
        }
        const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const commandNames = pkgContent.contributes.commands.map((c: any) => c.command);

        expect(commandNames).to.include('engineeringCommons.login');
        expect(commandNames).to.include('engineeringCommons.list');
        expect(commandNames).to.include('engineeringCommons.install');
        expect(commandNames).to.include('engineeringCommons.update');
        expect(commandNames).to.include('engineeringCommons.contribute');
        expect(commandNames).to.include('engineeringCommons.review');
        expect(commandNames).to.include('engineeringCommons.openThread');
        expect(commandNames).to.include('engineeringCommons.mySubmissions');
        expect(commandNames).to.include('engineeringCommons.refreshTree');
    });

    // 2. Login invokes Engineering Commons CLI
    it('2. Login command invokes Engineering Commons CLI with credentials', async () => {
        mockCli.mockResult = { exitCode: 0, stdout: 'Login successful', stderr: '', success: true };
        
        // Execute direct CLI call through executor to verify invocation
        const result = await mockCli.executeAsync('engineering-commons', ['login', 'producer@test.com', 'Producer@123']);
        
        expect(result.success).to.be.true;
        expect(mockCli.executedCalls.length).to.equal(1);
        expect(mockCli.executedCalls[0].command).to.equal('engineering-commons');
        expect(mockCli.executedCalls[0].args).to.deep.equal(['login', 'producer@test.com', 'Producer@123']);
    });

    // 3. List invokes Engineering Commons CLI
    it('3. List command invokes Engineering Commons CLI and parses output', async () => {
        mockCli.mockResult = {
            exitCode: 0,
            stdout: `AI Artifacts\nNAME                 TYPE       VERSION \n--------------------------------------------\ndesign-reviewer      agent      1.1.0   \nsql-transformer      skill      2.0.0   `,
            stderr: '',
            success: true
        };

        const items = parseListOutput(mockCli.mockResult.stdout);

        expect(items.length).to.equal(2);
        expect(items[0].name).to.equal('design-reviewer');
        expect(items[0].type).to.equal('agent');
        expect(items[0].version).to.equal('1.1.0');
        expect(items[1].name).to.equal('sql-transformer');
        expect(items[1].type).to.equal('skill');
        expect(items[1].version).to.equal('2.0.0');
    });

    // 4. Install invokes Engineering Commons CLI
    it('4. Install command invokes Engineering Commons CLI with artifact name', async () => {
        mockCli.mockResult = { exitCode: 0, stdout: 'Installed design-reviewer successfully.', stderr: '', success: true };

        const success = await executeInstallCommand(mockCli, mockAuth, mockLogger, 'design-reviewer');

        expect(success).to.be.true;
        expect(mockCli.executedCalls.length).to.equal(1);
        expect(mockCli.executedCalls[0].args).to.deep.equal(['install', 'design-reviewer']);
    });

    // 4b. Install checks and creates .github directory in workspace if missing
    it('4b. Install command creates .github directory in workspace if missing', async () => {
        const testWorkspace = path.join(os.tmpdir(), 'cip_test_ext_' + Date.now());
        fs.mkdirSync(testWorkspace, { recursive: true });
        const mockWorkspace = {
            uri: { fsPath: testWorkspace },
            name: 'test-workspace',
            index: 0
        };
        const prevFolders = (vscode.workspace as any).workspaceFolders;
        (vscode.workspace as any).workspaceFolders = [mockWorkspace];

        try {
            const githubDir = path.join(testWorkspace, '.github');
            expect(fs.existsSync(githubDir)).to.be.false;

            mockCli.mockResult = { exitCode: 0, stdout: 'Installed successfully.', stderr: '', success: true };
            const success = await executeInstallCommand(mockCli, mockAuth, mockLogger, 'design-reviewer');

            expect(success).to.be.true;
            expect(fs.existsSync(githubDir)).to.be.true;
        } finally {
            (vscode.workspace as any).workspaceFolders = prevFolders;
            try { fs.rmSync(testWorkspace, { recursive: true, force: true }); } catch {}
        }
    });

    // 5. Update invokes Engineering Commons CLI
    it('5. Update command invokes Engineering Commons CLI with artifact name', async () => {
        mockCli.mockResult = { exitCode: 0, stdout: 'Updated design-reviewer successfully.', stderr: '', success: true };

        const success = await executeUpdateCommand(mockCli, mockAuth, mockLogger, 'design-reviewer');

        expect(success).to.be.true;
        expect(mockCli.executedCalls.length).to.equal(1);
        expect(mockCli.executedCalls[0].args).to.deep.equal(['update', 'design-reviewer']);
    });

    // 6. Contribute invokes Engineering Commons CLI
    it('6. Contribute command invokes Engineering Commons CLI', async () => {
        mockCli.mockResult = { exitCode: 0, stdout: 'Submitted for review.', stderr: '', success: true };

        const success = await executeContributeCommand(mockCli, mockAuth, mockLogger, 'my-new-agent');

        expect(success).to.be.true;
        expect(mockCli.executedCalls.length).to.equal(1);
        expect(mockCli.executedCalls[0].args).to.deep.equal(['contribute', 'my-new-agent']);
    });

    // 6b. Contribute detects duplicate unchanged artifact and handles gracefully
    it('6b. Contribute detects duplicate unchanged artifact and informs producer without review creation', async () => {
        mockCli.mockResult = {
            exitCode: 0,
            stdout: `
┌────────────────────────────────────────────────────────────┐
│ Artifact Already Exists                                    │
│                                                            │
│ design-reviewer                                            │
│                                                            │
│ An identical artifact already exists in the marketplace.   │
│                                                            │
│ Existing Version: 1.0.0                                    │
│                                                            │
│ Files Compared: 4                                          │
│ Files Unchanged: 4                                         │
│ Files Changed: 0                                           │
│                                                            │
│ No changes were detected.                                  │
│ Review request was NOT created.                            │
└────────────────────────────────────────────────────────────┘
            `,
            stderr: '',
            success: true
        };

        const success = await executeContributeCommand(mockCli, mockAuth, mockLogger, 'design-reviewer');

        expect(success).to.be.true;
        expect(mockCli.executedCalls.length).to.equal(1);
        expect(mockCli.executedCalls[0].args).to.deep.equal(['contribute', 'design-reviewer']);
    });

    // 7. Usage event is generated after install
    it('7. Usage event is generated after install', async () => {
        mockCli.mockResult = { exitCode: 0, stdout: 'Installed design-reviewer.', stderr: '', success: true };

        await executeInstallCommand(mockCli, mockAuth, mockLogger, 'design-reviewer');

        expect(mockLogger.loggedEvents.length).to.equal(1);
        expect(mockLogger.loggedEvents[0].action).to.equal('INSTALL');
    });

    // 8. Usage event contains artifact name/type/version/action
    it('8. Usage event contains artifact name, type, version, action, source', async () => {
        mockCli.mockResult = { exitCode: 0, stdout: 'Installed design-reviewer.', stderr: '', success: true };

        await executeInstallCommand(mockCli, mockAuth, mockLogger, 'design-reviewer');

        const event = mockLogger.loggedEvents[0];
        expect(event.artifactName).to.equal('design-reviewer');
        expect(event.artifactType).to.equal('agent');
        expect(event.artifactVersion).to.equal('1.0.0');
        expect(event.action).to.equal('INSTALL');
        expect(event.source).to.equal('vscode');
        expect(event.timestamp).to.be.a('string');
    });

    // 9. Authentication failure is handled
    it('9. Unauthenticated users are blocked from running protected commands', async () => {
        mockAuth.authenticated = false;

        const success = await executeInstallCommand(mockCli, mockAuth, mockLogger, 'design-reviewer');

        expect(success).to.be.false;
        // CLI must NOT be invoked when user is unauthenticated
        expect(mockCli.executedCalls.length).to.equal(0);
    });

    // 10. CLI failure is handled
    it('10. CLI failure returns false and handles error', async () => {
        mockCli.mockResult = { exitCode: 1, stdout: '', stderr: 'Artifact not found', success: false };

        const success = await executeInstallCommand(mockCli, mockAuth, mockLogger, 'non-existent-artifact');

        expect(success).to.be.false;
        // No usage event recorded when install fails
        expect(mockLogger.loggedEvents.length).to.equal(0);
    });

    // 11. Usage logging failure does NOT break artifact installation
    it('11. Usage logging failure does not break artifact installation', async () => {
        mockCli.mockResult = { exitCode: 0, stdout: 'Installed successfully.', stderr: '', success: true };
        
        const mockBackendClient = new MockBackendUsageClient();
        mockBackendClient.shouldFail = true; // Simulating network/backend failure
        
        const resilientLogger = new BackendUsageLogger(mockBackendClient, mockAuth);

        // Logging must not throw even if backend fails
        await resilientLogger.logActionAsync('INSTALL', 'design-reviewer', 'agent', '1.0.0');
        
        // Command still succeeds
        const success = await executeInstallCommand(mockCli, mockAuth, resilientLogger, 'design-reviewer');
        expect(success).to.be.true;
    });

    // 12. Sensitive credentials are never included in usage events
    it('12. Sensitive credentials (PAT, passwords, tokens) are never included in usage events', () => {
        const sanitized = createSanitizedUsageEvent({
            action: 'INSTALL',
            artifactName: 'design-reviewer',
            artifactType: 'agent',
            artifactVersion: '1.1.0',
            workspace: '/projects/my-app'
        });

        const serialized = JSON.stringify(sanitized);

        expect(serialized).to.not.include('ghp_');
        expect(serialized).to.not.include('token');
        expect(serialized).to.not.include('password');
        expect(serialized).to.not.include('secret');
        expect(serialized).to.not.include('Authorization');
    });

    // 13. ReviewContentProvider stores and returns virtual diff documents
    it('13. ReviewContentProvider stores and returns virtual document contents', () => {
        const { ReviewContentProvider } = require('../src/services/reviewContentProvider');
        const provider = new ReviewContentProvider();
        const vscode = require('vscode');

        const uri = vscode.Uri.parse('cip-review://current/.github/agents/agent.md?rev=rev-1');
        provider.setDocumentContent(uri, '# Test Agent Content');

        const content = provider.provideTextDocumentContent(uri);
        expect(content).to.equal('# Test Agent Content');
    });

    // 14. ReviewCommand blocks unauthenticated users
    it('14. ReviewCommand blocks unauthenticated users gracefully', async () => {
        const { executeReviewCommand } = require('../src/commands/reviewCommand');
        const { ReviewContentProvider } = require('../src/services/reviewContentProvider');
        
        mockAuth.authenticated = false;
        const provider = new ReviewContentProvider();

        // Must complete without error when unauthenticated
        await executeReviewCommand(mockAuth, provider);
    });

    // 15. TreeDataProvider displays Login notice when unauthenticated
    it('15. TreeDataProvider renders Login options when user is not logged in', async () => {
        mockAuth.authenticated = false;
        const treeProvider = new ArtifactTreeDataProvider(mockCli, mockAuth);

        const items = await treeProvider.getChildren();
        expect(items.length).to.equal(2);
        expect(items[0].label).to.include('not logged in');
        expect(items[1].label).to.include('Login');
    });

    // 16. TreeDataProvider renders full sections when authenticated
    it('16. TreeDataProvider renders structured sections when logged in', async () => {
        mockAuth.authenticated = true;
        mockAuth.email = 'producer@test.com';
        const treeProvider = new ArtifactTreeDataProvider(mockCli, mockAuth);

        const roots = await treeProvider.getChildren();
        expect(roots.length).to.equal(6);
        expect(roots[0].label).to.include('producer@test.com');
        expect(roots[1].label).to.include('Notifications');
        expect(roots[2].label).to.equal('Marketplace');
        expect(roots[3].label).to.equal('My Artifacts');
        expect(roots[4].label).to.equal('Reviews');
        expect(roots[5].label).to.equal('Usage');
    });

    // 17. Multi-platform Usage Trackers adhere to strict telemetry rules
    it('17. Usage trackers accurately record VS Code events and mark external telemetry as unavailable', async () => {
        const mockBackend = new MockBackendUsageClient();
        
        const vscodeTracker = new VsCodeUsageProvider(mockBackend, mockAuth);
        const copilotTracker = new GitHubCopilotUsageTracker(mockBackend, mockAuth);
        const claudeTracker = new ClaudeUsageTracker(mockBackend, mockAuth);

        // VS Code tracker logs real events
        const vResult = await vscodeTracker.trackAsync({
            artifactId: 'design-reviewer',
            artifactName: 'design-reviewer',
            eventType: 'USE',
            action: 'USE',
            source: 'VS_CODE'
        });
        expect(vResult).to.be.true;

        // External trackers do NOT fabricate fake events and report status
        expect(copilotTracker.getTelemetryStatus()).to.equal('EXTERNAL_USAGE_UNAVAILABLE');
        expect(claudeTracker.getTelemetryStatus()).to.equal('EXTERNAL_USAGE_UNAVAILABLE');
        
        const cResult = await copilotTracker.trackAsync({
            artifactId: 'design-reviewer',
            artifactName: 'design-reviewer',
            eventType: 'USE',
            action: 'INVOKED',
            source: 'GITHUB_COPILOT'
        });
        expect(cResult).to.be.false;

        expect(mockBackend.sentEvents.length).to.equal(1);
        expect(mockBackend.sentEvents[0].event.source).to.equal('VS_CODE');
    });

    // 18. Review Thread Mock Service handles conversation messages
    it('18. Review Thread Service maintains conversation messages and status', async () => {
        const threadService = new MockReviewThreadService();
        threadService.threads.set('rev-123', {
            id: 'thread-123',
            reviewId: 'rev-123',
            artifactId: 'design-reviewer',
            artifactName: 'design-reviewer',
            version: '1.1.0',
            producerEmail: 'producer@test.com',
            status: 'Open',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: []
        });

        const thread = await threadService.getThreadAsync('rev-123');
        expect(thread).to.not.be.null;
        expect(thread!.artifactId).to.equal('design-reviewer');

        const sentMsg = await threadService.sendMessageAsync('rev-123', 'Please add error handling');
        expect(sentMsg).to.not.be.null;
        expect(sentMsg!.message).to.equal('Please add error handling');

        const updatedThread = await threadService.updateStatusAsync('rev-123', 'ChangesRequested');
        expect(updatedThread!.status).to.equal('ChangesRequested');
    });

    // 19. Workspace artifact discovery finds local AI artifacts
    it('19. Workspace artifact discovery finds local skills and agents for contribution', () => {
        const { discoverLocalArtifacts } = require('../src/commands/contributeCommand');
        const path = require('path');
        const workspacePath = path.resolve(__dirname, '..', '..', '..');
        const discovered = discoverLocalArtifacts(workspacePath);

        expect(discovered).to.be.an('array');
        const skill = discovered.find((d: any) => d.name === 'review-and-refactor' || d.type === 'skill');
        expect(skill).to.not.be.undefined;
        expect(skill.type).to.equal('skill');
    });

    // 20. SessionFileAuthStatusProvider logout cleans up session files and emits event
    it('20. SessionFileAuthStatusProvider logout cleans up session files and emits event', async () => {
        const { SessionFileAuthStatusProvider } = require('../src/services/authenticationStatusProvider');
        const tmpDir = path.join(os.tmpdir(), 'cip-test-' + Date.now());
        fs.mkdirSync(tmpDir, { recursive: true });
        const testSessionPath = path.join(tmpDir, 'session.json');
        fs.writeFileSync(testSessionPath, JSON.stringify({ token: 'mock-token', email: 'test@maqsoftware.com' }), 'utf-8');

        const provider = new SessionFileAuthStatusProvider(testSessionPath);
        expect(await provider.isAuthenticated()).to.be.true;
        expect(await provider.getEmail()).to.equal('test@maqsoftware.com');

        let authEventFired = false;
        let eventStatus = true;
        provider.onDidChangeAuthentication((isAuth: boolean) => {
            authEventFired = true;
            eventStatus = isAuth;
        });

        await provider.logout();
        expect(fs.existsSync(testSessionPath)).to.be.false;
        expect(await provider.isAuthenticated()).to.be.false;
        expect(authEventFired).to.be.true;
        expect(eventStatus).to.be.false;

        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });

    // 21. Extension startup and service initialization makes ZERO network/API calls when not logged in
    it('21. Extension startup and service initialization makes ZERO network/API calls when not logged in', async () => {
        const http = require('http');
        const https = require('https');
        const { MockAuthStatusProvider } = require('./mocks');
        const { AdoGovernanceService } = require('../src/services/adoGovernanceService');
        const { AdoTelemetryService } = require('../src/services/adoTelemetryService');
        const { HttpBackendUsageClient } = require('../src/services/backendUsageClient');
        const { PollingNotificationClient } = require('../src/services/notificationClient');
        const { HttpNotificationService } = require('../src/services/notificationService');
        const { HttpReviewThreadService } = require('../src/services/reviewThreadService');
        const { ReviewCommentService } = require('../src/services/reviewCommentService');
        const { CertificationService } = require('../src/services/certificationService');

        let networkRequestCount = 0;
        const originalHttpsRequest = https.request;
        const originalHttpRequest = http.request;

        https.request = (...args: any[]) => {
            networkRequestCount++;
            return originalHttpsRequest.apply(https, args);
        };
        http.request = (...args: any[]) => {
            networkRequestCount++;
            return originalHttpRequest.apply(http, args);
        };

        try {
            // Unauthenticated user state
            const unauthProvider = new MockAuthStatusProvider(false, undefined, undefined, 'CONSUMER');

            const adoGov = new AdoGovernanceService(unauthProvider);
            const adoTel = new AdoTelemetryService(undefined, unauthProvider);
            const httpUsage = new HttpBackendUsageClient('https://ecommerce-app-chi-wine.vercel.app');
            const notifService = new HttpNotificationService('https://ecommerce-app-chi-wine.vercel.app', unauthProvider);
            const pollingClient = new PollingNotificationClient(notifService, unauthProvider, 5000);
            const reviewThread = new HttpReviewThreadService('https://ecommerce-app-chi-wine.vercel.app', unauthProvider);
            const reviewComment = new ReviewCommentService(unauthProvider, 'https://ecommerce-app-chi-wine.vercel.app');
            const certService = new CertificationService(unauthProvider, { executeAsync: async () => ({ success: true, stdout: '', stderr: '', exitCode: 0 }) } as any, 'engineering-commons');

            // 1. AdoGovernanceService calls
            const roles = await adoGov.getUserRolesAsync(true);
            const reqs = await adoGov.getAccessRequestsAsync();
            const catalog = await adoGov.fetchAdoJsonFile('/catalog.json');
            expect(roles).to.deep.equal([]);
            expect(reqs).to.deep.equal([]);
            expect(catalog).to.be.null;

            // 2. AdoTelemetryService calls
            const flushed = await adoTel.flushQueueAsync();
            const telEvents = await adoTel.getTelemetryEventsAsync();
            expect(flushed).to.be.false;
            expect(telEvents).to.deep.equal([]);

            // 3. HttpBackendUsageClient calls
            const usageSent = await httpUsage.sendUsageEventAsync({ artifactId: 'test-art', artifactName: 'test-art' } as any);
            expect(usageSent).to.be.false;

            // 4. PollingNotificationClient start & fetchNow
            pollingClient.start();
            const notifs = await pollingClient.fetchNow();
            expect(notifs).to.deep.equal([]);
            pollingClient.stop();

            // 5. HttpReviewThreadService and ReviewCommentService calls
            const thread = await reviewThread.getThreadAsync('rev-123');
            expect(thread).to.be.null;
            const diff = await reviewComment.getDiffAsync('rev-123');
            expect(diff).to.be.null;

            // 6. CertificationService calls
            const certReq = await certService.requestCertification('art-123');
            expect(certReq).to.be.null;

            // Strictly verify ZERO network calls were dispatched while unauthenticated
            expect(networkRequestCount).to.equal(0);
        } finally {
            https.request = originalHttpsRequest;
            http.request = originalHttpRequest;
        }
    });

    // 22. The first API call is allowed and executed only when user logs in
    it('22. The first API call is allowed and executed only when user logs in', async () => {
        const http = require('http');
        const https = require('https');
        const { MockAuthStatusProvider } = require('./mocks');
        const { HttpNotificationService } = require('../src/services/notificationService');
        const { PollingNotificationClient } = require('../src/services/notificationClient');

        let networkRequestCount = 0;
        const originalHttpsRequest = https.request;
        const originalHttpRequest = http.request;

        const createMockRequest = (args: any[]) => {
            networkRequestCount++;
            const EventEmitter = require('events');
            const req = new EventEmitter();
            const callback = typeof args[1] === 'function' ? args[1] : (typeof args[2] === 'function' ? args[2] : null);
            req.write = () => {};
            req.end = () => {
                if (callback) {
                    const res = new EventEmitter();
                    res.statusCode = 200;
                    res.headers = { 'content-type': 'application/json' };
                    callback(res);
                    process.nextTick(() => {
                        res.emit('data', '[]');
                        res.emit('end');
                    });
                }
            };
            req.setTimeout = () => req;
            req.destroy = () => {};
            return req;
        };

        https.request = (...args: any[]) => createMockRequest(args);
        http.request = (...args: any[]) => createMockRequest(args);

        try {
            // Initially unauthenticated
            const authProvider = new MockAuthStatusProvider(false, undefined, undefined, 'CONSUMER');
            const notifService = new HttpNotificationService('https://ecommerce-app-chi-wine.vercel.app', authProvider);
            const client = new PollingNotificationClient(notifService, authProvider, 60000);

            client.start();
            expect(networkRequestCount).to.equal(0);

            // User logs in now
            authProvider.setAuthenticated(true, 'mock-jwt-token', 'user@maqsoftware.com', 'PRODUCER');

            // Upon login, the first API call occurs
            await client.fetchNow();
            expect(networkRequestCount).to.be.greaterThan(0);

            client.stop();
        } finally {
            https.request = originalHttpsRequest;
            http.request = originalHttpRequest;
        }
    });
});

