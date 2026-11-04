/**
 * SharePoint Review & Feedback Service.
 * Manages peer review feedback, inline line comments, reviewer ratings, and SLA updates
 * on the SharePoint list (Engineering-Commons-Reviews).
 */

import { SharePointClient } from './sharepointClient';

export interface SharePointReviewComment {
    id?: string;
    Title: string; // Artifact or Review ID
    Agent_x0020_Name?: string;
    Like_x0020_Dislike?: string; // 'Like' | 'Dislike'
    Comment?: string;
    Submitted_x0020_By?: string;
    Submitted_x0020_At?: string;
    FilePath?: string;
    LineNumber?: number;
    ReviewStatus?: string; // 'UnderReview' | 'Approved' | 'ChangesRequested' | 'Rejected'
}

export class SharePointReviewService {
    private client: SharePointClient;

    constructor(client?: SharePointClient) {
        this.client = client || new SharePointClient();
    }

    /**
     * Submits a peer review comment, line discussion, or rating directly to SharePoint list.
     */
    public async submitReviewFeedbackAsync(
        graphToken: string,
        data: {
            artifactName: string;
            reviewId?: string;
            comment: string;
            vote?: 'Like' | 'Dislike';
            submittedBy: string;
            filePath?: string;
            lineNumber?: number;
            reviewStatus?: string;
        }
    ): Promise<string> {
        const config = this.client.getConfig();
        const displayFields: Record<string, any> = {
            'Title': data.artifactName,
            'Agent Name': data.artifactName,
            'Like/Dislike': data.vote || 'Like',
            'Comment': data.comment,
            'Submitted By': data.submittedBy,
            'Submitted At': new Date().toISOString(),
            'FilePath': data.filePath || '',
            'LineNumber': data.lineNumber || 0,
            'ReviewStatus': data.reviewStatus || 'UnderReview'
        };

        return await this.client.createListItemAsync(graphToken, config.feedbackList, displayFields);
    }

    /**
     * Fetches all review comments and ratings for an artifact.
     */
    public async getReviewCommentsForArtifactAsync(graphToken: string, artifactName: string): Promise<SharePointReviewComment[]> {
        const config = this.client.getConfig();
        const allItems = await this.client.getAllListItemsMappedAsync(graphToken, config.feedbackList);
        
        return allItems
            .filter(item => {
                const name = item.Title || item.Agent_x0020_Name || item.AgentName || item.agentname || item.title || '';
                return name.toLowerCase() === artifactName.toLowerCase();
            })
            .map(item => ({
                id: String(item.id || item.ID || ''),
                Title: item.Title || item.title || '',
                Agent_x0020_Name: item.Agent_x0020_Name || item.AgentName || item.agentname || item.Title || '',
                Like_x0020_Dislike: item.Like_x0020_Dislike || item.Vote || item.vote || item.likedislike || item['Like/Dislike'] || 'Like',
                Comment: item.Comment || item.comment || '',
                Submitted_x0020_By: item.Submitted_x0020_By || item.SubmittedBy || item.submittedby || '',
                Submitted_x0020_At: item.Submitted_x0020_At || item.SubmittedAt || item.submittedat || item.Created || '',
                FilePath: item.FilePath || item.filepath || '',
                LineNumber: Number(item.LineNumber || item.linenumber || 0),
                ReviewStatus: item.ReviewStatus || item.reviewstatus || item.Review_x0020_Status || 'UnderReview'
            }));
    }
}
