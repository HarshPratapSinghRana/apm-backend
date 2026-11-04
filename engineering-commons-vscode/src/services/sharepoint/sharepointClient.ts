/**
 * Microsoft 365 SharePoint & Graph API Client for Engineering Commons.
 * Implements resilient site lookup, list lookup, column mapping, and file attachments
 * for dedicated Engineering Commons lists and libraries.
 */

import * as https from 'https';
import { URL } from 'url';

export interface SharePointConfig {
    hostname: string;        // e.g. testmaq.sharepoint.com
    sitePath: string;        // e.g. sites/Engineering-Commons or sites/AITeam2
    artifactsList: string;   // e.g. Engineering-Commons-Artifacts
    feedbackList: string;    // e.g. Engineering-Commons-Reviews
    bountiesList: string;    // e.g. Engineering-Commons-Bounties
    notificationsList: string; // e.g. Engineering-Commons-Notifications
    telemetryList: string;   // e.g. Engineering-Commons-Telemetry
    documentLibrary: string; // e.g. Engineering-Commons-Documents
}

export const DEFAULT_SHAREPOINT_CONFIG: SharePointConfig = {
    hostname: 'testmaq.sharepoint.com',
    sitePath: 'sites/AITeam2',
    artifactsList: 'Engineering-Commons-Artifacts',
    feedbackList: 'Engineering-Commons-Reviews',
    bountiesList: 'Engineering-Commons-Bounties',
    notificationsList: 'Engineering-Commons-Notifications',
    telemetryList: 'Engineering-Commons-Telemetry',
    documentLibrary: 'Engineering-Commons-Documents'
};

export class SharePointClient {
    /**
     * Architectural directive: All SharePoint requests are disabled.
     * All read and write operations route directly to Azure DevOps (ADO) Git and central backend.
     */
    public static readonly ENABLE_SHAREPOINT_REQUESTS: boolean = false;

    private config: SharePointConfig;
    private siteIdCache: string | null = null;
    private listIdCache: Map<string, string> = new Map();
    private columnMapCache: Map<string, Map<string, string>> = new Map();

    constructor(config?: Partial<SharePointConfig>) {
        this.config = { ...DEFAULT_SHAREPOINT_CONFIG, ...config };
    }

    public updateConfig(newConfig: Partial<SharePointConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.siteIdCache = null;
        this.listIdCache.clear();
        this.columnMapCache.clear();
    }

    public getConfig(): SharePointConfig {
        return { ...this.config };
    }

    /**
     * Resolves the Microsoft Graph site ID for the configured SharePoint site collection.
     */
    public async getSiteIdAsync(graphToken: string): Promise<string> {
        if (!SharePointClient.ENABLE_SHAREPOINT_REQUESTS) {
            return '';
        }
        if (this.siteIdCache) {
            return this.siteIdCache;
        }

        const cleanSitePath = this.config.sitePath.replace(/^\/+|\/+$/g, '');
        const endpoint = `/v1.0/sites/${this.config.hostname}:/${cleanSitePath}`;
        const res = await this.httpGetJsonAsync<{ id: string }>(endpoint, graphToken);
        if (!res || !res.id) {
            throw new Error(`Failed to resolve SharePoint site ID for ${this.config.hostname}/${cleanSitePath}`);
        }

        this.siteIdCache = res.id;
        return res.id;
    }

