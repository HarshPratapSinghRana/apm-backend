import * as http from 'http';
import * as https from 'https';
import { IAuthenticationStatusProvider } from './authenticationStatusProvider';
import { SharePointBountyService } from './sharepoint/sharepointBountyService';
import { AdoGovernanceService } from './adoGovernanceService';

export type BountyStage = 'Open' | 'CodeGeneration' | 'InReview' | 'InTesting' | 'Completed' | 'Cancelled';

export interface BountySubmission {
    id: string;
    submittedByEmail: string;
    solutionCode: string;
    commitSha?: string;
    notes?: string;
    submittedAt: string;
}

export interface BountyReview {
    id: string;
    reviewerEmail: string;
    isApproved: boolean;
    feedback: string;
    reviewedAt: string;
}

export interface BountyTestRun {
    id: string;
    testerEmail: string;
    testSuiteName: string;
    isPassed: boolean;
    passedCount: number;
    failedCount: number;
    testLogs: string;
    executedAt: string;
}

export interface BountyDto {
    id: string;
    title: string;
    category: string; // "Review", "Code gen", "Testing", "Prompt"
    credits: number;
    points?: number;
    status: string; // "Open", "InProgress", "In progress", "Completed"
    stage: BountyStage;
    claimedByEmail?: string;
    claimedAt?: string;
    createdByEmail?: string;
    dueInDays: number;
    autoReleasesHours: number;
    relatedArtifactId?: string;
    reviewId?: string;
    description: string;
    createdAt: string;
    completedAt?: string;
    winnerEmail?: string;
    isPublished?: boolean;
    publishedToMarketplaceAt?: string;
    isClaimedByMe: boolean;
    submissionsCount?: number;
    reviewsCount?: number;
    testRunsCount?: number;
    latestTestPassed?: boolean;
    latestFeedback?: string;
    producerResolutionPreference?: string;
    slaDeadline?: string;
    slaRemainingMinutes?: number;
    slaRemainingFormatted?: string;
    autoReleaseDeadline?: string;
    autoReleaseRemainingMinutes?: number;
    autoReleaseRemainingFormatted?: string;
    isSlaWarning?: boolean;
    isSlaBreached?: boolean;
    canClaim?: boolean;
    canSubmitCode?: boolean;
    canReview?: boolean;
    canRunTests?: boolean;
}

export interface BountyDetailDto extends BountyDto {
    submissions: BountySubmission[];
    reviews: BountyReview[];
    testRuns: BountyTestRun[];
}

export interface CreateBountyRequest {
    title: string;
    description: string;
    category?: string;
    credits?: number;
    points?: number;
    relatedArtifactId?: string;
    dueInDays?: number;
}

export interface BountySubmissionRequest {
    solutionCode: string;
    commitSha?: string;
    notes?: string;
}

export interface BountyReviewRequest {
    isApproved: boolean;
    feedback: string;
}

export interface BountyTestRunRequest {
    testSuiteName?: string;
    isPassed: boolean;
    passedCount: number;
    failedCount: number;
    testLogs?: string;
}

export interface BountyAnalyticsDto {
    totalBounties: number;
    openCount: number;
    inProgressCount: number;
    completedCount: number;
    successRatePercent: number;
    averageCompletionHours: number;
    stageBreakdown: Record<string, number>;
    categoryBreakdown: Record<string, number>;
    topContributors: Array<{ email: string; completedBounties: number; totalCreditsEarned: number }>;
}

export interface MyReviewItemDto {
    reviewId: string;
    artifactId: string;
    artifactName: string;
    version: string;
    shortHash: string;
    status: string;
    producerEmail: string;
    submittedAt: string;
    slaTargetMinutes?: number;
    slaDeadline?: string;
    slaRemainingMinutes?: number;
    slaRemainingFormatted?: string;
    isSlaWarning?: boolean;
    isSlaBreached?: boolean;
}

export interface MyWorkSummaryDto {
    claimedBounties: BountyDto[];
    reviews: MyReviewItemDto[];
    totalCreditsEarned: number;
    openBountiesCount: number;
    myWorkCount: number;
}

export interface IBountyService {
    getBountiesAsync(category?: string, stage?: string, force?: boolean): Promise<BountyDto[]>;
    getBountyDetailAsync(id: string): Promise<BountyDetailDto | null>;
    createBountyAsync(req: CreateBountyRequest): Promise<BountyDto | null>;
    claimBountyAsync(id: string): Promise<BountyDto | null>;
    releaseBountyAsync(id: string): Promise<BountyDto | null>;
    submitCodeAsync(id: string, req: BountySubmissionRequest): Promise<BountyDetailDto | null>;
    reviewCodeAsync(id: string, req: BountyReviewRequest): Promise<BountyDetailDto | null>;
    runTestsAsync(id: string, req: BountyTestRunRequest): Promise<BountyDetailDto | null>;
    setFeedbackChoiceAsync(id: string, choice: string): Promise<BountyDetailDto | null>;
    completeBountyAsync(id: string): Promise<BountyDto | null>;
    getMyWorkSummaryAsync(force?: boolean): Promise<MyWorkSummaryDto>;
    getBountyAnalyticsAsync(): Promise<BountyAnalyticsDto | null>;
    processAutoReleases(bounties: BountyDto[], myWork: MyWorkSummaryDto): { bounties: BountyDto[]; myWork: MyWorkSummaryDto };
}

