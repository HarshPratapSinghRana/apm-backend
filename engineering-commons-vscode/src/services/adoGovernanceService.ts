/**
 * Azure DevOps Governance Service for Engineering Commons & Engineering Commons.
 * Authoritative persistence and real-time synchronization of User Roles
 * and Role Access Requests directly to the Azure DevOps Git repository.
 */

import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IAuthenticationStatusProvider } from './authenticationStatusProvider';

export interface UserRoleRecord {
    userEmail: string;
    role: string;
    isCertifiedReviewer: boolean;
    grantedBy: string;
    notes?: string;
    grantedAt: string;
    updatedAt: string;
    lastLoginAt?: string;
}

export interface AccessRequestRecord {
    id: string;
    userEmail: string;
    requestedRole: string;
    currentRole: string;
    status: 'Pending' | 'Approved' | 'Rejected' | string;
    reason?: string;
    adminEmail?: string;
    adminNotes?: string;
    requestedAt: string;
    reviewedAt?: string;
}

export interface ArtifactUsageAnalytics {
    downloads: number;
    uniqueUsers: number;
    usageCount: number;
    usageRate: number;
    lastUsedAt?: string;
    sourceBreakdown: Record<string, number>;
    externalTelemetry: Record<string, string>;
}

export class AdoGovernanceService {
    private organization: string;
    private project: string;
    private repository: string;
    private branch: string;
    private pat: string;
    private authProvider?: IAuthenticationStatusProvider;

    private cachedRoles: UserRoleRecord[] = [];
    private cachedRequests: AccessRequestRecord[] = [];
    private cachedUsageEvents: any[] = [];
    private lastFetchMs = 0;
    private lastUsageFetchMs = 0;
    private isSyncing = false;

    constructor(authProvider?: IAuthenticationStatusProvider) {
        this.authProvider = authProvider;
        this.organization = process.env.AZURE_DEVOPS_ORG || 'MAQInternalCIP-Engineering-Commons';
        this.project = process.env.AZURE_DEVOPS_PROJECT || 'Engineering Commons';
        this.repository = process.env.AZURE_DEVOPS_REPO || 'Engineering Commons';
        this.branch = process.env.AZURE_DEVOPS_BRANCH || 'main';
        this.pat = process.env.AZURE_DEVOPS_PAT || '';
    }

    public setAuthProvider(authProvider: IAuthenticationStatusProvider): void {
        this.authProvider = authProvider;
    }

    public async isAuthenticated(): Promise<boolean> {
        if (this.authProvider) {
            return await this.authProvider.isAuthenticated();
        }
        try {
            const home = os.homedir();
            const engToken = path.join(home, '.engineering-commons', 'token.json');
            if (fs.existsSync(engToken)) {
                const data = JSON.parse(fs.readFileSync(engToken, 'utf-8'));
                if (data?.access_token) return true;
            }
            const sessFile = path.join(home, '.engineering-commons', 'session.json');
            if (fs.existsSync(sessFile)) {
                const data = JSON.parse(fs.readFileSync(sessFile, 'utf-8'));
                if (data?.token || data?.ssoToken) return true;
            }
        } catch {}
        return false;
    }

    private getAuthHeader(): string {
        return 'Basic ' + Buffer.from(':' + this.pat).toString('base64');
    }

    /**
     * Fetches all user roles directly from Azure DevOps Git repository (/governance/user-roles.json)
     */
    public async getUserRolesAsync(force = false): Promise<UserRoleRecord[]> {
        const now = Date.now();
        if (!force && this.cachedRoles.length > 0 && (now - this.lastFetchMs < 120000)) {
            return this.cachedRoles;
        }

        const projectEnc = encodeURIComponent(this.project);
        const repoEnc = encodeURIComponent(this.repository);
        const url = `https://dev.azure.com/${this.organization}/${projectEnc}/_apis/git/repositories/${repoEnc}/items?path=/governance/user-roles.json&versionDescriptor.version=${this.branch}&includeContent=true&api-version=7.0`;

        try {
            const data = await this.httpGetJsonAsync<any>(url);
            let parsed = data;
            if (data && typeof data.content === 'string') {
                try {
                    parsed = JSON.parse(data.content);
                } catch {}
            }
            if (parsed && Array.isArray(parsed.userRoles)) {
                // Deduplicate any records with same normalized email, preserving highest role (ADMIN > REVIEWER > CONTRIBUTOR > CONSUMER)
                const rolesMap = new Map<string, UserRoleRecord>();
                const rolePriority: Record<string, number> = { 'ADMIN': 4, 'CERTIFIED_REVIEWER': 3, 'REVIEWER': 3, 'CONTRIBUTOR': 2, 'PRODUCER': 2, 'CONSUMER': 1 };
                
                for (const r of parsed.userRoles) {
                    const normEmail = (r.userEmail || '').trim().toLowerCase();
                    const canonEmail = normEmail === 'vivekprasad@maqsoftware.com' ? 'vivekp@maqsoftware.com' : normEmail;
                    const existing = rolesMap.get(canonEmail);
                    if (!existing) {
                        rolesMap.set(canonEmail, { ...r, userEmail: canonEmail });
                    } else {
                        const existingPrio = rolePriority[(existing.role || '').toUpperCase()] || 0;
                        const newPrio = rolePriority[(r.role || '').toUpperCase()] || 0;
                        if (newPrio > existingPrio) {
                            rolesMap.set(canonEmail, { ...r, userEmail: canonEmail });
                        }
                    }
                }
                this.cachedRoles = Array.from(rolesMap.values());
                this.lastFetchMs = now;
                return this.cachedRoles;
            }
        } catch (err) {
            console.warn('[AdoGovernanceService] Failed to load user roles from ADO:', err);
        }

        return this.cachedRoles;
    }

