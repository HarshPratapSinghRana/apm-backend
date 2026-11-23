/**
 * SharePoint Artifact Service with 15-Minute In-Memory TTL Cache.
 * Reads published skills, agents, prompts, and packages directly from SharePoint List (Engineering-Commons-Artifacts).
 */

import { SharePointClient } from './sharepointClient';

export interface CachedItem<T> {
    data: T;
    expiresAt: number;
}

export class MemoryCache {
    private cache = new Map<string, CachedItem<any>>();

    public get<T>(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return item.data as T;
    }

    public set<T>(key: string, data: T, ttlMs: number = 15 * 60 * 1000): void {
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttlMs
        });
    }

    public clear(key?: string): void {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }
}

export interface SharePointArtifactItem {
    id: string;
    Title: string;
    Category?: string;
    Description?: string;
    Key_x0020_Features?: string;
    Tech_x0020_Stack?: string;
    Submitted_x0020_By?: string;
    Submitted_x0020_At?: string;
    Version?: string;
    ArtifactType?: string;
    IsCertified?: boolean;
    Downloads?: number;
    Rating?: number;
    RatingCount?: number;
    Visibility?: string;
    AttachmentFiles?: Array<{ ServerRelativeUrl: string; FileName: string }>;
}

export class SharePointArtifactService {
    private cache = new MemoryCache();
    private client: SharePointClient;

    constructor(client?: SharePointClient) {
        this.client = client || new SharePointClient();
    }

    public async getArtifactsAsync(graphToken: string, forceRefresh = false): Promise<any[]> {
        const cacheKey = 'sp_artifacts_catalog';
        if (!forceRefresh) {
            const cached = this.cache.get<any[]>(cacheKey);
            if (cached) {
                return cached;
            }
        }

        const config = this.client.getConfig();
        try {
            const rawItems = await this.client.getAllListItemsMappedAsync(
                graphToken,
                config.artifactsList,
                500
            );

            const artifacts = rawItems.map(item => this.mapToArtifactDto(item));
            // Cache catalog in memory for 15 minutes (900,000 ms)
            this.cache.set(cacheKey, artifacts, 15 * 60 * 1000);
            return artifacts;
        } catch (err) {
            console.warn('[SharePointArtifactService] Fetch from SharePoint failed:', err);
            // Return cached data if available even if expired on error
            return this.cache.get<any[]>(cacheKey) || [];
        }
    }

    public async getArtifactByNameAsync(graphToken: string, name: string): Promise<any | null> {
        const all = await this.getArtifactsAsync(graphToken);
        const match = all.find(a => (a.name || a.id || '').toLowerCase() === name.toLowerCase());
        return match || null;
    }

    public invalidateCache(): void {
        this.cache.clear('sp_artifacts_catalog');
    }

    /**
     * Downloads full artifact JSON package directly from SharePoint without backend.
     * Primary: SharePoint Document Library (Drive)
     * Fallback: SharePoint List Item Attachment
     */
    public async downloadArtifactJsonFromSharePointAsync(
        graphToken: string,
        artifactName: string,
        version: string = '1.0.0'
    ): Promise<ArtifactJsonPackage | null> {
        const config = this.client.getConfig();

        // 1. Primary: Download directly from SharePoint Document Library
        try {
            const docPkg = await this.client.downloadJsonFromDocumentLibraryAsync<ArtifactJsonPackage>(
                graphToken,
                config.documentLibrary || 'Documents',
                `artifacts/${artifactName}/${version}`,
                `${artifactName}.json`
            );
            if (docPkg && docPkg.files && docPkg.files.length > 0) {
                return docPkg;
            }
        } catch (docErr) {
            console.warn('[SharePointArtifactService] Document library download skipped:', docErr);
        }

        // 2. Fallback: SharePoint List Attachment
        try {
            const siteId = await this.client.getSiteIdAsync(graphToken);
            const listId = await this.client.getListIdAsync(graphToken, config.artifactsList);

            const queryUrl = `/v1.0/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=100`;
            const res = await this.client.httpGetJsonAsync<{ value: Array<{ id: string; fields?: any }> }>(queryUrl, graphToken);

            if (res && res.value && res.value.length > 0) {
                const match = res.value.find(item => {
                    const title = (item.fields?.Title || item.fields?.title || '').trim().toLowerCase();
                    return title === artifactName.trim().toLowerCase() || title.replace(/[^a-z0-9]/g, '') === artifactName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                });

                if (match) {
                    const artifactData = await this.client.getAttachmentJsonAsync<ArtifactJsonPackage>(
                        graphToken,
                        config.artifactsList,
                        match.id,
                        `${artifactName}.json`
                    );
                    if (artifactData && artifactData.files && artifactData.files.length > 0) {
                        return artifactData;
                    }
                }
            }
        } catch (spErr) {
            console.warn('[SharePointArtifactService] List attachment download skipped:', spErr);
        }

        return null;
    }

