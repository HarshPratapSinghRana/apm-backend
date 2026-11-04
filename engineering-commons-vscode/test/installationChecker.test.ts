import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
    checkArtifactInstallation,
    getAllInstalledArtifacts,
    normalizeArtifactName
} from '../src/services/installationChecker';

describe('Artifact Installation & Disk-Verification Tests', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cip-install-test-'));
    });

    afterEach(() => {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch { }
    });

    it('1. normalizes artifact names from diverse package identifiers', () => {
        assert.strictEqual(normalizeArtifactName('harshpratapsinghrana1/enterprise-reviewer#v1.0.0'), 'enterprise-reviewer');
        assert.strictEqual(normalizeArtifactName('enterprise-reviewer'), 'enterprise-reviewer');
        assert.strictEqual(normalizeArtifactName('company.cip.enterprise-reviewer'), 'enterprise-reviewer');
        assert.strictEqual(normalizeArtifactName('org/team/custom-skill#2.1.0'), 'custom-skill');
    });

    it('2. returns isInstalled: true when manifest exists and placed files exist on disk', () => {
        const manifestDir = path.join(tempDir, '.cip', 'installed');
        fs.mkdirSync(manifestDir, { recursive: true });

        const placedFileRel = '.github/agents/enterprise-reviewer/enterprise-reviewer.agent.md';
        const placedFileFull = path.join(tempDir, placedFileRel);
        fs.mkdirSync(path.dirname(placedFileFull), { recursive: true });
        fs.writeFileSync(placedFileFull, '# Enterprise Reviewer Agent');

        fs.writeFileSync(
            path.join(manifestDir, 'enterprise-reviewer.json'),
            JSON.stringify({
                ArtifactName: 'enterprise-reviewer',
                ArtifactType: 'agent',
                Version: '1.0.0',
                PlacedFiles: [placedFileRel]
            })
        );

        const check = checkArtifactInstallation(tempDir, 'enterprise-reviewer');
        assert.strictEqual(check.isInstalled, true);
        assert.strictEqual(check.version, '1.0.0');
        assert.strictEqual(check.type, 'agent');

        // Also test package string matching
        const checkFromPackage = checkArtifactInstallation(tempDir, 'harshpratapsinghrana1/enterprise-reviewer#v1.0.0');
        assert.strictEqual(checkFromPackage.isInstalled, true);
    });

    it('3. returns isInstalled: false when manifest exists but all placed files were deleted from disk', () => {
        const manifestDir = path.join(tempDir, '.cip', 'installed');
        fs.mkdirSync(manifestDir, { recursive: true });

        const nonExistentFileRel = '.github/agents/deleted-agent/agent.md';
        fs.writeFileSync(
            path.join(manifestDir, 'deleted-agent.json'),
            JSON.stringify({
                ArtifactName: 'deleted-agent',
                ArtifactType: 'agent',
                Version: '1.0.0',
                PlacedFiles: [nonExistentFileRel]
            })
        );

        const check = checkArtifactInstallation(tempDir, 'deleted-agent');
        assert.strictEqual(check.isInstalled, false);
    });

    it('4. detects installed artifacts from canonical workspace folders without manifest', () => {
        const skillPath = path.join(tempDir, '.agents', 'skills', 'custom-test-skill', 'SKILL.md');
        fs.mkdirSync(path.dirname(skillPath), { recursive: true });
        fs.writeFileSync(skillPath, '# Custom Skill');

        const check = checkArtifactInstallation(tempDir, 'custom-test-skill');
        assert.strictEqual(check.isInstalled, true);
        assert.strictEqual(check.type, 'skill');
    });

    it('5. getAllInstalledArtifacts returns all disk-verified artifacts and ignores deleted manifests', () => {
        const manifestDir = path.join(tempDir, '.cip', 'installed');
        fs.mkdirSync(manifestDir, { recursive: true });

        // Valid artifact A
        const fileA = path.join(tempDir, '.github', 'agents', 'valid-agent', 'agent.md');
        fs.mkdirSync(path.dirname(fileA), { recursive: true });
        fs.writeFileSync(fileA, '# Agent');
        fs.writeFileSync(
            path.join(manifestDir, 'valid-agent.json'),
            JSON.stringify({
                ArtifactName: 'valid-agent',
                ArtifactType: 'agent',
                Version: '1.2.0',
                PlacedFiles: ['.github/agents/valid-agent/agent.md']
            })
        );

        // Stale/deleted artifact B (files missing)
        fs.writeFileSync(
            path.join(manifestDir, 'ghost-agent.json'),
            JSON.stringify({
                ArtifactName: 'ghost-agent',
                ArtifactType: 'agent',
                Version: '1.0.0',
                PlacedFiles: ['.github/agents/ghost/ghost.md']
            })
        );

        const all = getAllInstalledArtifacts(tempDir);
        const names = all.map(a => a.name);

        assert.ok(names.includes('valid-agent'), 'Should include valid-agent');
        assert.ok(!names.includes('ghost-agent'), 'Should NOT include ghost-agent whose files are deleted');
    });
});