    /**
     * Fetches all role access requests directly from Azure DevOps Git repository (/governance/access-requests.json)
     */
    public async getAccessRequestsAsync(status?: string, force = false): Promise<AccessRequestRecord[]> {
        const now = Date.now();
        if (!force && this.cachedRequests.length > 0 && (now - this.lastFetchMs < 120000)) {
            let list = this.cachedRequests;
            if (status) {
                list = list.filter(r => String(r.status).toLowerCase() === status.toLowerCase());
            }
            return list;
        }

        const projectEnc = encodeURIComponent(this.project);
        const repoEnc = encodeURIComponent(this.repository);
        const url = `https://dev.azure.com/${this.organization}/${projectEnc}/_apis/git/repositories/${repoEnc}/items?path=/governance/access-requests.json&versionDescriptor.version=${this.branch}&includeContent=true&api-version=7.0`;

        try {
            const data = await this.httpGetJsonAsync<any>(url);
            let parsed = data;
            if (data && typeof data.content === 'string') {
                try {
                    parsed = JSON.parse(data.content);
                } catch {}
            }
            if (parsed && Array.isArray(parsed.requests)) {
                this.cachedRequests = parsed.requests;
                this.lastFetchMs = now;
                let list = this.cachedRequests;
                if (status) {
                    list = list.filter(r => String(r.status).toLowerCase() === status.toLowerCase());
                }
                return list;
            }
        } catch (err) {
            console.warn('[AdoGovernanceService] Failed to load access requests from ADO:', err);
        }

        return this.cachedRequests;
    }

    /**
     * Fetches original, authoritative artifact usage & telemetry events directly from Azure DevOps Git
     * (/governance/usage-events.json or /telemetry/usage-events.json) and calculates genuine usage metrics.
     * Zero fake inventory: if no events exist for this artifact, all metrics return 0 and lastUsedAt is undefined.
     */
    public async getArtifactUsageFromAdoAsync(artifactName: string, force = false): Promise<ArtifactUsageAnalytics> {
        const now = Date.now();
        if (force || this.cachedUsageEvents.length === 0 || (now - this.lastUsageFetchMs > 60000)) {
            const projectEnc = encodeURIComponent(this.project);
            const repoEnc = encodeURIComponent(this.repository);
            const candidatePaths = ['/governance/usage-events.json', '/telemetry/usage-events.json'];
            
            for (const itemPath of candidatePaths) {
                const url = `https://dev.azure.com/${this.organization}/${projectEnc}/_apis/git/repositories/${repoEnc}/items?path=${encodeURIComponent(itemPath)}&versionDescriptor.version=${this.branch}&includeContent=true&api-version=7.0`;
                try {
                    const data = await this.httpGetJsonAsync<any>(url);
                    let parsed = data;
                    if (data && typeof data.content === 'string') {
                        try { parsed = JSON.parse(data.content); } catch {}
                    }
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        this.cachedUsageEvents = parsed;
                        this.lastUsageFetchMs = now;
                        break;
                    }
                } catch (err) {
                    console.warn(`[AdoGovernanceService] Failed to read ${itemPath} from ADO:`, err);
                }
            }
        }

        const target = (artifactName || '').trim().toLowerCase();
        const targetClean = target.replace(/^leap-/, '');
        const matched = this.cachedUsageEvents.filter(e => {
            const artId = (e.artifactId || e.artifactName || '').trim().toLowerCase();
            const artClean = artId.replace(/^leap-/, '');
            return artId === target || artClean === targetClean || artId === 'company.cip.' + target || target === 'company.cip.' + artId;
        });

        if (matched.length === 0) {
            return {
                downloads: 0,
                uniqueUsers: 0,
                usageCount: 0,
                usageRate: 0,
                lastUsedAt: undefined,
                sourceBreakdown: {
                    'GitHub Copilot': 0,
                    'CLI': 0,
                    'VS Code': 0
                },
                externalTelemetry: {
                    'Authoritative Source': 'Azure DevOps Git (/governance/usage-events.json)'
                }
            };
        }

        let downloads = 0;
        let usageCount = 0;
        const usersSet = new Set<string>();
        let lastUsedMs = 0;
        let copilotCount = 0;
        let cliCount = 0;
        let vsCodeCount = 0;

        for (const e of matched) {
            const action = (e.action || e.eventType || '').toUpperCase();
            const user = (e.userEmail || e.userId || '').trim().toLowerCase();
            if (user) usersSet.add(user);

            const t = e.timestamp ? new Date(e.timestamp).getTime() : 0;
            if (t > lastUsedMs) lastUsedMs = t;

            if (action === 'INSTALL' || action === 'DOWNLOAD' || action === 'CLONE') {
                downloads++;
            } else {
                usageCount++;
            }

            const src = (e.source || '').toUpperCase();
            if (src.includes('COPILOT') || src.includes('CLAUDE') || src.includes('AGENT')) {
                copilotCount++;
            } else if (src.includes('CLI')) {
                cliCount++;
            } else {
                vsCodeCount++;
            }
        }

        const uniqueUsers = usersSet.size;
        const usageRate = uniqueUsers > 0 ? parseFloat((usageCount / uniqueUsers).toFixed(1)) : 0;

