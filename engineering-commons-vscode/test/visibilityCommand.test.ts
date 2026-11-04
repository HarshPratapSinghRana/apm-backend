import { expect } from 'chai';
import { executeVisibilityCommand } from '../src/commands/visibilityCommand';
import { MockCliExecutor, MockAuthProvider } from './mocks';

describe('Visibility Command Unit Tests', () => {
    let mockCli: MockCliExecutor;
    let mockAuth: MockAuthProvider;

    beforeEach(() => {
        mockCli = new MockCliExecutor();
        mockAuth = new MockAuthProvider();
    });

    it('1. Unauthenticated users are blocked from changing visibility', async () => {
        mockAuth.authenticated = false;
        const success = await executeVisibilityCommand(mockCli, mockAuth, 'my-agent', 'public');
        expect(success).to.be.false;
        expect(mockCli.executedCalls.length).to.equal(0);
    });

    it('2. Changing visibility to public executes CLI with public argument', async () => {
        mockCli.mockResult = { exitCode: 0, stdout: 'Visibility updated to PUBLIC', stderr: '', success: true };

        const success = await executeVisibilityCommand(mockCli, mockAuth, 'my-agent', 'public');
        expect(success).to.be.true;

        const cmd = mockCli.executedCalls.find((c: any) => c.args[0] === 'visibility');
        expect(cmd).to.not.be.undefined;
        expect(cmd?.args).to.deep.equal(['visibility', 'my-agent', 'public']);
    });

    it('3. Changing visibility to private with whitelists passes --consumers, --contributors, --reviewers', async () => {
        mockCli.mockResult = { exitCode: 0, stdout: 'Visibility updated to PRIVATE', stderr: '', success: true };

        const success = await executeVisibilityCommand(
            mockCli,
            mockAuth,
            'my-agent',
            'private',
            {
                consumers: 'tester1@company.com,user2@company.com',
                contributors: 'dev1@company.com',
                reviewers: 'lead@company.com'
            }
        );

        expect(success).to.be.true;
        const cmd = mockCli.executedCalls.find((c: any) => c.args[0] === 'visibility');
        expect(cmd).to.not.be.undefined;
        expect(cmd?.args).to.include('--consumers');
        expect(cmd?.args).to.include('tester1@company.com,user2@company.com');
        expect(cmd?.args).to.include('--contributors');
        expect(cmd?.args).to.include('dev1@company.com');
        expect(cmd?.args).to.include('--reviewers');
        expect(cmd?.args).to.include('lead@company.com');
    });

    it('4. CLI failure returns false gracefully without throwing unhandled errors', async () => {
        mockCli.mockResult = { exitCode: 1, stdout: '', stderr: 'Artifact not found or permission denied', success: false };

        const success = await executeVisibilityCommand(mockCli, mockAuth, 'my-agent', 'public');
        expect(success).to.be.false;
    });
});