function calculateSlaMetadata(b: BountyDto): BountyDto {
    const now = Date.now();
    const claimedMs = b.claimedAt ? new Date(b.claimedAt).getTime() : now;

    // Respect existing SLA deadline if present in ADO, or calculate from claimedAt + dueInDays
    let dueMs: number;
    if (b.slaDeadline) {
        const parsed = new Date(b.slaDeadline).getTime();
        dueMs = !isNaN(parsed) ? parsed : claimedMs + (b.dueInDays || 2) * 24 * 3600 * 1000;
    } else {
        dueMs = claimedMs + (b.dueInDays || 2) * 24 * 3600 * 1000;
    }

    // Respect existing Auto-Release deadline if present in ADO, or calculate from claimedAt + autoReleasesHours
    let autoRelMs: number;
    if (b.autoReleaseDeadline) {
        const parsed = new Date(b.autoReleaseDeadline).getTime();
        autoRelMs = !isNaN(parsed) ? parsed : claimedMs + (b.autoReleasesHours || 18) * 3600 * 1000;
    } else {
        autoRelMs = claimedMs + (b.autoReleasesHours || 18) * 3600 * 1000;
    }

    const remainingSlaMins = Math.max(0, Math.round((dueMs - now) / 60000));
    const remainingAutoRelMins = Math.max(0, Math.round((autoRelMs - now) / 60000));

    const slaH = Math.floor(remainingSlaMins / 60);
    const slaM = remainingSlaMins % 60;
    const arH = Math.floor(remainingAutoRelMins / 60);
    const arM = remainingAutoRelMins % 60;

    b.slaDeadline = new Date(dueMs).toISOString();
    b.slaRemainingMinutes = remainingSlaMins;
    b.slaRemainingFormatted = `${slaH}h ${slaM}m`;
    b.autoReleaseDeadline = new Date(autoRelMs).toISOString();
    b.autoReleaseRemainingMinutes = remainingAutoRelMins;
    b.autoReleaseRemainingFormatted = `${arH}h ${arM}m`;
    b.isSlaWarning = remainingSlaMins > 0 && remainingSlaMins <= 360;
    b.isSlaBreached = remainingSlaMins === 0 && b.status !== 'Completed';
    return b;
}

export class BountyService implements IBountyService {
    private authProvider: IAuthenticationStatusProvider;
    private baseUrl: string;
    private spBountyService: SharePointBountyService;
    private adoGovernanceService: AdoGovernanceService;
    private localClaimedMap: Map<string, BountyDto> = new Map();
    private localCompletedMap: Map<string, BountyDto> = new Map();
    private cachedBounties: { data: BountyDto[]; timestamp: number } | null = null;
    private cachedMyWork: { data: MyWorkSummaryDto; timestamp: number } | null = null;

    constructor(authProvider: IAuthenticationStatusProvider, baseUrl = 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io') {
        this.authProvider = authProvider;
        this.baseUrl = (baseUrl || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/+$/, '');
        this.spBountyService = new SharePointBountyService();
        this.adoGovernanceService = new AdoGovernanceService(authProvider);
    }

    public invalidateCache(): void {
        this.cachedBounties = null;
        this.cachedMyWork = null;
    }

    public setBackendUrl(url: string): void {
        this.baseUrl = (url || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/+$/, '');
        this.invalidateCache();
    }

    private normalizeBounty(raw: any, userEmail = ''): BountyDto {
        const creditsVal = Number(raw.credits ?? raw.points ?? raw.rewardCredits ?? raw.RewardCredits ?? 100) || 100;
        const rawStatus = String(raw.status || raw.Status || 'Open');
        const isClaimedDirect = Boolean(
            raw.isClaimedByMe ||
            (userEmail && raw.claimedByEmail && raw.claimedByEmail.toLowerCase() === userEmail.toLowerCase()) ||
            (userEmail && raw.ClaimedBy && raw.ClaimedBy.toLowerCase() === userEmail.toLowerCase()) ||
            this.localClaimedMap.has(String(raw.id))
        );

        let finalStatus = rawStatus;
        if (this.localCompletedMap.has(String(raw.id))) {
            finalStatus = 'Completed';
        } else if (isClaimedDirect && finalStatus === 'Open') {
            finalStatus = 'InProgress';
        }

        const rawStage = (raw.stage || raw.Stage || (finalStatus === 'InProgress' ? 'CodeGeneration' : 'Open')) as BountyStage;
        const dueDays = Number(raw.dueInDays || 2);
        const autoHours = Number(raw.autoReleasesHours || 18);
        const slaDeadline = raw.slaDeadline || raw.SlaDeadline;
        const autoReleaseDeadline = raw.autoReleaseDeadline || raw.AutoReleaseDeadline;

        const dto: BountyDto = {
            id: String(raw.id || ''),
            title: String(raw.title || raw.Title || `Bounty #${raw.id}`),
            category: String(raw.category || raw.Category || 'General'),
            credits: creditsVal,
            points: creditsVal,
            status: finalStatus,
            stage: rawStage,
            claimedByEmail: raw.claimedByEmail || raw.ClaimedBy || (isClaimedDirect ? userEmail : undefined),
            claimedAt: raw.claimedAt || raw.ClaimedAt || (isClaimedDirect ? new Date().toISOString() : undefined),
            createdByEmail: raw.createdByEmail,
            dueInDays: dueDays,
            autoReleasesHours: autoHours,
            slaDeadline: slaDeadline,
            autoReleaseDeadline: autoReleaseDeadline,
            relatedArtifactId: raw.relatedArtifactId || raw.artifactId,
            reviewId: raw.reviewId,
            description: String(raw.description || raw.Description || ''),
            createdAt: raw.createdAt || raw.ClaimedAt || new Date().toISOString(),
            completedAt: raw.completedAt,
            winnerEmail: raw.winnerEmail,
            isPublished: Boolean(raw.isPublished),
            publishedToMarketplaceAt: raw.publishedToMarketplaceAt,
            isClaimedByMe: isClaimedDirect,
            submissionsCount: Number(raw.submissionsCount || (raw.submissions ? raw.submissions.length : 0)),
            reviewsCount: Number(raw.reviewsCount || (raw.reviews ? raw.reviews.length : 0)),
            testRunsCount: Number(raw.testRunsCount || (raw.testRuns ? raw.testRuns.length : 0)),
            latestTestPassed: raw.latestTestPassed,
            latestFeedback: raw.latestFeedback,
            producerResolutionPreference: raw.producerResolutionPreference,
            canClaim: !isClaimedDirect && finalStatus === 'Open',
            canSubmitCode: isClaimedDirect && (rawStage === 'CodeGeneration' || rawStage === 'Open'),
            canReview: rawStage === 'InReview',
            canRunTests: rawStage === 'InTesting'
        };

        if (dto.isClaimedByMe || dto.status === 'InProgress' || dto.claimedAt) {
            calculateSlaMetadata(dto);
        }

        return dto;
    }

