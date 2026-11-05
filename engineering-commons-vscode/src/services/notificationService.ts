import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { IAuthenticationStatusProvider } from './authenticationStatusProvider';

export type NotificationEventType =
    | 'ReviewAssigned'
    | 'FeedbackAdded'
    | 'ProducerReplied'
    | 'ChangesRequested'
    | 'Resubmitted'
    | 'ReviewApproved'
    | 'ReviewRejected'
    | 'ReviewCompleted'
    | 'AccessRequested'
    | 'AccessApproved'
    | 'AccessRejected'
    | 'AccessRevoked'
    | 'ReviewerCertified';

export interface AppNotification {
    id: string;
    type: NotificationEventType;
    title: string;
    message: string;
    threadId?: string;
    submissionId: string;
    artifactId: string;
    artifactName: string;
    version: string;
    createdAt: string;
    isRead: boolean;
}

export interface INotificationService {
    getNotifications(unreadOnly?: boolean, force?: boolean): Promise<AppNotification[]>;
    markAsRead(notificationId: string): Promise<boolean>;
    deleteNotification(notificationId: string): Promise<boolean>;
    clearNotifications(): Promise<boolean>;
}

export class HttpNotificationService implements INotificationService {
    private cachedNotifications: AppNotification[] = [];
    private lastNotificationsFetchMs = 0;
    private lastEtag: string | null = null;
    private inFlightFetch?: Promise<AppNotification[]>;

    constructor(
        private backendUrl: string,
        private authProvider: IAuthenticationStatusProvider
    ) {
        this.backendUrl = (backendUrl || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/+$/, '');
    }

    public setBackendUrl(url: string): void {
        this.backendUrl = (url || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/+$/, '');
        this.lastNotificationsFetchMs = 0;
        this.lastEtag = null;
    }

    public async getNotifications(unreadOnly: boolean = false, force: boolean = false): Promise<AppNotification[]> {
        const now = Date.now();
        // 120-second client-side TTL to avoid aggressive polling
        if (!force && this.lastNotificationsFetchMs > 0 && (now - this.lastNotificationsFetchMs < 120000)) {
            return unreadOnly ? this.cachedNotifications.filter(n => !n.isRead) : [...this.cachedNotifications];
        }

        if (this.inFlightFetch) {
            const list = await this.inFlightFetch;
            return unreadOnly ? list.filter(n => !n.isRead) : [...list];
        }

        const token = await this.authProvider.getToken();
        if (!token) {
            return [];
        }

        const query = unreadOnly ? '?unreadOnly=true' : '';
        const targetUrl = new URL(`/api/notifications${query}`, this.backendUrl);
        const transport = targetUrl.protocol === 'https:' ? https : http;

        this.inFlightFetch = new Promise<AppNotification[]>((resolve) => {
            const headers: Record<string, string> = {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            };
            if (!force && this.lastEtag) {
                headers['If-None-Match'] = this.lastEtag;
            }

            const req = transport.request(targetUrl, {
                method: 'GET',
                headers
            }, (res) => {
                if (res.statusCode === 304) {
                    this.lastNotificationsFetchMs = Date.now();
                    resolve([...this.cachedNotifications]);
                    return;
                }

                const newEtag = res.headers['etag'];
                if (newEtag) {
                    this.lastEtag = Array.isArray(newEtag) ? newEtag[0] : newEtag;
                }

                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const parsed = JSON.parse(body);
                            const list = Array.isArray(parsed) ? parsed : [];
                            this.cachedNotifications = list;
                            this.lastNotificationsFetchMs = Date.now();
                            resolve(list);
                        } catch {
                            resolve(this.cachedNotifications || []);
                        }
                    } else {
                        resolve(this.cachedNotifications || []);
                    }
                });
            });

            req.on('error', () => {
                resolve(this.cachedNotifications || []);
            });

            req.setTimeout(5000, () => {
                req.destroy();
                resolve(this.cachedNotifications || []);
            });

            req.end();
        }).finally(() => {
            this.inFlightFetch = undefined;
        });

        const result = await this.inFlightFetch;
        return unreadOnly ? result.filter((n: any) => !n.isRead) : result;
    }

    public async markAsRead(notificationId: string): Promise<boolean> {
        const token = await this.authProvider.getToken();
        if (!token || !notificationId) {
            return false;
        }

        const targetUrl = new URL(`/api/notifications/${encodeURIComponent(notificationId)}/read`, this.backendUrl);
        const transport = targetUrl.protocol === 'https:' ? https : http;

        return new Promise<boolean>((resolve) => {
            const req = transport.request(targetUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }, (res) => {
                if (res.statusCode === 200) {
                    this.lastNotificationsFetchMs = 0;
                    const notif = this.cachedNotifications.find(n => n.id === notificationId);
                    if (notif) notif.isRead = true;
                }
                resolve(res.statusCode === 200);
            });

            req.on('error', () => resolve(false));
            req.setTimeout(5000, () => {
                req.destroy();
                resolve(false);
            });
            req.end();
        });
    }

    public async deleteNotification(notificationId: string): Promise<boolean> {
        const token = await this.authProvider.getToken();
        if (!token || !notificationId) {
            return false;
        }

        const targetUrl = new URL(`/api/notifications/${encodeURIComponent(notificationId)}`, this.backendUrl);
        const transport = targetUrl.protocol === 'https:' ? https : http;

        return new Promise<boolean>((resolve) => {
            const req = transport.request(targetUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            }, (res) => {
                if (res.statusCode === 200) {
                    this.lastNotificationsFetchMs = 0;
                    this.cachedNotifications = this.cachedNotifications.filter(n => n.id !== notificationId);
                }
                resolve(res.statusCode === 200);
            });

            req.on('error', () => resolve(false));
            req.setTimeout(5000, () => {
                req.destroy();
                resolve(false);
            });
            req.end();
        });
    }

    public async clearNotifications(): Promise<boolean> {
        const token = await this.authProvider.getToken();
        if (!token) {
            return false;
        }

        const targetUrl = new URL(`/api/notifications`, this.backendUrl);
        const transport = targetUrl.protocol === 'https:' ? https : http;

        return new Promise<boolean>((resolve) => {
            const req = transport.request(targetUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            }, (res) => {
                if (res.statusCode === 200) {
                    this.lastNotificationsFetchMs = 0;
                    this.cachedNotifications = [];
                }
                resolve(res.statusCode === 200);
            });

            req.on('error', () => resolve(false));
            req.setTimeout(5000, () => {
                req.destroy();
                resolve(false);
            });
            req.end();
        });
    }
}
