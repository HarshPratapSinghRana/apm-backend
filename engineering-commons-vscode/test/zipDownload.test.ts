import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';
import { createZipBuffer, computeCrc32 } from '../src/services/zipArchiveService';
import { executeDownloadZipCommand, executeInstallCommand } from '../src/commands/installCommand';
import { MockCliExecutor, MockAuthProvider } from './mocks';

describe('Artifact ZIP Packaging & Download Feature Tests', function () {
    this.timeout(10000);
    let auth: MockAuthProvider;
    let cli: MockCliExecutor;
    let mockLogger: any;
    let loggedActions: any[] = [];

    beforeEach(() => {
        auth = new MockAuthProvider();
        auth.authenticated = true;
        auth.email = 'harsh.rana@maqsoftware.com';
        cli = new MockCliExecutor();
        loggedActions = [];
        mockLogger = {
            logActionAsync: async (action: string, artifactName: string, type: string, version: string, pathOrDetails: string) => {
                loggedActions.push({ action, artifactName, type, version, pathOrDetails });
            }
        };
    });

    it('1. computeCrc32 produces valid IEEE 802.3 CRC-32 checksums', () => {
        const testBuf = Buffer.from('123456789', 'utf8');
        const crc = computeCrc32(testBuf);
        // Standard CRC-32 for "123456789" is 0xCBF43926 (3421780262)
        assert.strictEqual(crc, 0xCBF43926);
    });

    it('2. createZipBuffer generates standard PKZIP archive with valid signatures', () => {
        const files = [
            { path: '.github/agents/test-agent.agent.md', content: '# Test Agent\nDirective: enterprise' },
            { path: 'cip.yml', content: 'name: test-agent\nversion: 1.0.0\n' }
        ];

        const zip = createZipBuffer(files);
        assert.ok(zip.length > 100, 'Zip buffer should have valid size');

        // Check local file header signature: PK\x03\x04
        assert.strictEqual(zip.readUInt32LE(0), 0x04034b50, 'Must start with local file header signature');

        // Check End of Central Directory signature: PK\x05\x06 at the end
        const eocdSignature = zip.readUInt32LE(zip.length - 22);
        assert.strictEqual(eocdSignature, 0x06054b50, 'Must conclude with End of Central Directory signature');
    });

    it('3. executeDownloadZipCommand packages artifact files into user-selected ZIP destination and logs DOWNLOAD', async () => {
        const tmpZipPath = path.join(os.tmpdir(), `test_download_${Date.now()}.zip`);
        const saveUri = vscode.Uri.file(tmpZipPath);

        try {
            const success = await executeDownloadZipCommand(auth, mockLogger, 'design-reviewer', '1.0.0', saveUri);
            assert.strictEqual(success, true, 'Download ZIP command should succeed');
            assert.ok(fs.existsSync(tmpZipPath), 'Target zip file should be written to disk');

            const stat = fs.statSync(tmpZipPath);
            assert.ok(stat.size > 100, 'ZIP file must have non-zero size');

            // Verify telemetry logging
            assert.strictEqual(loggedActions.length, 1, 'Should log 1 action');
            assert.strictEqual(loggedActions[0].action, 'DOWNLOAD', 'Action must be DOWNLOAD');
            assert.strictEqual(loggedActions[0].artifactName, 'design-reviewer');
        } finally {
            try { if (fs.existsSync(tmpZipPath)) fs.unlinkSync(tmpZipPath); } catch {}
        }
    });

    it('4. executeInstallCommand with mode "zip" delegates to ZIP download without requiring workspace folder', async () => {
        const tmpZipPath = path.join(os.tmpdir(), `test_mode_zip_${Date.now()}.zip`);
        // Override mock showSaveDialog to point to tmpZipPath
        (vscode.window as any).showSaveDialog = async () => vscode.Uri.file(tmpZipPath);

        try {
            const success = await executeInstallCommand(cli, auth, mockLogger, { name: 'design-reviewer', mode: 'zip' });
            assert.strictEqual(success, true, 'Install with mode zip should succeed');
            assert.ok(fs.existsSync(tmpZipPath), 'Zip file should be created');

            assert.strictEqual(loggedActions.length, 1);
            assert.strictEqual(loggedActions[0].action, 'DOWNLOAD');
        } finally {
            try { if (fs.existsSync(tmpZipPath)) fs.unlinkSync(tmpZipPath); } catch {}
        }
    });

    it('5. executeInstallCommand with mode "workspace" installs directly into workspace', async () => {
        const testWorkspace = path.join(os.tmpdir(), `cip_ws_${Date.now()}`);
        fs.mkdirSync(testWorkspace, { recursive: true });
        const prev = (vscode.workspace as any).workspaceFolders;
        (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: testWorkspace } }];

        try {
            cli.mockResult = { exitCode: 0, stdout: 'Installed successfully.', stderr: '', success: true };
            const success = await executeInstallCommand(cli, auth, mockLogger, { name: 'design-reviewer', mode: 'workspace' });
            assert.strictEqual(success, true, 'Workspace install should succeed');

            // Workspace should contain placed files or cip.yml
            const cipYml = path.join(testWorkspace, 'cip.yml');
            assert.ok(fs.existsSync(cipYml), 'cip.yml should be placed in workspace');

            assert.strictEqual(loggedActions.length, 1);
            assert.strictEqual(loggedActions[0].action, 'INSTALL');
        } finally {
            (vscode.workspace as any).workspaceFolders = prev;
            try { fs.rmSync(testWorkspace, { recursive: true, force: true }); } catch {}
        }
    });
});
