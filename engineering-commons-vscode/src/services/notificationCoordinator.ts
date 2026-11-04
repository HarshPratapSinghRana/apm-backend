import * as vscode from 'vscode';
import { INotificationService, AppNotification } from './notificationService';
import { IAuthenticationStatusProvider } from './authenticationStatusProvider';
import { INotificationClient, PollingNotificationClient } from './notificationClient';

export class NotificationCoordinator {
    private notifiedIds = new Set<string>();
    private client: INotificationClient;

    constructor(
        private notificationService: INotificationService,
        private authProvider: IAuthenticationStatusProvider,
        pollingIntervalMs: number = 5 * 60 * 1000,
        customClient?: INotificationClient
    ) {
        this.client = customClient || new PollingNotificationClient(notificationService, authProvider, pollingIntervalMs);

        // Listen for new incoming notifications from client (poller or future realtime)
        this.client.onDidReceiveNotifications(async (notifs) => {
            const unread = (notifs || []).filter(n => !n.isRead);
            for (const notif of unread) {
                if (this.notifiedIds.has(notif.id)) {
                    continue;
                }
                this.notifiedIds.add(notif.id);
                this.showNotificationPopup(notif);
            }
        });
    }

    public start(): void {
        this.client.start();
    }

    public stop(): void {
        this.client.stop();
    }

    public async checkNotifications(): Promise<void> {
        await this.client.fetchNow();
    }

    public async showNotificationPopup(notif: AppNotification): Promise<void> {
        const actionLabel = this.getActionLabelForType(notif.type);
        const prefix = notif.title || notif.artifactName || 'Engineering Commons';

        let selectedAction: string | undefined;
        if (notif.type === 'ChangesRequested' || notif.type === 'ReviewRejected') {
            selectedAction = await vscode.window.showWarningMessage(
                `Engineering Commons\n\n${prefix}\n${notif.message}`,
                actionLabel
            );
        } else {
            selectedAction = await vscode.window.showInformationMessage(
                `Engineering Commons\n\n${prefix}\n${notif.message}`,
                actionLabel
            );
        }

        if (selectedAction === actionLabel) {
            // Mark as read and open exact review/thread directly
            await this.notificationService.markAsRead(notif.id).catch(() => {});
            await this.openDirectReview(notif);
        }
    }

    private getActionLabelForType(type: string): string {
        switch (type) {
            case 'ReviewAssigned':
            case 'Resubmitted':
                return 'Open Review';
            case 'FeedbackAdded':
            case 'ProducerReplied':
            case 'ChangesRequested':
                return 'Open Thread';
            case 'ReviewApproved':
            case 'ReviewRejected':
            case 'ReviewCompleted':
                return 'View Review';
            default:
                return 'Open Review';
        }
    }

    private async openDirectReview(notif: AppNotification): Promise<void> {
        const submissionId = notif.submissionId || notif.threadId;
        if (submissionId) {
            await vscode.commands.executeCommand('engineeringCommons.openThread', submissionId, notif.artifactName);
        } else {
            await vscode.commands.executeCommand('engineeringCommons.review');
        }
    }
}