    /**
     * Permanently deletes an artifact and its associated records from SharePoint Online.
     */
    public async deleteArtifactAsync(graphToken: string, artifactName: string): Promise<boolean> {
        const config = this.client.getConfig();
        let deletedFromList = false;
        const cleanTarget = artifactName.trim().toLowerCase();

        try {
            const siteId = await this.client.getSiteIdAsync(graphToken);
            const listId = await this.client.getListIdAsync(graphToken, config.artifactsList);

            // 1. Find and delete matching item in Engineering-Commons-Artifacts list
            const queryUrl = `/v1.0/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=200`;
            const res = await this.client.httpGetJsonAsync<{ value: Array<{ id: string; fields?: any }> }>(queryUrl, graphToken);

            if (res && res.value && res.value.length > 0) {
                const match = res.value.find(item => {
                    const title = (item.fields?.Title || item.fields?.Project_x0020_Title || item.fields?.name || item.fields?.id || '').trim().toLowerCase();
                    return title === cleanTarget || title.replace(/[^a-z0-9]/g, '') === cleanTarget.replace(/[^a-z0-9]/g, '');
                });

                if (match) {
                    const deleteUrl = `/v1.0/sites/${siteId}/lists/${listId}/items/${match.id}`;
                    deletedFromList = await this.client.httpDeleteAsync(deleteUrl, graphToken);
                }
            }

            // 2. Also delete associated bounty item if present
            try {
                const bountyListId = await this.client.getListIdAsync(graphToken, config.bountiesList);
                const bRes = await this.client.httpGetJsonAsync<{ value: Array<{ id: string; fields?: any }> }>(
                    `/v1.0/sites/${siteId}/lists/${bountyListId}/items?$expand=fields&$top=200`,
                    graphToken
                );
                if (bRes && bRes.value) {
                    const bMatch = bRes.value.find(item => {
                        const bTitle = (item.fields?.Title || item.fields?.title || '').toLowerCase();
                        const bArt = (item.fields?.RelatedArtifactId || item.fields?.relatedArtifactId || '').toLowerCase();
                        return bArt === cleanTarget || bTitle.includes(cleanTarget);
                    });
                    if (bMatch) {
                        await this.client.httpDeleteAsync(`/v1.0/sites/${siteId}/lists/${bountyListId}/items/${bMatch.id}`, graphToken);
                    }
                }
            } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }

            // Invalidate in-memory caches
            this.invalidateCache();
            return deletedFromList;
        } catch (err) {
            console.warn('[SharePointArtifactService] deleteArtifactAsync error:', err);
            this.invalidateCache();
            return false;
        }
    }

    private mapToArtifactDto(item: any): any {
        const name = item.Title || item.Project_x0020_Title || item.title || item.name || 'Unnamed Artifact';
        const type = (item.ArtifactType || item.Artifact_x0020_Type || item.artifacttype || item.type || 'skill').toLowerCase();
        const category = item.Category || item.category || 'General';
        const version = item.Version || item.version || '1.0.0';
        const desc = item.Description || item.description || '';
        const author = item.Submitted_x0020_By || item.SubmittedBy || item.Submitted_By || item.submittedby || item.author || 'MAQ Software';
        const certified = item.IsCertified === true || item.IsCertified === 'true' || item.IsCertified === 'TRUE' || item.iscertified === true || item.iscertified === 'true' || item.iscertified === 'TRUE' || item.isCertified === true || item.is_certified === true;
        const downloads = Number(item.Downloads || item.downloads || 0);
        const rating = Number(item.Rating || item.rating || 5.0);
        const ratingCount = Number(item.RatingCount || item.ratingcount || item.ratingCount || 1);
        const visibility = item.Visibility || item.visibility || 'Public';
        const techStack = item.Tech_x0020_Stack || item.TechStack || item.techstack || item.techStack || '';
        const tags = typeof techStack === 'string' && techStack ? techStack.split(',').map((s: string) => s.trim()) : [];
        const keyFeatures = item.Key_x0020_Features || item.KeyFeatures || item.keyfeatures || item.keyFeatures || '';
        const submittedAt = item.Submitted_x0020_At || item.SubmittedAt || item.submittedat || item.createdDateTime || item.Created || new Date().toISOString();

        return {
            id: item.id || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            name: name,
            title: name,
            type: type,
            artifactType: type,
            category: category,
            version: version,
            description: desc,
            author: author,
            isCertified: certified,
            certified: certified,
            downloads: downloads,
            rating: rating,
            ratingCount: ratingCount,
            visibility: visibility,
            tags: tags,
            keyFeatures: keyFeatures,
            submittedAt: submittedAt
        };
    }
}

export interface ArtifactJsonPackage {
    name: string;
    version: string;
    type: string;
    category?: string;
    description: string;
    author?: string;
    isCertified?: boolean;
    downloads?: number;
    rating?: number;
    techStack?: string[];
    keyFeatures?: string[];
    files: Array<{ path: string; content: string }>;
}