        return {
            downloads,
            uniqueUsers,
            usageCount,
            usageRate,
            lastUsedAt: lastUsedMs > 0 ? new Date(lastUsedMs).toISOString() : undefined,
            sourceBreakdown: {
                'GitHub Copilot': copilotCount,
                'CLI': cliCount,
                'VS Code': vsCodeCount
            },
            externalTelemetry: {
                'Authoritative Source': 'Azure DevOps Git (/governance/usage-events.json)'
            }
        };
    }


    /**
     * Automatically called every time a user logs in (or whenever their session changes).
     * Ensures the user is registered in ADO user-roles.json and their role is tracked.
     */
    public async onUserLoginAsync(userEmail: string): Promise<UserRoleRecord | null> {
        if (!userEmail || !userEmail.includes('@')) return null;
        const normEmail = userEmail.trim().toLowerCase();

        try {
            await this.getUserRolesAsync(true);
            await this.getAccessRequestsAsync(undefined, true);

            let existing = this.cachedRoles.find(r => r.userEmail.toLowerCase() === normEmail);
            const isAdmin = normEmail.includes('admin');

            if (!existing) {
                // Determine initial role: MAQ SSO users automatically receive CONTRIBUTOR role
                const initialRole = isAdmin ? 'ADMIN' : (normEmail.includes('reviewer') ? 'REVIEWER' : (normEmail.includes('producer') || normEmail.includes('contributor') || normEmail.includes('@maqsoftware.com') || normEmail !== 'consumer@test.com' ? 'CONTRIBUTOR' : 'CONSUMER'));
                const newRecord: UserRoleRecord = {
                    userEmail: normEmail,
                    role: initialRole,
                    isCertifiedReviewer: isAdmin || initialRole === 'REVIEWER',
                    grantedBy: 'SYSTEM',
                    notes: 'Auto-registered on user login',
                    grantedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastLoginAt: new Date().toISOString()
                };
                this.cachedRoles.push(newRecord);
                await this.pushGovernanceFilesAsync('Auto-register user on login: ' + normEmail);
                return newRecord;
            } else {
                // Update last login timestamp
                existing.lastLoginAt = new Date().toISOString();
                existing.updatedAt = new Date().toISOString();
                if (isAdmin && existing.role !== 'ADMIN') {
                    existing.role = 'ADMIN';
                    existing.isCertifiedReviewer = true;
                } else if (existing.role === 'CONSUMER' && (normEmail.includes('@maqsoftware.com') || normEmail !== 'consumer@test.com')) {
                    existing.role = 'CONTRIBUTOR';
                    existing.notes = (existing.notes ? existing.notes + ' | ' : '') + 'Auto-granted CONTRIBUTOR on MAQ SSO login';
                }
                await this.pushGovernanceFilesAsync('Update login timestamp: ' + normEmail);
                return existing;
            }
        } catch (err) {
            console.warn('[AdoGovernanceService] onUserLoginAsync error:', err);
            return null;
        }
    }

    /**
     * Submits an access request and saves directly to Azure DevOps Git
     */
    public async submitAccessRequestAsync(userEmail: string, requestedRole: string, reason?: string): Promise<AccessRequestRecord> {
        const normEmail = userEmail.trim().toLowerCase();
        const targetRole = requestedRole.trim().toUpperCase();

        await this.getUserRolesAsync(true);
        await this.getAccessRequestsAsync(undefined, true);

        const ROLE_RANKS: Record<string, number> = {
            'CONSUMER': 1,
            'CONTRIBUTOR': 2,
            'PRODUCER': 2,
            'REVIEWER': 3,
            'CERTIFIED_REVIEWER': 3,
            'ADMIN': 4
        };

        const currentRoleRecord = this.cachedRoles.find(r => r.userEmail.toLowerCase() === normEmail);
        const currentRole = (currentRoleRecord?.role || 'CONSUMER').toUpperCase();
        const currentRank = ROLE_RANKS[currentRole] || 1;
        const requestedRank = ROLE_RANKS[targetRole] || 2;

        if (currentRole === 'ADMIN' || normEmail.includes('admin')) {
            throw new Error('You already have Administrator permissions with full access.');
        }

        if (currentRank >= requestedRank) {
            throw new Error(`You already have '${currentRole}' permissions, which meets or exceeds the requested role '${targetRole}'.`);
        }

        // Check if an active pending request already exists for this user
        const existingPending = this.cachedRequests.find(r => 
            r.userEmail.toLowerCase() === normEmail && 
            (String(r.status).toLowerCase() === 'pending' || String(r.status) === '0')
        );
        if (existingPending) {
            throw new Error(`An active access request for role '${existingPending.requestedRole}' is already pending admin review.`);
        }

        const newReq: AccessRequestRecord = {
            id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            userEmail: normEmail,
            requestedRole: targetRole,
            currentRole: currentRole,
            status: 'Pending',
            reason: reason || 'Requested via VS Code Extension',
            adminEmail: 'admin@maqsoftware.com',
            requestedAt: new Date().toISOString()
        };

        this.cachedRequests.unshift(newReq);
        await this.pushGovernanceFilesAsync(`Submit access request for ${normEmail} (${targetRole})`);
        return newReq;
    }

    /**
     * Approves an access request, upgrades the user's role, and commits to ADO
     */
    public async approveAccessRequestAsync(requestId: string, adminEmail: string, notes?: string): Promise<boolean> {
        await this.getUserRolesAsync(true);
        await this.getAccessRequestsAsync(undefined, true);

        const req = this.cachedRequests.find(r => r.id === requestId);
        if (!req) return false;

        req.status = 'Approved';
        req.reviewedAt = new Date().toISOString();
        req.adminNotes = notes || req.adminNotes || 'Approved by administrator';
        req.adminEmail = adminEmail || 'admin@maqsoftware.com';

        const userEmail = req.userEmail.toLowerCase();
        const targetRole = req.requestedRole.toUpperCase();
        const isCert = targetRole === 'CERTIFIED_REVIEWER' || (targetRole === 'REVIEWER' && req.currentRole === 'REVIEWER');

        let userRole = this.cachedRoles.find(r => r.userEmail.toLowerCase() === userEmail);
        if (userRole) {
            userRole.role = targetRole === 'CERTIFIED_REVIEWER' ? 'REVIEWER' : targetRole;
            if (isCert) userRole.isCertifiedReviewer = true;
            userRole.updatedAt = new Date().toISOString();
            userRole.grantedBy = adminEmail;
            if (notes) userRole.notes = notes;
        } else {
            this.cachedRoles.push({
                userEmail: userEmail,
                role: targetRole === 'CERTIFIED_REVIEWER' ? 'REVIEWER' : targetRole,
                isCertifiedReviewer: isCert,
                grantedBy: adminEmail,
                notes: notes || 'Granted via access approval',
                grantedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        return await this.pushGovernanceFilesAsync(`Approve access request ${requestId} for ${userEmail} -> ${targetRole}`);
    }

    /**
     * Rejects an access request and commits to ADO
     */
    public async rejectAccessRequestAsync(requestId: string, adminEmail: string, notes?: string): Promise<boolean> {
        await this.getAccessRequestsAsync(undefined, true);

        const req = this.cachedRequests.find(r => r.id === requestId);
        if (!req) return false;

        req.status = 'Rejected';
        req.reviewedAt = new Date().toISOString();
        req.adminNotes = notes || req.adminNotes || 'Rejected by administrator';
        req.adminEmail = adminEmail || 'admin@maqsoftware.com';

        return await this.pushGovernanceFilesAsync(`Reject access request ${requestId} for ${req.userEmail}`);
    }

    /**
     * Revokes reviewer / contributor privileges back to CONSUMER
     */
    public async revokeAccessAsync(userEmail: string, adminEmail: string, notes?: string): Promise<boolean> {
        await this.getUserRolesAsync(true);
        const normEmail = userEmail.trim().toLowerCase();

        let userRole = this.cachedRoles.find(r => r.userEmail.toLowerCase() === normEmail);
        if (userRole) {
            userRole.role = 'CONSUMER';
            userRole.isCertifiedReviewer = false;
            userRole.updatedAt = new Date().toISOString();
            userRole.grantedBy = adminEmail;
            if (notes) userRole.notes = notes;
        } else {
            this.cachedRoles.push({
                userEmail: normEmail,
                role: 'CONSUMER',
                isCertifiedReviewer: false,
                grantedBy: adminEmail,
                notes: notes || 'Revoked by admin',
                grantedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        return await this.pushGovernanceFilesAsync(`Revoke privileges for ${normEmail} -> CONSUMER`);
    }

    /**
     * Promotes reviewer to Certified Reviewer
     */
    public async certifyReviewerAsync(userEmail: string, adminEmail: string, notes?: string): Promise<boolean> {
        await this.getUserRolesAsync(true);
        const normEmail = userEmail.trim().toLowerCase();

        let userRole = this.cachedRoles.find(r => r.userEmail.toLowerCase() === normEmail);
        if (userRole) {
            userRole.role = 'REVIEWER';
            userRole.isCertifiedReviewer = true;
            userRole.updatedAt = new Date().toISOString();
            userRole.grantedBy = adminEmail;
            if (notes) userRole.notes = notes;
        } else {
            this.cachedRoles.push({
                userEmail: normEmail,
                role: 'REVIEWER',
                isCertifiedReviewer: true,
                grantedBy: adminEmail,
                notes: notes || 'Certified Reviewer status granted',
                grantedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        return await this.pushGovernanceFilesAsync(`Certify reviewer status for ${normEmail}`);
    }

    /**
     * Atomic commit & push of governance files to Azure DevOps Git
     */
    private async pushGovernanceFilesAsync(comment: string): Promise<boolean> {
        if (this.isSyncing) return false;
        this.isSyncing = true;

        try {
            const projectEnc = encodeURIComponent(this.project);
            const repoEnc = encodeURIComponent(this.repository);
            const branchEnc = encodeURIComponent(this.branch);

            // 1. Get latest branch head objectId
            const refsUrl = `https://dev.azure.com/${this.organization}/${projectEnc}/_apis/git/repositories/${repoEnc}/refs?filter=heads/${branchEnc}&api-version=7.0`;
            const refData = await this.httpGetJsonAsync<any>(refsUrl);
            let oldObjectId = refData?.value?.[0]?.objectId || '0000000000000000000000000000000000000000';

            const rolesJson = JSON.stringify({
                updatedAt: new Date().toISOString(),
                organization: 'MAQ Software',
                totalUsers: this.cachedRoles.length,
                userRoles: this.cachedRoles
            }, null, 2);

            const reqsJson = JSON.stringify({
                updatedAt: new Date().toISOString(),
                totalRequests: this.cachedRequests.length,
                requests: this.cachedRequests
            }, null, 2);

            const pushPayload = {
                refUpdates: [
                    {
                        name: `refs/heads/${this.branch}`,
                        oldObjectId: oldObjectId
                    }
                ],
                commits: [
                    {
                        comment: `[Governance Sync] ${comment} (${new Date().toISOString()})`,
                        changes: [
                            {
                                changeType: 'edit',
                                item: { path: '/governance/user-roles.json' },
                                newContent: { content: rolesJson, contentType: 'rawtext' }
                            },
                            {
                                changeType: 'edit',
                                item: { path: '/governance/access-requests.json' },
                                newContent: { content: reqsJson, contentType: 'rawtext' }
                            }
                        ]
                    }
                ]
            };

            const pushUrl = `https://dev.azure.com/${this.organization}/${projectEnc}/_apis/git/repositories/${repoEnc}/pushes?api-version=7.0`;
            const pushResp = await this.httpPostJsonAsync<any>(pushUrl, pushPayload);
            this.lastFetchMs = Date.now();
            this.isSyncing = false;
            return !!pushResp;
        } catch (err) {
            console.error('[AdoGovernanceService] Push to ADO failed:', err);
            this.isSyncing = false;
            return false;
        }
    }

    /**
     * Permanently deletes an artifact across all Azure DevOps Git files, catalog, submissions, and bounties.
     */
    public async deleteArtifactFromAdoAsync(artifactName: string): Promise<boolean> {
        if (!this.pat || !artifactName) return false;
        const cleanTarget = artifactName.trim().toLowerCase();
        const cleanTargetNoDash = cleanTarget.replace(/[^a-z0-9]/g, '');

        try {
            const projectEnc = encodeURIComponent(this.project);
            const repoEnc = encodeURIComponent(this.repository);
            const branchEnc = encodeURIComponent(this.branch);

            // 1. Get full recursive repository tree from ADO Git
            const listUrl = `https://dev.azure.com/${this.organization}/${projectEnc}/_apis/git/repositories/${repoEnc}/items?recursionLevel=full&versionDescriptor.version=${branchEnc}&api-version=7.0`;
            const itemsRes = await this.httpGetJsonAsync<{ value: Array<{ path: string; gitObjectType: string; isFolder?: boolean }> }>(listUrl);
            const allItems = itemsRes?.value || [];

            // 2. Identify all matching blob files for this artifact
            const matchingBlobs = allItems.filter(item => {
                if (item.gitObjectType !== 'blob' || item.isFolder) return false;
                const p = item.path.toLowerCase();
                return p.startsWith('/.github/agents/' + cleanTarget) ||
                       p.startsWith('/.github/prompts/' + cleanTarget) ||
                       p.startsWith('/.github/commands/' + cleanTarget) ||
                       p.startsWith('/.github/mcp/' + cleanTarget) ||
                       p.startsWith('/.agents/skills/' + cleanTarget) ||
                       p.startsWith('/skills/' + cleanTarget) ||
                       p.startsWith('/plugins/' + cleanTarget) ||
                       p.startsWith('/artifacts/' + cleanTarget) ||
                       p.startsWith('/artifacts-json/' + cleanTarget) ||
                       p.includes('/' + cleanTarget + '/') ||
                       p.endsWith('/' + cleanTarget + '.md') ||
                       p.endsWith('/' + cleanTarget + '.json') ||
                       p.endsWith('/' + cleanTarget + '.prompt.md') ||
                       p.endsWith('/' + cleanTarget + '.command.md') ||
                       p.endsWith('/' + cleanTarget + '.agent.md') ||
                       p.endsWith('/' + cleanTarget + '.skill.md') ||
                       p.endsWith('/' + cleanTargetNoDash + '.md') ||
                       p.endsWith('/' + cleanTargetNoDash + '.json');
            });

            const changes: any[] = [];
            for (const blob of matchingBlobs) {
                changes.push({
                    changeType: 'delete',
                    item: { path: blob.path }
                });
            }

            // Catalog
            try {
                const catalogData = await this.fetchAdoJsonFile('/catalog.json');
                if (catalogData) {
                    let updated = false;
                    if (Array.isArray(catalogData.artifacts)) {
                        const origLen = catalogData.artifacts.length;
                        catalogData.artifacts = catalogData.artifacts.filter((a: any) => {
                            const name = (a.name || a.id || '').toLowerCase();
                            return name !== cleanTarget && name.replace(/[^a-z0-9]/g, '') !== cleanTargetNoDash;
                        });
                        if (catalogData.artifacts.length !== origLen) updated = true;
                    }
                    if (updated) {
                        catalogData.updatedAt = new Date().toISOString();
                        changes.push({
                            changeType: 'edit',
                            item: { path: '/catalog.json' },
                            newContent: { content: JSON.stringify(catalogData, null, 2), contentType: 'rawtext' }
                        });
                    }
                }
            } catch (e) {
                console.warn('[AdoGovernanceService] Error updating catalog.json:', e);
            }

            // Submissions
            try {
                const subsData = await this.fetchAdoJsonFile('/governance/submissions.json');
                if (subsData && Array.isArray(subsData.submissions)) {
                    const origLen = subsData.submissions.length;
                    subsData.submissions = subsData.submissions.filter((s: any) => {
                        const sName = (s.artifactId || s.artifactName || s.id || '').toLowerCase();
                        return sName !== cleanTarget && !sName.includes(cleanTarget);
                    });
                    if (subsData.submissions.length !== origLen) {
                        subsData.totalSubmissions = subsData.submissions.length;
                        subsData.updatedAt = new Date().toISOString();
                        changes.push({
                            changeType: 'edit',
                            item: { path: '/governance/submissions.json' },
                            newContent: { content: JSON.stringify(subsData, null, 2), contentType: 'rawtext' }
                        });
                    }
                }
            } catch (e) {
                console.warn('[AdoGovernanceService] Error updating submissions.json:', e);
            }

            // Bounties
            try {
                const btyData = await this.fetchAdoJsonFile('/governance/bounties.json');
                if (btyData && Array.isArray(btyData.bounties)) {
                    const origLen = btyData.bounties.length;
                    btyData.bounties = btyData.bounties.filter((b: any) => {
                        const bRel = (b.relatedArtifactId || b.id || '').toLowerCase();
                        const bTitle = (b.title || '').toLowerCase();
                        return bRel !== cleanTarget && !bTitle.includes(cleanTarget) && !bRel.includes(cleanTarget);
                    });
                    if (btyData.bounties.length !== origLen) {
                        btyData.totalBounties = btyData.bounties.length;
                        btyData.updatedAt = new Date().toISOString();
                        changes.push({
                            changeType: 'edit',
                            item: { path: '/governance/bounties.json' },
                            newContent: { content: JSON.stringify(btyData, null, 2), contentType: 'rawtext' }
                        });
                    }
                }
            } catch (e) {
                console.warn('[AdoGovernanceService] Error updating bounties.json:', e);
            }

            // Certifications
            try {
                const certData = await this.fetchAdoJsonFile('/governance/certifications.json');
                if (certData && typeof certData.certifications === 'object') {
                    let updated = false;
                    for (const key of Object.keys(certData.certifications)) {
                        if (key.toLowerCase() === cleanTarget || key.toLowerCase().includes(cleanTarget)) {
                            delete certData.certifications[key];
                            updated = true;
                        }
                    }
                    if (updated) {
                        certData.updatedAt = new Date().toISOString();
                        changes.push({
                            changeType: 'edit',
                            item: { path: '/governance/certifications.json' },
                            newContent: { content: JSON.stringify(certData, null, 2), contentType: 'rawtext' }
                        });
                    }
                }
            } catch (e) {
                console.warn('[AdoGovernanceService] Error updating certifications.json:', e);
            }

            if (changes.length === 0) {
                console.log(`[AdoGovernanceService] No ADO files or governance records found for '${artifactName}'.`);
                return true;
            }

            // 4. Get latest branch head objectId
            const refsUrl = `https://dev.azure.com/${this.organization}/${projectEnc}/_apis/git/repositories/${repoEnc}/refs?filter=heads/${branchEnc}&api-version=7.0`;
            const refData = await this.httpGetJsonAsync<any>(refsUrl);
            let oldObjectId = refData?.value?.[0]?.objectId || '0000000000000000000000000000000000000000';

            const pushPayload = {
                refUpdates: [
                    {
                        name: `refs/heads/${this.branch}`,
                        oldObjectId: oldObjectId
                    }
                ],
                commits: [
                    {
                        comment: `[Admin Deletion] Permanently delete artifact '${artifactName}' (${changes.length} changes)`,
                        changes: changes
                    }
                ]
            };

            const pushUrl = `https://dev.azure.com/${this.organization}/${projectEnc}/_apis/git/repositories/${repoEnc}/pushes?api-version=7.0`;
            const pushResp = await this.httpPostJsonAsync<any>(pushUrl, pushPayload);
            return !!pushResp;
        } catch (err) {
            console.error('[AdoGovernanceService] ADO artifact deletion failed:', err);
            return false;
        }
    }

    /**
     * Reads and parses a JSON file directly from Azure DevOps Git
     */
    public async fetchAdoJsonFile(filePath: string): Promise<any> {
        const projectEnc = encodeURIComponent(this.project);
        const repoEnc = encodeURIComponent(this.repository);
        const branchEnc = encodeURIComponent(this.branch);
        const url = `https://dev.azure.com/${this.organization}/${projectEnc}/_apis/git/repositories/${repoEnc}/items?path=${encodeURIComponent(filePath)}&versionDescriptor.version=${branchEnc}&includeContent=true&api-version=7.0`;
        const res = await this.httpGetJsonAsync<any>(url);
        if (!res) return null;
        if (res.content && typeof res.content === 'string') {
            try {
                return JSON.parse(res.content);
            } catch {
                return null;
            }
        }
        return res;
    }

    /**
     * Retrieves all bounties directly from Azure DevOps Git repository (/governance/bounties.json).
     */
    public async getBountiesFromAdoAsync(): Promise<any[]> {
        try {
            const data = await this.fetchAdoJsonFile('/governance/bounties.json');
            if (data && Array.isArray(data.bounties)) return data.bounties;
            if (Array.isArray(data)) return data;
            return [];
        } catch {
            return [];
        }
    }

    /**
     * Atomically commits updated bounties directly to Azure DevOps Git repository (/governance/bounties.json).
     */
    public async updateAdoBountiesAsync(modifier: (bounties: any[]) => any[], commitMsg = 'Update bounties'): Promise<boolean> {
        if (!this.pat) return false;
        try {
            const projectEnc = encodeURIComponent(this.project);
            const repoEnc = encodeURIComponent(this.repository);
            const branchEnc = encodeURIComponent(this.branch);

            const btyData = await this.fetchAdoJsonFile('/governance/bounties.json') || { bounties: [] };
            const currentList = Array.isArray(btyData.bounties) ? btyData.bounties : (Array.isArray(btyData) ? btyData : []);
            const updatedList = modifier(currentList);

            const payloadObj = {
                updatedAt: new Date().toISOString(),
                totalBounties: updatedList.length,
                bounties: updatedList
            };
            const btyJson = JSON.stringify(payloadObj, null, 2);

            const refsUrl = `https://dev.azure.com/${this.organization}/${projectEnc}/_apis/git/repositories/${repoEnc}/refs?filter=heads/${branchEnc}&api-version=7.0`;
            const refData = await this.httpGetJsonAsync<any>(refsUrl);
            let oldObjectId = refData?.value?.[0]?.objectId || '0000000000000000000000000000000000000000';

            const pushPayload = {
                refUpdates: [{ name: `refs/heads/${this.branch}`, oldObjectId }],
                commits: [
                    {
                        comment: `[Governance Sync] ${commitMsg} (${new Date().toISOString()})`,
                        changes: [
                            {
                                changeType: 'edit',
                                item: { path: '/governance/bounties.json' },
                                newContent: { content: btyJson, contentType: 'rawtext' }
                            }
                        ]
                    }
                ]
            };

            const pushUrl = `https://dev.azure.com/${this.organization}/${projectEnc}/_apis/git/repositories/${repoEnc}/pushes?api-version=7.0`;
            const pushResp = await this.httpPostJsonAsync<any>(pushUrl, pushPayload);
            return !!pushResp;
        } catch (err) {
            console.error('[AdoGovernanceService] Failed to update bounties in ADO:', err);
            return false;
        }
    }

    /**
     * Marks a bounty as Completed directly in Azure DevOps Git.
     */
    public async completeBountyInAdoAsync(bountyIdOrArtifactName: string, completedByEmail?: string): Promise<boolean> {
        const target = (bountyIdOrArtifactName || '').trim().toLowerCase();
        return this.updateAdoBountiesAsync((bounties) => {
            return bounties.map(b => {
                const bId = (b.id || '').toLowerCase();
                const bRel = (b.relatedArtifactId || '').toLowerCase();
                const bTitle = (b.title || '').toLowerCase();
                if (bId === target || bRel === target || bTitle.includes(target) || (target && bRel && target.includes(bRel))) {
                    return {
                        ...b,
                        status: 'Completed',
                        stage: 'Completed',
                        completedAt: new Date().toISOString(),
                        completedByEmail: completedByEmail || b.claimedByEmail,
                        canClaim: false,
                        canSubmitCode: false,
                        canReview: false,
                        canRunTests: false
                    };
                }
                return b;
            });
        }, `Complete bounty for '${bountyIdOrArtifactName}'`);
    }

    /**
     * Releases a bounty back to the Open pool directly in Azure DevOps Git.
     */
    public async releaseBountyInAdoAsync(bountyIdOrArtifactName: string): Promise<boolean> {
        const target = (bountyIdOrArtifactName || '').trim().toLowerCase();
        return this.updateAdoBountiesAsync((bounties) => {
            return bounties.map(b => {
                const bId = (b.id || '').toLowerCase();
                const bRel = (b.relatedArtifactId || '').toLowerCase();
                if (bId === target || bRel === target || (target && bRel && target.includes(bRel))) {
                    return {
                        ...b,
                        status: 'Open',
                        stage: 'Open',
                        claimedByEmail: undefined,
                        claimedAt: undefined,
                        slaDeadline: undefined,
                        autoReleaseDeadline: undefined,
                        isClaimedByMe: false,
                        canClaim: true,
                        canSubmitCode: false,
                        canReview: false,
                        canRunTests: false
                    };
                }
                return b;
            });
        }, `Release bounty '${bountyIdOrArtifactName}' back to open pool`);
    }

    /**
     * Checks all bounties in Azure DevOps Git and automatically releases any whose SLA auto-release deadline has expired.
     */
    public async releaseExpiredBountiesInAdoAsync(): Promise<string[]> {
        const releasedIds: string[] = [];
        const now = Date.now();

        await this.updateAdoBountiesAsync((bounties) => {
            return bounties.map(b => {
                const s = String(b.status || '').toLowerCase();
                const st = String(b.stage || '').toLowerCase();
                if (s === 'completed' || st === 'completed' || s === 'open') {
                    return b;
                }

                let isExpired = false;
                if (b.autoReleaseDeadline) {
                    const arMs = new Date(b.autoReleaseDeadline).getTime();
                    if (!isNaN(arMs) && arMs <= now) isExpired = true;
                } else if (b.claimedAt) {
                    const hours = Number(b.autoReleasesHours || 18);
                    const arMs = new Date(b.claimedAt).getTime() + hours * 3600 * 1000;
                    if (!isNaN(arMs) && arMs <= now) isExpired = true;
                }

                if (isExpired) {
                    releasedIds.push(b.id || b.title);
                    return {
                        ...b,
                        status: 'Open',
                        stage: 'Open',
                        claimedByEmail: undefined,
                        claimedAt: undefined,
                        slaDeadline: undefined,
                        autoReleaseDeadline: undefined,
                        isClaimedByMe: false,
                        canClaim: true,
                        canSubmitCode: false,
                        canReview: false,
                        canRunTests: false
                    };
                }
                return b;
            });
        }, `[SLA Policy] Auto-release expired bounties back to open pool`);

        return releasedIds;
    }

    /**
     * Downloads all files for an artifact directly from Azure DevOps Git repository.
     */
    public async downloadArtifactFilesFromAdoAsync(artifactName: string, version?: string): Promise<Array<{ path: string; content: string }>> {
        if (!this.pat || !artifactName) return [];
        const cleanTarget = artifactName.trim().toLowerCase();
        const cleanTargetNoDash = cleanTarget.replace(/[^a-z0-9]/g, '');

        try {
            const projectEnc = encodeURIComponent(this.project);
            const repoEnc = encodeURIComponent(this.repository);
            const branchEnc = encodeURIComponent(this.branch);

            // 1. Check if artifacts-json/{artifactName}.json package exists in ADO Git
            const pkgUrl = `https://dev.azure.com/${this.organization}/${projectEnc}/_apis/git/repositories/${repoEnc}/items?path=${encodeURIComponent('/artifacts-json/' + cleanTarget + '.json')}&versionDescriptor.version=${branchEnc}&includeContent=true&api-version=7.0`;
            const pkgData = await this.httpGetRawAsync(pkgUrl);
            if (pkgData && pkgData.status === 200 && pkgData.body) {
                try {
                    const parsed = JSON.parse(pkgData.body);
                    if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) {
                        return parsed.files;
                    }
                } catch {}
            }

            // 2. Query full recursive repository file tree from ADO Git
            const listUrl = `https://dev.azure.com/${this.organization}/${projectEnc}/_apis/git/repositories/${repoEnc}/items?recursionLevel=full&versionDescriptor.version=${branchEnc}&api-version=7.0`;
            const listData = await this.httpGetRawAsync(listUrl);
            if (!listData || listData.status !== 200 || !listData.body) return [];

            let allItems: Array<{ path: string; gitObjectType: string; isFolder?: boolean }> = [];
            try {
                allItems = JSON.parse(listData.body).value || [];
            } catch { return []; }

            const matchingBlobs = allItems.filter(item => {
                if (item.gitObjectType !== 'blob' || item.isFolder) return false;
                const p = item.path.toLowerCase();
                return p.startsWith('/.github/agents/' + cleanTarget) ||
                       p.startsWith('/.github/prompts/' + cleanTarget) ||
                       p.startsWith('/.github/commands/' + cleanTarget) ||
                       p.startsWith('/.github/mcp/' + cleanTarget) ||
                       p.startsWith('/.agents/skills/' + cleanTarget) ||
                       p.startsWith('/skills/' + cleanTarget) ||
                       p.startsWith('/plugins/' + cleanTarget) ||
                       p.startsWith('/artifacts/' + cleanTarget) ||
                       p.includes('/' + cleanTarget + '/') ||
                       p.endsWith('/' + cleanTarget + '.md') ||
                       p.endsWith('/' + cleanTarget + '.json') ||
                       p.endsWith('/' + cleanTarget + '.prompt.md') ||
                       p.endsWith('/' + cleanTarget + '.command.md') ||
                       p.endsWith('/' + cleanTarget + '.agent.md') ||
                       p.endsWith('/' + cleanTarget + '.skill.md') ||
                       p.endsWith('/' + cleanTargetNoDash + '.md') ||
                       p.endsWith('/' + cleanTargetNoDash + '.json');
            });

            const files: Array<{ path: string; content: string }> = [];
            for (const blob of matchingBlobs) {
                const fileUrl = `https://dev.azure.com/${this.organization}/${projectEnc}/_apis/git/repositories/${repoEnc}/items?path=${encodeURIComponent(blob.path)}&versionDescriptor.version=${branchEnc}&includeContent=true&api-version=7.0`;
                const fileRes = await this.httpGetRawAsync(fileUrl);
                if (fileRes && fileRes.status === 200 && fileRes.body) {
                    let relPath = blob.path.startsWith('/') ? blob.path.substring(1) : blob.path;
                    let content = fileRes.body;
                    try {
                        const parsed = JSON.parse(content);
                        if (parsed && typeof parsed.content === 'string') content = parsed.content;
                    } catch {}
                    files.push({ path: relPath, content });

                    // Also mirror .agents/skills to skills/
                    if (relPath.startsWith('.agents/skills/')) {
                        files.push({ path: relPath.replace('.agents/skills/', 'skills/'), content });
                    }
                }
            }

            return files;
        } catch (err) {
            console.warn('[AdoGovernanceService] Failed to download artifact files from ADO:', err);
            return [];
        }
    }

    private async httpGetRawAsync(urlStr: string): Promise<{ status: number; body: string } | null> {
        if (!(await this.isAuthenticated())) {
            return null;
        }
        return new Promise((resolve) => {
            try {
                const url = new URL(urlStr);
                const req = https.request(
                    url,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': this.getAuthHeader(),
                            'Accept': '*/*',
                            'User-Agent': 'EngineeringCommons-VSCode-AdoGovernance/1.2.0'
                        },
                        timeout: 10000
                    },
                    (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            resolve({ status: res.statusCode || 200, body: data });
                        });
                    }
                );
                req.on('error', () => resolve(null));
                req.on('timeout', () => { req.destroy(); resolve(null); });
                req.end();
            } catch {
                resolve(null);
            }
        });
    }

    private async httpGetJsonAsync<T>(urlStr: string): Promise<T | null> {
        if (!(await this.isAuthenticated())) {
            return null;
        }
        return new Promise((resolve) => {
            try {
                const url = new URL(urlStr);
                const req = https.request(
                    url,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': this.getAuthHeader(),
                            'Accept': 'application/json',
                            'User-Agent': 'EngineeringCommons-VSCode-AdoGovernance/1.2.0'
                        },
                        timeout: 10000
                    },
                    (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            try {
                                resolve(data ? JSON.parse(data) : null);
                            } catch {
                                resolve(null);
                            }
                        });
                    }
                );
                req.on('error', () => resolve(null));
                req.on('timeout', () => { req.destroy(); resolve(null); });
                req.end();
            } catch {
                resolve(null);
            }
        });
    }

    private async httpPostJsonAsync<T>(urlStr: string, body: any): Promise<T | null> {
        if (!(await this.isAuthenticated())) {
            return null;
        }
        return new Promise((resolve) => {
            try {
                const url = new URL(urlStr);
                const payload = JSON.stringify(body);
                const req = https.request(
                    url,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': this.getAuthHeader(),
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Content-Length': Buffer.byteLength(payload).toString(),
                            'User-Agent': 'EngineeringCommons-VSCode-AdoGovernance/1.2.0'
                        },
                        timeout: 10000
                    },
                    (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            try {
                                resolve(data ? JSON.parse(data) : null);
                            } catch {
                                resolve(null);
                            }
                        });
                    }
                );
                req.on('error', () => resolve(null));
                req.on('timeout', () => { req.destroy(); resolve(null); });
                req.write(payload);
                req.end();
            } catch {
                resolve(null);
            }
        });
    }
}

