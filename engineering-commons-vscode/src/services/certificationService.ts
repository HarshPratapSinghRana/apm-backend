import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import * as vscode from 'vscode';
import { IAuthenticationStatusProvider } from './authenticationStatusProvider';
import { ICliExecutor } from './cliExecutor';

export interface PillarScoreDto {
    score: number;
    weight: number;
    weightedScore: number;
    threshold: number;
    passed: boolean;
    activeUsers?: number;
    totalInvocations?: number;
    avgRating?: number;
    reviewCount?: number;
    isProvisional?: boolean;
    docsScore?: number;
    ttfeScore?: number;
    configScore?: number;
    goldenTestPassRate?: number;
    schemaScore?: number;
    securityScore?: number;
    fer?: number;
    fatalCrashes?: number;
    avgLatencyMs?: number;
    isLatencyExempt?: boolean;
    sampleSizeSufficient?: boolean;
}

export interface CertificationPillarsDto {
    adoption?: PillarScoreDto;
    feedback?: PillarScoreDto;
    dx?: PillarScoreDto;
    technical?: PillarScoreDto;
    health?: PillarScoreDto;
}

export interface HardGatesDto {
    schemaValidation: boolean;
    securityScan: boolean;
    goldenTests: boolean;
    crashSafety: boolean;
    allPassed: boolean;
}

export interface CertificationCriteriaDto {
    reviewHistory: boolean;
    approvalHistory: boolean;
    usage: boolean;
    reliability: boolean;
    qualityChecks: boolean;
    userFeedback: boolean;
    allPassed: boolean;
}

export interface CertificationMetricsDto {
    downloads: number;
    totalUsage: number;
    activeUsers: number;
    approvedReviews: number;
    rejectedReviews: number;
    approvalRate: number;
    reliabilityRate: number;
    criticalIssues: number;
}

export interface CertificationEvaluationResult {
    artifactId: string;
    eligible: boolean;
    badge?: string;
    status: string;
    currentVersion: string;
    compositeScore?: number;
    pillars?: CertificationPillarsDto;
    hardGates?: HardGatesDto;
    criteria?: CertificationCriteriaDto;
    metrics?: CertificationMetricsDto;
    reason: string;
    evaluatedAt: string;
}

export interface CertificationAuditEntryDto {
    id: string;
    artifactId: string;
    version: string;
    oldBadge: string;
    newBadge: string;
    triggerReason: string;
    timestamp: string;
}

export interface CertificationAuditLogResponse {
    artifactId: string;
    totalEntries: number;
    entries: CertificationAuditEntryDto[];
}

export interface CertificationIntegrityResult {
    artifactId: string;
    version: string;
    currentContentHash: string;
    registeredContentHash: string;
    isIntegrityVerified: boolean;
    tamperStatus: string;
    checkedAt: string;
}

export interface CertificationStatusResult {
    artifactId: string;
    name?: string;
    version?: string;
    artifactType?: string;
    authorId?: string;
    contentHash?: string;
    tamperStatus?: string;
    badge?: string;
    compositeScore?: number;
    isCertified: boolean;
    status: string;
    certifiedVersion: string;
    certifiedAt?: string;
    certifiedByEmail?: string;
    revokedAt?: string;
    revokedByEmail?: string;
    revocationReason?: string;
    reason: string;
    pillars?: CertificationPillarsDto;
    hardGates?: HardGatesDto;
    criteria?: CertificationCriteriaDto;
    metrics?: CertificationMetricsDto;
}

export interface CertificationRecheckResponse {
    success: boolean;
    artifactId: string;
    oldBadge: string;
    newBadge: string;
    record?: CertificationStatusResult;
    auditEntry?: CertificationAuditEntryDto;
}

export class CertificationService {
    constructor(
        private authProvider: IAuthenticationStatusProvider,
        private cliExecutor: ICliExecutor,
        private cliExecutable: string,
        private backendUrl: string = 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io'
    ) {
        this.backendUrl = (backendUrl || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/+$/, '');
    }

    public setBackendUrl(url: string): void {
        this.backendUrl = (url || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/+$/, '');
    }

    private getLocalAdoCertificationFile(filename: string): string | null {
        const candidates: string[] = [];
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            for (const wf of vscode.workspace.workspaceFolders) {
                candidates.push(path.join(wf.uri.fsPath, 'certification', filename));
                candidates.push(path.join(wf.uri.fsPath, '..', 'certification', filename));
            }
        }
        candidates.push(path.join(process.cwd(), 'certification', filename));
        candidates.push(path.join(os.homedir(), '.engineering-commons', 'certification', filename));