    /**
     * Resolves the list ID for a given list display name within the site.
     * Dynamically queries all lists on the site and matches flexibly
     * (e.g., handles 'Engineering-Commons-Artifacts', 'EngineeringCommonsArtifacts', 'Engineering Commons Artifacts').
     */
    public async getListIdAsync(graphToken: string, listName: string): Promise<string> {
        if (this.listIdCache.has(listName)) {
            return this.listIdCache.get(listName)!;
        }

        const siteId = await this.getSiteIdAsync(graphToken);
        const endpoint = `/v1.0/sites/${siteId}/lists?$top=100`;
        const res = await this.httpGetJsonAsync<{ value: Array<{ id: string; displayName?: string; name?: string }> }>(endpoint, graphToken);

        if (!res || !res.value || res.value.length === 0) {
            throw new Error(`No lists found on SharePoint site ${this.config.sitePath}`);
        }

        const cleanTarget = listName.toLowerCase().replace(/[^a-z0-9]/g, '');

        // 1. Try exact match on displayName or name
        let match = res.value.find(l => 
            (l.displayName && l.displayName.toLowerCase() === listName.toLowerCase()) ||
            (l.name && l.name.toLowerCase() === listName.toLowerCase())
        );

        // 2. Try normalized alphanumeric match
        if (!match) {
            match = res.value.find(l => {
                const normDisplay = (l.displayName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const normName = (l.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                return normDisplay === cleanTarget || normName === cleanTarget;
            });
        }

        // 3. Try partial / substring match
        if (!match) {
            match = res.value.find(l => {
                const normDisplay = (l.displayName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                return normDisplay.includes(cleanTarget) || cleanTarget.includes(normDisplay);
            });
        }

        if (!match) {
            const available = res.value.map(l => l.displayName || l.name).filter(Boolean).join(', ');
            throw new Error(`SharePoint list not found: '${listName}' on site ${this.config.sitePath}. Available lists: [${available}]`);
        }

        const listId = match.id;
        this.listIdCache.set(listName, listId);
        return listId;
    }

    /**
     * Dynamically maps display names to internal column names (preventing broken queries on column renaming).
     */
    public async getColumnMapAsync(graphToken: string, listName: string): Promise<Map<string, string>> {
        if (this.columnMapCache.has(listName)) {
            return this.columnMapCache.get(listName)!;
        }

        const siteId = await this.getSiteIdAsync(graphToken);
        const listId = await this.getListIdAsync(graphToken, listName);
        const endpoint = `/v1.0/sites/${siteId}/lists/${listId}/columns`;
        const res = await this.httpGetJsonAsync<{ value: Array<{ displayName?: string; name?: string; readOnly?: boolean }> }>(endpoint, graphToken);

        const map = new Map<string, string>();
        if (res && res.value) {
            for (const col of res.value) {
                if (col.readOnly) continue;
                if (col.displayName && col.name) {
                    map.set(col.displayName.trim().toLowerCase(), col.name);
                }
            }
        }

        this.columnMapCache.set(listName, map);
        return map;
    }

    /**
     * Fetches all items from a SharePoint list with expanded fields (paginated).
     */
    public async getAllListItemsAsync<T = any>(graphToken: string, listName: string, top = 500): Promise<T[]> {
        if (!SharePointClient.ENABLE_SHAREPOINT_REQUESTS) {
            return [];
        }
        const siteId = await this.getSiteIdAsync(graphToken);
        const listId = await this.getListIdAsync(graphToken, listName);

        let endpoint: string | null = `/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields&$top=${top}`;
        const allItems: T[] = [];

        while (endpoint) {
            const res: any = await this.httpGetJsonAsync(endpoint, graphToken);
            if (res && res.value) {
                for (const item of res.value) {
                    const fields = item.fields ? { ...item.fields, id: String(item.id || item.fields.id || item.fields.ID || '') } : item;
                    allItems.push(fields);
                }
            }
            endpoint = res && res['@odata.nextLink'] ? res['@odata.nextLink'] : null;
        }

        return allItems;
    }

    /**
     * Fetches all items from a SharePoint list and maps internal column names (e.g., field_1, field_2)
     * back to clean, normalized display property names.
     */
    public async getAllListItemsMappedAsync(graphToken: string, listName: string, top = 500): Promise<Record<string, any>[]> {
        if (!SharePointClient.ENABLE_SHAREPOINT_REQUESTS) {
            return [];
        }
        const rawItems = await this.getAllListItemsAsync<any>(graphToken, listName, top);
        let columnMap: Map<string, string>;
        try {
            columnMap = await this.getColumnMapAsync(graphToken, listName);
        } catch {
            columnMap = new Map();
        }

        // Invert map: internalName -> displayName
        const internalToDisplay = new Map<string, string>();
        for (const [displayName, internalName] of columnMap.entries()) {
            internalToDisplay.set(internalName.toLowerCase(), displayName);
        }

        return rawItems.map(raw => {
            const mapped: Record<string, any> = { ...raw };
            mapped.id = String(raw.id || raw.ID || '');

            for (const [key, val] of Object.entries(raw)) {
                let resolvedVal = val;
                if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
                    resolvedVal = val[0].Email || val[0].LookupValue || val[0].Title || JSON.stringify(val);
                } else if (val && typeof val === 'object' && !Array.isArray(val)) {
                    resolvedVal = (val as any).Email || (val as any).LookupValue || (val as any).Title || JSON.stringify(val);
                }

                mapped[key] = resolvedVal;

                const lowerKey = key.toLowerCase();
                const displayName = internalToDisplay.get(lowerKey);
                if (displayName) {
                    mapped[displayName] = resolvedVal;
                    const normalized = displayName.replace(/[^a-zA-Z0-9]/g, '');
                    mapped[normalized] = resolvedVal;
                    mapped[normalized.toLowerCase()] = resolvedVal;
                }
            }

            return mapped;
        });
    }

    /**
     * Creates a single list item atomically via Graph API.
     */
    public async createListItemAsync(graphToken: string, listName: string, displayFields: Record<string, any>): Promise<string> {
        const siteId = await this.getSiteIdAsync(graphToken);
        const listId = await this.getListIdAsync(graphToken, listName);
        const columnMap = await this.getColumnMapAsync(graphToken, listName);

        const mappedFields: Record<string, any> = {};
        for (const [key, val] of Object.entries(displayFields)) {
            const internalName = columnMap.get(key.trim().toLowerCase()) || key;
            if (val !== undefined && val !== null) {
                mappedFields[internalName] = val;
            }
        }

        // Guarantee Title is present if required by SharePoint
        if (!mappedFields['Title'] && displayFields['Title']) {
            mappedFields['Title'] = displayFields['Title'];
        }

        const endpoint = `/v1.0/sites/${siteId}/lists/${listId}/items`;
        const res = await this.httpPostJsonAsync<{ id: string }>(endpoint, { fields: mappedFields }, graphToken);
        if (!res || !res.id) {
            throw new Error(`Failed to create list item in '${listName}'`);
        }
        return res.id;
    }

    /**
     * Updates an existing list item's fields atomically.
     */
    public async updateListItemFieldsAsync(graphToken: string, listName: string, itemId: string, displayFields: Record<string, any>): Promise<boolean> {
        const siteId = await this.getSiteIdAsync(graphToken);
        const listId = await this.getListIdAsync(graphToken, listName);
        const columnMap = await this.getColumnMapAsync(graphToken, listName);

        const mappedFields: Record<string, any> = {};
        for (const [key, val] of Object.entries(displayFields)) {
            const internalName = columnMap.get(key.trim().toLowerCase()) || key;
            if (val !== undefined && val !== null) {
                mappedFields[internalName] = val;
            }
        }

        const endpoint = `/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}/fields`;
        await this.httpPatchJsonAsync(endpoint, mappedFields, graphToken);
        return true;
    }

    /**
     * Attaches a binary file (.zip package, image, doc) to a SharePoint List item using SharePoint REST API.
     */
    public async uploadAttachmentAsync(spToken: string, listName: string, itemId: string, fileName: string, fileBuffer: Buffer): Promise<boolean> {
        const cleanSitePath = this.config.sitePath.replace(/^\/+|\/+$/g, '');
        const url = `https://${this.config.hostname}/${cleanSitePath}/_api/web/lists/getbytitle('${encodeURIComponent(listName)}')/items(${itemId})/AttachmentFiles/add(FileName='${encodeURIComponent(fileName)}')`;

        return new Promise<boolean>((resolve, reject) => {
            const parsed = new URL(url);
            const req = https.request({
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${spToken}`,
                    'Accept': 'application/json;odata=verbose',
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': fileBuffer.length
                }
            }, (res) => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    resolve(true);
                } else {
                    let body = '';
                    res.on('data', chunk => { body += chunk; });
                    res.on('end', () => {
                        reject(new Error(`SharePoint attachment upload failed (${res.statusCode}): ${body}`));
                    });
                }
            });

            req.on('error', reject);
            req.write(fileBuffer);
            req.end();
        });
    }

    /**
     * Uploads a JSON object or string as a file attachment to a SharePoint List item.
     */
    public async uploadJsonAttachmentAsync(
        spToken: string,
        listName: string,
        itemId: string,
        fileName: string,
        jsonData: object | string
    ): Promise<boolean> {
        const jsonString = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);
        const fileBuffer = Buffer.from(jsonString, 'utf-8');
        return this.uploadAttachmentAsync(spToken, listName, itemId, fileName, fileBuffer);
    }

    /**
     * Downloads an attached JSON file from a SharePoint List item.
     */
    public async getAttachmentJsonAsync<T = any>(
        graphToken: string,
        listName: string,
        itemId: string,
        fileNameMatch?: string
    ): Promise<T | null> {
        const siteId = await this.getSiteIdAsync(graphToken);
        const listId = await this.getListIdAsync(graphToken, listName);

        const attachmentsUrl = `/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}/attachments`;
        const res = await this.httpGetJsonAsync<{ value: Array<{ id: string; name: string }> }>(attachmentsUrl, graphToken);

        if (!res || !res.value || res.value.length === 0) {
            return null;
        }

        let targetAttachment = res.value.find(a => 
            fileNameMatch ? a.name.toLowerCase() === fileNameMatch.toLowerCase() : a.name.toLowerCase().endsWith('.json')
        );

        if (!targetAttachment) {
            targetAttachment = res.value.find(a => a.name.toLowerCase().endsWith('.json'));
        }

        if (!targetAttachment) {
            return null;
        }

        const rawContent = await this.httpGetRawAsync(
            `/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}/attachments/${targetAttachment.id}/$value`,
            graphToken
        );

        try {
            return JSON.parse(rawContent) as T;
        } catch {
            return null;
        }
    }

    /**
     * Uploads a JSON file to a SharePoint Document Library (Drive).
     */
    public async uploadJsonToDocumentLibraryAsync(
        graphToken: string,
        libraryName: string,
        folderPath: string,
        fileName: string,
        jsonData: object | string
    ): Promise<string> {
        if (!SharePointClient.ENABLE_SHAREPOINT_REQUESTS) {
            return Promise.reject(new Error('[SharePointClient] SharePoint network requests disabled; routing to Azure DevOps (ADO)'));
        }
        const siteId = await this.getSiteIdAsync(graphToken);
        const endpointDrives = `/v1.0/sites/${siteId}/drives`;
        const drivesRes = await this.httpGetJsonAsync<{ value: Array<{ id: string; name: string }> }>(endpointDrives, graphToken);
        const drive = drivesRes.value?.find(d => d.name.toLowerCase() === libraryName.toLowerCase() || d.name.toLowerCase().includes('document'));
        if (!drive) {
            throw new Error(`Document library '${libraryName}' not found.`);
        }

        const cleanPath = `${folderPath.replace(/^\/+|\/+$/g, '')}/${fileName}`.replace(/^\/+/, '');
        const encodedPath = encodeURIComponent(cleanPath).replace(/%2F/g, '/');
        const endpoint = `/v1.0/drives/${drive.id}/root:/${encodedPath}:/content`;

        const payloadStr = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);
        return new Promise<string>((resolve, reject) => {
            const parsed = new URL(`https://graph.microsoft.com${endpoint}`);
            const req = https.request({
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${graphToken}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payloadStr),
                    'User-Agent': 'EngineeringCommons/1.1.9'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const parsedRes = JSON.parse(data || '{}');
                            resolve(parsedRes.webUrl || '');
                        } catch {
                            resolve('');
                        }
                    } else {
                        reject(new Error(`Graph API PUT error (${res.statusCode}): ${data}`));
                    }
                });
            });
            req.on('error', reject);
            req.write(payloadStr);
            req.end();
        });
    }

    /**
     * Downloads a JSON file directly from a SharePoint Document Library (Drive) without any backend.
     */
    public async downloadJsonFromDocumentLibraryAsync<T = any>(
        graphToken: string,
        libraryName: string,
        folderPath: string,
        fileName: string
    ): Promise<T | null> {
        if (!SharePointClient.ENABLE_SHAREPOINT_REQUESTS) {
            return null;
        }
        const siteId = await this.getSiteIdAsync(graphToken);
        const endpointDrives = `/v1.0/sites/${siteId}/drives`;
        const drivesRes = await this.httpGetJsonAsync<{ value: Array<{ id: string; name: string }> }>(endpointDrives, graphToken);
        const drive = drivesRes.value?.find(d => d.name.toLowerCase() === libraryName.toLowerCase() || d.name.toLowerCase().includes('document'));
        if (!drive) {
            return null;
        }

        const cleanPath = `${folderPath.replace(/^\/+|\/+$/g, '')}/${fileName}`.replace(/^\/+/, '');
        const encodedPath = encodeURIComponent(cleanPath).replace(/%2F/g, '/');
        const endpoint = `/v1.0/drives/${drive.id}/root:/${encodedPath}:/content`;

        try {
            const rawContent = await this.httpGetRawAsync(endpoint, graphToken);
            return JSON.parse(rawContent) as T;
        } catch {
            return null;
        }
    }

    // ── HTTP Helper Methods ───────────────────────────────────────────────
    public async httpGetRawAsync(endpoint: string, token: string): Promise<string> {
        if (!SharePointClient.ENABLE_SHAREPOINT_REQUESTS) {
            return Promise.reject(new Error('[SharePointClient] SharePoint network requests disabled; routing to Azure DevOps (ADO)'));
        }
        const fullUrl = endpoint.startsWith('http') ? endpoint : `https://graph.microsoft.com${endpoint}`;
        return new Promise<string>((resolve, reject) => {
            const parsed = new URL(fullUrl);
            const req = https.request({
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'User-Agent': 'EngineeringCommons/1.1.9'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`Graph API fetch failed (${res.statusCode}): ${data}`));
                    }
                });
            });
            req.on('error', reject);
            req.end();
        });
    }

    public async httpGetJsonAsync<T>(endpoint: string, token: string): Promise<T> {
        if (!SharePointClient.ENABLE_SHAREPOINT_REQUESTS) {
            return Promise.reject(new Error('[SharePointClient] SharePoint network requests disabled; routing to Azure DevOps (ADO)'));
        }
        const fullUrl = endpoint.startsWith('http') ? endpoint : `https://graph.microsoft.com${endpoint}`;
        return new Promise<T>((resolve, reject) => {
            const parsed = new URL(fullUrl);
            const req = https.request({
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'User-Agent': 'EngineeringCommons/1.1.9'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        reject(new Error(`Graph API error (${res.statusCode}): ${data}`));
                    }
                });
            });
            req.on('error', reject);
            req.end();
        });
    }

    public async httpPostJsonAsync<T>(endpoint: string, payload: any, token: string): Promise<T> {
        if (!SharePointClient.ENABLE_SHAREPOINT_REQUESTS) {
            return Promise.reject(new Error('[SharePointClient] SharePoint network requests disabled; routing to Azure DevOps (ADO)'));
        }
        const fullUrl = endpoint.startsWith('http') ? endpoint : `https://graph.microsoft.com${endpoint}`;
        const payloadStr = JSON.stringify(payload);
        return new Promise<T>((resolve, reject) => {
            const parsed = new URL(fullUrl);
            const req = https.request({
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payloadStr),
                    'User-Agent': 'EngineeringCommons/1.1.9'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data || '{}'));
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        reject(new Error(`Graph API POST error (${res.statusCode}): ${data}`));
                    }
                });
            });
            req.on('error', reject);
            req.write(payloadStr);
            req.end();
        });
    }

    public async httpPatchJsonAsync<T>(endpoint: string, payload: any, token: string): Promise<T> {
        if (!SharePointClient.ENABLE_SHAREPOINT_REQUESTS) {
            return Promise.reject(new Error('[SharePointClient] SharePoint network requests disabled; routing to Azure DevOps (ADO)'));
        }
        const fullUrl = endpoint.startsWith('http') ? endpoint : `https://graph.microsoft.com${endpoint}`;
        const payloadStr = JSON.stringify(payload);
        return new Promise<T>((resolve, reject) => {
            const parsed = new URL(fullUrl);
            const req = https.request({
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payloadStr),
                    'User-Agent': 'EngineeringCommons/1.2.0'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data || '{}'));
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        reject(new Error(`Graph API PATCH error (${res.statusCode}): ${data}`));
                    }
                });
            });
            req.on('error', reject);
            req.write(payloadStr);
            req.end();
        });
    }

    public async httpDeleteAsync(endpoint: string, token: string): Promise<boolean> {
        if (!SharePointClient.ENABLE_SHAREPOINT_REQUESTS) {
            return false;
        }
        const fullUrl = endpoint.startsWith('http') ? endpoint : `https://graph.microsoft.com${endpoint}`;
        return new Promise<boolean>((resolve) => {
            try {
                const parsed = new URL(fullUrl);
                const req = https.request({
                    hostname: parsed.hostname,
                    path: parsed.pathname + parsed.search,
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'User-Agent': 'EngineeringCommons/1.2.0'
                    }
                }, (res) => {
                    res.on('data', () => {});
                    res.on('end', () => {
                        if (res.statusCode && (res.statusCode >= 200 && res.statusCode < 300 || res.statusCode === 404)) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    });
                });
                req.on('error', () => resolve(false));
                req.end();
            } catch {
                resolve(false);
            }
        });
    }
}
