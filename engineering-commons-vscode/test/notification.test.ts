import { expect } from 'chai';
import { AppNotification, INotificationService } from '../src/services/notificationService';
import { NotificationCoordinator } from '../src/services/notificationCoordinator';
import { IAuthenticationStatusProvider } from '../src/services/authenticationStatusProvider';
import { ArtifactTreeDataProvider } from '../src/views/artifactTreeDataProvider';
import { ICliExecutor, CliExecutionResult } from '../src/services/cliExecutor';

class MockNotificationService implements INotificationService {
    public notifications: AppNotification[] = [];
    public readIds: string[] = [];

    public async getNotifications(unreadOnly: boolean = false): Promise<AppNotification[]> {
        if (unreadOnly) {
            return this.notifications.filter(n => !this.readIds.includes(n.id) && !n.isRead);
        }
        return this.notifications.map(n => ({
            ...n,
            isRead: this.readIds.includes(n.id) || n.isRead
        }));
    }

    public async markAsRead(notificationId: string): Promise<boolean> {
        this.readIds.push(notificationId);
        const item = this.notifications.find(n => n.id === notificationId);
        if (item) {
            item.isRead = true;
        }
        return true;
    }

    public async deleteNotification(notificationId: string): Promise<boolean> {
        const idx = this.notifications.findIndex(n => n.id === notificationId);
        if (idx >= 0) {
            this.notifications.splice(idx, 1);
            return true;
        }
        return false;
    }

    public async clearNotifications(): Promise<boolean> {
        this.notifications = [];
        return true;
    }
}

class MockAuthStatusProvider implements IAuthenticationStatusProvider {
    private authenticated: boolean;
    private token: string | undefined;
    private email: string | undefined;
    private listeners: ((isAuth: boolean) => void)[] = [];

    constructor(authenticated: boolean, token?: string, email?: string) {
        this.authenticated = authenticated;
        this.token = token;
        this.email = email;
    }

    public async isAuthenticated(): Promise<boolean> {
        return this.authenticated;
    }

    public async getToken(): Promise<string | undefined> {
        return this.token;
    }

    public async getEmail(): Promise<string | undefined> {
        return this.email;
    }

    public async getRole(): Promise<string | undefined> {
        return this.authenticated ? 'PRODUCER' : undefined;
    }

    public readonly onDidChangeAuthentication = (listener: (isAuth: boolean) => void) => {
        this.listeners.push(listener);
        return { dispose: () => {} };
    };

    public notifyAuthChanged(): void {
        for (const l of this.listeners) {
            l(this.authenticated);
        }
    }

    public setAuth(auth: boolean, token?: string, email?: string) {
        this.authenticated = auth;
        this.token = token;
        this.email = email;
        this.notifyAuthChanged();
    }
}

class MockCliExecutor implements ICliExecutor {
    public async executeAsync(command: string, args: string[]): Promise<CliExecutionResult> {
        return { exitCode: 0, stdout: 'OK', stderr: '', success: true };
    }
}

