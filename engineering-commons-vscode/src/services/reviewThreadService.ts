import * as http from 'http';
import * as https from 'https';
import { IAuthenticationStatusProvider } from './authenticationStatusProvider';

export interface ReviewMessageDto {
    id: string;
    threadId: string;
    authorEmail: string;
    authorRole: 'Reviewer' | 'Producer' | string;
    message: string;
    createdAt: string;
}

export interface ReviewThreadDto {
    id: string;
    reviewId: string;
    artifactId: string;
    artifactName: string;
    version: string;
    producerEmail: string;
    reviewerEmail?: string;
    status: 'Open' | 'ChangesRequested' | 'Resolved' | 'Closed' | string;
    feedback?: string;
    reviewStatus?: string;
    slaTargetMinutes?: number;
    slaDeadline?: string;
    slaRemainingMinutes?: number;
    slaStatus?: string;
    slaRemainingFormatted?: string;
    isSlaBreached?: boolean;
    isSlaWarning?: boolean;
    createdAt: string;
    updatedAt: string;
    messages: ReviewMessageDto[];
}

export interface IReviewThreadService {
    getThreadAsync(reviewId: string): Promise<ReviewThreadDto | null>;
    sendMessageAsync(reviewId: string, message: string): Promise<ReviewMessageDto | null>;
    updateStatusAsync(reviewId: string, status: string): Promise<ReviewThreadDto | null>;
}

export class HttpReviewThreadService implements IReviewThreadService {
    private backendUrl: string;
    private authProvider: IAuthenticationStatusProvider;

    constructor(backendUrl = 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io', authProvider: IAuthenticationStatusProvider) {
        this.backendUrl = backendUrl.replace(/\/+$/, '');
        this.authProvider = authProvider;
    }

    public setBackendUrl(url: string): void {
        this.backendUrl = (url || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/+$/, '');
    }

    private fetchJson<T>(path: string, method = 'GET', body?: any): Promise<{ status: number; data: T | null }> {
        return new Promise(async (resolve) => {
            try {
                const isAuth = await this.authProvider.isAuthenticated();
                if (!isAuth) {
                    resolve({ status: 401, data: null });
                    return;
                }
                const token = await this.authProvider.getToken();
                if (!token) {
                    resolve({ status: 401, data: null });
                    return;
                }
                const url = new URL(`${this.backendUrl}${path}`);
                const client = url.protocol === 'https:' ? https : http;
                const payload = body ? JSON.stringify(body) : undefined;
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json'
                };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                if (payload) {
                    headers['Content-Length'] = Buffer.byteLength(payload).toString();
                }

                const req = client.request(url, { method, headers }, (res) => {
                    let raw = '';
                    res.on('data', chunk => raw += chunk);
                    res.on('end', () => {
                        try {
                            const parsed = raw ? JSON.parse(raw) : null;
                            resolve({ status: res.statusCode || 500, data: parsed });
                        } catch {
                            resolve({ status: res.statusCode || 500, data: null });
                        }
                    });
                });

                req.on('error', () => resolve({ status: 500, data: null }));
                if (payload) req.write(payload);
                req.end();
            } catch {
                resolve({ status: 500, data: null });
            }
        });
    }

    public async getThreadAsync(reviewId: string): Promise<ReviewThreadDto | null> {
        const res = await this.fetchJson<ReviewThreadDto>(`/api/reviews/${reviewId}/thread`, 'GET');
        if (res.status === 200 && res.data) {
            return res.data;
        }
        return null;
    }

    public async sendMessageAsync(reviewId: string, message: string): Promise<ReviewMessageDto | null> {
        const res = await this.fetchJson<ReviewMessageDto>(`/api/reviews/${reviewId}/thread/messages`, 'POST', { message });
        if (res.status === 200 && res.data) {
            return res.data;
        }
        return null;
    }

    public async updateStatusAsync(reviewId: string, status: string): Promise<ReviewThreadDto | null> {
        const res = await this.fetchJson<ReviewThreadDto>(`/api/reviews/${reviewId}/thread/status`, 'POST', { status });
        if (res.status === 200 && res.data) {
            return res.data;
        }
        return null;
    }
}
