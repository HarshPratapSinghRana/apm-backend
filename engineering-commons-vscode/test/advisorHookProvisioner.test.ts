import { expect } from 'chai';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
const http = require('http');
const https = require('https');
import { AdvisorHookProvisioner, ADVISOR_SKILL_NAME } from '../src/services/advisorHookProvisioner';
import { MockAuthProvider } from './mocks';

describe('AdvisorHookProvisioner & GitHub Copilot Discovery Tests', () => {
    let tmpDir: string;
    let originalHttpsRequest: any;
    let originalHttpRequest: any;
    let networkRequestCount: number;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cip-advisor-test-'));
        networkRequestCount = 0;
        originalHttpsRequest = https.request;
        originalHttpRequest = http.request;

        (https as any).request = (...args: any[]) => {
            networkRequestCount++;
            return originalHttpsRequest.apply(https, args);
        };
        (http as any).request = (...args: any[]) => {
            networkRequestCount++;
            return originalHttpRequest.apply(http, args);
        };
    });

    afterEach(() => {
        (https as any).request = originalHttpsRequest;
        (http as any).request = originalHttpRequest;
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {}
    });

    it('1. provisions engineering-commons-advisor skill, prompt, and copilot instructions with ZERO network calls', () => {
        const success = AdvisorHookProvisioner.provisionWorkspaceHooks(tmpDir);
        expect(success).to.be.true;

        // Verify ZERO network calls were dispatched during provisioning
        expect(networkRequestCount).to.equal(0);

        // Verify .github/skills/engineering-commons-advisor/SKILL.md
        const githubSkillFile = path.join(tmpDir, '.github', 'skills', ADVISOR_SKILL_NAME, 'SKILL.md');
        expect(fs.existsSync(githubSkillFile)).to.be.true;
        const skillContent = fs.readFileSync(githubSkillFile, 'utf8');
        expect(skillContent).to.include('name: engineering-commons-advisor');
        expect(skillContent).to.include('Autonomous Engineering Commons AI Artifact Advisor & Matcher');

        // Verify .github/skills/engineering-commons-advisor/references/catalog.json
        const githubCatalogFile = path.join(tmpDir, '.github', 'skills', ADVISOR_SKILL_NAME, 'references', 'catalog.json');
        expect(fs.existsSync(githubCatalogFile)).to.be.true;
        const catalogData = JSON.parse(fs.readFileSync(githubCatalogFile, 'utf8'));
        expect(Array.isArray(catalogData)).to.be.true;
        expect(catalogData.length).to.be.greaterThan(10);

        // Verify .agents/skills/engineering-commons-advisor/SKILL.md
        const agentsSkillFile = path.join(tmpDir, '.agents', 'skills', ADVISOR_SKILL_NAME, 'SKILL.md');
        expect(fs.existsSync(agentsSkillFile)).to.be.true;

        // Verify .github/prompts/find-artifact.prompt.md
        const promptFile = path.join(tmpDir, '.github', 'prompts', 'find-artifact.prompt.md');
        expect(fs.existsSync(promptFile)).to.be.true;
        const promptContent = fs.readFileSync(promptFile, 'utf8');
        expect(promptContent).to.include('name: find-artifact');

        // Verify .github/copilot-instructions.md
        const instructionsFile = path.join(tmpDir, '.github', 'copilot-instructions.md');
        expect(fs.existsSync(instructionsFile)).to.be.true;
        const instructionsContent = fs.readFileSync(instructionsFile, 'utf8');
        expect(instructionsContent).to.include('Engineering Commons AI Artifact Advisor & Discovery');
    });

    it('2. all artifacts in catalog have non-empty description, type, and valid metadata for Copilot matching', () => {
        AdvisorHookProvisioner.provisionWorkspaceHooks(tmpDir);
        const catalogFile = path.join(tmpDir, '.github', 'skills', ADVISOR_SKILL_NAME, 'references', 'catalog.json');
        const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));

        expect(catalog.length).to.be.greaterThan(50);
        for (const item of catalog) {
            expect(item.name, `Artifact missing name: ${JSON.stringify(item)}`).to.be.a('string').and.not.be.empty;
            expect(item.type, `Artifact ${item.name} missing type`).to.be.a('string').and.not.be.empty;
            expect(item.description, `Artifact ${item.name} missing description`).to.be.a('string').and.have.lengthOf.at.least(10);
            expect(item.installCommand, `Artifact ${item.name} missing installCommand`).to.include('engineering-commons install');
        }

        // Verify key spotlight artifacts exist with high quality frontmatter
        const names = catalog.map((a: any) => a.name.toLowerCase());
        expect(names).to.include('api-test-generator');
        expect(names).to.include('database-migration-guardian');
        expect(names).to.include('cloud-finops-sentinel');
        expect(names).to.include('playwright-e2e-synthesizer');
        expect(names).to.include('graphql-schema-guardian');
        expect(names).to.include('secops-threat-hunter');
        expect(names).to.include('terraform-compliance-guard');
    });

    it('3. preserves existing .github/copilot-instructions.md and cleanly appends Engineering Commons hook', () => {
        const githubDir = path.join(tmpDir, '.github');
        fs.mkdirSync(githubDir, { recursive: true });
        const existingPath = path.join(githubDir, 'copilot-instructions.md');
        fs.writeFileSync(existingPath, '# My Existing Workspace Rules\n- Follow SOLID principles.\n', 'utf8');

        AdvisorHookProvisioner.provisionWorkspaceHooks(tmpDir);

        const updated = fs.readFileSync(existingPath, 'utf8');
        expect(updated).to.include('# My Existing Workspace Rules');
        expect(updated).to.include('- Follow SOLID principles.');
        expect(updated).to.include('## Engineering Commons AI Artifact Advisor & Discovery');
    });

    it('4. live catalog sync executes and updates catalog reference ONLY when user logs in', async () => {
        AdvisorHookProvisioner.provisionWorkspaceHooks(tmpDir);

        const mockAuth = new MockAuthProvider(false, undefined, undefined, 'CONSUMER');

        // Mock HTTP request to return sample updated live marketplace items
        const EventEmitter = require('events');
        const customHttpsRequest = (...args: any[]) => {
            networkRequestCount++;
            const req = new EventEmitter();
            const callback = typeof args[1] === 'function' ? args[1] : (typeof args[2] === 'function' ? args[2] : null);
            req.write = () => {};
            req.end = () => {
                if (callback) {
                    const res = new EventEmitter();
                    res.statusCode = 200;
                    callback(res);
                    process.nextTick(() => {
                        res.emit('data', JSON.stringify([
                            {
                                id: 'new-live-agent',
                                name: 'new-live-agent',
                                title: 'New Live Enterprise Agent',
                                type: 'agent',
                                description: 'Newly published live agent from internal team',
                                isCertified: true,
                                keyFeatures: ['Real-time sync', 'Auto resolution']
                            }
                        ]));
                        res.emit('end');
                    });
                }
            };
            req.setTimeout = () => req;
            req.destroy = () => {};
            return req;
        };

        (https as any).request = customHttpsRequest;

        try {
            const sub = AdvisorHookProvisioner.registerAuthSync(mockAuth, 'https://ecommerce-app-chi-wine.vercel.app', () => tmpDir);

            // Initially unauthenticated: 0 network calls dispatched
            expect(networkRequestCount).to.equal(0);

            // User logs in now
            mockAuth.setAuthenticated(true, 'mock-user-token', 'user@company.com', 'PRODUCER');

            // Allow tick for async fetch & merge
            await new Promise(r => setTimeout(r, 120));

            expect(networkRequestCount).to.be.greaterThan(0);

            // Check that newly synced live item was merged into the catalog
            const catalogFile = path.join(tmpDir, '.github', 'skills', ADVISOR_SKILL_NAME, 'references', 'catalog.json');
            const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
            const found = catalog.find((a: any) => a.name === 'new-live-agent');
            expect(found).to.not.be.undefined;
            expect(found.title).to.equal('New Live Enterprise Agent');

            sub.dispose();
        } finally {
            (https as any).request = originalHttpsRequest;
            (http as any).request = originalHttpRequest;
        }
    });

    it('5. syncLiveCatalogFromArtifacts persists full frontmatter directly from single marketplace load with ZERO additional network calls', () => {
        AdvisorHookProvisioner.provisionWorkspaceHooks(tmpDir);

        // Reset network counter
        networkRequestCount = 0;

        // Simulate artifacts payload loaded from the single /api/artifacts API call
        const singleApiCallMarketplacePayload = [
            {
                id: 'custom-cloud-optimizer',
                name: 'custom-cloud-optimizer',
                title: 'Custom Cloud Optimizer',
                type: 'agent',
                version: '2.1.0',
                domain: 'Cloud Infrastructure & FinOps',
                category: 'Infrastructure',
                description: 'Autonomous multi-cloud cost and performance optimizer with real-time rightsizing.',
                isCertified: true,
                tags: ['cloud', 'finops', 'aws', 'azure'],
                useCases: ['Reduce AWS EC2 overspending', 'Right-size Azure SQL databases'],
                keyFeatures: ['Idle instance detection', 'Automated reservation plan optimizer']
            }
        ];

        // Sync to workspace skill reference directly from the single marketplace load
        const synced = AdvisorHookProvisioner.syncLiveCatalogFromArtifacts(singleApiCallMarketplacePayload, tmpDir);
        expect(synced).to.be.true;

        // Zero additional network calls occurred during sync
        expect(networkRequestCount).to.equal(0);

        // Verify .github skill reference catalog has full frontmatter
        const githubCatalogPath = path.join(tmpDir, '.github', 'skills', ADVISOR_SKILL_NAME, 'references', 'catalog.json');
        expect(fs.existsSync(githubCatalogPath)).to.be.true;
        const catalog = JSON.parse(fs.readFileSync(githubCatalogPath, 'utf8'));

        const item = catalog.find((a: any) => a.name === 'custom-cloud-optimizer');
        expect(item).to.not.be.undefined;
        expect(item.type).to.equal('agent');
        expect(item.domain).to.equal('Cloud Infrastructure & FinOps');
        expect(item.description).to.include('Autonomous multi-cloud cost and performance optimizer');
        expect(item.isCertified).to.be.true;
        expect(item.tags).to.deep.equal(['cloud', 'finops', 'aws', 'azure']);
        expect(item.useCases).to.deep.equal(['Reduce AWS EC2 overspending', 'Right-size Azure SQL databases']);
        expect(item.keyFeatures).to.deep.equal(['Idle instance detection', 'Automated reservation plan optimizer']);
        expect(item.installCommand).to.equal('engineering-commons install custom-cloud-optimizer');

        // Verify .agents skill reference catalog also received the same frontmatter
        const agentsCatalogPath = path.join(tmpDir, '.agents', 'skills', ADVISOR_SKILL_NAME, 'references', 'catalog.json');
        expect(fs.existsSync(agentsCatalogPath)).to.be.true;
        const agentsCatalog = JSON.parse(fs.readFileSync(agentsCatalogPath, 'utf8'));
        const agentsItem = agentsCatalog.find((a: any) => a.name === 'custom-cloud-optimizer');
        expect(agentsItem).to.not.be.undefined;
        expect(agentsItem.installCommand).to.equal('engineering-commons install custom-cloud-optimizer');
    });
});
