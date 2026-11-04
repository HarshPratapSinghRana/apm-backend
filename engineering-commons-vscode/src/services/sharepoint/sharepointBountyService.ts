/**
 * SharePoint Bounty & Claimed Work Service.
 * Reads and manages open bounties, rewards, and claimed peer work directly from SharePoint List (Engineering-Commons-Bounties).
 */

import { SharePointClient } from './sharepointClient';
import { MemoryCache } from './sharepointArtifactService';

export interface SharePointBountyItem {
    id: string;
    Title: string;
    Description?: string;
    Category?: string;
    RewardCredits?: number;
    Status?: string; // 'Open' | 'InProgress' | 'InTesting' | 'Completed'
    ClaimedBy?: string;
    ClaimedAt?: string;
    Stage?: string;
}

export class SharePointBountyService {
    private client: SharePointClient;
    private cache = new MemoryCache();

    constructor(client?: SharePointClient) {
        this.client = client || new SharePointClient();
    }

    public async getBountiesAsync(graphToken: string, forceRefresh = false): Promise<SharePointBountyItem[]> {
        const cacheKey = 'sp_bounties_list';
        if (!forceRefresh) {
            const cached = this.cache.get<SharePointBountyItem[]>(cacheKey);
            if (cached) return cached;
        }

        const config = this.client.getConfig();
        try {
            const rawItems = await this.client.getAllListItemsMappedAsync(graphToken, config.bountiesList);
            const items: SharePointBountyItem[] = rawItems.map(item => ({
                id: String(item.id || item.ID || ''),
                Title: item.Title || item.title || '',
                Description: item.Description || item.description || '',
                Category: item.Category || item.category || 'General',
                RewardCredits: Number(item.RewardCredits || item.Reward_x0020_Credits || item.rewardcredits || item.credits || 0),
                Status: item.Status || item.status || 'Open',
                ClaimedBy: item.ClaimedBy || item.Claimed_x0020_By || item.claimedby || '',
                ClaimedAt: item.ClaimedAt || item.Claimed_x0020_At || item.claimedat || '',
                Stage: item.Stage || item.stage || (item.Status || item.status || 'Open')
            }));
            this.cache.set(cacheKey, items, 15 * 60 * 1000); // 15-minute cache
            return items;
        } catch (err) {
            console.warn('[SharePointBountyService] Fetch bounties failed:', err);
            return this.cache.get<SharePointBountyItem[]>(cacheKey) || [];
        }
    }

    public async claimBountyAsync(graphToken: string, bountyId: string, userEmail: string): Promise<boolean> {
        const config = this.client.getConfig();
        const displayFields = {
            'Status': 'InProgress',
            'ClaimedBy': userEmail,
            'ClaimedAt': new Date().toISOString(),
            'Stage': 'CodeGeneration'
        };

        const success = await this.client.updateListItemFieldsAsync(graphToken, config.bountiesList, bountyId, displayFields);
        this.cache.clear('sp_bounties_list');
        return success;
    }

    public async releaseBountyAsync(graphToken: string, bountyId: string): Promise<boolean> {
        const config = this.client.getConfig();
        const displayFields = {
            'Status': 'Open',
            'ClaimedBy': null,
            'ClaimedAt': null,
            'Stage': 'Open'
        };

        const success = await this.client.updateListItemFieldsAsync(graphToken, config.bountiesList, bountyId, displayFields);
        this.cache.clear('sp_bounties_list');
        return success;
    }

    public async submitCodeAsync(graphToken: string, bountyId: string, solutionCode: string): Promise<boolean> {
        const config = this.client.getConfig();
        const displayFields = {
            'Status': 'InProgress',
            'Stage': 'InReview',
            'SolutionCode': solutionCode
        };

        const success = await this.client.updateListItemFieldsAsync(graphToken, config.bountiesList, bountyId, displayFields);
        this.cache.clear('sp_bounties_list');
        return success;
    }

    public async reviewCodeAsync(graphToken: string, bountyId: string, isApproved: boolean, feedback?: string): Promise<boolean> {
        const config = this.client.getConfig();
        const displayFields = {
            'Stage': isApproved ? 'InTesting' : 'CodeGeneration',
            'ReviewFeedback': feedback || ''
        };

        const success = await this.client.updateListItemFieldsAsync(graphToken, config.bountiesList, bountyId, displayFields);
        this.cache.clear('sp_bounties_list');
        return success;
    }

    public async runTestsAsync(graphToken: string, bountyId: string, isPassed: boolean): Promise<boolean> {
        const config = this.client.getConfig();
        const displayFields = {
            'Status': isPassed ? 'Completed' : 'InProgress',
            'Stage': isPassed ? 'Completed' : 'CodeGeneration'
        };

        const success = await this.client.updateListItemFieldsAsync(graphToken, config.bountiesList, bountyId, displayFields);
        this.cache.clear('sp_bounties_list');
        return success;
    }
}