    public processAutoReleases(bounties: BountyDto[], myWork: MyWorkSummaryDto): { bounties: BountyDto[]; myWork: MyWorkSummaryDto } {
        const now = Date.now();
        const activeClaimed: BountyDto[] = [];
        const openPool = [...bounties];
        const expiredIds: string[] = [];

        for (const cb of myWork.claimedBounties) {
            let isExpired = false;
            if (cb.autoReleaseDeadline) {
                const arMs = new Date(cb.autoReleaseDeadline).getTime();
                if (!isNaN(arMs) && arMs <= now) {
                    isExpired = true;
                }
            } else if (cb.claimedAt && cb.autoReleasesHours) {
                const arMs = new Date(cb.claimedAt).getTime() + cb.autoReleasesHours * 3600 * 1000;
                if (!isNaN(arMs) && arMs <= now) {
                    isExpired = true;
                }
            }

            if (isExpired) {
                // Expired! The bounty is automatically released and returns to open Bounties pool
                expiredIds.push(cb.id);
                this.localClaimedMap.delete(cb.id);
                const existingIndex = openPool.findIndex(b => b.id === cb.id);
                const releasedBounty: BountyDto = {
                    ...cb,
                    status: 'Open',
                    stage: 'Open',
                    isClaimedByMe: false,
                    canClaim: true,
                    canSubmitCode: false,
                    canReview: false,
                    canRunTests: false,
                    claimedByEmail: undefined,
                    claimedAt: undefined,
                    slaDeadline: undefined,
                    autoReleaseDeadline: undefined
                };
                if (existingIndex >= 0) {
                    openPool[existingIndex] = releasedBounty;
                } else {
                    openPool.push(releasedBounty);
                }
            } else {
                activeClaimed.push(cb);
            }
        }

        // Also check openPool: any bounty that is marked InProgress but expired should also be released
        for (let i = 0; i < openPool.length; i++) {
            const b = openPool[i];
            if (b.status === 'InProgress' || (b.stage !== 'Completed' && b.status !== 'Completed' && b.status !== 'Open')) {
                let isExp = false;
                if (b.autoReleaseDeadline) {
                    const ar = new Date(b.autoReleaseDeadline).getTime();
                    if (!isNaN(ar) && ar <= now) isExp = true;
                } else if (b.claimedAt && b.autoReleasesHours) {
                    const ar = new Date(b.claimedAt).getTime() + b.autoReleasesHours * 3600 * 1000;
                    if (!isNaN(ar) && ar <= now) isExp = true;
                }
                if (isExp) {
                    if (!expiredIds.includes(b.id)) expiredIds.push(b.id);
                    openPool[i] = {
                        ...b,
                        status: 'Open',
                        stage: 'Open',
                        isClaimedByMe: false,
                        canClaim: true,
                        canSubmitCode: false,
                        canReview: false,
                        canRunTests: false,
                        claimedByEmail: undefined,
                        claimedAt: undefined,
                        slaDeadline: undefined,
                        autoReleaseDeadline: undefined
                    };
                }
            }
        }

        // If any bounties expired, persist the auto-releases to Azure DevOps Git asynchronously!
        if (expiredIds.length > 0) {
            this.adoGovernanceService.releaseExpiredBountiesInAdoAsync().catch((err) => {
                console.warn('[BountyService] Background ADO expired release sync note:', err);
            });
        }

        return {
            bounties: openPool,
            myWork: {
                ...myWork,
                claimedBounties: activeClaimed,
                openBountiesCount: openPool.filter(b => b.status === 'Open').length
            }
        };
    }

