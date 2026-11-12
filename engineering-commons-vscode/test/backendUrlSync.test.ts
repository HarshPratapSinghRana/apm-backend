import { expect } from 'chai';
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { HttpBackendUsageClient } from '../src/services/backendUsageClient';
import { BountyService } from '../src/services/bountyService';
import { HttpReviewThreadService } from '../src/services/reviewThreadService';
import { ReviewCommentService } from '../src/services/reviewCommentService';
import { HttpNotificationService } from '../src/services/notificationService';
import { CertificationService } from '../src/services/certificationService';
import { ArtifactDetailsWebviewProvider } from '../src/views/artifactDetailsWebviewProvider';
import { ArtifactTreeDataProvider } from '../src/views/artifactTreeDataProvider';
import { UsageDashboardWebviewProvider } from '../src/views/usageDashboardWebviewProvider';
import { EngineeringCommonsSidebarWebviewProvider } from '../src/views/engineeringCommonsSidebarWebviewProvider';
import { MockAuthProvider, MockCliExecutor } from './mocks';

describe('Remote Backend & Cloudflare Tunnel Dynamic Sync Tests', () => {
    let mockAuth: MockAuthProvider;
    let mockCli: MockCliExecutor;

    beforeEach(() => {
        mockAuth = new MockAuthProvider();
        mockAuth.authenticated = true;
        mockAuth.email = 'harsh.rana@maqsoftware.com';
        mockCli = new MockCliExecutor();
    });

    it('1. HttpBackendUsageClient dynamically updates backend URL for telemetry sync', () => {
        const client = new HttpBackendUsageClient('https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io');
        expect(client.getBackendUrl()).to.equal('https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io');

        const cloudflareUrl = 'https://ai-cip-tunnel.trycloudflare.com';
        client.setBackendUrl(cloudflareUrl);
        expect(client.getBackendUrl()).to.equal(cloudflareUrl);
    });

    it('2. BountyService dynamically updates remote backend URL', () => {
        const bountyService = new BountyService(mockAuth, 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io');
        const cloudflareUrl = 'https://remote-team-hub.trycloudflare.com/';
        bountyService.setBackendUrl(cloudflareUrl);
        expect((bountyService as any).baseUrl).to.equal('https://remote-team-hub.trycloudflare.com');
    });

    it('3. HttpReviewThreadService and ReviewCommentService update backend URL', () => {
        const threadService = new HttpReviewThreadService('https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io', mockAuth);
        const commentService = new ReviewCommentService(mockAuth, 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io');

        const cloudflareUrl = 'https://cip-shared-server.trycloudflare.com';
        threadService.setBackendUrl(cloudflareUrl);
        commentService.setBackendUrl(cloudflareUrl);

        expect((threadService as any).backendUrl).to.equal(cloudflareUrl);
        expect((commentService as any).baseUrl).to.equal(cloudflareUrl);
    });

    it('4. NotificationService and CertificationService update backend URL', () => {
        const notifService = new HttpNotificationService('https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io', mockAuth);
        const certService = new CertificationService(mockAuth, mockCli, 'engineering-commons', 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io');

        const cloudflareUrl = 'https://cloud-cip-backend.trycloudflare.com';
        notifService.setBackendUrl(cloudflareUrl);
        certService.setBackendUrl(cloudflareUrl);

        expect((notifService as any).backendUrl).to.equal(cloudflareUrl);
        expect((certService as any).backendUrl).to.equal(cloudflareUrl);
    });

    it('5. ArtifactDetailsWebviewProvider and ArtifactTreeDataProvider update backend URL', () => {
        const detailsProvider = new ArtifactDetailsWebviewProvider(mockAuth, mockCli, 'engineering-commons', 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io');
        const treeProvider = new ArtifactTreeDataProvider(mockCli, mockAuth, 'engineering-commons', 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io');

        const cloudflareUrl = 'https://tunnel-instance-99.trycloudflare.com';
        detailsProvider.setBackendUrl(cloudflareUrl);
        treeProvider.setBackendUrl(cloudflareUrl);

        expect((detailsProvider as any).backendUrl).to.equal(cloudflareUrl);
        expect((treeProvider as any).backendUrl).to.equal(cloudflareUrl);
    });

    it('6. EngineeringCommonsSidebarWebviewProvider updates backend URL and propagates to BountyService', () => {
        const notifService = new HttpNotificationService('https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io', mockAuth);
        const commentService = new ReviewCommentService(mockAuth, 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io');
        const threadService = new HttpReviewThreadService('https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io', mockAuth);
        const detailsProvider = new ArtifactDetailsWebviewProvider(mockAuth, mockCli, 'engineering-commons', 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io');

        const sidebar = new EngineeringCommonsSidebarWebviewProvider(
            vscode.Uri.file('/ext'),
            mockAuth,
            mockCli,
            'engineering-commons',
            'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io',
            notifService,
            commentService,
            {} as any,
            detailsProvider,
            {} as any
        );

        const cloudflareUrl = 'https://shared-corp-db.trycloudflare.com';
        sidebar.setBackendUrl(cloudflareUrl);

        expect((sidebar as any).backendUrl).to.equal(cloudflareUrl);
        expect(((sidebar as any).bountyService as any).baseUrl).to.equal(cloudflareUrl);
    });

    it('7. package.json registers engineeringCommons.setBackendUrl and engineeringCommons.backendUrl config', () => {
        const pkgPath = path.join(__dirname, '..', '..', 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        expect(pkg.contributes.commands.some((c: any) => c.command === 'engineeringCommons.setBackendUrl')).to.be.true;
        expect(pkg.contributes.configuration.properties['engineeringCommons.backendUrl']).to.exist;
        expect(pkg.activationEvents).to.include('onCommand:engineeringCommons.setBackendUrl');
    });
});
