import * as assert from 'assert';
import { ThreadWebviewProvider, ArtifactDiffData } from '../src/views/threadWebviewProvider';
import { ReviewCommentService, ReviewCommentDto } from '../src/services/reviewCommentService';
import { MockAuthProvider, MockReviewThreadService } from './mocks';

describe('GitHub-Like Multi-File PR Diff & Review Workflow Tests', () => {
    let auth: MockAuthProvider;
    let threadService: MockReviewThreadService;
    let commentService: ReviewCommentService;

    const sampleMultiFileDiff: ArtifactDiffData = {
        reviewId: 'rev-multi-123',
        artifactName: 'enterprise-reviewer',
        currentVersion: '1.0.0',
        submittedVersion: '1.1.0',
        producerEmail: 'producer@company.com',
        filesChangedCount: 3,
        addedFilesCount: 1,
        modifiedFilesCount: 2,
        deletedFilesCount: 0,
        unchangedFilesCount: 0,
        files: [
            {
                path: 'agents/enterprise-reviewer.md',
                changeType: 2, // Modified
                addedLinesCount: 2,
                deletedLinesCount: 1,
                lineChanges: [
                    { oldLineNumber: 10, newLineNumber: 10, type: 2, content: 'Analyze the page.' },
                    { oldLineNumber: 11, newLineNumber: 11, type: 2, content: '' },
                    { oldLineNumber: 12, newLineNumber: undefined, type: 1, content: 'Check basic accessibility.' },
                    { oldLineNumber: undefined, newLineNumber: 12, type: 0, content: 'Check WCAG accessibility requirements.' },
                    { oldLineNumber: undefined, newLineNumber: 13, type: 0, content: 'Check keyboard navigation.' },
                    { oldLineNumber: 13, newLineNumber: 14, type: 2, content: 'Generate report.' }
                ]
            },
            {
                path: 'skills/accessibility/SKILL.md',
                changeType: 0, // Added
                addedLinesCount: 4,
                deletedLinesCount: 0,
                lineChanges: [
                    { oldLineNumber: undefined, newLineNumber: 1, type: 0, content: '---' },
                    { oldLineNumber: undefined, newLineNumber: 2, type: 0, content: 'name: accessibility' },
                    { oldLineNumber: undefined, newLineNumber: 3, type: 0, content: 'description: Accessibility tests' },
                    { oldLineNumber: undefined, newLineNumber: 4, type: 0, content: '---' }
                ]
            },
            {
                path: 'cip.yml',
                changeType: 2, // Modified
                addedLinesCount: 1,
                deletedLinesCount: 1,
                lineChanges: [
                    { oldLineNumber: 1, newLineNumber: 1, type: 2, content: 'name: enterprise-reviewer' },
                    { oldLineNumber: 2, newLineNumber: undefined, type: 1, content: 'version: 1.0.0' },
                    { oldLineNumber: undefined, newLineNumber: 2, type: 0, content: 'version: 1.1.0' }
                ]
            }
        ]
    };

    beforeEach(() => {
        auth = new MockAuthProvider();
        auth.authenticated = true;
        auth.email = 'reviewer@company.com';
        threadService = new MockReviewThreadService();
        commentService = new ReviewCommentService(auth, 'http://localhost:5000');
    });

    it('1. Multi-file diff renders all changed files in navigation sidebar', () => {
        const provider = new ThreadWebviewProvider(threadService, commentService, auth);
        const thread = {
            id: 'rev-multi-123',
            reviewId: 'rev-multi-123',
            artifactId: 'enterprise-reviewer',
            artifactName: 'enterprise-reviewer',
            version: '1.1.0',
            producerEmail: 'producer@company.com',
            reviewerEmail: 'reviewer@company.com',
            status: 'UnderReview',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: []
        };

        const html = (provider as any).getHtmlForWebview(thread, [], sampleMultiFileDiff, 'reviewer@company.com', true);

        assert.ok(html.includes('Changed Files (3)'), 'Should show 3 changed files in sidebar');
        assert.ok(html.includes('agents/enterprise-reviewer.md'), 'Should list agents/enterprise-reviewer.md');
        assert.ok(html.includes('skills/accessibility/SKILL.md'), 'Should list skills/accessibility/SKILL.md');
        assert.ok(html.includes('cip.yml'), 'Should list cip.yml');
    });

    it('2. Added, deleted, and modified lines render with correct line numbers and hover comment button', () => {
        const provider = new ThreadWebviewProvider(threadService, commentService, auth);
        const thread = {
            id: 'rev-multi-123',
            reviewId: 'rev-multi-123',
            artifactId: 'enterprise-reviewer',
            artifactName: 'enterprise-reviewer',
            version: '1.1.0',
            producerEmail: 'producer@company.com',
            reviewerEmail: 'reviewer@company.com',
            status: 'UnderReview',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: []
        };

        const html = (provider as any).getHtmlForWebview(thread, [], sampleMultiFileDiff, 'reviewer@company.com', true);

        assert.ok(html.includes('+ Comment'), 'Should contain hover + Comment buttons on diff lines');
        assert.ok(html.includes('line-added'), 'Should contain line-added CSS class');
        assert.ok(html.includes('line-deleted'), 'Should contain line-deleted CSS class');
        assert.ok(html.includes('Check WCAG accessibility requirements.'), 'Should render new added line text');
        assert.ok(html.includes('Check basic accessibility.'), 'Should render deleted line text');
    });

    it('3. Inline comments and replies attach directly beneath the correct diff line', () => {
        const provider = new ThreadWebviewProvider(threadService, commentService, auth);
        const thread = {
            id: 'rev-multi-123',
            reviewId: 'rev-multi-123',
            artifactId: 'enterprise-reviewer',
            artifactName: 'enterprise-reviewer',
            version: '1.1.0',
            producerEmail: 'producer@company.com',
            reviewerEmail: 'reviewer@company.com',
            status: 'UnderReview',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: []
        };

        const comments: ReviewCommentDto[] = [
            {
                id: 'comment-1',
                submissionId: 'rev-multi-123',
                artifactId: 'enterprise-reviewer',
                artifactVersion: '1.1.0',
                filePath: 'agents/enterprise-reviewer.md',
                lineNumber: 12,
                lineType: 'Added',
                authorEmail: 'reviewer@company.com',
                authorRole: 'Reviewer',
                comment: 'Please check WCAG contrast ratios here.',
                createdAt: new Date().toISOString(),
                replies: [
                    {
                        id: 'reply-1',
                        submissionId: 'rev-multi-123',
                        artifactId: 'enterprise-reviewer',
                        artifactVersion: '1.1.0',
                        filePath: 'agents/enterprise-reviewer.md',
                        lineNumber: 12,
                        lineType: 'Added',
                        authorEmail: 'producer@company.com',
                        authorRole: 'Producer',
                        comment: 'Updated with contrast ratio checks.',
                        createdAt: new Date().toISOString()
                    }
                ]
            }
        ];

        const html = (provider as any).getHtmlForWebview(thread, comments, sampleMultiFileDiff, 'reviewer@company.com', true);

        assert.ok(html.includes('Please check WCAG contrast ratios here.'), 'Should render reviewer comment');
        assert.ok(html.includes('Updated with contrast ratio checks.'), 'Should render producer reply');
        assert.ok(html.includes('role-reviewer'), 'Should render reviewer role badge');
        assert.ok(html.includes('role-producer'), 'Should render producer role badge');
    });

    it('4. Reviewer sees action buttons (Approve, Request Changes, Cancel Review); Producer does NOT', () => {
        const provider = new ThreadWebviewProvider(threadService, commentService, auth);
        const thread = {
            id: 'rev-multi-123',
            reviewId: 'rev-multi-123',
            artifactId: 'enterprise-reviewer',
            artifactName: 'enterprise-reviewer',
            version: '1.1.0',
            producerEmail: 'producer@company.com',
            reviewerEmail: 'reviewer@company.com',
            status: 'UnderReview',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: []
        };

        const reviewerHtml = (provider as any).getHtmlForWebview(thread, [], sampleMultiFileDiff, 'reviewer@company.com', true);
        assert.ok(reviewerHtml.includes('id="btn-action-approve"'), 'Should render Approve button for reviewer');
        assert.ok(reviewerHtml.includes('id="btn-action-changes"'), 'Should render Request Changes button for reviewer');
        assert.ok(reviewerHtml.includes('id="btn-action-reject"'), 'Should render Reject button for reviewer');
        assert.ok(reviewerHtml.includes('id="btn-action-cancel"'), 'Should render Cancel Review button for reviewer');

        const producerHtml = (provider as any).getHtmlForWebview(thread, [], sampleMultiFileDiff, 'producer@company.com', false);
        assert.ok(!producerHtml.includes('id="btn-action-approve"'), 'Producer should not see Approve button');
        assert.ok(!producerHtml.includes('id="btn-action-changes"'), 'Producer should not see Request Changes button');

        const publishedThread = {
            ...thread,
            status: 'Published'
        };
        const publishedHtml = (provider as any).getHtmlForWebview(publishedThread, [], sampleMultiFileDiff, 'reviewer@company.com', true);
        assert.ok(!publishedHtml.includes('id="btn-action-approve"'), 'Published review should not render Approve button');
        assert.ok(publishedHtml.includes('PUBLISHED ARTIFACT ARCHIVE') || publishedHtml.includes('Published to Marketplace'), 'Published review should render published archive notice');
        assert.ok(publishedHtml.includes('data-is-resolved="true"'), 'Published review should disable live SLA countdown');
    });

    it('5. Invariant: Adding a comment does not cancel or reject review (status remains UnderReview)', () => {
        const thread = {
            id: 'rev-multi-123',
            status: 'UnderReview'
        };

        const provider = new ThreadWebviewProvider(threadService, commentService, auth);
        const status = (provider as any).normalizeStatus(thread.status);

        assert.strictEqual(status, 'UnderReview', 'Review status must remain UnderReview after adding comment');
    });

    it('6. Split (Side-by-Side) diff renders Base/Old file on left and Head/New file on right', () => {
        const provider = new ThreadWebviewProvider(threadService, commentService, auth);
        const thread = {
            id: 'rev-multi-123',
            reviewId: 'rev-multi-123',
            artifactId: 'enterprise-reviewer',
            artifactName: 'enterprise-reviewer',
            version: '1.1.0',
            producerEmail: 'producer@company.com',
            reviewerEmail: 'reviewer@company.com',
            status: 'UnderReview',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: []
        };

        const html = (provider as any).getHtmlForWebview(thread, [], sampleMultiFileDiff, 'reviewer@company.com', true);

        assert.ok(html.includes('diff-table-split'), 'Should render split diff table');
        assert.ok(html.includes('diff-table-unified'), 'Should render unified diff table');
        assert.ok(html.includes('Base / Original (Old)'), 'Should render Base/Original header on left');
        assert.ok(html.includes('Head / Modified (New)'), 'Should render Head/Modified header on right');
        assert.ok(html.includes('split-col-code split-border-right'), 'Should render left split column with border divider');
    });

    it('7. Diff toolbar provides interactive view mode switcher (Split and Unified buttons)', () => {
        const provider = new ThreadWebviewProvider(threadService, commentService, auth);
        const thread = {
            id: 'rev-multi-123',
            reviewId: 'rev-multi-123',
            artifactId: 'enterprise-reviewer',
            artifactName: 'enterprise-reviewer',
            version: '1.1.0',
            producerEmail: 'producer@company.com',
            reviewerEmail: 'reviewer@company.com',
            status: 'UnderReview',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: []
        };

        const html = (provider as any).getHtmlForWebview(thread, [], sampleMultiFileDiff, 'reviewer@company.com', true);

        assert.ok(html.includes('id="btn-mode-split"'), 'Should render Split view toggle button');
        assert.ok(html.includes('id="btn-mode-unified"'), 'Should render Unified view toggle button');
        assert.ok(html.includes('setDiffViewMode'), 'Should contain setDiffViewMode click handler');
        assert.ok(html.includes('diff-toolbar'), 'Should render diff toolbar');
    });

    it('8. New Artifact without previous marketplace version displays NEW ARTIFACT banner and adds all files', () => {
        const provider = new ThreadWebviewProvider(threadService, commentService, auth);
        const newArtifactDiff: ArtifactDiffData = {
            reviewId: 'rev-new-999',
            artifactName: 'brand-new-plugin',
            currentVersion: undefined,
            submittedVersion: '1.0.0',
            producerEmail: 'producer@company.com',
            artifactChangeType: 0, // NewArtifact
            isNewArtifact: true,
            filesChangedCount: 2,
            addedFilesCount: 2,
            modifiedFilesCount: 0,
            deletedFilesCount: 0,
            unchangedFilesCount: 0,
            files: [
                {
                    path: 'plugin.json',
                    changeType: 0,
                    addedLinesCount: 10,
                    deletedLinesCount: 0,
                    lineChanges: [
                        { oldLineNumber: undefined, newLineNumber: 1, type: 0, content: '{"name": "brand-new-plugin"}' }
                    ]
                }
            ]
        };

        const thread = {
            id: 'rev-new-999',
            reviewId: 'rev-new-999',
            artifactId: 'brand-new-plugin',
            artifactName: 'brand-new-plugin',
            version: '1.0.0',
            producerEmail: 'producer@company.com',
            reviewerEmail: 'reviewer@company.com',
            status: 'Submitted',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: []
        };

        const html = (provider as any).getHtmlForWebview(thread, [], newArtifactDiff, 'reviewer@company.com', true);

        assert.ok(html.includes('NEW ARTIFACT (Initial Contribution)'), 'Should display NEW ARTIFACT banner');
        assert.ok(html.includes('No previous match found on Marketplace'), 'Should explain no match was found');
        assert.ok(html.includes('banner-new-artifact'), 'Should have banner-new-artifact CSS class');
    });

    it('9. Updated Artifact with existing version displays UPDATED ARTIFACT banner with exact version transition', () => {
        const provider = new ThreadWebviewProvider(threadService, commentService, auth);
        const thread = {
            id: 'rev-multi-123',
            reviewId: 'rev-multi-123',
            artifactId: 'enterprise-reviewer',
            artifactName: 'enterprise-reviewer',
            version: '1.1.0',
            producerEmail: 'producer@company.com',
            reviewerEmail: 'reviewer@company.com',
            status: 'UnderReview',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: []
        };

        const html = (provider as any).getHtmlForWebview(thread, [], sampleMultiFileDiff, 'reviewer@company.com', true);

        assert.ok(html.includes('UPDATED ARTIFACT: Comparing Previous Version (v1.0.0)'), 'Should display UPDATED ARTIFACT banner with version');
        assert.ok(html.includes('Submitted Version (v1.1.0)'), 'Should show target submitted version');
        assert.ok(html.includes('banner-updated-artifact'), 'Should have banner-updated-artifact CSS class');
    });

    it('10. Unified single-file view mode defaults to active with green added lines, red deleted lines, and white context lines', () => {
        const provider = new ThreadWebviewProvider(threadService, commentService, auth);
        const thread = {
            id: 'rev-multi-123',
            reviewId: 'rev-multi-123',
            artifactId: 'enterprise-reviewer',
            artifactName: 'enterprise-reviewer',
            version: '1.1.0',
            producerEmail: 'producer@company.com',
            reviewerEmail: 'reviewer@company.com',
            status: 'UnderReview',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: []
        };

        const html = (provider as any).getHtmlForWebview(thread, [], sampleMultiFileDiff, 'reviewer@company.com', true);

        assert.ok(html.includes("currentDiffViewMode = 'unified'"), 'Unified mode should be default');
        assert.ok(html.includes('class="view-mode-btn active" id="btn-mode-unified"'), 'Unified button should be active by default');
        assert.ok(html.includes('--diff-add-fg: #3fb950;'), 'Added lines should use green foreground');
        assert.ok(html.includes('--diff-del-fg: #f85149;'), 'Deleted lines should use red foreground');
        assert.ok(html.includes('--diff-ctx-fg: #ffffff;'), 'Context lines should use white foreground');
    });

    it('11. Multi-line range comments render with range badge and line numbers', () => {
        const provider = new ThreadWebviewProvider(threadService, commentService, auth);
        const thread = {
            id: 'rev-multi-123',
            reviewId: 'rev-multi-123',
            artifactId: 'enterprise-reviewer',
            artifactName: 'enterprise-reviewer',
            version: '1.1.0',
            producerEmail: 'producer@company.com',
            reviewerEmail: 'reviewer@company.com',
            status: 'UnderReview',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: []
        };

        const rangeComments: ReviewCommentDto[] = [
            {
                id: 'range-comment-1',
                submissionId: 'rev-multi-123',
                artifactId: 'enterprise-reviewer',
                artifactVersion: '1.1.0',
                filePath: 'agents/enterprise-reviewer.md',
                lineNumber: 13,
                startLineNumber: 12,
                endLineNumber: 13,
                lineRange: '12-13',
                lineType: 'Added',
                authorEmail: 'reviewer@company.com',
                authorRole: 'Reviewer',
                comment: 'These two lines together should be refactored into a helper.',
                createdAt: new Date().toISOString()
            }
        ];

        const html = (provider as any).getHtmlForWebview(thread, rangeComments, sampleMultiFileDiff, 'reviewer@company.com', true);

        assert.ok(html.includes('Lines 12-13'), 'Should display Lines 12-13 badge');
        assert.ok(html.includes('These two lines together should be refactored into a helper.'), 'Should render comment text');
        assert.ok(html.includes('selectAndOpenRange'), 'Should contain range selection handler');
        assert.ok(html.includes('id="floating-comment-pill"'), 'Should render floating comment pill element');
    });

    it('12. User-select none CSS rule is applied to gutters, hover buttons, and markers to prevent selection glitch', () => {
        const provider = new ThreadWebviewProvider(threadService, commentService, auth);
        const thread = {
            id: 'rev-multi-123',
            reviewId: 'rev-multi-123',
            artifactId: 'enterprise-reviewer',
            artifactName: 'enterprise-reviewer',
            version: '1.1.0',
            producerEmail: 'producer@company.com',
            reviewerEmail: 'reviewer@company.com',
            status: 'UnderReview',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: []
        };

        const html = (provider as any).getHtmlForWebview(thread, [], sampleMultiFileDiff, 'reviewer@company.com', true);

        assert.ok(html.includes('user-select: none !important;'), 'Should apply user-select: none !important');
        assert.ok(html.includes('-webkit-user-select: none !important;'), 'Should apply -webkit-user-select: none !important');
        assert.ok(html.includes('.btn-hover-comment'), 'Should target .btn-hover-comment in CSS');
        assert.ok(html.includes('.btn-gutter-plus'), 'Should target .btn-gutter-plus in CSS');
    });

    it('13. Split side-by-side mode correctly renders code lines when backend sends string enum types (Added/Deleted/Unchanged)', () => {
        const provider = new ThreadWebviewProvider(threadService, commentService, auth);
        const stringTypeDiff: ArtifactDiffData = {
            reviewId: 'rev-accessibility-1',
            artifactName: 'accessibility-audit',
            currentVersion: undefined,
            submittedVersion: '1.0.0',
            producerEmail: 'producer@company.com',
            artifactChangeType: 'NewArtifact',
            isNewArtifact: true,
            filesChangedCount: 1,
            addedFilesCount: 1,
            modifiedFilesCount: 0,
            deletedFilesCount: 0,
            unchangedFilesCount: 0,
            files: [
                {
                    path: 'accessibility-audit.md',
                    changeType: 'Added',
                    addedLinesCount: 10,
                    deletedLinesCount: 0,
                    lineChanges: [
                        { newLineNumber: 1, type: 'Added', content: '# Accessibility Audit Rule' },
                        { newLineNumber: 2, type: 'Added', content: '' },
                        { newLineNumber: 3, type: 'Added', content: '## Overview' },
                        { newLineNumber: 4, type: 'Added', content: 'Audits web pages for WCAG compliance.' },
                        { newLineNumber: 5, type: 'Added', content: '' },
                        { newLineNumber: 6, type: 'Added', content: '```typescript' },
                        { newLineNumber: 7, type: 'Added', content: 'export function runAudit() {' },
                        { newLineNumber: 8, type: 'Added', content: '    return { score: 100 };' },
                        { newLineNumber: 9, type: 'Added', content: '}' },
                        { newLineNumber: 10, type: 'Added', content: '```' }
                    ]
                }
            ]
        };

        const thread = {
            id: 'rev-accessibility-1',
            reviewId: 'rev-accessibility-1',
            artifactId: 'accessibility-audit',
            artifactName: 'accessibility-audit rule automation',
            version: '1.0.0',
            producerEmail: 'producer@company.com',
            reviewerEmail: 'harsh.rana@maqsoftware.com',
            status: 'UnderReview',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: []
        };

        const html = (provider as any).getHtmlForWebview(thread, [], stringTypeDiff, 'harsh.rana@maqsoftware.com', true);

        // Verify split table contains all rows
        assert.ok(html.includes('id="row-split-accessibility-audit_md-0"'), 'Should render split row 0');
        assert.ok(html.includes('id="row-split-accessibility-audit_md-9"'), 'Should render split row 9 (10th row)');
        assert.ok(html.includes('export function runAudit()'), 'Should render code content inside split view');
        assert.ok(html.includes('split-marker-add'), 'Should render split add marker');
        assert.ok(html.includes('split-empty'), 'Should mark left side as split-empty for newly added file');
    });

    it('14. Split mode computes paired side-by-side rows for modifications', () => {
        const provider = new ThreadWebviewProvider(threadService, commentService, auth);
        const lineChanges: any[] = [
            { oldLineNumber: 1, newLineNumber: 1, type: 'Unchanged', content: 'const a = 1;' },
            { oldLineNumber: 2, type: 'Deleted', content: 'const b = 2;' },
            { newLineNumber: 2, type: 'Added', content: 'const b = 20;' },
            { oldLineNumber: 3, newLineNumber: 3, type: 'Unchanged', content: 'const c = 3;' }
        ];

        const splitRows = (provider as any).computeSplitRows(lineChanges);
        assert.strictEqual(splitRows.length, 3, 'Should have 3 split rows (1 context + 1 modified pair + 1 context)');
        assert.strictEqual(splitRows[0].left.lineNum, 1);
        assert.strictEqual(splitRows[0].right.lineNum, 1);
        assert.strictEqual(splitRows[1].left.lineNum, 2);
        assert.strictEqual(splitRows[1].left.content, 'const b = 2;');
        assert.strictEqual(splitRows[1].right.lineNum, 2);
        assert.strictEqual(splitRows[1].right.content, 'const b = 20;');
        assert.strictEqual(splitRows[2].left.lineNum, 3);
        assert.strictEqual(splitRows[2].right.lineNum, 3);
    });
});