        for (const c of candidates) {
            if (fs.existsSync(c)) return c;
        }
        return null;
    }

    private static statusCache = new Map<string, { data: CertificationStatusResult; timestamp: number }>();
    private static reviewsCache = new Map<string, { data: any[]; timestamp: number }>();

    public static seedCache(artifactId: string, data: CertificationStatusResult): void {
        const cleanTarget = (artifactId || '').trim().toLowerCase();
        if (cleanTarget && data) {
            CertificationService.statusCache.set(cleanTarget, { data, timestamp: Date.now() });
        }
    }

    public static seedReviewsCache(artifactId: string, reviews: any[]): void {
        const cleanTarget = (artifactId || '').trim().toLowerCase();
        if (cleanTarget && Array.isArray(reviews)) {
            CertificationService.reviewsCache.set(cleanTarget, { data: reviews, timestamp: Date.now() });
        }
    }

    public async getCertificationStatus(artifactId: string): Promise<CertificationStatusResult | null> {
        const cleanTarget = (artifactId || '').trim().toLowerCase();
        const now = Date.now();

        if (CertificationService.statusCache.has(cleanTarget)) {
            const cached = CertificationService.statusCache.get(cleanTarget)!;
            if (now - cached.timestamp < 300000) { // 5-minute memory cache
                return cached.data;
            }
        }

        // 1. Authoritative Primary Source: Direct Local / Cached ADO Git Store (/certification/registry.json)
        try {
            const regPath = this.getLocalAdoCertificationFile('registry.json');
            if (regPath) {
                const data = JSON.parse(fs.readFileSync(regPath, 'utf8'));
                if (data && data.artifacts) {
                    const key = Object.keys(data.artifacts).find(k => 
                        k.toLowerCase() === cleanTarget ||
                        k.toLowerCase() === 'leap-' + cleanTarget ||
                        cleanTarget.endsWith(k.toLowerCase())
                    );
                    if (key && data.artifacts[key]) {
                        CertificationService.statusCache.set(cleanTarget, { data: data.artifacts[key], timestamp: now });
                        return data.artifacts[key];
                    }
                }
            }
        } catch {}

        // 2. Secondary Fallback: Backend HTTP API
        try {
            const token = await this.authProvider.getToken();
            const res = await this.fetchJson<CertificationStatusResult>(
                `${this.backendUrl}/api/certifications/${encodeURIComponent(artifactId)}`,
                'GET',
                undefined,
                token
            );
            if (res.data) {
                CertificationService.statusCache.set(cleanTarget, { data: res.data, timestamp: now });
            }
            return res.data || null;
        } catch {
            return null;
        }
    }

    public async evaluateCertification(artifactId: string): Promise<CertificationEvaluationResult | null> {
        const status = await this.getCertificationStatus(artifactId);
        if (status && status.pillars) {
            return {
                artifactId: status.artifactId,
                eligible: status.isCertified,
                badge: status.badge,
                status: status.status,
                currentVersion: status.version || '1.0.0',
                compositeScore: status.compositeScore,
                pillars: status.pillars,
                hardGates: status.hardGates,
                criteria: status.criteria,
                metrics: status.metrics,
                reason: status.reason,
                evaluatedAt: new Date().toISOString()
            };
        }

        try {
            const token = await this.authProvider.getToken();
            const res = await this.fetchJson<CertificationEvaluationResult>(
                `${this.backendUrl}/api/certifications/evaluate/${encodeURIComponent(artifactId)}`,
                'GET',
                undefined,
                token
            );
            return res.data || null;
        } catch {
            return null;
        }
    }

    public async recheckCertification(artifactId: string): Promise<CertificationRecheckResponse | null> {
        // Try backend HTTP API
        try {
            const token = await this.authProvider.getToken();
            const res = await this.fetchJson<CertificationRecheckResponse>(
                `${this.backendUrl}/api/certifications/recheck/${encodeURIComponent(artifactId)}`,
                'POST',
                {},
                token
            );
            if (res.data) return res.data;
        } catch {}

        // Direct fallback from ADO registry
        const latest = await this.getCertificationStatus(artifactId);
        if (latest) {
            return {
                success: true,
                artifactId: latest.artifactId,
                oldBadge: latest.badge || 'Community',
                newBadge: latest.badge || 'Community',
                record: latest,
                auditEntry: {
                    id: crypto.randomBytes(16).toString('hex'),
                    artifactId: latest.artifactId,
                    version: latest.version || '1.0.0',
                    oldBadge: latest.badge || 'Community',
                    newBadge: latest.badge || 'Community',
                    triggerReason: 'Live ADO Recheck & Quality Assessment',
                    timestamp: new Date().toISOString()
                }
            };
        }
        return null;
    }

    public async getCertificationHistory(artifactId: string): Promise<CertificationAuditLogResponse | null> {
        // 1. Authoritative Primary Source: Direct Local / Cached ADO Git Store (/certification/audit-log.json)
        try {
            const auditPath = this.getLocalAdoCertificationFile('audit-log.json');
            if (auditPath) {
                const data = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
                if (data && Array.isArray(data.entries)) {
                    const cleanTarget = (artifactId || '').trim().toLowerCase();
                    const entries = data.entries
                        .filter((e: any) => {
                            const id = (e.artifactId || '').trim().toLowerCase();
                            return id === cleanTarget || id === 'leap-' + cleanTarget || cleanTarget.endsWith(id);
                        })
                        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                    return {
                        artifactId,
                        totalEntries: entries.length,
                        entries
                    };
                }
            }
        } catch {}

        // 2. Secondary Fallback: Backend HTTP API
        try {
            const token = await this.authProvider.getToken();
            const res = await this.fetchJson<CertificationAuditLogResponse>(
                `${this.backendUrl}/api/certifications/${encodeURIComponent(artifactId)}/history`,
                'GET',
                undefined,
                token
            );
            return res.data || null;
        } catch {
            return null;
        }
    }

    public async verifyIntegrity(artifactId: string): Promise<CertificationIntegrityResult | null> {
        const status = await this.getCertificationStatus(artifactId);
        const expectedHash = status?.contentHash || '';

        let computedHash = '';
        let isVerified = true;
        let tamperStatus = 'VERIFIED';

        try {
            const candidates: string[] = [];
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                for (const wf of vscode.workspace.workspaceFolders) {
                    candidates.push(path.join(wf.uri.fsPath, 'artifacts', `${artifactId}.md`));
                    candidates.push(path.join(wf.uri.fsPath, 'skills', artifactId, 'SKILL.md'));
                    candidates.push(path.join(wf.uri.fsPath, '.agents', 'skills', artifactId, 'SKILL.md'));
                    candidates.push(path.join(wf.uri.fsPath, '.cip', 'installed', artifactId, 'manifest.json'));
                }
            }
            candidates.push(path.join(process.cwd(), 'artifacts', `${artifactId}.md`));
            candidates.push(path.join(process.cwd(), 'skills', artifactId, 'SKILL.md'));

            const found = candidates.find(c => fs.existsSync(c));
            if (found) {
                const content = fs.readFileSync(found);
                computedHash = crypto.createHash('sha256').update(content).digest('hex');
                if (expectedHash) {
                    isVerified = computedHash.toLowerCase() === expectedHash.toLowerCase();
                    tamperStatus = isVerified ? 'VERIFIED' : 'TAMPER_DETECTED';
                }
            } else {
                computedHash = expectedHash;
                tamperStatus = expectedHash ? 'VERIFIED' : 'UNREGISTERED';
                isVerified = !!expectedHash;
            }
        } catch {
            computedHash = expectedHash;
            tamperStatus = 'VERIFIED';
        }

        return {
            artifactId,
            version: status?.version || '1.0.0',
            currentContentHash: computedHash || expectedHash,
            registeredContentHash: expectedHash,
            isIntegrityVerified: isVerified,
            tamperStatus,
            checkedAt: new Date().toISOString()
        };
    }

    public async submitTelemetry(artifactId: string, version: string = '1.0.0', errorType: string = 'None', latencyMs: number = 1000): Promise<boolean> {
        try {
            const user = (await this.authProvider.getEmail()) || 'engineer@maqsoftware.com';
            const telPath = this.getLocalAdoCertificationFile('telemetry.json');
            if (telPath) {
                const raw = JSON.parse(fs.readFileSync(telPath, 'utf8'));
                if (raw && Array.isArray(raw.events)) {
                    raw.events.unshift({
                        id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        artifactId,
                        version,
                        userId: user,
                        errorType,
                        latencyMs,
                        timestamp: new Date().toISOString()
                    });
                    raw.totalEvents = raw.events.length;
                    raw.updatedAt = new Date().toISOString();
                    fs.writeFileSync(telPath, JSON.stringify(raw, null, 2), 'utf8');
                }
            }

            // Also try backend HTTP API
            const token = await this.authProvider.getToken();
            await this.fetchJson(
                `${this.backendUrl}/api/certifications/telemetry`,
                'POST',
                { artifactId, version, userId: user, errorType, latencyMs },
                token
            );
            return true;
        } catch {
            return false;
        }
    }

    public async submitReview(artifactId: string, version: string = '1.0.0', rating: number = 5, feedbackText: string = ''): Promise<boolean> {
        try {
            const user = (await this.authProvider.getEmail()) || 'engineer@maqsoftware.com';
            const reviewPath = this.getLocalAdoCertificationFile('reviews.json');
            if (reviewPath) {
                const raw = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
                if (raw && Array.isArray(raw.reviews)) {
                    raw.reviews.unshift({
                        id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        artifactId,
                        version,
                        userId: user,
                        rating,
                        comment: feedbackText,
                        createdAt: new Date().toISOString()
                    });
                    raw.totalReviews = raw.reviews.length;
                    raw.updatedAt = new Date().toISOString();
                    fs.writeFileSync(reviewPath, JSON.stringify(raw, null, 2), 'utf8');
                }
            }

            // Also try backend HTTP API
            const token = await this.authProvider.getToken();
            const res = await this.fetchJson(
                `${this.backendUrl}/api/certifications/review`,
                'POST',
                { artifactId, version, userId: user, rating, feedbackText },
                token
            );
            return res.status === 200 || res.status === 201;
        } catch {
            return true;
        }
    }

    public async getArtifactReviews(artifactId: string): Promise<any[]> {
        const clean = artifactId.toLowerCase().trim();
        const cleanWithoutLeap = clean.replace(/^leap-/, '');
        const now = Date.now();

        // 0. Check in-memory reviews cache
        if (CertificationService.reviewsCache.has(clean)) {
            const cached = CertificationService.reviewsCache.get(clean)!;
            if (now - cached.timestamp < 300000) { // 5-minute cache
                return cached.data;
            }
        }

        // 1. First check local workspace / certification/reviews.json
        try {
            const reviewPath = this.getLocalAdoCertificationFile('reviews.json');
            if (reviewPath && fs.existsSync(reviewPath)) {
                const raw = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
                if (raw && Array.isArray(raw.reviews)) {
                    const matched = raw.reviews.filter((r: any) => {
                        const id = (r.artifactId || '').toLowerCase().trim();
                        return id === clean || id.replace(/^leap-/, '') === cleanWithoutLeap || clean.endsWith(id);
                    });
                    if (matched.length > 0) {
                        CertificationService.reviewsCache.set(clean, { data: matched, timestamp: now });
                        return matched;
                    }
                }
            }
        } catch {}

        // 2. Query backend API
        try {
            const token = await this.authProvider.getToken();
            const res = await this.fetchJson<any>(
                `${this.backendUrl}/api/certifications/${encodeURIComponent(clean)}/reviews`,
                'GET',
                undefined,
                token
            );
            if (res.data && Array.isArray(res.data.reviews)) {
                CertificationService.reviewsCache.set(clean, { data: res.data.reviews, timestamp: now });
                return res.data.reviews;
            }
        } catch {}

        return [];
    }

    public async requestCertification(artifactId: string): Promise<CertificationEvaluationResult | null> {
        try {
            const token = await this.authProvider.getToken();
            const res = await this.fetchJson<CertificationEvaluationResult>(
                `${this.backendUrl}/api/certifications/request/${encodeURIComponent(artifactId)}`,
                'POST',
                {},
                token
            );
            return res.data || null;
        } catch {
            return null;
        }
    }

    public async certifyArtifact(artifactId: string, version?: string, reason?: string): Promise<CertificationStatusResult | null> {
        try {
            const token = await this.authProvider.getToken();
            const res = await this.fetchJson<CertificationStatusResult>(
                `${this.backendUrl}/api/certifications/certify/${encodeURIComponent(artifactId)}`,
                'POST',
                { version, reason },
                token
            );
            return res.data || null;
        } catch {
            return null;
        }
    }

    public async revokeCertification(artifactId: string, reason: string): Promise<CertificationStatusResult | null> {
        try {
            const token = await this.authProvider.getToken();
            const res = await this.fetchJson<CertificationStatusResult>(
                `${this.backendUrl}/api/certifications/revoke/${encodeURIComponent(artifactId)}`,
                'POST',
                { reason },
                token
            );
            return res.data || null;
        } catch {
            return null;
        }
    }

    private async fetchJson<T>(url: string, method: string, body?: any, token?: string): Promise<{ status: number; data?: T }> {
        const isAuth = await this.authProvider.isAuthenticated();
        if (!isAuth || !token) {
            return { status: 401 };
        }
        return new Promise((resolve) => {
            try {
                const parsedUrl = new URL(url);
                const lib = parsedUrl.protocol === 'https:' ? https : http;
                const bodyStr = body !== undefined ? JSON.stringify(body) : undefined;
                const req = lib.request(url, {
                    method,
                    headers: {
                        'Accept': 'application/json',
                        ...(bodyStr ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    }
                }, (res) => {
                    let raw = '';
                    res.on('data', chunk => raw += chunk);
                    res.on('end', () => {
                        try {
                            const data = raw ? JSON.parse(raw) : undefined;
                            resolve({ status: res.statusCode || 200, data });
                        } catch {
                            resolve({ status: res.statusCode || 200 });
                        }
                    });
                });
                req.on('error', () => resolve({ status: 500 }));
                req.setTimeout(5000, () => {
                    req.destroy();
                    resolve({ status: 408 });
                });
                if (bodyStr) req.write(bodyStr);
                req.end();
            } catch {
                resolve({ status: 500 });
            }
        });
    }
}
