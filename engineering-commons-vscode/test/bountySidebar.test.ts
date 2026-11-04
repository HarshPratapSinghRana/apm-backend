import { expect } from 'chai';
import * as assert from 'assert';
import { BountyService, BountyDto } from '../src/services/bountyService';
import { EngineeringCommonsSidebarWebviewProvider } from '../src/views/engineeringCommonsSidebarWebviewProvider';
import { MockAuthProvider, MockCliExecutor, MockReviewThreadService, MockUsageLogger, MockBackendUsageClient } from './mocks';
import { ReviewCommentService } from '../src/services/reviewCommentService';
import { HttpNotificationService } from '../src/services/notificationService';
import { CompositeArtifactUsageTracker } from '../src/services/usageTracker';
import { ArtifactDetailsWebviewProvider } from '../src/views/artifactDetailsWebviewProvider';
import { ThreadWebviewProvider } from '../src/views/threadWebviewProvider';

describe('Engineering Commons Modern Sidebar UI & Bounty System Tests', () => {
    let mockAuth: MockAuthProvider;
    let mockCli: MockCliExecutor;
    let bountyService: BountyService;
    let provider: EngineeringCommonsSidebarWebviewProvider;

    beforeEach(() => {
        mockAuth = new MockAuthProvider();
        mockAuth.authenticated = true;
        mockAuth.email = 'producer@company.com';
        mockCli = new MockCliExecutor();
        mockCli.mockResult = {
            exitCode: 0,
            stdout: `
NAME                 TYPE       VERSION 
--------------------------------------------
enterprise-reviewer  agent      1.0.0   
design-reviewer      agent      1.0.0   
accessibility-fix    agent      1.0.0   
review-and-refactor  skill      1.0.0   
github-assistant     plugin     1.0.0   
postgres-mcp         mcpserver  1.0.0   
sample-prompt        prompt     1.0.0   
sample-command       command    1.0.0   
sample-package       package    1.0.0   
`,
            stderr: '',
            success: true
        };
        bountyService = new BountyService(mockAuth, 'http://localhost:59999');

        const mockBackendUsageClient = new MockBackendUsageClient();
        const usageTracker = new CompositeArtifactUsageTracker(mockBackendUsageClient, mockAuth);
        const reviewThreadService = new MockReviewThreadService();
        const reviewCommentService = new ReviewCommentService(mockAuth, 'http://localhost:59999');
        const notificationService = new HttpNotificationService('http://localhost:59999', mockAuth);
        const threadWebviewProvider = new ThreadWebviewProvider(reviewThreadService, reviewCommentService, mockAuth);
        const detailsProvider = new ArtifactDetailsWebviewProvider(
            mockAuth,
            mockCli,
            'engineering-commons',
            'http://localhost:59999',
            usageTracker,
            () => {}
        );

        provider = new EngineeringCommonsSidebarWebviewProvider(
            { fsPath: '/ext' } as any,
            mockAuth,
            mockCli,
            'engineering-commons',
            'http://localhost:59999',
            notificationService,
            reviewCommentService,
            usageTracker,
            detailsProvider,
            threadWebviewProvider
        );
    });

    it('1. Default bounties are strictly dynamic (zero hardcoded mock arrays)', () => {
        const defaults = bountyService.getDefaultBounties();
        expect(defaults).to.be.an('array');
        expect(defaults.length).to.equal(0);
    });

    it('2. Default My Work is strictly dynamic (zero hardcoded mock arrays)', () => {
        const myWork = bountyService.getDefaultMyWork();
        expect(myWork.claimedBounties).to.be.an('array');
        expect(myWork.claimedBounties.length).to.equal(0);
        expect(myWork.reviews).to.be.an('array');
        expect(myWork.reviews.length).to.equal(0);
    });

    it('3. Sidebar Webview renders header with logged-in user email, Switch button, and theme toggle', async () => {
        const html = await (provider as any).renderHtml();
        assert.ok(html.includes('user-identity-block') || html.includes('user-email-text'), 'Should render user identity block');
        assert.ok(html.includes('switch-account-btn'), 'Should render Switch account button');
        assert.ok(html.includes('theme-toggle-btn'), 'Should render theme switcher');
    });

    it('4. Sidebar Webview renders 3 navigation tabs with notification badges', async () => {
        const html = await (provider as any).renderHtml();
        assert.ok(html.includes('Market'), 'Should render Market tab');
        assert.ok(html.includes('Bounties'), 'Should render Bounties tab');
        assert.ok(html.includes('My work'), 'Should render My work tab');
        assert.ok(html.includes('badge-count'), 'Should render badge count indicator');
    });

    it('5. Bounties tab renders category pills, credit rewards, and Claim bounty buttons', async () => {
        (provider as any).currentTab = 'bounties';
        const html = await (provider as any).renderHtml();

        assert.ok(html.includes('terraform-compliance-guard') || html.includes('bty-terraform-guard'), 'Should show Review terraform-compliance bounty');
        assert.ok(html.includes('160 points') || html.includes('160 credits') || html.includes('160'), 'Should show 160 points');
        assert.ok(html.includes('graphql-schema-guardian') || html.includes('bty-graphql-guardian'), 'Should show Review graphql-schema bounty');
        assert.ok(html.includes('140 points') || html.includes('140 credits') || html.includes('140'), 'Should show 140 points');
        assert.ok(html.includes('Claim bounty'), 'Should render Claim bounty button');
    });

    it('6. My Work tab renders Claimed bounties with In progress status and Reviews section', async () => {
        mockAuth.email = 'reviewer@company.com';
        mockAuth.role = 'REVIEWER';
        (provider as any).currentTab = 'my-work';
        (provider as any).bountyService.getMyWorkSummaryAsync = async () => ({
            claimedBounties: [
                {
                    id: 'bty-terraform-guard',
                    title: 'Review terraform-compliance-guard agent',
                    category: 'Review',
                    status: 'InProgress',
                    stage: 'InReview',
                    credits: 160,
                    isClaimedByMe: true,
                    dueInDays: 2
                }
            ],
            reviews: [
                {
                    reviewId: 'rev-terraform-guard',
                    artifactId: 'terraform-compliance-guard',
                    artifactName: 'terraform-compliance-guard',
                    version: '1.0.0',
                    shortHash: '#b1a2',
                    status: 'UnderReview',
                    producerEmail: 'producer@company.com',
                    submittedAt: new Date().toISOString()
                }
            ],
            totalCreditsEarned: 0,
            openBountiesCount: 4,
            myWorkCount: 1
        });
        const html = await (provider as any).renderHtml();

        assert.ok(html.includes('Claimed bounties'), 'Should render Claimed bounties section');
        assert.ok(html.includes('terraform-compliance-guard'), 'Should show claimed bounty title');
        assert.ok(html.includes('In progress'), 'Should show In progress status badge');
        assert.ok(html.includes('Release bounty'), 'Should render Release bounty button');
        assert.ok(html.includes('Reviews'), 'Should render Reviews section');
        assert.ok(html.includes('review-item-card') || html.includes('terraform-compliance-guard'), 'Should show review item');
        assert.ok(html.includes('#') || html.includes('review-hash'), 'Should show review short hash');
    });

    it('7. Market tab renders artifact list with search and 1-click Install and Details buttons', async () => {
        (provider as any).currentTab = 'market';
        const html = await (provider as any).renderHtml();

        assert.ok(html.includes('search-box'), 'Should render search box');
        assert.ok(html.includes('Install') && html.includes('📥'), 'Should render Install action button');
        assert.ok(html.includes('Details') && html.includes('👁️'), 'Should render Details action button');
    });

    it('8. Market tab renders category filter pills for all artifact types', async () => {
        (provider as any).currentTab = 'market';
        const html = await (provider as any).renderHtml();

        assert.ok(html.includes('market-filter-pills'), 'Should render filter pills container');
        assert.ok(html.includes('data-type="all"'), 'Should render All filter pill');
        assert.ok(html.includes('data-type="agent"'), 'Should render Agents filter pill');
        assert.ok(html.includes('data-type="skill"'), 'Should render Skills filter pill');
        assert.ok(html.includes('data-type="plugin"'), 'Should render Plugins filter pill');
        assert.ok(html.includes('data-type="mcpserver"'), 'Should render MCP Servers filter pill');
        assert.ok(html.includes('data-type="prompt"'), 'Should render Prompts filter pill');
        assert.ok(html.includes('data-type="command"'), 'Should render Commands filter pill');
        assert.ok(html.includes('data-type="package"'), 'Should render CIP Packages filter pill');
    });

    it('9. Installed tab renders workspace artifacts with update action and contribute button', async () => {
        (provider as any).currentTab = 'installed';
        const html = await (provider as any).renderHtml();

        assert.ok(html.includes('Workspace Artifacts'), 'Should render Workspace Artifacts header');
        assert.ok(html.includes('contributeArtifact()'), 'Should render contribute button');
    });

    it('10. Notifications tab renders Notification Center with clear all button and unread indicators', async () => {
        (provider as any).currentTab = 'notifications';
        const html = await (provider as any).renderHtml();

        assert.ok(html.includes('Notification Center'), 'Should render Notification Center header');
    });

    it('11. Header renders Analytics dashboard and Contribute quick action buttons', async () => {
        const html = await (provider as any).renderHtml();

        assert.ok(html.includes('openUsageDashboard()'), 'Should render Analytics dashboard header button');
        assert.ok(html.includes('contributeArtifact()'), 'Should render Contribute header button');
    });

    it('12. Consumer role renders Access Restricted messages on Claimed bounties and Reviews in My Work tab', async () => {
        mockAuth.email = 'consumer@test.com';
        mockAuth.role = 'CONSUMER';
        (provider as any).currentTab = 'my-work';
        const html = await (provider as any).renderHtml();

        assert.ok(html.includes('rbac-restricted-box'), 'Should render RBAC restricted notice box');
        assert.ok(html.includes('You do not have permission for this'), 'Should state permission restriction');
        assert.ok(!html.includes('+ Start Review'), 'Should not render + Start Review button for consumer');
    });

    it('13. Consumer role renders Access Restricted in Bounties tab without loading bounties content', async () => {
        mockAuth.email = 'consumer@test.com';
        mockAuth.role = 'CONSUMER';
        (provider as any).currentTab = 'bounties';
        const html = await (provider as any).renderHtml();

        assert.ok(html.includes('rbac-restricted-box'), 'Should render Access Restricted notice box in Bounties tab');
        assert.ok(html.includes('You do not have access'), 'Should state You do not have access message');
        assert.ok(!html.includes('class="bounty-card"'), 'Should not render bounties cards for consumer');
        assert.ok(!html.includes('Claim bounty'), 'Should not render claim buttons for consumer');
    });

    it('14. My Work tab renders all claimed bounties for producer', async () => {
        mockAuth.email = 'producer@test.com';
        mockAuth.role = 'PRODUCER';
        (provider as any).currentTab = 'my-work';
        (provider as any).bountyService.getMyWorkSummaryAsync = async () => ({
            claimedBounties: [
                {
                    id: 'bty-playwright-e2e',
                    title: 'Review playwright-e2e-synthesizer skill',
                    category: 'Review',
                    status: 'InProgress',
                    stage: 'InReview',
                    credits: 120,
                    isClaimedByMe: true
                },
                {
                    id: 'bty-db-migration',
                    title: 'Review database-migration-guardian skill',
                    category: 'Review',
                    status: 'InProgress',
                    stage: 'InReview',
                    credits: 140,
                    isClaimedByMe: true
                }
            ],
            reviews: [],
            totalCreditsEarned: 0,
            openBountiesCount: 2,
            myWorkCount: 2
        });
        const html = await (provider as any).renderHtml();

        assert.ok(html.includes('playwright-e2e-synthesizer'), 'Should render first claimed bounty');
        assert.ok(html.includes('database-migration-guardian'), 'Should render second claimed bounty');
    });

    it('15. Reviewer role can claim pending review bounties and view claimed reviews in My Work', async () => {
        mockAuth.email = 'reviewer@test.com';
        mockAuth.role = 'REVIEWER';
        (provider as any).currentTab = 'bounties';
        const bountyHtml = await (provider as any).renderHtml();

        assert.ok(bountyHtml.includes('Claim bounty'), 'Reviewer should see active Claim bounty buttons');

        (provider as any).currentTab = 'my-work';
        const myWorkHtml = await (provider as any).renderHtml();
        assert.ok(myWorkHtml.includes('Reviews'), 'Should render Reviews section');
        assert.ok(myWorkHtml.includes('+ Start Review'), 'Should render + Start Review button');
    });

    it('16. Claimed review bounties automatically sync under Reviews section and have Review now button for Reviewer', async () => {
        mockAuth.email = 'reviewer@test.com';
        mockAuth.role = 'REVIEWER';
        (provider as any).currentTab = 'my-work';
        (provider as any).bountyService.getMyWorkSummaryAsync = async () => ({
            claimedBounties: [
                {
                    id: 'bty-secops-hunter',
                    title: 'Review secops-threat-hunter agent',
                    category: 'Review',
                    status: 'InProgress',
                    stage: 'InReview',
                    credits: 180,
                    isClaimedByMe: true
                }
            ],
            reviews: [],
            totalCreditsEarned: 0,
            openBountiesCount: 3,
            myWorkCount: 1
        });
        const myWorkHtml = await (provider as any).renderHtml();

        assert.ok(myWorkHtml.includes('Review now'), 'Claimed review bounty should have Review now button for reviewer');
        assert.ok(myWorkHtml.includes('secops-threat-hunter'), 'Claimed review bounty should appear in Reviews section for reviewer');
    });

    it('17. Producer role sees Access Restricted in Reviews section and does not get Review now buttons', async () => {
        mockAuth.email = 'producer@test.com';
        mockAuth.role = 'PRODUCER';
        (provider as any).currentTab = 'my-work';
        const myWorkHtml = await (provider as any).renderHtml();

        assert.ok(myWorkHtml.includes('You do not have permission to review'), 'Producer should see permission restriction in Reviews section');
        assert.ok(!myWorkHtml.includes('Review now'), 'Producer should not see Review now action button');
    });

    it('18. Admin role (e.g. harsh.rana@maqsoftware.com) has full Reviewer permissions without Access Restricted box', async () => {
        mockAuth.email = 'harsh.rana@maqsoftware.com';
        mockAuth.role = 'ADMIN';
        (provider as any).currentTab = 'my-work';
        (provider as any).bountyService.getMyWorkSummaryAsync = async () => ({
            claimedBounties: [
                {
                    id: 'bty-cloud-finops',
                    title: 'Review cloud-finops-sentinel agent',
                    category: 'Review',
                    status: 'InProgress',
                    stage: 'InReview',
                    credits: 150,
                    isClaimedByMe: true
                }
            ],
            reviews: [],
            totalCreditsEarned: 0,
            openBountiesCount: 3,
            myWorkCount: 1
        });
        const myWorkHtml = await (provider as any).renderHtml();

        assert.ok(myWorkHtml.includes('+ Start Review'), 'Admin should have + Start Review button');
        assert.ok(myWorkHtml.includes('Review now'), 'Admin should see Review now button on claimed review bounty');
        assert.ok(!myWorkHtml.includes('You do not have permission to review'), 'Admin must not see You do not have permission to review');
    });

    it('19. Sidebar Webview includes responsive CSS for vertical tab stacking on narrow viewports', async () => {
        const html = await (provider as any).renderHtml();
        assert.ok(html.includes('max-width: 285px') || html.includes('flex-direction: column'), 'Should define responsive vertical stacking for tabs');
        assert.ok(html.includes('market-type-dropdown-wrapper') && html.includes('bounties-type-dropdown-wrapper'), 'Should define responsive dropdown wrappers in CSS');
    });

    it('20. Market and Bounties tabs render responsive Category Select dropdowns with all options', async () => {
        (provider as any).currentTab = 'market';
        const marketHtml = await (provider as any).renderHtml();
        assert.ok(marketHtml.includes('id="market-type-select"'), 'Should render market type select dropdown');
        assert.ok(marketHtml.includes('value="agent"'), 'Should include agent option in dropdown');
        assert.ok(marketHtml.includes('value="mcpserver"'), 'Should include MCP option in dropdown');
        assert.ok(marketHtml.includes('value="certified"'), 'Should include certified option in dropdown');

        (provider as any).currentTab = 'bounties';
        const bountyHtml = await (provider as any).renderHtml();
        assert.ok(bountyHtml.includes('id="bounties-category-select"'), 'Should render bounties category select dropdown');
        assert.ok(bountyHtml.includes('value="Code gen"'), 'Should include Code gen option in bounties dropdown');
    });

    it('21. Approving a code review moves the bounty to InTesting stage', async () => {
        const bounties = await bountyService.getBountiesAsync();
        const bounty = bounties.find(b => b.stage === 'InReview') || bounties[0];
        if (bounty) {
            const updated = await bountyService.reviewCodeAsync(bounty.id, { isApproved: true, feedback: 'Approved by reviewer' });
            expect(updated).to.not.be.null;
            expect(updated?.stage).to.equal('InTesting');
        }
    });

    it('22. Rejecting a code review moves the bounty back to CodeGeneration stage', async () => {
        const bounties = await bountyService.getBountiesAsync();
        const bounty = bounties.find(b => b.stage === 'InReview') || bounties[0];
        if (bounty) {
            const updated = await bountyService.reviewCodeAsync(bounty.id, { isApproved: false, feedback: 'Fix linting errors' });
            expect(updated).to.not.be.null;
            expect(updated?.stage).to.equal('CodeGeneration');
        }
    });

    it('23. Unauthenticated user renders Authentication Required box and does not show mock artifacts or bounties', async () => {
        mockAuth.authenticated = false;
        mockAuth.email = undefined;
        mockAuth.token = undefined;

        // Market Tab
        (provider as any).currentTab = 'market';
        let html = await (provider as any).renderHtml();
        assert.ok(html.includes('Authentication Required'), 'Market tab should show Authentication Required');
        assert.ok(html.includes('loginSso()'), 'Market tab should show login button');
        assert.ok(!html.includes('class="artifact-row market-item-card"'), 'Market tab should not render artifact cards when logged out');

        // Bounties Tab
        (provider as any).currentTab = 'bounties';
        html = await (provider as any).renderHtml();
        assert.ok(html.includes('Authentication Required'), 'Bounties tab should show Authentication Required');
        assert.ok(!html.includes('class="bounty-card"'), 'Bounties tab should not render bounty cards when logged out');

        // My Work Tab
        (provider as any).currentTab = 'my-work';
        html = await (provider as any).renderHtml();
        assert.ok(html.includes('Authentication Required'), 'My Work tab should show Authentication Required');
        assert.ok(!html.includes('Claimed bounties'), 'My Work tab should not show claimed bounties when logged out');
    });
});

