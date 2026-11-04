import * as assert from 'assert';
import * as vscode from 'vscode';
import { ArtifactDetailsWebviewProvider } from '../src/views/artifactDetailsWebviewProvider';
import { ArtifactTreeDataProvider } from '../src/views/artifactTreeDataProvider';
import { MockCliExecutor, MockAuthProvider } from './mocks';
import { DiscoveredArtifactItem } from '../src/commands/listCommand';

describe('Artifact Details View & Explicit Installation Tests', function () {
    this.timeout(10000);
    let cli: MockCliExecutor;
    let auth: MockAuthProvider;
    let tree: ArtifactTreeDataProvider;

    beforeEach(() => {
        cli = new MockCliExecutor();
        auth = new MockAuthProvider();
        auth.authenticated = true;
        auth.email = 'consumer@company.com';
        tree = new ArtifactTreeDataProvider(cli, auth, 'engineering-commons', 'http://localhost:5000');
    });

    it('1. Clicking artifact in tree assigns showArtifactDetails command (does NOT install)', async () => {
        cli.mockResult = {
            exitCode: 0,
            stdout: `
NAME                 TYPE       VERSION 
--------------------------------------------
design-reviewer      agent      1.1.0   
accessibility-fix    agent      1.0.0   
`,
            stderr: '',
            success: true
        };

        const roots = await tree.getChildren();
        const marketplaceRoot = roots.find(c => c.category === 'marketplace');
        assert.ok(marketplaceRoot, 'Marketplace root category should exist');

        const categories = await tree.getChildren(marketplaceRoot);
        const browseAll = categories.find(c => c.label === 'Browse All Artifacts' || c.category === 'marketplace:all');
        assert.ok(browseAll, 'Browse All Artifacts category should exist');

        const items = await tree.getChildren(browseAll);
        assert.strictEqual(items.length, 2, 'Should have 2 artifacts');

        const designReviewer = items[0];
        assert.strictEqual(designReviewer.label, 'design-reviewer');
        assert.ok(designReviewer.command, 'Item should have command attached');
        assert.strictEqual(designReviewer.command.command, 'engineeringCommons.showArtifactDetails', 'Command should be showArtifactDetails');
        assert.notStrictEqual(designReviewer.command.command, 'engineeringCommons.install', 'Command must NOT be engineeringCommons.install');

        // Verify CLI install was NOT called when generating/clicking the tree item
        const installCalls = cli.executedCalls.filter(c => c.args.includes('install'));
        assert.strictEqual(installCalls.length, 0, 'Clicking tree item must not trigger install');
    });

    it('2. Artifact details provider resolves metadata, versions, and file structure', async () => {
        const provider = new ArtifactDetailsWebviewProvider(auth, cli, 'engineering-commons', 'http://localhost:5000');
        const artifact: DiscoveredArtifactItem = {
            name: 'design-reviewer',
            type: 'agent',
            version: '1.1.0'
        };

        const details = await (provider as any).fetchArtifactDetails(artifact, '1.1.0');
        assert.strictEqual(details.name, 'design-reviewer');
        assert.strictEqual(details.type, 'agent');
        assert.strictEqual(details.version, '1.1.0');
        assert.ok(details.files.length > 0, 'Should include files list');
        assert.ok(details.availableVersions.length > 0, 'Should include versions list');
    });

    it('3. Explicit install button triggers CLI install with selected version', async () => {
        const provider = new ArtifactDetailsWebviewProvider(auth, cli, 'engineering-commons', 'http://localhost:5000');
        const artifact: DiscoveredArtifactItem = {
            name: 'design-reviewer',
            type: 'agent',
            version: '1.1.0'
        };

        // Simulate install action
        await (provider as any).handleInstall(
            { webview: { postMessage: () => {} } },
            'design-reviewer',
            '1.0.0',
            'agent'
        );

        const installCalls = cli.executedCalls.filter(c => c.args[0] === 'install');
        assert.strictEqual(installCalls.length, 1, 'Install should be called once');
        assert.strictEqual(installCalls[0].args[1], 'design-reviewer');
        assert.ok(installCalls[0].args.includes('--version'), 'Should pass --version');
        assert.ok(installCalls[0].args.includes('1.0.0'), 'Should pass selected version 1.0.0');
    });

    it('4. Unauthenticated users are blocked from installing', async () => {
        auth.authenticated = false;
        auth.email = undefined;

        const provider = new ArtifactDetailsWebviewProvider(auth, cli, 'engineering-commons', 'http://localhost:5000');
        await (provider as any).handleInstall(
            { webview: { postMessage: () => {} } },
            'design-reviewer',
            '1.1.0',
            'agent'
        );

        const installCalls = cli.executedCalls.filter(c => c.args[0] === 'install');
        assert.strictEqual(installCalls.length, 0, 'Unauthenticated install must be blocked');
    });

    it('5. Interactive files list provides expandable content preview and openInEditor action', async () => {
        const provider = new ArtifactDetailsWebviewProvider(auth, cli, 'engineering-commons', 'http://localhost:5000');
        const artifact: DiscoveredArtifactItem = {
            name: 'accessibility-fix',
            type: 'agent',
            version: '1.0.0'
        };

        const details = await (provider as any).fetchArtifactDetails(artifact, '1.0.0');
        const html = (provider as any).getHtmlForWebview(details);

        assert.ok(html.includes('file-card'), 'Should render file-card container');
        assert.ok(html.includes('openInEditor'), 'Should render openInEditor action');
        assert.ok(html.includes('toggleFileContent'), 'Should render toggleFileContent handler');
        assert.ok(html.includes('copyFileContent'), 'Should render copyFileContent handler');
        assert.ok(html.includes('file-content-pre'), 'Should render code pre block');
    });

    it('6. Artifact with agent files structure is dynamically resolved to type agent', async () => {
        const provider = new ArtifactDetailsWebviewProvider(auth, cli, 'engineering-commons', 'http://localhost:5000');
        const artifact: DiscoveredArtifactItem = {
            name: 'accessibility-fix',
            type: 'normalfile', // Intentionally pass outdated/fallback type
            version: '1.0.0'
        };

        const details = await (provider as any).fetchArtifactDetails(artifact, '1.0.0');
        assert.strictEqual(details.type, 'agent', 'Should dynamically resolve to agent type from files');
    });

    it('7. Artifact details view renders visibility badge and Make Public button for owner', () => {
        const provider = new ArtifactDetailsWebviewProvider(auth, cli, 'engineering-commons', 'http://localhost:5000');
        const details = {
            id: 'dev-skill',
            name: 'dev-skill',
            type: 'skill',
            version: '1.0.0',
            description: 'Under development skill',
            producerEmail: 'consumer@company.com',
            isPrivate: true,
            isOwner: true,
            files: [{ path: 'SKILL.md', content: 'test' }],
            availableVersions: [{ version: '1.0.0', cipPackage: 'dev-skill', isLatest: true }],
            isInstalled: false
        };

        const html = (provider as any).getHtmlForWebview(details);
        assert.ok(html.includes('badge-private'), 'Should render private badge');
        assert.ok(html.includes('Make Public'), 'Owner should see Make Public button');
        assert.ok(html.includes('toggleVisibility(false)'), 'Should call toggleVisibility with false');
    });

    it('8. Artifact details view renders Install to Workspace and Download ZIP buttons', () => {
        const provider = new ArtifactDetailsWebviewProvider(auth, cli, 'engineering-commons', 'http://localhost:5000');
        const details = {
            id: 'design-reviewer',
            name: 'design-reviewer',
            type: 'agent',
            version: '1.0.0',
            description: 'Design reviewer agent',
            producerEmail: 'producer@company.com',
            files: [{ path: '.github/agents/design-reviewer.agent.md', content: 'test' }],
            availableVersions: [{ version: '1.0.0', cipPackage: 'company.cip.design-reviewer', isLatest: true }],
            isInstalled: false,
            hasDownloaded: true,
            hasUsed: true
        };

        const html = (provider as any).getHtmlForWebview(details);
        assert.ok(html.includes('Install to Workspace'), 'Should render Install to Workspace button');
        assert.ok(html.includes('Download ZIP'), 'Should render Download ZIP button');
        assert.ok(html.includes('triggerDownloadZip'), 'Should include triggerDownloadZip click handler');
    });
});
