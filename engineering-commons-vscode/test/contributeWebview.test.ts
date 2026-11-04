import * as assert from 'assert';
import * as vscode from 'vscode';
import { ContributeWebviewProvider } from '../src/views/contributeWebviewProvider';
import { MockCliExecutor, MockAuthProvider, MockUsageLogger } from './mocks';
import { DiscoveredLocalArtifact } from '../src/commands/contributeCommand';

describe('Contribute Right Panel Webview Tests', () => {
    let cli: MockCliExecutor;
    let auth: MockAuthProvider;
    let logger: MockUsageLogger;

    beforeEach(() => {
        cli = new MockCliExecutor();
        auth = new MockAuthProvider();
        auth.authenticated = true;
        auth.email = 'producer@company.com';
        logger = new MockUsageLogger();
    });

    it('1. Rendered HTML contains header, workspace discovery list, custom file picker, and metadata form', () => {
        const mockDiscovered: DiscoveredLocalArtifact[] = [
            {
                name: 'design-reviewer',
                type: 'agent',
                version: '1.0.0',
                path: '.github/agents/design-reviewer.agent.md',
                files: ['.github/agents/design-reviewer.agent.md'],
                description: 'Agent definition'
            },
            {
                name: 'review-and-refactor',
                type: 'skill',
                version: '1.0.0',
                path: '.agents/skills/review-and-refactor/SKILL.md',
                files: ['.agents/skills/review-and-refactor/SKILL.md'],
                description: 'Skill package'
            }
        ];

        const html = (ContributeWebviewProvider as any).renderHtml(mockDiscovered, 'producer@company.com', '/workspace');

        assert.ok(html.includes('Engineering Commons: Contribute AI Artifact'), 'Should contain title');
        assert.ok(html.includes('Select Workspace Artifact'), 'Should contain discovery section');
        assert.ok(html.includes('Browse Custom File/Folder...'), 'Should contain custom file picker button');
        assert.ok(html.includes('design-reviewer'), 'Should list discovered design-reviewer');
        assert.ok(html.includes('review-and-refactor'), 'Should list discovered review-and-refactor');
        assert.ok(html.includes('Artifact Identifier / Name'), 'Should contain name field');
        assert.ok(html.includes('Artifact Type'), 'Should contain type selector');
        assert.ok(html.includes('Included Files in Package'), 'Should contain files inspector');
        assert.ok(html.includes('Submit for Peer Review & Publish'), 'Should contain submit button');
    });

    it('2. Form supports all AI artifact types', () => {
        const html = (ContributeWebviewProvider as any).renderHtml([], 'producer@company.com', '/workspace');

        assert.ok(html.includes('value="agent"'), 'Should support Agent');
        assert.ok(html.includes('value="skill"'), 'Should support Skill');
        assert.ok(html.includes('value="plugin"'), 'Should support Plugin');
        assert.ok(html.includes('value="mcpserver"'), 'Should support MCP Server');
        assert.ok(html.includes('value="prompt"'), 'Should support Prompt');
        assert.ok(html.includes('value="package"'), 'Should support CIP Package');
    });

    it('3. Unauthenticated users are blocked from opening contribute panel', async () => {
        auth.authenticated = false;
        const uri = { fsPath: '/ext' } as any;

        // Calling show when unauthenticated should return early without creating panel
        await ContributeWebviewProvider.show(uri, cli, auth, logger, 'engineering-commons');
        assert.strictEqual(ContributeWebviewProvider.currentPanel, undefined);
    });

    it('4. Form renders visibility options (Public and Private)', () => {
        const html = (ContributeWebviewProvider as any).renderHtml([], 'producer@company.com', '/workspace');
        assert.ok(html.includes('Visibility & Access Control'), 'Should contain visibility heading');
        assert.ok(html.includes('id="vis-public"'), 'Should contain public option');
        assert.ok(html.includes('id="vis-private"'), 'Should contain private option');
        assert.ok(html.includes('Public (Marketplace)'), 'Should display Public (Marketplace) title');
        assert.ok(html.includes('Private (Development)'), 'Should display Private (Development) title');
    });

    it('5. handleSubmit passes --private flag to CLI when isPrivate is true', async () => {
        (ContributeWebviewProvider as any).cliExecutor = cli;
        (ContributeWebviewProvider as any).cliExecutable = 'engineering-commons';
        (ContributeWebviewProvider as any).usageLogger = logger;

        const mockPanel = {
            webview: {
                postMessage: () => {}
            }
        } as any;

        await (ContributeWebviewProvider as any).handleSubmit(mockPanel, '/workspace', {
            name: 'my-private-agent',
            path: '.agents/my-private-agent.agent.md',
            isPrivate: true
        });

        const calls = cli.executedCalls.filter(c => c.args[0] === 'contribute');
        assert.strictEqual(calls.length, 1);
        assert.ok(calls[0].args.includes('--private'), 'Should include --private CLI argument');
    });
});
