import * as vscode from 'vscode';
import { INotificationService, AppNotification } from './notificationService';
import { IAuthenticationStatusProvider } from './authenticationStatusProvider';

export interface INotificationClient {
    readonly onDidReceiveNotifications: vscode.Event<AppNotification[]>;
    start(): void;
    stop(): void;
    fetchNow(): Promise<AppNotification[]>;
    setPollingInterval(intervalMs: number): void;
}

export class PollingNotificationClient implements INotificationClient {
    private _onDidReceiveNotifications = new vscode.EventEmitter<AppNotification[]>();
    public readonly onDidReceiveNotifications = this._onDidReceiveNotifications.event;

    private timer?: NodeJS.Timeout;
    private pollingIntervalMs: number;
    private lastFetchMs = 0;

    constructor(
        private notificationService: INotificationService,
        private authProvider: IAuthenticationStatusProvider,
        pollingIntervalMs: number = 5 * 60 * 1000
    ) {
        this.pollingIntervalMs = pollingIntervalMs;
    }

    public start(): void {
        this.authProvider.isAuthenticated().then((isAuth) => {
            if (isAuth) {
                this.startPolling();
            }
        }).catch(() => {});

        this.authProvider.onDidChangeAuthentication((isAuth) => {
            if (isAuth) {
                this.startPolling();
            } else {
                this.stop();
            }
        });

        if (vscode.window && vscode.window.onDidChangeWindowState) {
            vscode.window.onDidChangeWindowState((state) => {
                if (state.focused) {
                    const now = Date.now();
                    if (this.lastFetchMs === 0 || (now - this.lastFetchMs >= this.pollingIntervalMs)) {
                        this.fetchNow(true).catch(() => {});
                    }
                }
            });
        }
    }

    private startPolling(): void {
        this.stop();
        this.fetchNow();

        if (this.pollingIntervalMs > 0) {
            this.timer = setInterval(() => {
                this.fetchNow();
            }, this.pollingIntervalMs);
        }
    }

    public stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }

    public setPollingInterval(intervalMs: number): void {
        this.pollingIntervalMs = intervalMs;
        this.stop();
        this.start();
    }

    public async fetchNow(force = false): Promise<AppNotification[]> {
        try {
            const isAuth = await this.authProvider.isAuthenticated();
            if (!isAuth) return [];

            if (!force && vscode.window && vscode.window.state && !vscode.window.state.focused) {
                return [];
            }

            this.lastFetchMs = Date.now();
            const notifs = await this.notificationService.getNotifications(false);
            this._onDidReceiveNotifications.fire(notifs || []);
            return notifs || [];
        } catch {
            // Silently handle backend offline/errors to avoid crashing
            return [];
        }
    }
}