    public async getBountiesAsync(category?: string, stage?: string, force = false): Promise<BountyDto[]> {
        const isAuth = await this.authProvider.isAuthenticated();
        if (!isAuth) {
            return [];
        }
        const now = Date.now();
        if (!force && !category && !stage && this.cachedBounties && (now - this.cachedBounties.timestamp < 180000)) {
            return this.cachedBounties.data;
        }

        const token = await this.authProvider.getToken();
        const userEmail = (await this.authProvider.getEmail()) || '';

        let bounties: BountyDto[] = [];

        // 1. Primary Source: Authoritative Azure DevOps Git repository (/governance/bounties.json)
        try {
            const adoBounties = await this.adoGovernanceService.getBountiesFromAdoAsync();
            if (Array.isArray(adoBounties) && adoBounties.length > 0) {
                bounties = adoBounties.map(item => this.normalizeBounty(item, userEmail));
            }
        } catch (adoErr) {
            console.warn('[BountyService] Direct ADO Git fetch failed:', adoErr);
        }

        // Check for any expired bounties in ADO Git and automatically release them
        let hasExpiredInAdo = false;
        bounties = bounties.map(b => {
            const s = (b.status || '').toLowerCase();
            if (s === 'inprogress' || (s !== 'completed' && s !== 'open')) {
                let isExp = false;
                if (b.autoReleaseDeadline) {
                    const ar = new Date(b.autoReleaseDeadline).getTime();
                    if (!isNaN(ar) && ar <= now) isExp = true;
                } else if (b.claimedAt && b.autoReleasesHours) {
                    const ar = new Date(b.claimedAt).getTime() + b.autoReleasesHours * 3600 * 1000;
                    if (!isNaN(ar) && ar <= now) isExp = true;
                }
                if (isExp) {
                    hasExpiredInAdo = true;
                    return {
                        ...b,
                        status: 'Open',
                        stage: 'Open',
                        isClaimedByMe: false,
                        canClaim: true,
                        canSubmitCode: false,
                        canReview: false,
                        canRunTests: false,
                        claimedByEmail: undefined,
                        claimedAt: undefined,
                        slaDeadline: undefined,
                        autoReleaseDeadline: undefined
                    };
                }
            }
            return b;
        });

        if (hasExpiredInAdo) {
            this.adoGovernanceService.releaseExpiredBountiesInAdoAsync().catch(() => {});
        }

        // 2. Secondary Source: Backend API
        if (bounties.length === 0) {
            const url = new URL(`${this.baseUrl}/api/bounties`);
            if (category) url.searchParams.append('category', category);
            if (stage) url.searchParams.append('stage', stage);

            try {
                const res = await this.requestJson<any[]>(url.toString(), 'GET', undefined, token);
                if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
                    bounties = res.data.map(item => this.normalizeBounty(item, userEmail));
                }
            } catch {
                // error fetching from backend
            }
        }

        // 3. Merge with local claimed and completed state
        for (let i = 0; i < bounties.length; i++) {
            const b = bounties[i];
            if (this.localCompletedMap.has(b.id)) {
                bounties[i] = { ...b, ...this.localCompletedMap.get(b.id)!, status: 'Completed', stage: 'Completed', isClaimedByMe: true, canClaim: false };
            } else if (this.localClaimedMap.has(b.id)) {
                bounties[i] = { ...b, ...this.localClaimedMap.get(b.id)!, status: 'InProgress', isClaimedByMe: true, canClaim: false };
            }
        }

        if (category && category !== 'all') {
            bounties = bounties.filter(b => b.category.toLowerCase().includes(category.toLowerCase()));
        }
        if (stage && stage !== 'all') {
            bounties = bounties.filter(b => b.stage.toLowerCase() === stage.toLowerCase());
        }

        if (!category && !stage) {
            this.cachedBounties = { data: bounties, timestamp: Date.now() };
        }

