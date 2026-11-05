import * as http from 'http';
import * as https from 'https';
import { IAuthenticationStatusProvider } from './authenticationStatusProvider';

export interface ReviewCommentDto {
    id: string;
    submissionId: string;
    threadId?: string;
    artifactId: string;
    artifactVersion: string;
    filePath: string;
    lineNumber?: number;
    oldLineNumber?: number;
    startLineNumber?: number;
    endLineNumber?: number;
    lineRange?: string;
    lineType: string;
    oldContent?: string;
    newContent?: string;
    authorEmail: string;
    authorRole: string;
    comment: string;
    createdAt: string;
    parentCommentId?: string;
    replies?: ReviewCommentDto[];
}

export interface IReviewCommentService {
    getCommentsAsync(reviewId: string, filePath?: string): Promise<ReviewCommentDto[]>;
    addCommentAsync(
        reviewId: string,
        filePath: string,
        comment: string,
        lineNumber?: number,
        oldLineNumber?: number,
        lineType?: string,
        oldContent?: string,
        newContent?: string,
        startLineNumber?: number,
        endLineNumber?: number,
        lineRange?: string
    ): Promise<ReviewCommentDto | null>;
    addReplyAsync(reviewId: string, commentId: string, reply: string): Promise<ReviewCommentDto | null>;
    getDiffAsync(reviewId: string): Promise<any | null>;
    approveReviewAsync(reviewId: string, feedback?: string): Promise<boolean>;
    rejectReviewAsync(reviewId: string, feedback?: string): Promise<boolean>;
    requestChangesAsync(reviewId: string, feedback?: string): Promise<boolean>;
    cancelReviewAsync(reviewId: string, reason?: string): Promise<boolean>;
}

export class ReviewCommentService implements IReviewCommentService {
    private authProvider: IAuthenticationStatusProvider;
    private baseUrl: string;

    constructor(authProvider: IAuthenticationStatusProvider, baseUrl = 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io') {
        this.authProvider = authProvider;
        this.baseUrl = (baseUrl || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/+$/, '');
    }

    public setBackendUrl(url: string): void {
        this.baseUrl = (url || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/+$/, '');
    }

    public async getDiffAsync(reviewId: string): Promise<any | null> {
        const token = await this.authProvider.getToken();
        const res = await this.requestJson<any>(`${this.baseUrl}/api/reviews/${reviewId}/diff`, 'GET', undefined, token);
        return res.data;
    }

    public async approveReviewAsync(reviewId: string, feedback?: string): Promise<boolean> {
        const token = await this.authProvider.getToken();
        const res = await this.requestJson<any>(`${this.baseUrl}/api/reviews/${reviewId}/approve`, 'POST', { feedback }, token);
        return res.status >= 200 && res.status < 300;
    }

    public async rejectReviewAsync(reviewId: string, feedback?: string): Promise<boolean> {
        const token = await this.authProvider.getToken();
        const res = await this.requestJson<any>(`${this.baseUrl}/api/reviews/${reviewId}/reject`, 'POST', { feedback }, token);
        return res.status >= 200 && res.status < 300;
    }

    public async requestChangesAsync(reviewId: string, feedback?: string): Promise<boolean> {
        const token = await this.authProvider.getToken();
        const res = await this.requestJson<any>(`${this.baseUrl}/api/reviews/${reviewId}/request-changes`, 'POST', { feedback }, token);
        return res.status >= 200 && res.status < 300;
    }

    public async cancelReviewAsync(reviewId: string, reason?: string): Promise<boolean> {
        const token = await this.authProvider.getToken();
        const res = await this.requestJson<any>(`${this.baseUrl}/api/reviews/${reviewId}/cancel`, 'POST', { feedback: reason }, token);
        return res.status >= 200 && res.status < 300;
    }

    public async getCommentsAsync(reviewId: string, filePath?: string): Promise<ReviewCommentDto[]> {
        const token = await this.authProvider.getToken();
        const url = new URL(`${this.baseUrl}/api/reviews/${reviewId}/comments`);
        if (filePath) {
            url.searchParams.append('filePath', filePath);
        }

        const res = await this.requestJson<ReviewCommentDto[]>(url.toString(), 'GET', undefined, token);
        return res.data || [];
    }

    public async addCommentAsync(
        reviewId: string,
        filePath: string,
        comment: string,
        lineNumber?: number,
        oldLineNumber?: number,
        lineType?: string,
        oldContent?: string,
        newContent?: string,
        startLineNumber?: number,
        endLineNumber?: number,
        lineRange?: string
    ): Promise<ReviewCommentDto | null> {
        const token = await this.authProvider.getToken();
        const payload = {
            filePath,
            lineNumber,
            oldLineNumber,
            startLineNumber: startLineNumber ?? lineNumber,
            endLineNumber: endLineNumber ?? lineNumber,
            lineRange: lineRange || (startLineNumber && endLineNumber && startLineNumber !== endLineNumber ? `${startLineNumber}-${endLineNumber}` : undefined),
            lineType: lineType || (lineNumber !== undefined ? 'Modified' : 'File'),
            oldContent,
            newContent,
            comment
        };

        const res = await this.requestJson<ReviewCommentDto>(
            `${this.baseUrl}/api/reviews/${reviewId}/comments`,
            'POST',
            payload,
            token
        );
        return res.data;
    }

    public async addReplyAsync(reviewId: string, commentId: string, reply: string): Promise<ReviewCommentDto | null> {
        const token = await this.authProvider.getToken();
        const res = await this.requestJson<ReviewCommentDto>(
            `${this.baseUrl}/api/reviews/${reviewId}/comments/${commentId}/replies`,
            'POST',
            { reply },
            token
        );
        return res.data;
    }

    private requestJson<T>(urlStr: string, method: string, body?: any, token?: string): Promise<{ status: number; data: T | null }> {
        if (!token) {
            return Promise.resolve({ status: 401, data: null });
        }
        return new Promise((resolve) => {
            try {
                const url = new URL(urlStr);
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
}