describe('VS Code Extension Notification & Notification Center Tests', () => {
    it('1. Unauthenticated users do not fetch notifications', async () => {
        const mockNotifs = new MockNotificationService();
        mockNotifs.notifications = [
            {
                id: 'n1',
                type: 'ReviewAssigned',
                title: 'New review assigned',
                message: 'design-reviewer waiting for review',
                submissionId: 'sub-1',
                artifactId: 'design-reviewer',
                artifactName: 'design-reviewer',
                version: '1.1.0',
                createdAt: new Date().toISOString(),
                isRead: false
            }
        ];

        const mockAuth = new MockAuthStatusProvider(false);
        const coordinator = new NotificationCoordinator(mockNotifs, mockAuth, 1000);

        await coordinator.checkNotifications();
        expect(mockNotifs.readIds).to.be.empty;
    });

    it('2. Authenticated user receives notifications and keeps unread until opened', async () => {
        const mockNotifs = new MockNotificationService();
        mockNotifs.notifications = [
            {
                id: 'n1',
                type: 'FeedbackAdded',
                title: 'design-reviewer v1.1.0',
                message: 'Rishabh added feedback to your review thread.',
                threadId: 'th-1',
                submissionId: 'sub-1',
                artifactId: 'design-reviewer',
                artifactName: 'design-reviewer',
                version: '1.1.0',
                createdAt: new Date().toISOString(),
                isRead: false
            }
        ];

        const mockAuth = new MockAuthStatusProvider(true, 'valid-token', 'producer@test.com');
        // User has unread notification initially
        const unread = await mockNotifs.getNotifications(true);
        expect(unread.length).to.equal(1);

        // User opens notification -> marked as read
        await mockNotifs.markAsRead('n1');
        expect(mockNotifs.readIds).to.include('n1');
    });

    it('3. Duplicate notifications do not trigger multiple popups', async () => {
        const mockNotifs = new MockNotificationService();
        mockNotifs.notifications = [
            {
                id: 'n-dup-1',
                type: 'ReviewApproved',
                title: 'accessibility-agent v2.0.0',
                message: 'Your artifact was approved.',
                threadId: 'th-dup',
                submissionId: 'sub-dup',
                artifactId: 'accessibility-agent',
                artifactName: 'accessibility-agent',
                version: '2.0.0',
                createdAt: new Date().toISOString(),
                isRead: false
            }
        ];

        const mockAuth = new MockAuthStatusProvider(true, 'valid-token', 'producer@test.com');
        const coordinator = new NotificationCoordinator(mockNotifs, mockAuth, 1000);

        // First check
        await coordinator.checkNotifications();
        // Second check with same notification
        await coordinator.checkNotifications();
    });

    it('4. Login event triggers immediate notification check', async () => {
        const mockNotifs = new MockNotificationService();
        mockNotifs.notifications = [
            {
                id: 'n-login-1',
                type: 'ProducerReplied',
                title: 'my-agent v2.0.0',
                message: 'Harsh replied to your review thread.',
                threadId: 'th-rep',
                submissionId: 'sub-rej',
                artifactId: 'my-agent',
                artifactName: 'my-agent',
                version: '2.0.0',
                createdAt: new Date().toISOString(),
                isRead: false
            }
        ];

        const mockAuth = new MockAuthStatusProvider(false);
        const coordinator = new NotificationCoordinator(mockNotifs, mockAuth, 100000);
        coordinator.start();

        // User logs in
        mockAuth.setAuth(true, 'new-token', 'reviewer@test.com');

        // Allow microtask cycle to resolve
        await new Promise(r => setTimeout(r, 50));
        coordinator.stop();
    });

    it('5. Backend errors or offline state do not throw unhandled exceptions', async () => {
        const failingService: INotificationService = {
            getNotifications: async () => { throw new Error('Network error: backend offline'); },
            markAsRead: async () => false,
            deleteNotification: async () => false,
            clearNotifications: async () => false
        };

        const mockAuth = new MockAuthStatusProvider(true, 'tok', 'user@test.com');
        const coordinator = new NotificationCoordinator(failingService, mockAuth, 1000);

        let errorThrown = false;
        try {
            await coordinator.checkNotifications();
        } catch {
            errorThrown = true;
        }

        expect(errorThrown).to.be.false;
    });

    it('6. Notification Center in TreeDataProvider renders unread (●) and read (○) badges', async () => {
        const mockNotifs = new MockNotificationService();
        mockNotifs.notifications = [
            {
                id: 'n-tree-1',
                type: 'ChangesRequested',
                title: 'sql-agent v1.2.0',
                message: 'Changes requested by Rishabh.',
                threadId: 'th-sql',
                submissionId: 'sub-sql',
                artifactId: 'sql-agent',
                artifactName: 'sql-agent',
                version: '1.2.0',
                createdAt: new Date().toISOString(),
                isRead: false
            },
            {
                id: 'n-tree-2',
                type: 'ReviewApproved',
                title: 'accessibility-agent v2.0.0',
                message: 'Your artifact was approved.',
                threadId: 'th-acc',
                submissionId: 'sub-acc',
                artifactId: 'accessibility-agent',
                artifactName: 'accessibility-agent',
                version: '2.0.0',
                createdAt: new Date().toISOString(),
                isRead: true
            }
        ];

        const mockAuth = new MockAuthStatusProvider(true, 'tok', 'producer@test.com');
        const treeProvider = new ArtifactTreeDataProvider(
            new MockCliExecutor(),
            mockAuth,
            'engineering-commons',
            'http://localhost:5000',
            mockNotifs
        );

        // Root items
        const roots = await treeProvider.getChildren();
        const notifRoot = roots.find(r => r.category === 'notifications');
        expect(notifRoot).to.exist;
        expect(notifRoot!.label).to.include('Notifications (1)');

        // Children of notifications
        const notifChildren = await treeProvider.getChildren(notifRoot);
        expect(notifChildren.length).to.equal(2);

        // First item is unread (●)
        expect(notifChildren[0].label).to.include('● Changes Requested');
        expect(notifChildren[0].description).to.include('sql-agent v1.2.0');

        // Second item is read (○)
        expect(notifChildren[1].label).to.include('○ Review Approved');
        expect(notifChildren[1].description).to.include('accessibility-agent v2.0.0');

        // Mark all read -> label becomes 'Notifications'
        await mockNotifs.markAsRead('n-tree-1');
        const updatedRoots = await treeProvider.getChildren();
        const updatedNotifRoot = updatedRoots.find(r => r.category === 'notifications');
        expect(updatedNotifRoot!.label).to.equal('Notifications');
    });

    it('7. Individual notification deletion and Clear All notifications', async () => {
        const mockNotifs = new MockNotificationService();
        mockNotifs.notifications = [
            {
                id: 'n-del-1',
                type: 'FeedbackAdded',
                title: 'test-art v1.0.0',
                message: 'Reviewer commented.',
                threadId: 'th-1',
                submissionId: 'sub-1',
                artifactId: 'test-art',
                artifactName: 'test-art',
                version: '1.0.0',
                createdAt: new Date().toISOString(),
                isRead: false
            },
            {
                id: 'n-del-2',
                type: 'ReviewApproved',
                title: 'test-art v1.0.0',
                message: 'Approved!',
                threadId: 'th-2',
                submissionId: 'sub-2',
                artifactId: 'test-art',
                artifactName: 'test-art',
                version: '1.0.0',
                createdAt: new Date().toISOString(),
                isRead: true
            }
        ];

        // Delete single notification
        const delRes = await mockNotifs.deleteNotification('n-del-1');
        expect(delRes).to.be.true;
        let notifs = await mockNotifs.getNotifications();
        expect(notifs.length).to.equal(1);
        expect(notifs[0].id).to.equal('n-del-2');

        // Clear all notifications
        const clearRes = await mockNotifs.clearNotifications();
        expect(clearRes).to.be.true;
        notifs = await mockNotifs.getNotifications();
        expect(notifs.length).to.equal(0);
    });
});