        return bounties;
    }

    public async getBountyDetailAsync(id: string): Promise<BountyDetailDto | null> {
        const token = await this.authProvider.getToken();
        const userEmail = (await this.authProvider.getEmail()) || '';

        try {
            const res = await this.requestJson<BountyDetailDto>(`${this.baseUrl}/api/bounties/${id}`, 'GET', undefined, token);
            if (res.data) return { ...this.normalizeBounty(res.data, userEmail), submissions: res.data.submissions || [], reviews: res.data.reviews || [], testRuns: res.data.testRuns || [] };
        } catch { }

        const localMatch = this.localClaimedMap.get(id) || this.localCompletedMap.get(id);
        if (localMatch) {
            return {
                ...localMatch,
                submissions: [],
                reviews: [],
                testRuns: []
            };
        }

        const liveBounties = await this.getBountiesAsync();
        const match = liveBounties.find(b => b.id === id || b.relatedArtifactId === id);
        if (match) {
            return {
                ...match,
                submissions: [],
                reviews: [],
                testRuns: []
            };
        }

        return null;
    }

    public async createBountyAsync(req: CreateBountyRequest): Promise<BountyDto | null> {
        const token = await this.authProvider.getToken();
        let created: BountyDto | null = null;
        try {
            const res = await this.requestJson<BountyDto>(`${this.baseUrl}/api/bounties`, 'POST', req, token);
            if (res.data) created = this.normalizeBounty(res.data);
        } catch { }

        const newBounty: BountyDto = created || {
            id: `bty-${Date.now()}`,
            title: req.title,
            description: req.description,
            category: req.category || 'Code gen',
            credits: req.credits || req.points || 100,
            points: req.credits || req.points || 100,
            status: 'Open',
            stage: 'Open',
            dueInDays: req.dueInDays || 2,
            autoReleasesHours: 18,
            createdAt: new Date().toISOString(),
            isClaimedByMe: false,
            canClaim: true,
            canSubmitCode: false,
            canReview: false,
            canRunTests: false
        };

        // Persist directly to Azure DevOps Git (/governance/bounties.json)
        await this.adoGovernanceService.updateAdoBountiesAsync((bounties) => {
            const exists = bounties.some(b => b.id === newBounty.id);
            if (!exists) {
                return [newBounty, ...bounties];
            }
            return bounties;
        }, `Create bounty '${newBounty.title}'`).catch(() => {});

        return newBounty;
    }

    public async claimBountyAsync(id: string): Promise<BountyDto | null> {
        const token = await this.authProvider.getToken();
        const userEmail = (await this.authProvider.getEmail()) || 'harsh.rana@maqsoftware.com';
        const nowIso = new Date().toISOString();
        const claimedMs = new Date(nowIso).getTime();

        let claimedDto: BountyDto | null = null;

        // 1. Try Backend Claim
        try {
            const res = await this.requestJson<BountyDto>(`${this.baseUrl}/api/bounties/${id}/claim`, 'POST', { userEmail }, token);
            if (res.data) {
                claimedDto = this.normalizeBounty(res.data, userEmail);
            }
        } catch { }

        // 2. Persist directly to Azure DevOps Git repository (/governance/bounties.json) with live SLA deadlines
        let persistedSlaDeadline: string | undefined;
        let persistedAutoReleaseDeadline: string | undefined;
        await this.adoGovernanceService.updateAdoBountiesAsync((bounties) => {
            return bounties.map(b => {
                if (b.id === id || b.relatedArtifactId === id) {
                    const dueDays = Number(b.dueInDays || 2);
                    const autoHours = Number(b.autoReleasesHours || 18);
                    const slaDeadline = new Date(claimedMs + dueDays * 24 * 3600 * 1000).toISOString();
                    const autoReleaseDeadline = new Date(claimedMs + autoHours * 3600 * 1000).toISOString();
                    persistedSlaDeadline = slaDeadline;
                    persistedAutoReleaseDeadline = autoReleaseDeadline;
                    return {
                        ...b,
                        status: 'InProgress',
                        stage: (b.category === 'Review' ? 'InReview' : 'CodeGeneration'),
                        claimedByEmail: userEmail,
                        claimedAt: nowIso,
                        dueInDays: dueDays,
                        autoReleasesHours: autoHours,
                        slaDeadline: slaDeadline,
                        autoReleaseDeadline: autoReleaseDeadline,
                        isClaimedByMe: true,
                        canClaim: false,
                        canSubmitCode: true
                    };
                }
                return b;
            });
        }, `Claim bounty #${id} by ${userEmail}`).catch(() => {});

        // 3. Fallback match from live ADO list if backend claim call was skipped/failed
        if (!claimedDto) {
            const liveBounties = await this.getBountiesAsync();
            const match = liveBounties.find(b => b.id === id || b.relatedArtifactId === id);
            if (match) {
                claimedDto = {
                    ...match,
                    status: 'InProgress',
                    stage: (match.category === 'Review' ? 'InReview' : 'CodeGeneration') as BountyStage,
                    claimedByEmail: userEmail,
                    claimedAt: nowIso,
                    dueInDays: match.dueInDays || 2,
                    autoReleasesHours: match.autoReleasesHours || 18,
                    slaDeadline: persistedSlaDeadline || new Date(claimedMs + (match.dueInDays || 2) * 24 * 3600 * 1000).toISOString(),
                    autoReleaseDeadline: persistedAutoReleaseDeadline || new Date(claimedMs + (match.autoReleasesHours || 18) * 3600 * 1000).toISOString(),
                    isClaimedByMe: true,
                    canClaim: false,
                    canSubmitCode: true
                };
            }
        }

        if (claimedDto) {
            claimedDto.isClaimedByMe = true;
            claimedDto.status = 'InProgress';
            claimedDto.stage = (claimedDto.category === 'Review' ? 'InReview' : 'CodeGeneration') as BountyStage;
            claimedDto.canClaim = false;
            claimedDto.canSubmitCode = true;
            claimedDto.claimedByEmail = userEmail;
            claimedDto.claimedAt = claimedDto.claimedAt || nowIso;
            if (persistedSlaDeadline) claimedDto.slaDeadline = persistedSlaDeadline;
            if (persistedAutoReleaseDeadline) claimedDto.autoReleaseDeadline = persistedAutoReleaseDeadline;
            calculateSlaMetadata(claimedDto);

            this.localClaimedMap.set(id, claimedDto);
            this.localCompletedMap.delete(id);
        }

        return claimedDto;
    }

    public async releaseBountyAsync(id: string): Promise<BountyDto | null> {
        const token = await this.authProvider.getToken();
        this.localClaimedMap.delete(id);

        try {
            const res = await this.requestJson<BountyDto>(`${this.baseUrl}/api/bounties/${id}/release`, 'POST', undefined, token);
            if (res.data) return this.normalizeBounty(res.data);
        } catch { }

        // Persist directly to Azure DevOps Git repository (/governance/bounties.json)
        await this.adoGovernanceService.releaseBountyInAdoAsync(id).catch(() => {});

        const liveBounties = await this.getBountiesAsync();
        return liveBounties.find(b => b.id === id || b.relatedArtifactId === id) || null;
    }

    public async submitCodeAsync(id: string, req: BountySubmissionRequest): Promise<BountyDetailDto | null> {
        const token = await this.authProvider.getToken();
        const userEmail = (await this.authProvider.getEmail()) || 'producer@company.com';

        let resDetail: BountyDetailDto | null = null;
        try {
            const res = await this.requestJson<BountyDetailDto>(`${this.baseUrl}/api/bounties/${id}/submit-code`, 'POST', req, token);
            if (res.data) resDetail = res.data;
        } catch { }

        const currentClaimed = this.localClaimedMap.get(id);
        if (currentClaimed) {
            currentClaimed.stage = 'InReview';
            currentClaimed.canSubmitCode = false;
            currentClaimed.canReview = true;
            this.localClaimedMap.set(id, currentClaimed);
        }

        // Persist directly to Azure DevOps Git
        await this.adoGovernanceService.updateAdoBountiesAsync((bounties) => {
            return bounties.map(b => {
                if (b.id === id || b.relatedArtifactId === id) {
                    return {
                        ...b,
                        stage: 'InReview',
                        canSubmitCode: false,
                        canReview: true
                    };
                }
                return b;
            });
        }, `Submit code for bounty #${id}`).catch(() => {});

        if (resDetail) return resDetail;

        const liveBounties = await this.getBountiesAsync();
        const baseMatch = currentClaimed || liveBounties.find(b => b.id === id || b.relatedArtifactId === id);
        if (!baseMatch) return null;

        return {
            ...this.normalizeBounty(baseMatch, userEmail),
            stage: 'InReview',
            submissions: [{
                id: `sub-${Date.now()}`,
                submittedByEmail: userEmail,
                solutionCode: req.solutionCode,
                submittedAt: new Date().toISOString()
            }],
            reviews: [],
            testRuns: []
        };
    }

    public async reviewCodeAsync(id: string, req: BountyReviewRequest): Promise<BountyDetailDto | null> {
        const token = await this.authProvider.getToken();
        const userEmail = (await this.authProvider.getEmail()) || 'reviewer@company.com';

        let resDetail: BountyDetailDto | null = null;
        try {
            const res = await this.requestJson<BountyDetailDto>(`${this.baseUrl}/api/bounties/${id}/review`, 'POST', req, token);
            if (res.data) resDetail = res.data;
        } catch { }

        const newStage: BountyStage = req.isApproved ? 'InTesting' : 'CodeGeneration';
        const currentClaimed = this.localClaimedMap.get(id);
        if (currentClaimed) {
            currentClaimed.stage = newStage;
            currentClaimed.canReview = false;
            currentClaimed.canRunTests = req.isApproved;
            currentClaimed.canSubmitCode = !req.isApproved;
            this.localClaimedMap.set(id, currentClaimed);
        }

        // Persist directly to Azure DevOps Git
        await this.adoGovernanceService.updateAdoBountiesAsync((bounties) => {
            return bounties.map(b => {
                if (b.id === id || b.relatedArtifactId === id) {
                    return {
                        ...b,
                        stage: newStage,
                        canReview: false,
                        canRunTests: req.isApproved,
                        canSubmitCode: !req.isApproved
                    };
                }
                return b;
            });
        }, `Review code for bounty #${id}`).catch(() => {});

        if (resDetail) return resDetail;

        const liveBounties = await this.getBountiesAsync();
        const baseMatch = currentClaimed || liveBounties.find(b => b.id === id || b.relatedArtifactId === id);
        if (!baseMatch) return null;

        return {
            ...this.normalizeBounty(baseMatch, userEmail),
            stage: newStage,
            submissions: [],
            reviews: [{
                id: `rev-${Date.now()}`,
                reviewerEmail: userEmail,
                isApproved: req.isApproved,
                feedback: req.feedback,
                reviewedAt: new Date().toISOString()
            }],
            testRuns: []
        };
    }

    public async runTestsAsync(id: string, req: BountyTestRunRequest): Promise<BountyDetailDto | null> {
        const token = await this.authProvider.getToken();
        const userEmail = (await this.authProvider.getEmail()) || 'tester@company.com';

        let resDetail: BountyDetailDto | null = null;
        try {
            const res = await this.requestJson<BountyDetailDto>(`${this.baseUrl}/api/bounties/${id}/run-tests`, 'POST', req, token);
            if (res.data) resDetail = res.data;
        } catch { }

        const newStage: BountyStage = req.isPassed ? 'Completed' : 'CodeGeneration';
        const currentClaimed = this.localClaimedMap.get(id);
        if (currentClaimed) {
            currentClaimed.stage = newStage;
            currentClaimed.status = req.isPassed ? 'Completed' : 'InProgress';
            currentClaimed.isPublished = req.isPassed;
            currentClaimed.canRunTests = false;
            currentClaimed.canSubmitCode = !req.isPassed;
            if (req.isPassed) {
                this.localCompletedMap.set(id, currentClaimed);
                this.localClaimedMap.delete(id);
            } else {
                this.localClaimedMap.set(id, currentClaimed);
            }
        }

        // Persist directly to Azure DevOps Git
        await this.adoGovernanceService.updateAdoBountiesAsync((bounties) => {
            return bounties.map(b => {
                if (b.id === id || b.relatedArtifactId === id) {
                    return {
                        ...b,
                        stage: newStage,
                        status: req.isPassed ? 'Completed' : b.status,
                        completedAt: req.isPassed ? new Date().toISOString() : b.completedAt,
                        canRunTests: false,
                        canSubmitCode: !req.isPassed
                    };
                }
                return b;
            });
        }, `Run tests for bounty #${id}`).catch(() => {});

        if (resDetail) return resDetail;

        const liveBounties = await this.getBountiesAsync();
        const baseMatch = currentClaimed || liveBounties.find(b => b.id === id || b.relatedArtifactId === id);
        if (!baseMatch) return null;

        return {
            ...this.normalizeBounty(baseMatch, userEmail),
            stage: newStage,
            status: req.isPassed ? 'Completed' : 'InProgress',
            isPublished: req.isPassed,
            publishedToMarketplaceAt: req.isPassed ? new Date().toISOString() : undefined,
            submissions: [],
            reviews: [],
            testRuns: [{
                id: `tr-${Date.now()}`,
                testerEmail: userEmail,
                testSuiteName: req.testSuiteName || 'Test Suite',
                isPassed: req.isPassed,
                passedCount: req.passedCount,
                failedCount: req.failedCount,
                testLogs: req.testLogs || '',
                executedAt: new Date().toISOString()
            }]
        };
    }

    public async setFeedbackChoiceAsync(id: string, choice: string): Promise<BountyDetailDto | null> {
        const token = await this.authProvider.getToken();
        try {
            const res = await this.requestJson<BountyDetailDto>(`${this.baseUrl}/api/bounties/${id}/feedback-choice`, 'POST', { choice }, token);
            return res.data;
        } catch {
            return null;
        }
    }

    public async completeBountyAsync(id: string): Promise<BountyDto | null> {
        const token = await this.authProvider.getToken();
        const userEmail = (await this.authProvider.getEmail()) || 'harsh.rana@maqsoftware.com';

        // 1. Persist directly to Azure DevOps Git repository (/governance/bounties.json)
        await this.adoGovernanceService.completeBountyInAdoAsync(id, userEmail).catch(() => {});

        // 2. Mark in local completed map
        const currentClaimed = this.localClaimedMap.get(id);
        let matched: BountyDto | undefined;
        if (currentClaimed) {
            matched = {
                ...currentClaimed,
                status: 'Completed',
                stage: 'Completed',
                completedAt: new Date().toISOString(),
                isClaimedByMe: true,
                canClaim: false,
                canSubmitCode: false,
                canReview: false,
                canRunTests: false
            };
            this.localCompletedMap.set(id, matched);
            this.localClaimedMap.delete(id);
        }

        // 3. Call backend complete endpoint
        try {
            const res = await this.requestJson<BountyDto>(`${this.baseUrl}/api/bounties/${encodeURIComponent(id)}/complete`, 'POST', undefined, token);
            if (res.data) return this.normalizeBounty(res.data, userEmail);
        } catch { }

        if (!matched) {
            const liveBounties = await this.getBountiesAsync();
            matched = liveBounties.find(b => b.id === id || b.relatedArtifactId === id);
            if (matched) {
                matched = {
                    ...matched,
                    status: 'Completed',
                    stage: 'Completed',
                    completedAt: new Date().toISOString(),
                    canClaim: false,
                    canSubmitCode: false,
                    canReview: false,
                    canRunTests: false
                };
                this.localCompletedMap.set(id, matched);
            }
        }

        return matched || null;
    }

    public async getMyWorkSummaryAsync(force = false): Promise<MyWorkSummaryDto> {
        const isAuth = await this.authProvider.isAuthenticated();
        if (!isAuth) {
            return {
                claimedBounties: [],
                reviews: [],
                totalCreditsEarned: 0,
                openBountiesCount: 0,
                myWorkCount: 0
            };
        }
        const now = Date.now();
        if (!force && this.cachedMyWork && (now - this.cachedMyWork.timestamp < 180000)) {
            return this.cachedMyWork.data;
        }

        const token = await this.authProvider.getToken();
        const userEmail = (await this.authProvider.getEmail()) || '';

        let summary: MyWorkSummaryDto | null = null;
        try {
            const url = userEmail 
                ? `${this.baseUrl}/api/bounties/my-work?userEmail=${encodeURIComponent(userEmail)}`
                : `${this.baseUrl}/api/bounties/my-work`;
            const customHeaders = userEmail ? { 'x-user-email': userEmail } : undefined;
            const res = await this.requestJson<MyWorkSummaryDto>(url, 'GET', undefined, token, customHeaders);
            if (res.status === 200 && res.data && Array.isArray(res.data.claimedBounties)) {
                summary = {
                    claimedBounties: res.data.claimedBounties.map(cb => this.normalizeBounty(cb, userEmail)),
                    reviews: res.data.reviews || [],
                    totalCreditsEarned: res.data.totalCreditsEarned || 0,
                    openBountiesCount: res.data.openBountiesCount || 0,
                    myWorkCount: res.data.myWorkCount || 0
                };
            }
        } catch { }

        if (!summary) {
            // Live ADO Git computation - zero hardcoded mock arrays!
            const allBounties = await this.getBountiesAsync();
            const userClaimed = allBounties.filter(b => 
                (b.isClaimedByMe || (userEmail && b.claimedByEmail && b.claimedByEmail.toLowerCase() === userEmail.toLowerCase())) &&
                b.status !== 'Completed' && b.stage !== 'Completed'
            );
            const userCompleted = allBounties.filter(b => 
                b.status === 'Completed' && 
                (b.isClaimedByMe || (userEmail && (b.claimedByEmail?.toLowerCase() === userEmail.toLowerCase() || b.winnerEmail?.toLowerCase() === userEmail.toLowerCase())))
            );

            // Synthesize review items for any claimed review bounties so SLA deadline is never lost
            const userReviews: MyReviewItemDto[] = userClaimed
                .filter(b => b.category === 'Review' || b.category === 'review' || b.stage === 'InReview')
                .map(b => {
                    const artName = b.relatedArtifactId || b.title.replace(/^Review\s+/i, '').replace(/\s+agent$/i, '').trim();
                    const revId = b.reviewId || b.id;
                    const dueDays = Number(b.dueInDays || 2);
                    return {
                        reviewId: revId,
                        artifactId: artName,
                        artifactName: artName,
                        version: '1.0.0',
                        shortHash: '#' + (revId.length >= 4 ? revId.substring(revId.length - 4) : 'a12f'),
                        status: 'UnderReview',
                        producerEmail: b.createdByEmail || b.claimedByEmail || 'producer@company.com',
                        submittedAt: b.claimedAt || b.createdAt || new Date().toISOString(),
                        slaDeadline: b.slaDeadline,
                        slaTargetMinutes: dueDays * 1440,
                        slaRemainingMinutes: b.slaRemainingMinutes,
                        slaRemainingFormatted: b.slaRemainingFormatted,
                        isSlaWarning: b.isSlaWarning,
                        isSlaBreached: b.isSlaBreached
                    };
                });

            summary = {
                claimedBounties: userClaimed,
                reviews: userReviews,
                totalCreditsEarned: userCompleted.reduce((sum, b) => sum + (b.credits || 0), 0),
                openBountiesCount: allBounties.filter(b => b.status === 'Open').length,
                myWorkCount: userClaimed.length
            };
        }

        // Merge local claimed bounties
        for (const [id, localBounty] of this.localClaimedMap.entries()) {
            const existingIdx = summary.claimedBounties.findIndex(cb => cb.id === id);
            if (existingIdx >= 0) {
                summary.claimedBounties[existingIdx] = { ...summary.claimedBounties[existingIdx], ...localBounty };
            } else {
                summary.claimedBounties.unshift(localBounty);
            }
        }

        // Strictly exclude completed, closed, or resolved bounties from active Claimed Bounties
        summary.claimedBounties = summary.claimedBounties.filter(cb => {
            if (this.localCompletedMap.has(cb.id)) return false;
            const s = String(cb.status || '').toLowerCase();
            const st = String(cb.stage || '').toLowerCase();
            return s !== 'completed' && s !== 'closed' && st !== 'completed' && st !== 'closed';
        });

        // Calculate total earned credits
        const completedCredits = Array.from(this.localCompletedMap.values()).reduce((sum, b) => sum + (b.credits || 0), 0);
        summary.totalCreditsEarned = (summary.totalCreditsEarned || 0) + completedCredits;
        summary.myWorkCount = summary.claimedBounties.length + (summary.reviews ? summary.reviews.length : 0);

        return summary;
    }

    public async getBountyAnalyticsAsync(): Promise<BountyAnalyticsDto | null> {
        const token = await this.authProvider.getToken();
        try {
            const res = await this.requestJson<BountyAnalyticsDto>(`${this.baseUrl}/api/bounties/analytics`, 'GET', undefined, token);
            return res.data;
        } catch {
            return null;
        }
    }

    public getDefaultBounties(): BountyDto[] {
        return [];
    }

    public getDefaultMyWork(): MyWorkSummaryDto {
        return {
            claimedBounties: [],
            reviews: [],
            totalCreditsEarned: 0,
            openBountiesCount: 0,
            myWorkCount: 0
        };
    }

    private requestJson<T>(
        urlStr: string,
        method: string,
        body?: any,
        token?: string,
        customHeaders?: Record<string, string>
    ): Promise<{ status: number; data: T | null }> {
        if (!token) {
            return Promise.resolve({ status: 401, data: null });
        }
        return new Promise((resolve) => {
            try {
                const url = new URL(urlStr);
                const isHttps = url.protocol === 'https:';
                const client = isHttps ? https : http;

                const payload = body ? JSON.stringify(body) : undefined;
                const headers: Record<string, string> = {
                    'Accept': 'application/json',
                    'User-Agent': 'EngineeringCommons-VSCode-BountyService/1.2.0'
                };

                if (payload) {
                    headers['Content-Type'] = 'application/json';
                    headers['Content-Length'] = Buffer.byteLength(payload).toString();
                }

                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                if (customHeaders) {
                    Object.assign(headers, customHeaders);
                }

                const req = client.request(
                    url,
                    {
                        method,
                        headers,
                        timeout: 5000
                    },
                    (res) => {
                        let responseData = '';
                        res.on('data', (chunk) => { responseData += chunk; });
                        res.on('end', () => {
                            try {
                                const parsed = responseData ? JSON.parse(responseData) : null;
                                resolve({ status: res.statusCode || 200, data: parsed });
                            } catch {
                                resolve({ status: res.statusCode || 200, data: null });
                            }
                        });
                    }
                );

                req.on('error', () => resolve({ status: 500, data: null }));
                req.on('timeout', () => { req.destroy(); resolve({ status: 408, data: null }); });

                if (payload) {
                    req.write(payload);
                }
                req.end();
            } catch {
                resolve({ status: 500, data: null });
            }
        });
    }
}
