import * as assert from 'assert';
import { CertificationService } from '../src/services/certificationService';
import { MockAuthProvider, MockCliExecutor, MockBackendUsageClient } from './mocks';
import { EngineeringCommonsSidebarWebviewProvider } from '../src/views/engineeringCommonsSidebarWebviewProvider';
import { ArtifactDetailsWebviewProvider } from '../src/views/artifactDetailsWebviewProvider';

describe('AI Artifact Certification Mechanism Tests', () => {
    let authProvider: MockAuthProvider;
    let cliExecutor: MockCliExecutor;
    let certificationService: CertificationService;

    beforeEach(() => {
        authProvider = new MockAuthProvider();
        authProvider.authenticated = true;
        authProvider.email = 'reviewer@company.com';
        cliExecutor = new MockCliExecutor();
        cliExecutor.mockResult = {
            exitCode: 0,
            stdout: `
NAME                 TYPE       VERSION 
--------------------------------------------
design-reviewer      agent      1.0.0   
accessibility-fix    agent      1.0.0   
`,
            stderr: '',
            success: true
        };
        certificationService = new CertificationService(authProvider, cliExecutor, 'engineering-commons', 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io');
    });

    it('1. CertificationService should initialize and support client methods', async () => {
        assert.ok(certificationService);
        assert.strictEqual(typeof certificationService.getCertificationStatus, 'function');
        assert.strictEqual(typeof certificationService.evaluateCertification, 'function');
        assert.strictEqual(typeof certificationService.requestCertification, 'function');
        assert.strictEqual(typeof certificationService.certifyArtifact, 'function');
        assert.strictEqual(typeof certificationService.revokeCertification, 'function');
    });

    it('2. Sidebar webview provider should render Certified filter pill in market view', async () => {
        const mockUri = { fsPath: '/test', scheme: 'file', path: '/test' } as any;
        const mockNotifService = { getNotifications: async () => [], markAsRead: async () => true } as any;
        const mockReviewCommentService = {} as any;
        const mockUsageTracker = {} as any;
        const mockDetailsProvider = {} as any;
        const mockThreadProvider = {} as any;

        const sidebar = new EngineeringCommonsSidebarWebviewProvider(
            mockUri,
            authProvider,
            cliExecutor,
            'engineering-commons',
            'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io',
            mockNotifService,
            mockReviewCommentService,
            mockUsageTracker,
            mockDetailsProvider,
            mockThreadProvider
        );

        (sidebar as any).currentTab = 'market';
        const html = await (sidebar as any).renderHtml();

        // Verify Certified filter pill is present
        assert.ok(html.includes('data-type="certified"'), 'HTML must contain Certified filter pill');
        assert.ok(html.includes('selectTypeFilter(\'certified\')'), 'HTML must have click handler for Certified filter');
        assert.ok(html.includes('certified-badge'), 'HTML must include certified-badge class');
    });

    it('3. Sidebar webview provider should render ✓ Certified badge on certified artifacts', async () => {
        const mockUri = { fsPath: '/test', scheme: 'file', path: '/test' } as any;
        const mockNotifService = { getNotifications: async () => [], markAsRead: async () => true } as any;

        const sidebar = new EngineeringCommonsSidebarWebviewProvider(
            mockUri,
            authProvider,
            cliExecutor,
            'engineering-commons',
            'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io',
            mockNotifService,
            {} as any,
            {} as any,
            {} as any,
            {} as any
        );

        (sidebar as any).currentTab = 'market';
        const html = await (sidebar as any).renderHtml();

        // Default certified artifacts should have the badge rendered
        assert.ok(html.includes('✓ Certified'), 'HTML should render ✓ Certified badge for certified artifacts');
        assert.ok(html.includes('data-certified="true"'), 'Certified artifacts should have data-certified="true"');
    });

    it('4. Artifact details provider should render Enterprise Certified Artifact card', async () => {
        const detailsProvider = new ArtifactDetailsWebviewProvider(
            authProvider,
            cliExecutor,
            'engineering-commons',
            'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io',
            undefined,
            undefined,
            certificationService
        );

        const detailsData = {
            id: 'design-reviewer',
            name: 'design-reviewer',
            type: 'agent',
            version: '1.0.0',
            description: 'Enterprise design and UI review agent',
            cipPackage: 'company.cip.design-reviewer',
            files: [{ path: 'README.md', content: '# Design Reviewer' }],
            availableVersions: [{ version: '1.0.0', cipPackage: 'company.cip.design-reviewer', isLatest: true }],
            isInstalled: true,
            isCertified: true,
            certificationStatus: 'CERTIFIED',
            certifiedVersion: '1.0.0',
            certifiedAt: new Date().toISOString(),
            certificationReason: 'Passed enterprise review and reliability criteria.'
        };

        const html = (detailsProvider as any).getHtmlForWebview(detailsData);

        assert.ok(html.includes('Enterprise Certified Artifact'), 'Artifact details should render Enterprise Certified Artifact section');
        assert.ok(html.includes('badge-certified'), 'Artifact details should have badge-certified styling');
        assert.ok(html.includes('Passed enterprise review and reliability criteria.'), 'Artifact details should display certification reason');
    });

    it('5. Artifact details provider should provide Certify/Revoke buttons for Reviewers', async () => {
        authProvider.email = 'reviewer@company.com';
        const detailsProvider = new ArtifactDetailsWebviewProvider(
            authProvider,
            cliExecutor,
            'engineering-commons',
            'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io'
        );

        const certifiedArtifact = {
            id: 'design-reviewer',
            name: 'design-reviewer',
            type: 'agent',
            version: '1.0.0',
            description: 'Enterprise design reviewer',
            cipPackage: 'company.cip.design-reviewer',
            files: [],
            availableVersions: [],
            isInstalled: false,
            isCertified: true,
            isReviewer: true,
            certificationStatus: 'CERTIFIED'
        };

        const html = (detailsProvider as any).getHtmlForWebview(certifiedArtifact);
        assert.ok(html.includes('Revoke Certification'), 'Reviewer should see Revoke Certification button on certified artifact');
    });
});
