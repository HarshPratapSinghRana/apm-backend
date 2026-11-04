import { expect } from 'chai';
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { ArtifactRegistry } from '../src/services/artifactRegistry';
import { AgentDebugLogCollector, OpenTelemetryUsageCollector } from '../src/services/artifactUsageCollector';
import { ArtifactUsageTracker, CopilotUsageProvider } from '../src/services/usageTracker';
import { MockAuthProvider, MockBackendUsageClient, MockCliExecutor } from './mocks';

describe('Engineering Commons Agent Debug Log & OpenTelemetry Usage Tracking Tests', () => {
    let registry: ArtifactRegistry;
    let mockBackend: MockBackendUsageClient;
    let mockAuth: MockAuthProvider;
    let usageTracker: ArtifactUsageTracker;
    let collector: AgentDebugLogCollector;

    beforeEach(() => {
        registry = new ArtifactRegistry();
        mockBackend = new MockBackendUsageClient();
        mockAuth = new MockAuthProvider();
        mockAuth.authenticated = true;
        mockAuth.email = 'engineer@company.com';

        // Register sample multi-file artifacts
        registry.registerArtifact({
            id: 'design-reviewer',
            name: 'design-reviewer',
            version: '1.1.0',
            type: 'agent',
            installedPath: '/workspace/.github/agents/design-reviewer',
            files: ['cip.yml', 'agents/reviewer.md', 'skills/accessibility/skill.md', 'readme.md'],
            skillNames: ['design-reviewer', 'design_review', 'accessibility_check'],
            agentNames: ['design-reviewer', 'reviewer_agent']
        });

        registry.registerArtifact({
            id: 'accessibility-skill',
            name: 'accessibility-skill',
            version: '1.0.0',
            type: 'skill',
            installedPath: '/workspace/.github/skills/accessibility-skill',
            files: ['cip.yml', 'skills/accessibility/skill.md'],
            skillNames: ['accessibility-skill', 'wcag_audit'],
            agentNames: []
        });

        registry.registerArtifact({
            id: 'sql-agent',
            name: 'sql-agent',
            version: '2.0.0',
            type: 'agent',
            installedPath: '/workspace/.github/agents/sql-agent',
            files: ['cip.yml', 'agents/sql.md'],
            skillNames: ['sql_transform', 'sql_optimizer'],
            agentNames: ['sql-agent']
        });

        usageTracker = new ArtifactUsageTracker(mockBackend, mockAuth, registry);
        collector = new AgentDebugLogCollector(registry);
        usageTracker.registerCollector(collector);
    });

    // 1. Artifact installation creates INSTALL event
    it('1. Artifact installation creates INSTALL event with source VS_CODE', async () => {
        const success = await usageTracker.trackInstallAsync('design-reviewer', '1.1.0', 'agent', 'sess-100');
        expect(success).to.be.true;

        expect(mockBackend.sentEvents.length).to.equal(1);
        expect(mockBackend.sentEvents[0].event.eventType).to.equal('INSTALL');
        expect(mockBackend.sentEvents[0].event.artifactId).to.equal('design-reviewer');
        expect(mockBackend.sentEvents[0].event.artifactVersion).to.equal('1.1.0');
        expect(mockBackend.sentEvents[0].event.source).to.equal('VS_CODE');
    });

    // 2. Artifact invocation creates INVOKE event with source GITHUB_COPILOT
    it('2. Artifact invocation creates INVOKE event with source GITHUB_COPILOT', async () => {
        let detectedEvent: any = null;
        collector.onDidDetectUsage((ev) => {
            detectedEvent = ev;
        });

        const logSample = `[2026-08-24T10:15:30Z] [Agent] Loading skill: accessibility_check (session_id: sess-copilot-1)`;
        collector.parseLogContent(logSample, 'test.log');

        expect(detectedEvent).to.not.be.null;
        expect(detectedEvent.eventType).to.equal('INVOKE');
        expect(detectedEvent.artifactId).to.equal('design-reviewer');
        expect(detectedEvent.source).to.equal('GITHUB_COPILOT');
        expect(detectedEvent.sessionId).to.equal('sess-copilot-1');
    });

    it('2b. Copilot Chat chatSessions JSON line creates INVOKE event', async () => {
        let detectedEvent: any = null;
        collector.onDidDetectUsage((ev) => {
            detectedEvent = ev;
        });

        const chatSessionLine = JSON.stringify({
            kind: 1,
            k: ['inputState', 'mode'],
            v: {
                id: 'file:///c%3A/workspace/.github/skills/accessibility-skill/skills/accessibility/skill.md',
                kind: 'agent'
            },
            sid: 'chat-sess-copilot-99'
        });
        collector.parseLogContent(chatSessionLine, 'chatSessions/test-session.jsonl');

        expect(detectedEvent).to.not.be.null;
        expect(detectedEvent.eventType).to.equal('INVOKE');
        expect(detectedEvent.artifactId).to.equal('accessibility-skill');
        expect(detectedEvent.source).to.equal('GITHUB_COPILOT');
        expect(detectedEvent.sessionId).to.equal('chat-sess-copilot-99');
    });

    // 3. Artifact discovery does NOT create INVOKE event
    it('3. Artifact discovery scanning does NOT create INVOKE event', () => {
        let detectedCount = 0;
        collector.onDidDetectUsage(() => {
            detectedCount++;
        });

        const discoveryLogs = `
[2026-08-24T10:00:00Z] Discovered skill in /workspace/.github/skills/accessibility-skill
[2026-08-24T10:00:01Z] Scanning skills directory for agent runtime
[2026-08-24T10:00:02Z] Skills available: design-reviewer, accessibility-skill, sql-agent
[2026-08-24T10:00:03Z] Registered skill wcag_audit into tool index
        `;

        collector.parseLogContent(discoveryLogs, 'test.log');
        expect(detectedCount).to.equal(0);
        expect(mockBackend.sentEvents.length).to.equal(0);
    });

    // 4. Installed artifact without usage remains at 0 usage
    it('4. Installed artifact without usage does not emit invoke events', async () => {
        await usageTracker.trackInstallAsync('sql-agent', '2.0.0', 'agent');
        
        // Backend only has 1 event (INSTALL)
        expect(mockBackend.sentEvents.length).to.equal(1);
        expect(mockBackend.sentEvents[0].event.eventType).to.equal('INSTALL');
        
        const invokeEvents = mockBackend.sentEvents.filter(e => e.event.eventType === 'INVOKE');
        expect(invokeEvents.length).to.equal(0);
    });

    // 5. Skill invocation is associated with correct skill
    it('5. Skill invocation is associated with correct skill artifact', () => {
        let detected: any = null;
        collector.onDidDetectUsage((ev) => { detected = ev; });

        const log = `[Agent] Executing skill tool: wcag_audit (session_id: sess-wcag-99)`;
        collector.parseLogContent(log, 'agentSessionsOutput.log');

        expect(detected).to.not.be.null;
        expect(detected.artifactId).to.equal('accessibility-skill');
        expect(detected.artifactVersion).to.equal('1.0.0');
        expect(detected.artifactType).to.equal('skill');
    });

    // 6. Agent invocation is associated with correct agent
    it('6. Agent invocation is associated with correct agent artifact', () => {
        let detected: any = null;
        collector.onDidDetectUsage((ev) => { detected = ev; });

        const log = `[CopilotChat] Invoking custom agent: design-reviewer`;
        collector.parseLogContent(log, 'copilot.log');

        expect(detected).to.not.be.null;
        expect(detected.artifactId).to.equal('design-reviewer');
        expect(detected.artifactType).to.equal('agent');
    });

    // 7. Multi-file artifact resolves to one logical artifact
    it('7. Multi-file artifact resolves sub-file paths back to one logical artifact', () => {
        const res1 = registry.resolveArtifactFromFilePath('.github/agents/design-reviewer/agents/reviewer.md');
        expect(res1).to.not.be.undefined;
        expect(res1?.id).to.equal('design-reviewer');

        const res2 = registry.resolveArtifactFromFilePath('.github/agents/design-reviewer/skills/accessibility/skill.md');
        expect(res2).to.not.be.undefined;
        expect(res2?.id).to.equal('design-reviewer');

        const res3 = registry.resolveArtifactFromFilePath('unknown/path/file.txt');
        expect(res3).to.be.undefined;
    });

    // 8. Duplicate debug events within time window are deduplicated
    it('8. Duplicate debug events within deduplication window generate exactly 1 event', () => {
        let count = 0;
        collector.onDidDetectUsage(() => { count++; });

        const duplicateLogLines = `
[Agent] Loading skill: wcag_audit (session_id: s1)
[Agent] Loading skill: wcag_audit (session_id: s1)
[Tool] Executing skill tool: wcag_audit (session_id: s1)
        `;

        collector.parseLogContent(duplicateLogLines, 'test.log');
        expect(count).to.equal(1);
    });

    // 9. Different artifacts have separate counters
    it('9. Different artifacts maintain separate invocation counters and tracking', async () => {
        (collector as any).reliabilityState = 'OBSERVED';
        await usageTracker.trackInvokeAsync('design-reviewer', '1.1.0', 'agent', 's1', 'GITHUB_COPILOT');
        await usageTracker.trackInvokeAsync('design-reviewer', '1.1.0', 'agent', 's2', 'GITHUB_COPILOT');
        await usageTracker.trackInvokeAsync('accessibility-skill', '1.0.0', 'skill', 's3', 'GITHUB_COPILOT');

        const drEvents = mockBackend.sentEvents.filter(e => e.event.artifactId === 'design-reviewer');
        const accEvents = mockBackend.sentEvents.filter(e => e.event.artifactId === 'accessibility-skill');

        expect(drEvents.length).to.equal(2);
        expect(accEvents.length).to.equal(1);
    });

    // 10. Different versions have separate usage counts
    it('10. Different versions have separate usage records', async () => {
        (collector as any).reliabilityState = 'OBSERVED';
        await usageTracker.trackInvokeAsync('design-reviewer', '1.0.0', 'agent', 's1');
        await usageTracker.trackInvokeAsync('design-reviewer', '1.1.0', 'agent', 's2');

        const v100 = mockBackend.sentEvents.filter(e => e.event.artifactId === 'design-reviewer' && e.event.artifactVersion === '1.0.0');
        const v110 = mockBackend.sentEvents.filter(e => e.event.artifactId === 'design-reviewer' && e.event.artifactVersion === '1.1.0');

        expect(v100.length).to.equal(1);
        expect(v110.length).to.equal(1);
    });

    // 11. Copilot events are labelled GITHUB_COPILOT
    it('11. Copilot events are explicitly labelled with source GITHUB_COPILOT', async () => {
        (collector as any).reliabilityState = 'OBSERVED';
        await usageTracker.trackInvokeAsync('design-reviewer', '1.1.0', 'agent', 's1', 'GITHUB_COPILOT');
        expect(mockBackend.sentEvents[0].event.source).to.equal('GITHUB_COPILOT');
    });

    // 12. Unsupported external usage is not fabricated
    it('12. Unsupported external usage providers report UNAVAILABLE and never fabricate fake data', async () => {
        const claudeProvider = usageTracker.getProvider('CLAUDE');
        expect(claudeProvider.isAvailable()).to.be.false;
        expect(claudeProvider.getTelemetryStatus()).to.equal('EXTERNAL_USAGE_UNAVAILABLE');

        const result = await claudeProvider.trackAsync({
            artifactId: 'design-reviewer',
            artifactName: 'design-reviewer'
        });
        expect(result).to.be.false;
    });

    // 13. Debug logging disabled is reported as unavailable rather than zero
    it('13. Disabled debug logging is reported as UNAVAILABLE', () => {
        const freshCollector = new AgentDebugLogCollector(registry);
        expect(freshCollector.getReliabilityState()).to.equal('UNAVAILABLE');
    });

    // 14. OpenTelemetry collector parses trace spans accurately
    it('14. OpenTelemetry collector parses trace spans for tool invocations', () => {
        const otel = new OpenTelemetryUsageCollector();
        otel.start();

        let detected: any = null;
        otel.onDidDetectUsage((ev) => { detected = ev; });

        otel.processSpan('gen_ai.client.tool.call', {
            'gen_ai.tool.name': 'sql_transform',
            'session.id': 'otel-session-42'
        }, registry);

        expect(detected).to.not.be.null;
        expect(detected.artifactId).to.equal('sql-agent');
        expect(detected.sessionId).to.equal('otel-session-42');
        expect(detected.source).to.equal('GITHUB_COPILOT');
    });

    // 15. Collector status reports reliability states accurately
    it('15. UsageTracker reports collector status with reliability state', () => {
        const statuses = usageTracker.getCollectorStatus();
        expect(statuses.length).to.be.greaterThan(0);
        expect(statuses[0].name).to.equal('Agent Debug Log Collector');
        expect(statuses[0].source).to.equal('GITHUB_COPILOT');
    });
});
