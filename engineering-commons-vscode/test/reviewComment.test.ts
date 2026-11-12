import { describe, it, before, after } from 'mocha';
import * as assert from 'assert';
import * as http from 'http';
import { ReviewCommentService } from '../src/services/reviewCommentService';
import { MockAuthProvider } from './mocks';

describe('ReviewCommentService Unit Tests', () => {
    let server: http.Server;
    let authProvider: MockAuthProvider;
    let commentService: ReviewCommentService;
    const recordedRequests: Array<{ url: string; method: string; body: any }> = [];

    before((done) => {
        authProvider = new MockAuthProvider();
        authProvider.authenticated = true;
        authProvider.email = 'reviewer@company.com';
        authProvider.token = 'test-token';

        server = http.createServer((req, res) => {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const parsedBody = body ? JSON.parse(body) : null;
                recordedRequests.push({
                    url: req.url || '',
                    method: req.method || 'GET',
                    body: parsedBody
                });

                if (req.url?.includes('/replies') && req.method === 'POST') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        id: 'r-new',
                        comment: parsedBody?.reply,
                        createdAt: new Date().toISOString()
                    }));
                } else if (req.url?.includes('/api/reviews/rev-123/comments') && req.method === 'POST') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        id: 'c-new',
                        submissionId: 'rev-123',
                        ...parsedBody,
                        createdAt: new Date().toISOString()
                    }));
                } else if (req.url?.includes('/api/reviews/rev-123/comments') && req.method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify([
                        {
                            id: 'c-1',
                            submissionId: 'rev-123',
                            filePath: 'agents/reviewer.md',
                            lineNumber: 12,
                            lineType: 'Modified',
                            authorEmail: 'reviewer@company.com',
                            authorRole: 'Reviewer',
                            comment: 'Please check accessibility.',
                            createdAt: new Date().toISOString(),
                            replies: [
                                {
                                    id: 'r-1',
                                    submissionId: 'rev-123',
                                    filePath: 'agents/reviewer.md',
                                    lineNumber: 12,
                                    lineType: 'Modified',
                                    authorEmail: 'producer@company.com',
                                    authorRole: 'Producer',
                                    comment: 'Fixed it!',
                                    createdAt: new Date().toISOString()
                                }
                            ]
                        }
                    ]));
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });
        });

        server.listen(5099, () => {
            commentService = new ReviewCommentService(authProvider, 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io');
            done();
        });
    });

    after((done) => {
        server.close(done);
    });

    it('getCommentsAsync fetches comments with replies for a submission', async () => {
        const comments = await commentService.getCommentsAsync('rev-123');
        assert.strictEqual(comments.length, 1);
        assert.strictEqual(comments[0].filePath, 'agents/reviewer.md');
        assert.strictEqual(comments[0].lineNumber, 12);
        assert.strictEqual(comments[0].replies?.length, 1);
        assert.strictEqual(comments[0].replies[0].comment, 'Fixed it!');
    });

    it('addCommentAsync sends line-level comment payload', async () => {
        const comment = await commentService.addCommentAsync(
            'rev-123',
            'skills/accessibility/SKILL.md',
            'Add keyboard nav docs.',
            15,
            undefined,
            'Added'
        );

        assert.ok(comment);
        assert.strictEqual(comment?.filePath, 'skills/accessibility/SKILL.md');
        assert.strictEqual(comment?.lineNumber, 15);
        assert.strictEqual(comment?.lineType, 'Added');
    });

    it('addReplyAsync sends reply to specific comment thread', async () => {
        const reply = await commentService.addReplyAsync('rev-123', 'c-1', 'Updated per feedback.');
        assert.ok(reply);
        assert.strictEqual(reply?.comment, 'Updated per feedback.');
    });
});
