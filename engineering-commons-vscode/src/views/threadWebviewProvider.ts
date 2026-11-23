import * as vscode from 'vscode';
import { IReviewThreadService, ReviewThreadDto } from '../services/reviewThreadService';
import { IReviewCommentService, ReviewCommentDto } from '../services/reviewCommentService';
import { IAuthenticationStatusProvider } from '../services/authenticationStatusProvider';
import { IBountyService, BountyService } from '../services/bountyService';
import { AdoGovernanceService } from '../services/adoGovernanceService';

export interface LineChangeData {
    oldLineNumber?: number;
    newLineNumber?: number;
    type: number | string; // 0=Added, 1=Deleted, 2=Unchanged, or string "Added", "Deleted", "Unchanged"
    content: string;
}

export interface ArtifactFileDiffData {
    path: string;
    changeType: number | string; // 0=Added, 1=Deleted, 2=Modified, 3=Unchanged, or string
    oldContent?: string;
    newContent?: string;
    lineChanges: LineChangeData[];
    addedLinesCount: number;
    deletedLinesCount: number;
}

export interface ArtifactDiffData {
    reviewId: string;
    artifactName: string;
    currentVersion?: string;
    submittedVersion?: string;
    producerEmail?: string;
    submittedAt?: string;
    artifactChangeType?: number | string; // 0=NewArtifact, 1=Modified, 2=NoChanges, or string
    isNewArtifact?: boolean;
    filesChangedCount: number;
    addedFilesCount: number;
    modifiedFilesCount: number;
    deletedFilesCount: number;
    unchangedFilesCount: number;
    files: ArtifactFileDiffData[];
}

export class ThreadWebviewProvider {
    private static currentPanel: vscode.WebviewPanel | undefined;
    private static messageDisposable: vscode.Disposable | undefined;
    private reviewThreadService: IReviewThreadService;
    private reviewCommentService: IReviewCommentService;
    private authProvider: IAuthenticationStatusProvider;
    private bountyService: IBountyService;

    public static closeIfOpen(): void {
        if (ThreadWebviewProvider.currentPanel) {
            ThreadWebviewProvider.messageDisposable?.dispose();
            ThreadWebviewProvider.messageDisposable = undefined;
            ThreadWebviewProvider.currentPanel.dispose();
            ThreadWebviewProvider.currentPanel = undefined;
        }
    }

    constructor(
        reviewThreadService: IReviewThreadService,
        reviewCommentService: IReviewCommentService,
        authProvider: IAuthenticationStatusProvider,
        bountyService?: IBountyService
    ) {
        this.reviewThreadService = reviewThreadService;
        this.reviewCommentService = reviewCommentService;
        this.authProvider = authProvider;
        this.bountyService = bountyService || new BountyService(authProvider);
    }

    public async showThread(reviewId: string, artifactName?: string, initialFile?: string, initialLine?: number, initialTab?: 'diff' | 'general'): Promise<void> {
        const isAuth = await this.authProvider.isAuthenticated();
        if (!isAuth) {
            vscode.window.showWarningMessage('Please sign in to Engineering Commons to inspect reviews.');
            return;
        }
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : vscode.ViewColumn.One;

        if (ThreadWebviewProvider.currentPanel) {
            ThreadWebviewProvider.currentPanel.reveal(column);
        } else {
            ThreadWebviewProvider.currentPanel = vscode.window.createWebviewPanel(
                'engineeringCommonsReviewThread',
                `Review: ${artifactName || reviewId}`,
                column || vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            ThreadWebviewProvider.currentPanel.onDidDispose(() => {
                ThreadWebviewProvider.messageDisposable?.dispose();
                ThreadWebviewProvider.messageDisposable = undefined;
                ThreadWebviewProvider.currentPanel = undefined;
            });
        }

        const panel = ThreadWebviewProvider.currentPanel;

        // Clean up previous message listener before attaching fresh listener
        ThreadWebviewProvider.messageDisposable?.dispose();
        ThreadWebviewProvider.messageDisposable = panel.webview.onDidReceiveMessage(async (message) => {
            const currentRevId = message.reviewId || reviewId;
            const currentArtName = message.artifactId || artifactName;

            switch (message.command) {
                case 'sendMessage':
                    if (message.text && message.text.trim().length > 0) {
                        const sent = await this.reviewThreadService.sendMessageAsync(currentRevId, message.text.trim());
                        if (sent) {
                            await this.updateWebviewContent(panel, currentRevId, currentArtName, message.activeFile || initialFile, initialLine, 'general');
                        } else {
                            vscode.window.showErrorMessage('Failed to post message to review thread.');
                        }
                    }
                    break;

                case 'updateThreadStatus':
                    const updated = await this.reviewThreadService.updateStatusAsync(currentRevId, message.status);
                    if (updated) {
                        vscode.window.showInformationMessage(`✓ Discussion thread is now ${message.status.toUpperCase()}`);
                        await this.updateWebviewContent(panel, currentRevId, currentArtName, message.activeFile || initialFile, initialLine, 'general');
                    } else {
                        vscode.window.showErrorMessage('Failed to update discussion thread status.');
                    }
                    break;

                case 'addInlineComment':
                    if (message.filePath && message.comment && message.comment.trim().length > 0) {
                        const startLine = message.startLineNumber !== undefined && message.startLineNumber !== null && message.startLineNumber !== '' ? Number(message.startLineNumber) : undefined;
                        const endLine = message.endLineNumber !== undefined && message.endLineNumber !== null && message.endLineNumber !== '' ? Number(message.endLineNumber) : undefined;
                        const lineRange = message.lineRange || (startLine && endLine && startLine !== endLine ? `${startLine}-${endLine}` : undefined);
                        const lineNum = endLine || (message.lineNumber !== undefined && message.lineNumber !== null && message.lineNumber !== '' ? Number(message.lineNumber) : undefined);

                        const added = await this.reviewCommentService.addCommentAsync(
                            currentRevId,
                            message.filePath,
                            message.comment.trim(),
                            lineNum,
                            message.oldLineNumber !== undefined && message.oldLineNumber !== null ? Number(message.oldLineNumber) : undefined,
                            message.lineType,
                            message.oldContent,
                            message.newContent,
                            startLine,
                            endLine,
                            lineRange
                        );
                        if (added) {
                            const rangeStr = lineRange ? ` lines ${lineRange}` : (lineNum ? ` line ${lineNum}` : '');
                            vscode.window.showInformationMessage(`✓ Comment added to ${message.filePath}${rangeStr}`);
                            await this.updateWebviewContent(panel, currentRevId, currentArtName, message.filePath, lineNum, 'diff');
                        } else {
                            vscode.window.showErrorMessage('Failed to post inline comment.');
                        }
                    }
                    break;

                case 'addReply':
                    if (message.commentId && message.reply && message.reply.trim().length > 0) {
                        const replied = await this.reviewCommentService.addReplyAsync(currentRevId, message.commentId, message.reply.trim());
                        if (replied) {
                            await this.updateWebviewContent(panel, currentRevId, currentArtName, message.activeFile || initialFile, initialLine, 'diff');
                        } else {
                            vscode.window.showErrorMessage('Failed to reply to comment.');
                        }
                    }
                    break;

                case 'approveReview':
                    let approved = false;
                    try {
                        const rApproved = await this.reviewCommentService.approveReviewAsync(currentRevId, message.feedback);
                        if (rApproved) approved = true;
                    } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }

                    // Mark corresponding bounty as Completed so it is removed from active Claimed Bounties
                    try {
                        await this.bountyService.completeBountyAsync(currentRevId);
                    } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }
                    if (currentArtName) {
                        try {
                            await this.bountyService.completeBountyAsync(currentArtName);
                        } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }
                    }

                    if (approved) {
                        vscode.window.showInformationMessage(`✓ SUCCESS: Code Review APPROVED! Artifact published to marketplace and bounty marked completed.`);
                        await this.updateWebviewContent(panel, currentRevId, currentArtName, message.activeFile || initialFile, initialLine);
                        vscode.commands.executeCommand('engineeringCommons.refresh');
                    } else {
                        vscode.window.showErrorMessage('Failed to approve review.');
                    }
                    break;

                case 'rejectReview':
                    let rejected = false;
                    try {
                        const rRejected = await this.reviewCommentService.rejectReviewAsync(currentRevId, message.feedback);
                        if (rRejected) rejected = true;
                    } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }

                    try {
                        const bRes = await this.bountyService.reviewCodeAsync(currentRevId, { isApproved: false, feedback: message.feedback || 'Rejected' });
                        if (bRes) rejected = true;
                    } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }

                    if (!rejected && currentArtName) {
                        try {
                            const bRes = await this.bountyService.reviewCodeAsync(currentArtName, { isApproved: false, feedback: message.feedback || 'Rejected' });
                            if (bRes) rejected = true;
                        } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }
                    }

                    if (rejected) {
                        vscode.window.showInformationMessage(`✓ Review REJECTED. Bounty returned to Code Generation with reviewer feedback.`);
                        await this.updateWebviewContent(panel, currentRevId, currentArtName, message.activeFile || initialFile, initialLine);
                        vscode.commands.executeCommand('engineeringCommons.refresh');
                    } else {
                        vscode.window.showErrorMessage('Failed to reject review.');
                    }
                    break;

                case 'requestChanges':
                    let requested = false;
                    try {
                        const rReq = await this.reviewCommentService.requestChangesAsync(currentRevId, message.feedback);
                        if (rReq) requested = true;
                    } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }

                    try {
                        const bRes = await this.bountyService.reviewCodeAsync(currentRevId, { isApproved: false, feedback: message.feedback || 'Changes requested' });
                        if (bRes) requested = true;
                    } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }

                    if (!requested && currentArtName) {
                        try {
                            const bRes = await this.bountyService.reviewCodeAsync(currentArtName, { isApproved: false, feedback: message.feedback || 'Changes requested' });
                            if (bRes) requested = true;
                        } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }
                    }

                    if (requested) {
                        vscode.window.showInformationMessage(`✓ Review status updated to CHANGES REQUESTED. Bounty returned to Code Generation.`);
                        await this.updateWebviewContent(panel, currentRevId, currentArtName, message.activeFile || initialFile, initialLine);
                        vscode.commands.executeCommand('engineeringCommons.refresh');
                    } else {
                        vscode.window.showErrorMessage('Failed to request changes.');
                    }
                    break;

                case 'cancelReview':
                    const cancelled = await this.reviewCommentService.cancelReviewAsync(currentRevId, message.reason);
                    if (cancelled) {
                        vscode.window.showInformationMessage(`✓ Review has been CANCELLED.`);
                        await this.updateWebviewContent(panel, currentRevId, currentArtName, message.activeFile || initialFile, initialLine);
                        vscode.commands.executeCommand('engineeringCommons.refresh');
                    } else {
                        vscode.window.showErrorMessage('Failed to cancel review.');
                    }
                    break;
            }
        });

        await this.updateWebviewContent(panel, reviewId, artifactName, initialFile, initialLine, initialTab);
    }

    private async updateWebviewContent(
        panel: vscode.WebviewPanel,
        reviewId: string,
        artifactName?: string,
        initialFile?: string,
        initialLine?: number,
        initialTab?: 'diff' | 'general'
    ): Promise<void> {
        try {
            let [thread, comments, diff, currentUserEmail] = await Promise.all([
                this.reviewThreadService.getThreadAsync(reviewId).catch(() => null),
                this.reviewCommentService.getCommentsAsync(reviewId).catch(() => []),
                this.reviewCommentService.getDiffAsync(reviewId).catch(() => null),
                this.authProvider.getEmail()
            ]);

            let effectiveDiff: ArtifactDiffData | null = diff;
            let effectiveName = artifactName || thread?.artifactName || reviewId;

            // 1. If diff has no files or is null, check bounty submissions detail
            if (!effectiveDiff || !effectiveDiff.files || effectiveDiff.files.length === 0) {
                try {
                    const b = await this.bountyService.getBountyDetailAsync(reviewId);
                    if (b) {
                        effectiveName = b.title || effectiveName;
                        const lastSub = b.submissions && b.submissions.length > 0
                            ? b.submissions[b.submissions.length - 1]
                            : undefined;
                        const solutionCode = lastSub?.solutionCode || b.description || '// Solution code submitted for review';
                        const fileName = (b.relatedArtifactId || b.title.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')) + '.md';
                        const lines = solutionCode.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

                        const fileDiff: ArtifactFileDiffData = {
                            path: fileName,
                            changeType: 0,
                            newContent: solutionCode,
                            addedLinesCount: lines.length,
                            deletedLinesCount: 0,
                            lineChanges: lines.map((line, idx) => ({
                                newLineNumber: idx + 1,
                                type: 0,
                                content: line
                            }))
                        };

                        effectiveDiff = {
                            reviewId: b.id,
                            artifactName: b.title,
                            filesChangedCount: 1,
                            addedFilesCount: 1,
                            modifiedFilesCount: 0,
                            deletedFilesCount: 0,
                            unchangedFilesCount: 0,
                            files: [fileDiff]
                        };

                        if (!thread) {
                            thread = {
                                id: b.id,
                                reviewId: b.id,
                                artifactId: b.relatedArtifactId || b.id,
                                artifactName: b.title,
                                version: '1.0.0',
                                producerEmail: lastSub?.submittedByEmail || b.claimedByEmail || 'producer@company.com',
                                reviewerEmail: currentUserEmail || 'Reviewer',
                                status: b.stage === 'InReview' ? 'UnderReview' : (b.stage === 'InTesting' || b.stage === 'Completed' ? 'Approved' : 'ChangesRequested'),
                                createdAt: b.claimedAt || b.createdAt || new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                slaDeadline: b.slaDeadline,
                                slaTargetMinutes: (b.dueInDays || 2) * 1440,
                                slaRemainingMinutes: b.slaRemainingMinutes,
                                slaRemainingFormatted: b.slaRemainingFormatted,
                                isSlaWarning: b.isSlaWarning,
                                isSlaBreached: b.isSlaBreached,
                                messages: (b.reviews || []).map(rv => ({
                                    id: rv.id,
                                    threadId: b.id,
                                    authorEmail: rv.reviewerEmail,
                                    authorRole: 'Reviewer',
                                    message: rv.feedback,
                                    createdAt: rv.reviewedAt
                                }))
                            };
                        } else {
                            if (b.slaDeadline) thread.slaDeadline = b.slaDeadline;
                            if (b.slaRemainingFormatted) thread.slaRemainingFormatted = b.slaRemainingFormatted;
                            if (b.dueInDays) thread.slaTargetMinutes = (b.dueInDays || 2) * 1440;
                        }
                    }
                } catch {
                    // Ignore fallback error
                }
            }

            // 2. Direct Azure DevOps Git download if diff has 0 files
            if (!effectiveDiff || !effectiveDiff.files || effectiveDiff.files.length === 0) {
                try {
                    const cleanName = (effectiveName || reviewId)
                        .replace(/^bty-/, '')
                        .replace(/^rev-/, '')
                        .replace(/^Review\s+/i, '')
                        .replace(/\s+agent.*$/i, '')
                        .trim();
                    const adoService = new AdoGovernanceService();
                    const adoFiles = await adoService.downloadArtifactFilesFromAdoAsync(cleanName);
                    if (adoFiles && adoFiles.length > 0) {
                        const fileDiffs: ArtifactFileDiffData[] = adoFiles.map(af => {
                            const code = af.content || '';
                            const lines = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
                            return {
                                path: af.path,
                                changeType: 0,
                                newContent: code,
                                addedLinesCount: lines.length,
                                deletedLinesCount: 0,
                                lineChanges: lines.map((l, idx) => ({
                                    newLineNumber: idx + 1,
                                    type: 0,
                                    content: l
                                }))
                            };
                        });

                        effectiveDiff = {
                            reviewId: reviewId,
                            artifactName: effectiveName,
                            filesChangedCount: fileDiffs.length,
                            addedFilesCount: fileDiffs.length,
                            modifiedFilesCount: 0,
                            deletedFilesCount: 0,
                            unchangedFilesCount: 0,
                            files: fileDiffs
                        };
                    }
                } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }
            }

            // 3. Guaranteed fallback if still empty
            if (!effectiveDiff || !effectiveDiff.files || effectiveDiff.files.length === 0) {
                const defaultFileName = `.github/agents/${effectiveName.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}.agent.md`;
                const defaultCode = `# ${effectiveName}\n\nEnterprise AI Artifact for Engineering Commons.\n\n\`\`\`yaml\nname: ${effectiveName}\nversion: 1.0.0\ntype: agent\nstatus: InReview\n\`\`\`\n`;
                const lines = defaultCode.split('\n');
                effectiveDiff = {
                    reviewId: reviewId,
                    artifactName: effectiveName,
                    filesChangedCount: 1,
                    addedFilesCount: 1,
                    modifiedFilesCount: 0,
                    deletedFilesCount: 0,
                    unchangedFilesCount: 0,
                    files: [
                        {
                            path: defaultFileName,
                            changeType: 0,
                            newContent: defaultCode,
                            addedLinesCount: lines.length,
                            deletedLinesCount: 0,
                            lineChanges: lines.map((l, idx) => ({
                                newLineNumber: idx + 1,
                                type: 0,
                                content: l
                            }))
                        }
                    ]
                };
            }

            // 4. Normalize all files in diff
            effectiveDiff.files = effectiveDiff.files.map(f => {
                const pathStr = f.path || (f as any).filePath || `${effectiveName}.md`;
                let lineChanges = f.lineChanges;
                let addedCount = f.addedLinesCount;
                let deletedCount = f.deletedLinesCount;

                if (!lineChanges || lineChanges.length === 0) {
                    const code = f.newContent || (f as any).content || f.oldContent || '// Source code';
                    const lines = String(code).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
                    addedCount = addedCount ?? lines.length;
                    deletedCount = deletedCount ?? 0;
                    lineChanges = lines.map((l, idx) => ({
                        newLineNumber: idx + 1,
                        type: 0,
                        content: l
                    }));
                }

                return {
                    path: pathStr,
                    changeType: f.changeType ?? 0,
                    oldContent: f.oldContent,
                    newContent: f.newContent,
                    addedLinesCount: addedCount ?? 0,
                    deletedLinesCount: deletedCount ?? 0,
                    lineChanges: lineChanges
                };
            });

            const effectiveEmail = currentUserEmail || '';
            const role = (await this.authProvider.getRole?.()) || 'PRODUCER';
            const isAdmin = role === 'ADMIN' || effectiveEmail.toLowerCase().includes('admin');
            const isReviewer: boolean = Boolean(
                role === 'REVIEWER' ||
                role === 'CERTIFIED_REVIEWER' ||
                isAdmin ||
                role === 'PRODUCER' ||
                role === 'COLLABORATOR' ||
                role === 'DEVELOPER' ||
                effectiveEmail.toLowerCase().includes('reviewer') ||
                effectiveEmail.toLowerCase().includes('producer') ||
                (thread?.reviewerEmail && thread.reviewerEmail.toLowerCase() === effectiveEmail.toLowerCase()) ||
                (role !== 'CONSUMER' && effectiveEmail.length > 0)
            );

            const effectiveThread: ReviewThreadDto = thread || {
                id: reviewId,
                reviewId: reviewId,
                artifactId: reviewId,
                artifactName: effectiveName,
                version: '1.0.0',
                producerEmail: effectiveEmail,
                reviewerEmail: 'Reviewer',
                status: 'UnderReview',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                messages: []
            };

            panel.title = `Review: ${effectiveThread.artifactName} (v${effectiveThread.version})`;
            panel.webview.html = this.getHtmlForWebview(effectiveThread, comments, effectiveDiff, effectiveEmail, isReviewer, initialFile, initialLine, initialTab);
        } catch (err: any) {
            console.error('[ThreadWebviewProvider] Error rendering webview content:', err);
            panel.webview.html = `<!DOCTYPE html><html><body style="background:#0f0f12;color:#f4f4f6;padding:24px;font-family:sans-serif;">
                <h2>Review: ${this.escapeHtml(artifactName || reviewId)}</h2>
                <div style="background:#301818;border:1px solid #f85149;padding:16px;border-radius:6px;margin:16px 0;">
                    <h3>⚠️ Error Loading Review</h3>
                    <p>${this.escapeHtml(err?.message || String(err))}</p>
                </div>
            </body></html>`;
        }
    }

    private normalizeLineType(type: any): number {
        if (type === 0 || type === '0' || type === 'Added' || type === 'added') return 0;
        if (type === 1 || type === '1' || type === 'Deleted' || type === 'deleted') return 1;
        if (type === 2 || type === '2' || type === 'Unchanged' || type === 'unchanged') return 2;
        return 2;
    }

    private normalizeFileChangeType(type: any): number {
        if (type === 0 || type === '0' || type === 'Added' || type === 'added') return 0;
        if (type === 1 || type === '1' || type === 'Deleted' || type === 'deleted') return 1;
        if (type === 2 || type === '2' || type === 'Modified' || type === 'modified') return 2;
        if (type === 3 || type === '3' || type === 'Unchanged' || type === 'unchanged') return 3;
        return 2;
    }

    private normalizeStatus(status: any): string {
        if (status === undefined || status === null) return 'UnderReview';
        if (typeof status === 'number') {
            const map: Record<number, string> = {
                0: 'Draft',
                1: 'Submitted',
                2: 'UnderReview',
                3: 'ChangesRequested',
                4: 'Resubmitted',
                5: 'Approved',
                6: 'Rejected',
                7: 'Published',
                8: 'Cancelled'
            };
            return map[status] || String(status);
        }
        const s = String(status).trim();
        const lower = s.toLowerCase().replace(/[^a-z]/g, '');
        if (lower === 'inreview' || lower === 'open' || lower === 'pending' || lower === 'submitted' || lower === 'submited' || lower === 'underreview') {
            return 'UnderReview';
        }
        if (lower === 'approved' || lower === 'pass' || lower === 'passed') return 'Approved';
        if (lower === 'published') return 'Published';
        if (lower === 'rejected' || lower === 'fail' || lower === 'failed') return 'Rejected';
        if (lower === 'cancelled' || lower === 'canceled' || lower === 'closed') return 'Cancelled';
        if (lower === 'changesrequested') return 'ChangesRequested';
        if (lower === 'resubmitted') return 'Resubmitted';
        return s;
    }

    private getHtmlForWebview(
        thread: ReviewThreadDto,
        comments: ReviewCommentDto[],
        diff: ArtifactDiffData | null,
        currentUserEmail: string,
        isReviewer: boolean,
        initialFile?: string,
        initialLine?: number,
        initialTab?: 'diff' | 'general'
    ): string {
        const rawStatus = thread.reviewStatus || thread.status;
        const statusStr = this.normalizeStatus(rawStatus);
        const statusClass = statusStr.toLowerCase();
        const isResolved = statusStr === 'Published' || statusStr === 'Approved' || statusStr === 'Rejected' || statusStr === 'Cancelled' || Boolean((thread as any).isPublished);
        const isPendingReview = isReviewer && !isResolved;

        // 1. Group comments by filePath
        const commentsByFile = new Map<string, ReviewCommentDto[]>();
        const generalComments: ReviewCommentDto[] = [];

        for (const c of comments) {
            if (c.filePath) {
                const normPath = c.filePath.replace(/\\/g, '/');
                if (!commentsByFile.has(normPath)) {
                    commentsByFile.set(normPath, []);
                }
                commentsByFile.get(normPath)!.push(c);
            } else {
                generalComments.push(c);
            }
        }

        // 2. Build files list from diff
        const files: ArtifactFileDiffData[] = diff?.files || [];
        const activeFile = initialFile ? initialFile.replace(/\\/g, '/') : (files.length > 0 ? files[0].path.replace(/\\/g, '/') : '');
        const totalAddedLines = files.reduce((s, f) => s + (f.addedLinesCount || 0), 0);
        const totalDeletedLines = files.reduce((s, f) => s + (f.deletedLinesCount || 0), 0);

        // Rule-based artifact classification: Is this a completely new artifact or an update to an existing one?
        const isNewArtifact = Boolean(
            diff?.isNewArtifact ||
            diff?.artifactChangeType === 0 ||
            (diff?.artifactChangeType as any) === 'NewArtifact' ||
            (!diff?.currentVersion && (diff?.addedFilesCount || 0) > 0 && (diff?.modifiedFilesCount || 0) === 0 && (diff?.deletedFilesCount || 0) === 0) ||
            (!diff?.currentVersion && files.length > 0 && files.every(f => this.normalizeFileChangeType(f.changeType) === 0))
        );

        // Sidebar items
        const fileListHtml = files.map((f, idx) => {
            const normPath = f.path.replace(/\\/g, '/');
            const isActive = normPath === activeFile || (!activeFile && idx === 0);
            const normChange = this.normalizeFileChangeType(f.changeType);
            const badgeType = normChange === 0 ? '+' : (normChange === 1 ? '-' : '•');
            const badgeClass = normChange === 0 ? 'badge-added' : (normChange === 1 ? 'badge-deleted' : 'badge-modified');
            const fileCommentsCount = commentsByFile.get(normPath)?.length || 0;

            return `
            <div class="file-nav-item ${isActive ? 'active' : ''}" onclick="selectFile('${normPath}')" id="nav-${this.sanitizeId(normPath)}" data-file="${normPath.toLowerCase()}">
                <span class="file-icon">📄</span>
                <span class="file-change-badge ${badgeClass}">${badgeType}</span>
                <span class="file-nav-name" title="${normPath}">${this.renderFormattedFilePath(normPath)}</span>
                ${fileCommentsCount > 0 ? `<span class="file-comments-badge">💬 ${fileCommentsCount}</span>` : ''}
                <span class="file-diff-stats">+${f.addedLinesCount} -${f.deletedLinesCount}</span>
            </div>`;
        }).join('\n');

        // Diff sections for all files (rendered in a continuous scrollable stream)
        const filesDiffHtml = files.map((f, idx) => {
            const normPath = f.path.replace(/\\/g, '/');
            const fileComments = commentsByFile.get(normPath) || [];

            return this.renderFileDiffSection(f, normPath, fileComments, true, initialLine, idx);
        }).join('\n');

        // General feedback / messages HTML
        const generalMessagesHtml = (thread.messages || []).map(m => {
            const isMe = m.authorEmail.toLowerCase() === currentUserEmail.toLowerCase();
            const roleBadge = m.authorRole === 'Reviewer' ? 'role-reviewer' : 'role-producer';
            return `
            <div class="message-card ${isMe ? 'message-me' : ''}">
                <div class="message-header">
                    <span class="author-email">${m.authorEmail}</span>
                    <span class="role-badge ${roleBadge}">${m.authorRole}</span>
                    <span class="message-time">${new Date(m.createdAt).toLocaleTimeString()}</span>
                </div>
                <div class="message-body">${this.escapeHtml(m.message)}</div>
            </div>`;
        }).join('\n');

        // SLA Badge & Countdown HTML
        let slaBadgeHtml = '';
        let slaDeadlineHtml = '';
        if (isResolved) {
            if (statusStr === 'Published' || statusStr === 'Approved') {
                slaBadgeHtml = `<span id="thread-sla-badge" class="sla-badge sla-on-track" data-is-resolved="true" title="Review Completed & Published"><span id="thread-sla-txt">✓ Review Completed</span></span>`;
            } else if (statusStr === 'Rejected' || statusStr === 'Cancelled') {
                slaBadgeHtml = `<span id="thread-sla-badge" class="sla-badge" style="background-color: #21262d; color: #8b949e; border: 1px solid #30363d;" data-is-resolved="true" title="Review Closed"><span id="thread-sla-txt">Closed</span></span>`;
            }
            if (thread.updatedAt) {
                slaDeadlineHtml = `<span>Resolved: <strong>${new Date(thread.updatedAt).toLocaleDateString()}</strong></span>`;
            }
        } else if (thread.slaDeadline) {
            const formatted = thread.slaRemainingFormatted || (thread.slaRemainingMinutes !== undefined ? (thread.slaRemainingMinutes > 0 ? `${thread.slaRemainingMinutes}m` : '0m') : '');
            let initialClass = 'sla-on-track';
            if (thread.isSlaBreached || (thread.slaRemainingMinutes !== undefined && thread.slaRemainingMinutes < 0)) {
                initialClass = 'sla-breached';
            } else if (thread.isSlaWarning || (thread.slaRemainingMinutes !== undefined && thread.slaRemainingMinutes <= 60)) {
                initialClass = 'sla-warning';
            }
            slaBadgeHtml = `<span id="thread-sla-badge" class="sla-badge ${initialClass}" data-sla-deadline="${thread.slaDeadline}" data-submitted-at="${thread.createdAt}" data-sla-target="${thread.slaTargetMinutes || 1440}" data-is-resolved="false" title="Review SLA Status"><span id="thread-sla-txt">⏱️ ${formatted}</span></span>`;

            const deadlineDate = new Date(thread.slaDeadline).toLocaleString();
            slaDeadlineHtml = `<span>SLA Deadline: <strong id="thread-sla-deadline-text">${deadlineDate} (${thread.slaTargetMinutes ? Math.round(thread.slaTargetMinutes / 60) + 'h target' : '24h target'})</strong></span>`;
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Review: ${thread.artifactName}</title>
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src https: data:; font-src https:; connect-src https: http:;">
    <style>
        :root {
            --bg-color: #0f0f12;
            --page-bg: #0f0f12;
            --panel-bg: #16161a;
            --header-bg: #16161a;
            --card-bg: #1c1c22;
            --card-border: #2a2a33;
            --card-hover-border: #444452;
            --border: #24242c;
            --border-color: #24242c;
            --border-strong: #33333e;
            --fg-color: #f4f4f6;
            --text-primary: #f4f4f6;
            --text-secondary: #9ea0aa;
            --text-muted: #6b6d77;
            --accent: #818cf8;
            --accent-bg: rgba(129, 140, 248, 0.12);
            --btn-bg: #22222a;
            --btn-border: #33333e;
            --btn-text: #f4f4f6;
            --btn-hover: #2c2c36;
            --tab-bg: #1b1b20;
            --tab-border: #292930;
            --tab-active-bg: #26262e;
            --tab-active-border: #52525e;
            --tab-active-text: #f4f4f6;
            --gutter-bg: #131317;
            --diff-add-bg: rgba(52, 211, 153, 0.12);
            --diff-add-num-bg: rgba(52, 211, 153, 0.22);
            --diff-add-word-bg: rgba(52, 211, 153, 0.35);
            --diff-add-fg: #3fb950;
            --diff-del-bg: rgba(248, 113, 113, 0.12);
            --diff-del-num-bg: rgba(248, 113, 113, 0.22);
            --diff-del-word-bg: rgba(248, 113, 113, 0.35);
            --diff-del-fg: #f85149;
            --diff-ctx-fg: #ffffff;
            --hunk-bg: #182632;
            --hunk-fg: #7dd3fc;
            --btn-approve-bg: #142822;
            --btn-changes-bg: #302816;
            --btn-danger-bg: #301818;
            --btn-cancel-bg: #22222a;
        }

        :root[data-theme="light"], .theme-light, body.vscode-light {
            --bg-color: #f4f6fb;
            --page-bg: #f4f6fb;
            --panel-bg: #ffffff;
            --header-bg: #ffffff;
            --card-bg: #ffffff;
            --card-border: #e2e8f0;
            --card-hover-border: #cbd5e1;
            --border: #e2e8f0;
            --border-color: #e2e8f0;
            --border-strong: #cbd5e1;
            --fg-color: #1e293b;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --text-muted: #94a3b8;
            --accent: #6366f1;
            --accent-bg: rgba(99, 102, 241, 0.08);
            --btn-bg: #f8fafc;
            --btn-border: #cbd5e1;
            --btn-text: #1e293b;
            --btn-hover: #e2e8f0;
            --tab-bg: #f1f5f9;
            --tab-border: #e2e8f0;
            --tab-active-bg: #ffffff;
            --tab-active-border: #cbd5e1;
            --tab-active-text: #1e293b;
            --gutter-bg: #f1f5f9;
            --diff-add-bg: rgba(34, 197, 94, 0.12);
            --diff-add-num-bg: rgba(34, 197, 94, 0.22);
            --diff-add-word-bg: rgba(34, 197, 94, 0.35);
            --diff-add-fg: #15803d;
            --diff-del-bg: rgba(239, 68, 68, 0.12);
            --diff-del-num-bg: rgba(239, 68, 68, 0.22);
            --diff-del-word-bg: rgba(239, 68, 68, 0.35);
            --diff-del-fg: #b91c1c;
            --diff-ctx-fg: #1e293b;
            --hunk-bg: #f0f9ff;
            --hunk-fg: #0369a1;
            --btn-approve-bg: #f0fdf4;
            --btn-changes-bg: #fefce8;
            --btn-danger-bg: #fef2f2;
            --btn-cancel-bg: #f8fafc;
        }

        * { box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--page-bg);
            color: var(--text-primary);
            padding: 20px 24px;
            margin: 0;
            line-height: 1.5;
        }

        /* Header & Actions */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid var(--border);
            padding-bottom: 16px;
            margin-bottom: 18px;
            flex-wrap: wrap;
            gap: 14px;
        }
        .title-area {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .title {
            margin: 0;
            font-size: 1.35rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
            letter-spacing: -0.3px;
        }
        .status-badge {
            font-size: 10px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .status-underreview, .status-submitted, .status-resubmitted { background-color: #182632; color: #7dd3fc; border: 1px solid rgba(56, 189, 248, 0.3); }
        .status-changesrequested { background-color: #302816; color: #fde68a; border: 1px solid rgba(251, 191, 36, 0.3); }
        .status-approved, .status-published { background-color: #14281c; color: #86efac; border: 1px solid rgba(52, 211, 153, 0.3); }
        .status-rejected, .status-cancelled { background-color: #301818; color: #fca5a5; border: 1px solid rgba(248, 113, 113, 0.3); }

        .sla-badge {
            font-size: 11px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 20px;
            letter-spacing: 0.3px;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        .sla-on-track { background-color: #14281c; color: #86efac; border: 1px solid rgba(52, 211, 153, 0.4); }
        .sla-warning { background-color: #382d14; color: #fde047; border: 1px solid rgba(250, 204, 21, 0.5); animation: slaPulse 2s infinite ease-in-out; }
        .sla-breached { background-color: #381414; color: #fca5a5; border: 1px solid rgba(248, 113, 113, 0.5); font-weight: 800; }
        @keyframes slaPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.85; transform: scale(1.02); }
        }

        .meta-info {
            font-size: 12px;
            color: var(--text-secondary);
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
        }
        .meta-info strong {
            color: var(--text-primary);
        }

        .action-buttons {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
        }
        .btn {
            border: 1px solid var(--btn-border);
            padding: 6px 13px;
            border-radius: 7px;
            font-size: 11.5px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.16s ease;
            outline: none;
        }
        .btn-approve {
            background-color: var(--btn-approve-bg);
            color: #34d399;
            border-color: rgba(52, 211, 153, 0.35);
        }
        .btn-approve:hover {
            background-color: #1a382e;
            border-color: #34d399;
            color: #6ee7b7;
        }
        .btn-changes {
            background-color: var(--btn-changes-bg);
            color: #fbbf24;
            border-color: rgba(251, 191, 36, 0.35);
        }
        .btn-changes:hover {
            background-color: #40341b;
            border-color: #fbbf24;
            color: #fde68a;
        }
        .btn-reject {
            background-color: var(--btn-danger-bg);
            color: #f87171;
            border-color: rgba(248, 113, 113, 0.35);
        }
        .btn-reject:hover {
            background-color: #441f1f;
            border-color: #f87171;
            color: #fca5a5;
        }
        .btn-cancel {
            background-color: var(--btn-cancel-bg);
            color: var(--text-secondary);
            border-color: var(--border-strong);
        }
        .btn-cancel:hover {
            background-color: var(--btn-hover);
            border-color: var(--border-strong);
            color: var(--text-primary);
        }

        /* Review Feedback Banner */
        .review-feedback-banner {
            background-color: var(--card-bg);
            border: 1px solid var(--border);
            border-left: 3px solid var(--accent);
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 18px;
        }

        /* Artifact Status Banners */
        .artifact-status-banner {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 18px;
            font-size: 12.5px;
        }
        .banner-new-artifact {
            background-color: #14241c;
            border: 1px solid #1e3c2c;
            border-left: 3px solid #34d399;
        }
        .banner-updated-artifact {
            background-color: #161a24;
            border: 1px solid #243048;
            border-left: 3px solid #60a5fa;
        }
        .banner-badge-icon { font-size: 1.2rem; }
        .banner-title { font-weight: 700; margin-bottom: 2px; color: var(--text-primary); }
        .banner-subtitle { font-size: 11.5px; color: var(--text-secondary); }

        /* Tabs */
        .tabs {
            display: flex;
            gap: 6px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 14px;
            margin-bottom: 18px;
        }
        .tab-btn {
            background: var(--tab-bg);
            border: 1px solid var(--tab-border);
            color: var(--text-secondary);
            padding: 7px 14px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.16s ease;
        }
        .tab-btn:hover {
            color: var(--text-primary);
            border-color: var(--border-strong);
            background: var(--btn-hover);
        }
        .tab-btn.active {
            background: var(--tab-active-bg);
            color: var(--tab-active-text);
            border: 1.5px solid var(--tab-active-border);
            font-weight: 700;
        }
        .tab-content { display: none; }
        .tab-content.active { display: block; }

        /* Diff Toolbar */
        .diff-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 9px;
            padding: 9px 14px;
            margin-bottom: 18px;
            flex-wrap: wrap;
            gap: 10px;
        }
        .diff-summary-stats {
            font-size: 12px;
            color: var(--text-secondary);
        }
        .diff-view-mode-group {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background-color: var(--tab-bg);
            padding: 3px;
            border-radius: 8px;
            border: 1px solid var(--border-strong);
        }
        .view-mode-btn {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            padding: 5px 12px;
            border-radius: 6px;
            font-size: 11.5px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .view-mode-btn:hover {
            color: var(--text-primary);
            background-color: var(--btn-hover);
        }
        .view-mode-btn.active {
            background-color: var(--tab-active-bg);
            color: var(--tab-active-text);
            border: 1px solid var(--tab-active-border);
            font-weight: 700;
        }

        /* Layout with Sidebar & Main Diff Stream */
        .diff-layout {
            display: flex;
            gap: 16px;
            align-items: flex-start !important;
        }

        /* Left Files Sidebar */
        .files-sidebar {
            width: 240px;
            min-width: 240px;
            flex-shrink: 0;
            background-color: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 9px;
            overflow: hidden;
            position: sticky;
            top: 16px;
            height: auto !important;
            max-height: calc(100vh - 80px);
            align-self: flex-start !important;
            display: flex;
            flex-direction: column;
            transition: all 0.2s ease;
        }
        .sidebar-header {
            padding: 10px 12px;
            background-color: var(--header-bg);
            border-bottom: 1px solid var(--border);
        }
        .filter-box-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }
        .filter-input {
            width: 100%;
            background-color: #18181d;
            border: 1px solid var(--border-strong);
            border-radius: 7px;
            padding: 6px 28px 6px 30px;
            color: var(--text-primary);
            font-size: 12px;
            outline: none;
            transition: border-color 0.15s ease;
        }
        .filter-input:focus {
            border-color: var(--accent);
        }
        .filter-search-icon {
            position: absolute;
            left: 10px;
            font-size: 11px;
            color: var(--text-muted);
            pointer-events: none;
        }
        .filter-clear-btn {
            position: absolute;
            right: 8px;
            background: transparent;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            font-size: 11px;
            display: none;
        }
        .sidebar-files-list {
            overflow-y: auto;
            flex: 1;
        }
        .file-nav-item {
            padding: 8px 11px;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            border-bottom: 1px solid var(--border);
            transition: background-color 0.15s ease;
        }
        .file-nav-item:hover {
            background-color: var(--accent-bg);
        }
        .file-nav-item.active {
            background-color: var(--tab-active-bg);
            border-left: 3px solid var(--accent);
            color: var(--text-primary);
        }
        .file-nav-item.file-viewed {
            opacity: 0.55;
        }
        .file-icon {
            font-size: 12px;
            color: var(--text-muted);
        }
        .file-change-badge {
            font-size: 10px;
            font-weight: bold;
            padding: 0 5px;
            border-radius: 3px;
        }
        .badge-added { background-color: #14281c; color: #86efac; border: 1px solid rgba(52,211,153,0.3); }
        .badge-deleted { background-color: #301818; color: #fca5a5; border: 1px solid rgba(248,113,113,0.3); }
        .badge-modified { background-color: #302816; color: #fde68a; border: 1px solid rgba(251,191,36,0.3); }
        .file-nav-name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
            font-size: 11.5px;
            letter-spacing: -0.15px;
        }
        .file-comments-badge {
            font-size: 11px;
            color: var(--accent);
        }
        .file-diff-stats {
            font-size: 10.5px;
            color: var(--text-muted);
            font-family: ui-monospace, SFMono-Regular, monospace;
        }

        /* Diff Content Area (Continuous Document) */
        .diff-main {
            flex: 1;
            min-width: 0;
            width: 100%;
            height: auto !important;
            align-self: flex-start !important;
        }
        .file-diff-container {
            display: block;
            background-color: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 9px;
            margin-bottom: 24px;
            overflow: hidden;
            height: auto !important;
            transition: all 0.2s ease;
            scroll-margin-top: 20px;
        }
        .file-diff-container.file-collapsed .file-diff-body {
            display: none !important;
        }
        .file-diff-body {
            width: 100%;
            height: auto !important;
            max-height: none !important;
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: thin;
        }
        .file-diff-body::-webkit-scrollbar {
            height: 7px;
            width: 7px;
        }
        .file-diff-body::-webkit-scrollbar-track {
            background: #121216;
        }
        .file-diff-body::-webkit-scrollbar-thumb {
            background: #333340;
            border-radius: 4px;
        }
        .file-diff-body::-webkit-scrollbar-thumb:hover {
            background: #4f4f60;
        }
        .file-diff-container.is-viewed {
            border-color: var(--border);
        }
        .file-diff-container.is-viewed .diff-file-header {
            background-color: #111419;
            color: var(--text-muted);
        }

        /* Per-File GitHub Header */
        .diff-file-header {
            padding: 8px 14px;
            background-color: var(--header-bg);
            border-bottom: 1px solid var(--border);
            font-size: 12.5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            user-select: none;
            gap: 12px;
        }
        .diff-file-header:hover {
            background-color: var(--btn-hover);
        }
        .diff-file-title {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            min-width: 0;
        }
        .file-collapse-icon {
            font-size: 0.75rem;
            color: #8b949e;
            transition: transform 0.15s ease;
            width: 14px;
            display: inline-block;
        }
        .file-path-text {
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
            font-size: 12.5px;
            letter-spacing: -0.15px;
            display: inline-flex;
            align-items: center;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .file-path-dir {
            color: var(--text-secondary);
            font-weight: 400;
            opacity: 0.85;
        }
        .file-path-filename {
            color: var(--text-primary);
            font-weight: 700;
        }
        .btn-icon {
            background: transparent;
            border: none;
            color: #8b949e;
            cursor: pointer;
            padding: 2px 5px;
            border-radius: 4px;
            font-size: 0.8rem;
            display: inline-flex;
            align-items: center;
        }
        .btn-icon:hover {
            color: var(--fg-color);
            background-color: rgba(255,255,255,0.08);
        }
        .diff-file-actions {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
        }
        .diff-stat-counts {
            font-size: 0.8rem;
            display: flex;
            align-items: center;
            gap: 6px;
            font-family: ui-monospace, SFMono-Regular, monospace;
        }
        .stat-added { color: #3fb950; font-weight: 600; }
        .stat-deleted { color: #f85149; font-weight: 600; }
        .diff-stat-squares {
            display: inline-flex;
            gap: 2px;
        }
        .sq {
            width: 8px;
            height: 8px;
            border-radius: 1px;
        }
        .sq-add { background-color: #2ea043; }
        .sq-del { background-color: #da3633; }
        .sq-neu { background-color: #30363d; }

        .file-action-btn-group {
            display: inline-flex;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            overflow: hidden;
        }
        .btn-view-code {
            background-color: #21262d;
            border: none;
            border-right: 1px solid var(--border-color);
            color: #c9d1d9;
            padding: 3px 8px;
            font-size: 0.78rem;
            cursor: pointer;
        }
        .btn-view-code:last-child { border-right: none; }
        .btn-view-code:hover {
            background-color: #30363d;
            color: #fff;
        }
        .viewed-checkbox-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.82rem;
            color: #8b949e;
            cursor: pointer;
            user-select: none;
            padding: 3px 8px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background-color: #21262d;
        }
        .viewed-checkbox-label:hover {
            color: var(--fg-color);
            background-color: #30363d;
        }
        .btn-more-options {
            background: transparent;
            border: none;
            color: #8b949e;
            cursor: pointer;
            padding: 2px 6px;
            font-size: 0.9rem;
            font-weight: bold;
        }

        /* Common Table Styles */
        .diff-table {
            width: 100%;
            height: 1px !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
            font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace);
            font-size: 12px;
            line-height: 20px !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        .diff-table-unified, .diff-table-split {
            width: 100%;
            height: 1px !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        .diff-table tbody, .diff-table-unified tbody, .diff-table-split tbody {
            margin: 0 !important;
            padding: 0 !important;
            border-spacing: 0 !important;
            border: none;
            height: auto !important;
        }
        .diff-table tr, .diff-table td {
            margin: 0;
            padding: 0;
            border-spacing: 0;
            border: none;
        }

        /* Hunk Header Row (GitHub Blue Bar) */
        .hunk-header-row {
            background-color: var(--hunk-bg);
            color: var(--hunk-fg);
            user-select: none;
            font-size: 11.5px;
            line-height: 20px !important;
            height: 20px !important;
            max-height: 20px !important;
        }
        .hunk-btn-cell {
            text-align: center;
            padding: 0;
            width: 88px;
            min-width: 88px;
            max-width: 88px;
            height: 20px !important;
            line-height: 20px !important;
            border-right: 1px solid var(--border-color);
        }
        .btn-hunk-expand {
            background: transparent;
            border: none;
            color: #58a6ff;
            cursor: pointer;
            font-size: 11px;
            padding: 0 4px;
            border-radius: 3px;
            line-height: 18px;
            height: 18px;
        }
        .btn-hunk-expand:hover {
            background-color: rgba(88, 166, 255, 0.2);
        }
        .hunk-code-cell {
            padding: 0 10px;
            font-weight: 500;
            height: 20px !important;
            line-height: 20px !important;
            font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace);
            font-size: 11.5px;
            user-select: none;
            -webkit-user-select: none;
        }
        .hunk-range {
            color: #79c0ff;
            font-weight: 600;
            margin-right: 8px;
        }
        .hunk-path {
            color: var(--text-secondary);
            font-size: 11px;
            font-weight: 400;
        }

        /* Prevent buttons, gutters, and markers from being included in text selection */
        .line-num,
        .split-col-num,
        .btn-gutter-plus,
        .btn-hover-comment,
        .diff-marker,
        .split-marker,
        .hunk-header-row,
        .btn-hunk-expand,
        .diff-file-header,
        .file-collapse-icon,
        .diff-stat-counts,
        .diff-stat-squares,
        .file-action-btn-group,
        .viewed-checkbox-label,
        .btn-more-options,
        .floating-comment-pill {
            user-select: none !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
        }

        /* Highlighted multi-line selection range */
        .diff-line-row.range-selected,
        .split-diff-row.range-selected {
            background-color: rgba(56, 139, 253, 0.22) !important;
            border-left: 3px solid #58a6ff !important;
        }
        .diff-line-row.range-selected .line-num,
        .split-diff-row.range-selected .split-col-num {
            background-color: rgba(56, 139, 253, 0.45) !important;
            color: #ffffff !important;
            font-weight: 700;
        }

        /* Floating multi-line comment pill */
        .floating-comment-pill {
            position: fixed;
            background-color: #1f6feb;
            color: #ffffff;
            border: 1px solid #388bfd;
            border-radius: 20px;
            padding: 5px 14px;
            font-size: 0.8rem;
            font-weight: 600;
            box-shadow: none;
            cursor: pointer;
            z-index: 999;
            display: none;
            align-items: center;
            gap: 6px;
            transition: transform 0.1s ease;
        }
        .floating-comment-pill:hover {
            background-color: #388bfd;
            transform: scale(1.04);
        }

        /* Unified Diff Table */
        .diff-table-unified {
            width: 100%;
        }
        .diff-line-row {
            height: 20px !important;
            min-height: 20px !important;
            max-height: 20px !important;
            line-height: 20px !important;
            box-sizing: border-box;
            border: none;
            margin: 0 !important;
            padding: 0 !important;
        }
        .diff-line-row:hover .btn-gutter-plus,
        .diff-line-row:hover .btn-hover-comment,
        .split-diff-row:hover .btn-gutter-plus,
        .split-diff-row:hover .btn-hover-comment {
            opacity: 1;
            pointer-events: auto;
        }
        .line-num {
            width: 44px;
            min-width: 44px;
            max-width: 44px;
            padding: 0 6px !important;
            color: #6e7681;
            background-color: var(--gutter-bg);
            font-size: 12px;
            line-height: 20px !important;
            height: 20px !important;
            min-height: 20px !important;
            max-height: 20px !important;
            cursor: pointer;
            box-sizing: border-box;
            vertical-align: middle;
            margin: 0 !important;
            border: none;
        }
        .line-num-left {
            border-right: 1px solid rgba(255,255,255,0.04) !important;
        }
        .line-num-right {
            border-right: 1px solid rgba(255,255,255,0.06) !important;
        }
        .line-num-inner {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            width: 100%;
            height: 20px !important;
            min-height: 20px !important;
            max-height: 20px !important;
            line-height: 20px !important;
            box-sizing: border-box;
            margin: 0 !important;
            padding: 0 !important;
        }
        .num-text {
            font-size: 12px;
            line-height: 20px !important;
            color: inherit;
            user-select: none;
        }

        .btn-gutter-plus {
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 15px;
            height: 15px;
            background-color: #1f6feb;
            color: #ffffff;
            border: none;
            border-radius: 50%;
            font-size: 11px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.1s ease;
            z-index: 10;
            padding: 0;
            line-height: 15px;
            box-sizing: border-box;
        }
        .btn-gutter-plus:hover {
            transform: translateY(-50%) scale(1.15);
            box-shadow: none;
        }
        .line-code {
            padding: 0 8px !important;
            font-size: 12px;
            line-height: 20px !important;
            height: 20px !important;
            min-height: 20px !important;
            max-height: 20px !important;
            box-sizing: border-box;
            vertical-align: middle;
            margin: 0 !important;
            border: none;
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: none;
        }
        .line-code::-webkit-scrollbar {
            display: none;
        }
        .line-code-inner {
            position: relative;
            display: flex;
            align-items: center;
            width: max-content;
            min-width: 100%;
            height: 20px !important;
            min-height: 20px !important;
            max-height: 20px !important;
            line-height: 20px !important;
            box-sizing: border-box;
            margin: 0 !important;
            padding: 0 !important;
        }
        .code-text {
            flex: 1;
            min-width: max-content;
            white-space: pre;
            overflow: visible;
            font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace) !important;
            font-size: 12px !important;
            line-height: 20px !important;
            height: 20px !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        .diff-marker {
            display: inline-block;
            width: 14px;
            min-width: 14px;
            text-align: center;
            font-weight: bold;
            line-height: 20px !important;
            height: 20px !important;
            margin-right: 4px;
            user-select: none;
            flex-shrink: 0;
        }
        .line-added {
            background-color: var(--diff-add-bg);
            color: #e6edf3;
        }
        .line-added .line-num {
            background-color: var(--diff-add-num-bg);
            color: #7ee787;
        }
        .line-added .diff-marker {
            color: #3fb950;
            font-weight: bold;
        }
        .line-deleted {
            background-color: var(--diff-del-bg);
            color: #e6edf3;
        }
        .line-deleted .line-num {
            background-color: var(--diff-del-num-bg);
            color: #ffa198;
        }
        .line-deleted .diff-marker {
            color: #f85149;
            font-weight: bold;
        }
        .line-context {
            color: var(--diff-ctx-fg);
            background-color: transparent;
        }
        .line-context .line-num {
            color: #6e7681;
        }
        .line-context .diff-marker {
            color: transparent;
        }

        /* Word-Level Intra-Line Highlights */
        .diff-word-added {
            background-color: var(--diff-add-word-bg);
            color: #aff5b4;
            border-radius: 3px;
            padding: 0 2px;
            box-shadow: none;
        }
        .diff-word-deleted {
            background-color: var(--diff-del-word-bg);
            color: #ffd8d3;
            border-radius: 3px;
            padding: 0 2px;
            box-shadow: none;
        }

        /* Split (Side-by-Side) Diff Table */
        .diff-table-split {
            width: 100%;
            height: 1px !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
        }
        .split-table-head {
            background-color: #161b22;
            border-bottom: 1px solid var(--border-color);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
            height: 24px !important;
            min-height: 24px !important;
            max-height: 24px !important;
            line-height: 24px !important;
        }
        .split-head-gutter {
            width: 44px !important;
            min-width: 44px !important;
            max-width: 44px !important;
            padding: 0 !important;
            background-color: var(--gutter-bg);
            height: 24px !important;
            line-height: 24px !important;
            border: none;
        }
        .split-head-left {
            padding: 0 10px !important;
            text-align: left;
            color: #ffa198;
            border-right: 1px solid var(--border-color) !important;
            height: 24px !important;
            line-height: 24px !important;
            box-sizing: border-box;
        }
        .split-head-right {
            padding: 0 10px !important;
            text-align: left;
            color: #7ee787;
            height: 24px !important;
            line-height: 24px !important;
            box-sizing: border-box;
        }
        .split-diff-row {
            height: 20px !important;
            min-height: 20px !important;
            max-height: 20px !important;
            line-height: 20px !important;
            box-sizing: border-box;
            border: none;
            margin: 0 !important;
            padding: 0 !important;
        }
        .split-col-num {
            width: 44px;
            min-width: 44px;
            max-width: 44px;
            padding: 0 6px !important;
            color: #6e7681;
            background-color: var(--gutter-bg);
            font-size: 12px;
            line-height: 20px !important;
            height: 20px !important;
            min-height: 20px !important;
            max-height: 20px !important;
            cursor: pointer;
            box-sizing: border-box;
            vertical-align: middle;
            margin: 0 !important;
            border: none;
        }
        .split-col-num.line-added {
            background-color: var(--diff-add-num-bg);
            color: #7ee787;
        }
        .split-col-num.line-deleted {
            background-color: var(--diff-del-num-bg);
            color: #ffa198;
        }
        .split-col-code {
            padding: 0 8px !important;
            font-size: 12px;
            line-height: 20px !important;
            height: 20px !important;
            min-height: 20px !important;
            max-height: 20px !important;
            box-sizing: border-box;
            vertical-align: middle;
            margin: 0 !important;
            border: none;
            overflow-x: auto;
            overflow-y: hidden;
            white-space: pre;
            scrollbar-width: none;
        }
        .split-col-code::-webkit-scrollbar {
            display: none;
        }
        .split-col-code .line-code-inner {
            position: relative;
            display: flex;
            align-items: center;
            width: max-content;
            min-width: 100%;
            height: 20px !important;
            min-height: 20px !important;
            max-height: 20px !important;
            line-height: 20px !important;
            box-sizing: border-box;
            margin: 0 !important;
            padding: 0 !important;
        }
        .split-col-code .code-text {
            flex: 1;
            min-width: max-content;
            white-space: pre;
            overflow: visible;
            font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace) !important;
            font-size: 12px !important;
            line-height: 20px !important;
            height: 20px !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        .split-col-code.line-added {
            background-color: var(--diff-add-bg);
            color: #e6edf3;
        }
        .split-col-code.line-deleted {
            background-color: var(--diff-del-bg);
            color: #e6edf3;
        }
        .split-col-code.line-context {
            color: var(--diff-ctx-fg);
            background-color: transparent;
        }
        .split-border-right {
            border-right: 1px solid var(--border-color);
        }
        .split-empty {
            background-color: rgba(0, 0, 0, 0.2) !important;
            color: transparent !important;
        }
        :root[data-theme="light"] .split-empty,
        .theme-light .split-empty,
        body.vscode-light .split-empty {
            background-color: rgba(0, 0, 0, 0.04) !important;
        }
        .split-marker-del {
            color: #f85149;
            font-weight: bold;
            display: inline-block;
            width: 14px;
            min-width: 14px;
            text-align: center;
            line-height: 20px !important;
            height: 20px !important;
            margin-right: 4px;
            user-select: none;
            flex-shrink: 0;
        }
        .split-marker-add {
            color: #3fb950;
            font-weight: bold;
            display: inline-block;
            width: 14px;
            min-width: 14px;
            text-align: center;
            line-height: 20px !important;
            height: 20px !important;
            margin-right: 4px;
            user-select: none;
            flex-shrink: 0;
        }

        .btn-hover-comment {
            position: absolute;
            right: 4px;
            top: 50%;
            transform: translateY(-50%);
            background-color: #1f6feb;
            color: #ffffff;
            border: none;
            padding: 0 7px;
            height: 16px;
            line-height: 16px;
            border-radius: 4px;
            font-size: 10.5px;
            font-weight: 600;
            cursor: pointer;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.1s ease;
            z-index: 5;
            white-space: nowrap;
            box-sizing: border-box;
        }
        .btn-hover-comment:hover {
            background-color: #388bfd;
        }

        /* Inline Comment Box & Threads */
        .inline-comment-row {
            height: auto !important;
            max-height: none !important;
            line-height: normal !important;
        }
        .inline-comment-row td {
            height: auto !important;
            max-height: none !important;
            line-height: normal !important;
            padding: 6px 0 !important;
            border-top: 1px solid var(--border-color);
            border-bottom: 1px solid var(--border-color);
        }
        .inline-thread-container {
            background-color: #161b22;
            padding: 12px 18px;
            margin: 4px 12px 8px 12px;
            border-radius: 6px;
            border: 1px solid #1f6feb;
        }
        .comment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.82rem;
            margin-bottom: 4px;
        }
        .comment-body {
            font-size: 0.88rem;
            margin-bottom: 8px;
            white-space: pre-wrap;
        }
        .reply-item {
            border-left: 2px solid #30363d;
            padding-left: 10px;
            margin-top: 6px;
            font-size: 0.85rem;
        }
        .inline-reply-box, .inline-comment-box {
            margin-top: 8px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        textarea {
            width: 100%;
            box-sizing: border-box;
            background-color: #0d1117;
            color: var(--fg-color);
            border: 1px solid var(--border-color);
            padding: 8px;
            border-radius: 6px;
            font-family: inherit;
            font-size: 0.86rem;
            resize: vertical;
            min-height: 60px;
        }
        textarea:focus {
            outline: none;
            border-color: #1f6feb;
        }

        /* Modals */
        .modal-overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(0,0,0,0.7);
            z-index: 1000;
            justify-content: center;
            align-items: center;
            padding: 16px;
        }
        .modal-card {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 24px;
            width: 460px;
            max-width: 95vw;
            box-shadow: none;
        }
        .modal-title {
            margin-top: 0;
            font-size: 1.2rem;
            font-weight: 600;
        }
        .modal-actions {
            margin-top: 18px;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            flex-wrap: wrap;
        }

        /* ── Responsive Breakpoints ─────────────── */
        @media (max-width: 900px) {
            body {
                padding: 14px 16px;
            }
            .header {
                flex-direction: column;
                align-items: stretch;
                gap: 12px;
            }
            .action-buttons {
                width: 100%;
                justify-content: flex-start;
            }
            .diff-layout {
                flex-direction: column;
            }
            .files-sidebar {
                width: 100%;
                position: static;
                max-height: 220px;
                margin-bottom: 16px;
            }
            .diff-main {
                width: 100%;
            }
            .diff-toolbar {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            .diff-summary-stats {
                width: 100%;
            }
            .diff-view-mode-group {
                width: 100%;
                display: flex;
            }
            .view-mode-btn {
                flex: 1;
                text-align: center;
                display: flex;
                justify-content: center;
                align-items: center;
            }
        }

        @media (max-width: 600px) {
            body {
                padding: 8px 8px 30px;
                font-size: 12px;
            }
            .title {
                font-size: 1.15rem;
                flex-wrap: wrap;
            }
            .diff-file-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
            .diff-file-actions {
                width: 100%;
                justify-content: space-between;
            }
            .modal-card {
                padding: 16px;
            }
            .tabs {
                flex-wrap: wrap;
            }
            .tab-btn {
                flex: 1;
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="title-area">
            <h1 class="title">
                ${thread.artifactName} <span style="font-weight: normal; font-size: 1rem; color: #8b949e;">v${thread.version}</span>
                <span class="status-badge status-${statusClass}">${statusStr}</span>
                ${slaBadgeHtml}
            </h1>
            <div class="meta-info">
                <span>Producer: <strong>${thread.producerEmail}</strong></span>
                <span>Reviewer: <strong>${thread.reviewerEmail || 'Unassigned'}</strong></span>
                <span>Submitted: <strong>${new Date(thread.createdAt).toLocaleDateString()}</strong></span>
                ${slaDeadlineHtml}
            </div>
        </div>

        <div class="action-buttons">
            ${isPendingReview ? `
            <button id="btn-action-approve" class="btn btn-approve" onclick="openApproveModal()">✓ Approve</button>
            <button id="btn-action-changes" class="btn btn-changes" onclick="openChangesModal()">⚠️ Request Changes</button>
            <button id="btn-action-reject" class="btn btn-reject" onclick="openRejectModal()">✕ Reject</button>
            <button id="btn-action-cancel" class="btn btn-cancel" onclick="openCancelModal()">🚫 Cancel Review</button>
            ` : (isResolved ? (
                statusStr === 'Published' || statusStr === 'Approved' ? `
                <div style="display: flex; align-items: center; gap: 8px; background: rgba(52, 211, 153, 0.12); border: 1px solid rgba(52, 211, 153, 0.35); padding: 5px 12px; border-radius: 6px; font-size: 0.82rem; color: #86efac; font-weight: 600;">
                    <span>✓ Artifact Published to Marketplace (v${thread.version})</span>
                </div>` : (
                statusStr === 'Rejected' ? `
                <div style="display: flex; align-items: center; gap: 8px; background: rgba(248, 113, 113, 0.12); border: 1px solid rgba(248, 113, 113, 0.35); padding: 5px 12px; border-radius: 6px; font-size: 0.82rem; color: #fca5a5; font-weight: 600;">
                    <span>✕ Review Rejected</span>
                </div>` : `
                <div style="display: flex; align-items: center; gap: 8px; background: rgba(148, 163, 184, 0.12); border: 1px solid rgba(148, 163, 184, 0.35); padding: 5px 12px; border-radius: 6px; font-size: 0.82rem; color: #cbd5e1; font-weight: 600;">
                    <span>🚫 Review Cancelled</span>
                </div>`
                )
            ) : `
            <div style="display: flex; align-items: center; gap: 8px; background: rgba(129, 140, 248, 0.12); border: 1px solid rgba(129, 140, 248, 0.3); padding: 5px 12px; border-radius: 6px; font-size: 0.82rem; color: #c7d2fe; font-weight: 600;">
                <span>⏳ Review in Progress</span>
            </div>`
            )}
        </div>
    </div>

    <!-- Official Review Decision Feedback Banner -->
    ${thread.feedback ? `
    <div class="review-feedback-banner">
        <div style="font-weight: bold; margin-bottom: 4px; display: flex; justify-content: space-between;">
            <span>📝 Official Review Feedback:</span>
            <span class="status-badge status-${statusClass}">${statusStr}</span>
        </div>
        <div style="font-size: 0.9rem; white-space: pre-wrap;">${this.escapeHtml(thread.feedback)}</div>
    </div>` : ''}

    <!-- Tabs -->
    <div class="tabs">
        <button class="tab-btn ${initialTab === 'general' || files.length === 0 ? '' : 'active'}" id="tab-btn-diff" onclick="switchTab('diff')">📄 Files changed (${files.length})</button>
        <button class="tab-btn ${initialTab === 'general' || files.length === 0 ? 'active' : ''}" id="tab-btn-general" onclick="switchTab('general')">📋 Conversation (${(thread.messages || []).length})</button>
    </div>

    <!-- TAB 1: Multi-File Diff & Inline Comments -->
    <div class="tab-content ${initialTab === 'general' || files.length === 0 ? '' : 'active'}" id="tab-diff">
        <!-- Rule-Based Artifact Status Banner: New Artifact vs Published/Updated Artifact -->
        ${isNewArtifact ? `
        <div class="artifact-status-banner banner-new-artifact">
            <div class="banner-badge-icon">✨</div>
            <div class="banner-content">
                <div class="banner-title">NEW ARTIFACT (Initial Contribution)</div>
                <div class="banner-subtitle">No previous match found on Marketplace. This is a brand-new artifact submission (v${thread.version}). All ${files.length} file(s) are newly added.</div>
            </div>
        </div>` : (isResolved && (statusStr === 'Published' || statusStr === 'Approved') ? `
        <div class="artifact-status-banner banner-published-artifact" style="background: rgba(16,185,129,0.08); border-left: 4px solid #10b981; border: 1px solid rgba(16,185,129,0.25);">
            <div class="banner-badge-icon" style="background: rgba(16,185,129,0.18); color: #34d399;">✓</div>
            <div class="banner-content">
                <div class="banner-title" style="color: #34d399;">PUBLISHED ARTIFACT ARCHIVE (v${thread.version})</div>
                <div class="banner-subtitle">This artifact version has been approved and published to the Marketplace. Displaying read-only diff archive with ${files.length} changed file(s).</div>
            </div>
        </div>` : `
        <div class="artifact-status-banner banner-updated-artifact">
            <div class="banner-badge-icon">🔄</div>
            <div class="banner-content">
                <div class="banner-title">UPDATED ARTIFACT: Comparing Previous Version (v${diff?.currentVersion || '1.0.0'}) → Submitted Version (v${diff?.submittedVersion || thread.version})</div>
                <div class="banner-subtitle">Found existing artifact on Marketplace. Showing exact line-by-line diff with added lines (green), deleted lines (red), and unchanged context (white).</div>
            </div>
        </div>`)}

        <!-- Diff Toolbar: Stats & Split/Unified Mode Switcher -->
        <div class="diff-toolbar">
            <div class="diff-summary-stats">
                <span>Showing <strong>${files.length}</strong> changed file(s) with <span style="color:#3fb950;font-weight:bold;">+${totalAddedLines}</span> additions and <span style="color:#f85149;font-weight:bold;">-${totalDeletedLines}</span> deletions</span>
                <span id="viewed-progress-text" style="margin-left: 14px; font-size: 0.82rem; color: #8b949e;"></span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <button class="view-mode-btn" id="btn-toggle-sidebar" onclick="toggleSidebar()" title="Toggle changed files sidebar for more viewing width">
                    <span>📁</span> Files Sidebar
                </button>
                <div class="diff-view-mode-group">
                    <button class="view-mode-btn active" id="btn-mode-unified" onclick="setDiffViewMode('unified')" title="View changes in a single linear file with green added, red deleted, and white unchanged lines">
                        <span>☰</span> Unified (Single File)
                    </button>
                    <button class="view-mode-btn" id="btn-mode-split" onclick="setDiffViewMode('split')" title="Compare changes side by side (Old File on Left, New File on Right)">
                        <span>☷</span> Split (Side-by-Side)
                    </button>
                </div>
            </div>
        </div>

        <div class="diff-layout">
            <!-- Sidebar: Quick Jump Index for Changed Files -->
            <div class="files-sidebar">
                <div class="sidebar-header">
                    <div class="filter-box-wrapper">
                        <span class="filter-search-icon">🔍</span>
                        <input type="text" class="filter-input" id="file-filter-input" placeholder="Filter files..." oninput="onFilterInput(this.value)" />
                        <button class="filter-clear-btn" id="btn-clear-filter" onclick="clearFileFilter()">✕</button>
                    </div>
                </div>
                <div class="sidebar-files-list">
                    <div style="padding: 6px 12px; font-size: 0.75rem; font-weight: bold; color: #8b949e; text-transform: uppercase;">
                        Changed Files (${files.length})
                    </div>
                    ${fileListHtml || '<div style="padding: 12px; font-style: italic; color: #888;">No changed files.</div>'}
                </div>
            </div>

            <!-- Main: Continuous Scrollable File Diffs -->
            <div class="diff-main" id="diff-main-container">
                ${filesDiffHtml || '<div style="padding: 24px; text-align: center; color: #888;">No diff available for this review.</div>'}
            </div>
        </div>
    </div>

    <!-- TAB 2: General Feedback & Discussion -->
    <div class="tab-content ${initialTab === 'general' || files.length === 0 ? 'active' : ''}" id="tab-general">
        <div style="display: flex; justify-content: space-between; align-items: center; background-color: var(--card-bg); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px 16px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>Discussion Thread Status:</span>
                <span class="status-badge ${thread.status === 'Closed' ? 'status-rejected' : 'status-approved'}">${(thread.status || 'Open').toUpperCase()}</span>
                <span style="font-size: 0.85rem; color: #888;">(Chat continues freely until explicitly closed)</span>
            </div>
            <div>
                ${thread.status === 'Closed'
                    ? `<button class="btn btn-approve" onclick="updateThreadStatus('Open')">🔓 Reopen Thread</button>`
                    : `<button class="btn btn-cancel" onclick="updateThreadStatus('Closed')">🔒 Close Thread</button>`}
            </div>
        </div>

        <div id="general-messages-list" style="margin-bottom: 20px;">
            ${generalMessagesHtml || '<div style="padding: 20px; text-align: center; color: #888;">No general feedback messages yet. Start the conversation below.</div>'}
        </div>

        ${thread.status === 'Closed' ? `
        <div style="background-color: var(--card-bg); border: 1px solid var(--border-color); border-radius: 6px; padding: 16px; text-align: center; color: #8b949e;">
            <p>🔒 <strong>This discussion thread has been closed.</strong></p>
            <p style="font-size: 0.88rem;">To continue chatting or post additional feedback, click <strong>Reopen Thread</strong> above.</p>
        </div>` : `
        <div style="background-color: var(--card-bg); border: 1px solid var(--border-color); border-radius: 6px; padding: 16px;">
            <h4 style="margin-top: 0;">💬 Conversation & Feedback</h4>
            <textarea id="general-msg-input" placeholder="Write feedback, review comments, or reply to discussion..."></textarea>
            <div style="margin-top: 8px; display: flex; justify-content: flex-end;">
                <button class="btn btn-primary" style="background-color: #238636; color: #fff;" onclick="sendGeneralMessage()">Send Message</button>
            </div>
        </div>`}
    </div>

    <!-- Floating Action Pill for Text Selection commenting -->
    <button id="floating-comment-pill" class="floating-comment-pill" onclick="onFloatingPillClick()">
        💬 Comment on lines <span id="floating-pill-range"></span>
    </button>

    <!-- Modal: Approve -->
    <div id="modal-approve" class="modal-overlay">
        <div class="modal-card">
            <h3 class="modal-title">Approve Artifact Submission?</h3>
            <p>Artifact: <strong>${thread.artifactName} v${thread.version}</strong></p>
            <p style="font-size: 0.9rem; color: #8b949e;">This will approve the submitted version and publish it to the Azure DevOps marketplace repository.</p>
            <textarea id="approve-feedback" placeholder="Optional approval notes or feedback..."></textarea>
            <div class="modal-actions">
                <button class="btn btn-cancel" onclick="closeModal('modal-approve')">Cancel</button>
                <button class="btn btn-approve" onclick="submitApprove()">Confirm Approval</button>
            </div>
        </div>
    </div>

    <!-- Modal: Request Changes -->
    <div id="modal-changes" class="modal-overlay">
        <div class="modal-card">
            <h3 class="modal-title">Request Changes?</h3>
            <p style="font-size: 0.9rem; color: #8b949e;">The producer will be notified to make updates and resubmit the artifact for review.</p>
            <textarea id="changes-feedback" placeholder="Explain the required changes or fixes in detail..." required></textarea>
            <div class="modal-actions">
                <button class="btn btn-cancel" onclick="closeModal('modal-changes')">Cancel</button>
                <button class="btn btn-changes" onclick="submitRequestChanges()">Request Changes</button>
            </div>
        </div>
    </div>

    <!-- Modal: Reject -->
    <div id="modal-reject" class="modal-overlay">
        <div class="modal-card">
            <h3 class="modal-title">Reject Artifact Submission?</h3>
            <p style="font-size: 0.9rem; color: #8b949e;">The submission will be marked as REJECTED and reviewer feedback delivered to the producer.</p>
            <textarea id="reject-feedback" placeholder="Explain the reasons for rejection..." required></textarea>
            <div class="modal-actions">
                <button class="btn btn-cancel" onclick="closeModal('modal-reject')">Cancel</button>
                <button class="btn btn-reject" style="background-color: var(--btn-danger-bg); color: #fff;" onclick="submitReject()">Confirm Rejection</button>
            </div>
        </div>
    </div>

    <!-- Modal: Cancel Review -->
    <div id="modal-cancel" class="modal-overlay">
        <div class="modal-card">
            <h3 class="modal-title">Cancel this Review?</h3>
            <p style="font-size: 0.9rem; color: #8b949e;">This will cancel the current review request. Adding comments alone does not cancel reviews.</p>
            <textarea id="cancel-reason" placeholder="Optional cancellation reason..."></textarea>
            <div class="modal-actions">
                <button class="btn btn-cancel" onclick="closeModal('modal-cancel')">Keep Review</button>
                <button class="btn btn-danger" style="background-color: var(--btn-danger-bg); color: #fff;" onclick="submitCancelReview()">Cancel Review</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentActiveFile = '${activeFile}';
        let currentDiffViewMode = 'unified'; // Default to Unified (Single File) mode
        let viewedFiles = new Set();
        const totalFilesCount = ${files.length};

        // Multi-line range selection state
        let activeGutterSelection = null;
        let isDraggingGutter = false;
        let lastClickedGutter = null;
        let floatingRange = null;

        function updateViewedProgress() {
            const count = viewedFiles.size;
            const el = document.getElementById('viewed-progress-text');
            if (el) {
                el.textContent = count > 0 ? (count + ' of ' + totalFilesCount + ' files viewed') : '';
            }
        }

        function toggleViewed(fileId, isViewed) {
            const box = document.getElementById('diff-' + fileId);
            const nav = document.getElementById('nav-' + fileId);
            if (isViewed) {
                viewedFiles.add(fileId);
                if (box) {
                    box.classList.add('is-viewed');
                    box.classList.add('file-collapsed');
                    const icon = document.getElementById('collapse-icon-' + fileId);
                    if (icon) icon.textContent = '▶';
                }
                if (nav) nav.classList.add('file-viewed');
            } else {
                viewedFiles.delete(fileId);
                if (box) {
                    box.classList.remove('is-viewed');
                    box.classList.remove('file-collapsed');
                    const icon = document.getElementById('collapse-icon-' + fileId);
                    if (icon) icon.textContent = '▼';
                }
                if (nav) nav.classList.remove('file-viewed');
            }
            updateViewedProgress();
        }

        function onFilterInput(query) {
            const q = query.trim().toLowerCase();
            const clearBtn = document.getElementById('btn-clear-filter');
            if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';

            document.querySelectorAll('.file-nav-item').forEach(item => {
                const f = item.getAttribute('data-file') || '';
                item.style.display = (!q || f.includes(q)) ? 'flex' : 'none';
            });

            document.querySelectorAll('.file-diff-container').forEach(card => {
                const f = card.getAttribute('data-file') || '';
                card.style.display = (!q || f.includes(q)) ? 'block' : 'none';
            });
        }

        function clearFileFilter() {
            const input = document.getElementById('file-filter-input');
            if (input) {
                input.value = '';
                onFilterInput('');
            }
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text);
        }

        function switchTab(tabId) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById('tab-btn-' + tabId).classList.add('active');
            document.getElementById('tab-' + tabId).classList.add('active');
        }

        function toggleSidebar() {
            const sidebar = document.querySelector('.files-sidebar');
            const btn = document.getElementById('btn-toggle-sidebar');
            if (!sidebar) return;
            if (sidebar.style.display === 'none') {
                sidebar.style.display = 'flex';
                if (btn) btn.classList.remove('active');
            } else {
                sidebar.style.display = 'none';
                if (btn) btn.classList.add('active');
            }
        }

        function setDiffViewMode(mode) {
            currentDiffViewMode = mode;
            document.querySelectorAll('.view-mode-btn').forEach(b => {
                if (b.id !== 'btn-toggle-sidebar') b.classList.remove('active');
            });
            const activeBtn = document.getElementById('btn-mode-' + mode);
            if (activeBtn) activeBtn.classList.add('active');

            if (mode === 'split') {
                document.querySelectorAll('.diff-table-split').forEach(t => t.style.display = 'table');
                document.querySelectorAll('.diff-table-unified').forEach(t => t.style.display = 'none');
            } else {
                document.querySelectorAll('.diff-table-split').forEach(t => t.style.display = 'none');
                document.querySelectorAll('.diff-table-unified').forEach(t => t.style.display = 'table');
            }
        }

        function selectFile(filePath) {
            currentActiveFile = filePath;
            document.querySelectorAll('.file-nav-item').forEach(i => i.classList.remove('active'));
            const navItem = document.getElementById('nav-' + sanitizeId(filePath));
            if (navItem) navItem.classList.add('active');

            const diffBox = document.getElementById('diff-' + sanitizeId(filePath));
            if (diffBox) {
                diffBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
                diffBox.style.outline = '2px solid #1f6feb';
                setTimeout(() => { diffBox.style.outline = 'none'; }, 1200);
            }
        }

        function toggleFileCollapse(fileId) {
            const box = document.getElementById('diff-' + fileId);
            const icon = document.getElementById('collapse-icon-' + fileId);
            if (box) {
                const isCollapsed = box.classList.toggle('file-collapsed');
                if (icon) {
                    icon.textContent = isCollapsed ? '▶' : '▼';
                }
            }
        }

        function toggleInlineCommentBox(boxId) {
            const el = document.getElementById(boxId);
            if (el) {
                el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'table-row' : 'none';
            }
        }

        function toggleReplyBox(replyBoxId) {
            const el = document.getElementById(replyBoxId);
            if (el) {
                el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
            }
        }

        // Multi-line range selection via Gutter Click & Drag
        function handleGutterMouseDown(fileId, idx, event) {
            if (event.button !== 0) return;
            const row = document.getElementById('row-unified-' + fileId + '-' + idx);
            if (!row) return;

            // Handle Shift+Click range selection
            if (event.shiftKey && lastClickedGutter && lastClickedGutter.fileId === fileId) {
                event.preventDefault();
                const minIdx = Math.min(lastClickedGutter.idx, idx);
                const maxIdx = Math.max(lastClickedGutter.idx, idx);
                selectAndOpenRange(fileId, minIdx, maxIdx);
                return;
            }

            isDraggingGutter = true;
            activeGutterSelection = { fileId, startIdx: idx, endIdx: idx, filePath: row.getAttribute('data-file-path') || '' };
            lastClickedGutter = { fileId, idx };
            highlightRange(fileId, idx, idx);
        }

        window.addEventListener('mousemove', function(e) {
            if (!isDraggingGutter || !activeGutterSelection) return;
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (!el) return;
            const row = el.closest('.diff-line-row[data-file-id="' + activeGutterSelection.fileId + '"]');
            if (row) {
                const targetIdx = parseInt(row.getAttribute('data-row-idx'));
                if (!isNaN(targetIdx)) {
                    activeGutterSelection.endIdx = targetIdx;
                    const minIdx = Math.min(activeGutterSelection.startIdx, targetIdx);
                    const maxIdx = Math.max(activeGutterSelection.startIdx, targetIdx);
                    highlightRange(activeGutterSelection.fileId, minIdx, maxIdx);
                }
            }
        });

        window.addEventListener('mouseup', function(e) {
            if (isDraggingGutter && activeGutterSelection) {
                isDraggingGutter = false;
                const minIdx = Math.min(activeGutterSelection.startIdx, activeGutterSelection.endIdx);
                const maxIdx = Math.max(activeGutterSelection.startIdx, activeGutterSelection.endIdx);
                selectAndOpenRange(activeGutterSelection.fileId, minIdx, maxIdx);
            }
        });

        function highlightRange(fileId, startIdx, endIdx) {
            document.querySelectorAll('.diff-line-row[data-file-id="' + fileId + '"]').forEach(r => {
                const rIdx = parseInt(r.getAttribute('data-row-idx'));
                if (rIdx >= startIdx && rIdx <= endIdx) {
                    r.classList.add('range-selected');
                } else {
                    r.classList.remove('range-selected');
                }
            });
        }

        function clearRangeHighlight(fileId) {
            document.querySelectorAll('.diff-line-row[data-file-id="' + fileId + '"]').forEach(r => {
                r.classList.remove('range-selected');
            });
            hideFloatingPill();
        }

        function selectAndOpenRange(fileId, startIdx, endIdx) {
            highlightRange(fileId, startIdx, endIdx);

            const existingBox = document.getElementById('active-inline-comment-row');
            if (existingBox) existingBox.remove();

            const rows = [];
            for (let i = startIdx; i <= endIdx; i++) {
                const r = document.getElementById('row-unified-' + fileId + '-' + i);
                if (r) rows.push(r);
            }
            if (rows.length === 0) return;

            let firstLine = null;
            let lastLine = null;
            let filePath = rows[0].getAttribute('data-file-path') || '';
            let lineType = rows[rows.length - 1].getAttribute('data-line-type') || 'Modified';

            rows.forEach(r => {
                const ln = r.getAttribute('data-line') || r.getAttribute('data-old-line');
                if (ln && !isNaN(parseInt(ln))) {
                    const n = parseInt(ln);
                    if (firstLine === null) firstLine = n;
                    lastLine = n;
                }
            });

            const startLineNum = firstLine || 1;
            const endLineNum = lastLine || startLineNum;
            const isMulti = startLineNum !== endLineNum;
            const rangeText = isMulti ? (startLineNum + '–' + endLineNum) : ('' + startLineNum);
            const lineRangeVal = isMulti ? (startLineNum + '-' + endLineNum) : '';

            const targetRow = rows[rows.length - 1];
            const boxHtml = '<tr id="active-inline-comment-row" class="inline-comment-row">' +
                '<td colspan="3">' +
                    '<div class="inline-thread-container">' +
                        '<div style="font-weight: bold; font-size: 0.85rem; margin-bottom: 4px;">' +
                            '💬 Add review comment on ' + (isMulti ? 'lines ' : 'line ') + rangeText +
                        '</div>' +
                        '<input type="hidden" id="dynamic-file-path" value="' + (filePath || '') + '" />' +
                        '<input type="hidden" id="dynamic-line-type" value="' + (lineType || 'Modified') + '" />' +
                        '<input type="hidden" id="dynamic-start-line" value="' + startLineNum + '" />' +
                        '<input type="hidden" id="dynamic-end-line" value="' + endLineNum + '" />' +
                        '<input type="hidden" id="dynamic-range" value="' + lineRangeVal + '" />' +
                        '<div class="inline-comment-box">' +
                            '<textarea id="dynamic-comment-ta" placeholder="Write line-level feedback or question..."></textarea>' +
                            '<div style="display: flex; justify-content: flex-end; gap: 8px;">' +
                                '<button class="btn btn-cancel" onclick="closeDynamicCommentBox()">Cancel</button>' +
                                '<button class="btn btn-approve" onclick="submitDynamicRangeComment()">Post Comment</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</td>' +
            '</tr>';

            targetRow.insertAdjacentHTML('afterend', boxHtml);
            const ta = document.getElementById('dynamic-comment-ta');
            if (ta) ta.focus();
        }

        function openSplitCommentBox(fileId, idx, side, lineNum, lineType, filePath, content) {
            const existingBox = document.getElementById('active-inline-comment-row');
            if (existingBox) existingBox.remove();

            const targetRow = document.getElementById('row-split-' + fileId + '-' + idx);
            if (!targetRow) return;

            const sideTitle = side === 'left' ? (lineType === 'Deleted' ? 'deleted line ' : 'original line ') + lineNum : (lineType === 'Added' ? 'added line ' : 'line ') + lineNum;
            const boxHtml = '<tr id="active-inline-comment-row" class="inline-comment-row">' +
                '<td colspan="4">' +
                    '<div class="inline-thread-container">' +
                        '<div style="font-weight: bold; font-size: 0.85rem; margin-bottom: 4px;">' +
                            '💬 Add review comment on ' + sideTitle +
                        '</div>' +
                        '<input type="hidden" id="dynamic-file-path" value="' + (filePath || '') + '" />' +
                        '<input type="hidden" id="dynamic-line-type" value="' + (lineType || 'Modified') + '" />' +
                        '<input type="hidden" id="dynamic-line-num" value="' + (lineNum || '') + '" />' +
                        '<input type="hidden" id="dynamic-content" value="' + (content || '') + '" />' +
                        '<div class="inline-comment-box">' +
                            '<textarea id="dynamic-comment-ta" placeholder="Write line-level feedback..."></textarea>' +
                            '<div style="display: flex; justify-content: flex-end; gap: 8px;">' +
                                '<button class="btn btn-cancel" onclick="closeDynamicCommentBox()">Cancel</button>' +
                                '<button class="btn btn-approve" onclick="submitDynamicSplitComment()">Post Comment</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</td>' +
            '</tr>';

            targetRow.insertAdjacentHTML('afterend', boxHtml);
            const ta = document.getElementById('dynamic-comment-ta');
            if (ta) ta.focus();
        }

        // Text selection in code handling
        document.addEventListener('mouseup', function(e) {
            setTimeout(() => {
                const sel = window.getSelection();
                if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
                    hideFloatingPill();
                    return;
                }

                const range = sel.getRangeAt(0);
                const startRow = sel.anchorNode ? (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement).closest('.diff-line-row') : null;
                const endRow = sel.focusNode ? (sel.focusNode.nodeType === 1 ? sel.focusNode : sel.focusNode.parentElement).closest('.diff-line-row') : null;

                if (startRow && endRow && startRow.getAttribute('data-file-id') === endRow.getAttribute('data-file-id')) {
                    const fileId = startRow.getAttribute('data-file-id');
                    const idx1 = parseInt(startRow.getAttribute('data-row-idx'));
                    const idx2 = parseInt(endRow.getAttribute('data-row-idx'));
                    const minIdx = Math.min(idx1, idx2);
                    const maxIdx = Math.max(idx1, idx2);

                    const ln1 = parseInt(startRow.getAttribute('data-line') || startRow.getAttribute('data-old-line') || '1');
                    const ln2 = parseInt(endRow.getAttribute('data-line') || endRow.getAttribute('data-old-line') || '1');
                    const startLine = Math.min(ln1, ln2);
                    const endLine = Math.max(ln1, ln2);

                    floatingRange = { fileId, startIdx: minIdx, endIdx: maxIdx, startLine, endLine };

                    const pill = document.getElementById('floating-comment-pill');
                    const rangeSpan = document.getElementById('floating-pill-range');
                    if (pill && rangeSpan) {
                        rangeSpan.textContent = (startLine !== endLine ? (startLine + '–' + endLine) : ('' + startLine));
                        pill.style.display = 'flex';
                        const rect = range.getBoundingClientRect();
                        pill.style.left = Math.min(window.innerWidth - 240, Math.max(10, rect.right - 80)) + 'px';
                        pill.style.top = (rect.bottom + 8) + 'px';
                    }
                } else {
                    hideFloatingPill();
                }
            }, 50);
        });

        function hideFloatingPill() {
            const pill = document.getElementById('floating-comment-pill');
            if (pill) pill.style.display = 'none';
        }

        function onFloatingPillClick() {
            if (floatingRange) {
                selectAndOpenRange(floatingRange.fileId, floatingRange.startIdx, floatingRange.endIdx);
                hideFloatingPill();
            }
        }

        function closeDynamicCommentBox(fileId) {
            const box = document.getElementById('active-inline-comment-row');
            if (box) box.remove();
            if (fileId) {
                clearRangeHighlight(fileId);
            } else {
                document.querySelectorAll('.diff-line-row.range-selected').forEach(r => r.classList.remove('range-selected'));
                hideFloatingPill();
            }
        }

        function closeCommentBox(fileId, boxId) {
            closeDynamicCommentBox(fileId);
        }

        function submitDynamicRangeComment() {
            const ta = document.getElementById('dynamic-comment-ta');
            const comment = ta ? ta.value.trim() : '';
            if (!comment) return;

            const filePath = document.getElementById('dynamic-file-path')?.value || currentActiveFile;
            const lineType = document.getElementById('dynamic-line-type')?.value || 'Modified';
            const startLineEl = document.getElementById('dynamic-start-line');
            const endLineEl = document.getElementById('dynamic-end-line');
            const rangeEl = document.getElementById('dynamic-range');

            const startLine = startLineEl && startLineEl.value ? parseInt(startLineEl.value) : undefined;
            const endLine = endLineEl && endLineEl.value ? parseInt(endLineEl.value) : undefined;
            const lineRange = rangeEl && rangeEl.value ? rangeEl.value : undefined;

            closeDynamicCommentBox();

            vscode.postMessage({
                command: 'addInlineComment',
                filePath: filePath,
                lineNumber: endLine || startLine,
                startLineNumber: startLine,
                endLineNumber: endLine,
                lineRange: lineRange,
                lineType: lineType,
                oldContent: '',
                newContent: '',
                comment: comment,
                activeFile: currentActiveFile
            });
        }

        function submitDynamicSplitComment() {
            const ta = document.getElementById('dynamic-comment-ta');
            const comment = ta ? ta.value.trim() : '';
            if (!comment) return;

            const filePath = document.getElementById('dynamic-file-path')?.value || currentActiveFile;
            const lineType = document.getElementById('dynamic-line-type')?.value || 'Modified';
            const lineNum = document.getElementById('dynamic-line-num')?.value;
            const content = document.getElementById('dynamic-content')?.value || '';

            closeDynamicCommentBox();

            const num = lineNum && lineNum !== 'null' && lineNum !== '' ? parseInt(lineNum) : undefined;
            vscode.postMessage({
                command: 'addInlineComment',
                filePath: filePath,
                lineNumber: lineType === 'Deleted' ? undefined : num,
                oldLineNumber: lineType === 'Deleted' ? num : (lineType === 'Modified' ? num : undefined),
                lineType: lineType,
                oldContent: lineType === 'Deleted' ? content : '',
                newContent: lineType === 'Added' ? content : '',
                comment: comment,
                activeFile: currentActiveFile
            });
        }

        function submitRangeComment(filePath, fileId, idx, lineType, content, textareaId, boxId) {
            submitDynamicRangeComment();
        }

        function submitInlineComment(filePath, lineNum, oldLineNum, lineType, oldContent, newContent, textareaId, boxId) {
            submitDynamicSplitComment();
        }

        function submitReply(commentId, textareaId) {
            const ta = document.getElementById(textareaId);
            const reply = ta ? ta.value.trim() : '';
            if (!reply) return;

            vscode.postMessage({
                command: 'addReply',
                commentId: commentId,
                reply: reply,
                activeFile: currentActiveFile
            });
        }

        function sendGeneralMessage() {
            const ta = document.getElementById('general-msg-input');
            const text = ta ? ta.value.trim() : '';
            if (!text) return;
            vscode.postMessage({ command: 'sendMessage', text: text, activeFile: currentActiveFile });
        }

        function updateThreadStatus(newStatus) {
            vscode.postMessage({ command: 'updateThreadStatus', status: newStatus, activeFile: currentActiveFile });
        }

        // Modals
        function openApproveModal() { document.getElementById('modal-approve').style.display = 'flex'; }
        function openChangesModal() { document.getElementById('modal-changes').style.display = 'flex'; }
        function openRejectModal() { document.getElementById('modal-reject').style.display = 'flex'; }
        function openCancelModal() { document.getElementById('modal-cancel').style.display = 'flex'; }
        function closeModal(id) { document.getElementById(id).style.display = 'none'; }

        function submitApprove() {
            const fb = (document.getElementById('approve-feedback')?.value || '').trim();
            closeModal('modal-approve');
            vscode.postMessage({
                command: 'approveReview',
                feedback: fb || 'Code review approved.',
                reviewId: '${this.escapeJs(thread.reviewId || thread.id)}',
                artifactId: '${this.escapeJs(thread.artifactId || thread.artifactName || '')}',
                activeFile: currentActiveFile
            });
        }

        function submitRequestChanges() {
            const fb = (document.getElementById('changes-feedback')?.value || '').trim();
            closeModal('modal-changes');
            vscode.postMessage({
                command: 'requestChanges',
                feedback: fb || 'Changes requested during peer review.',
                reviewId: '${this.escapeJs(thread.reviewId || thread.id)}',
                artifactId: '${this.escapeJs(thread.artifactId || thread.artifactName || '')}',
                activeFile: currentActiveFile
            });
        }

        function submitReject() {
            const fb = (document.getElementById('reject-feedback')?.value || '').trim();
            closeModal('modal-reject');
            vscode.postMessage({
                command: 'rejectReview',
                feedback: fb || 'Code review rejected.',
                reviewId: '${this.escapeJs(thread.reviewId || thread.id)}',
                artifactId: '${this.escapeJs(thread.artifactId || thread.artifactName || '')}',
                activeFile: currentActiveFile
            });
        }

        function submitCancelReview() {
            const reason = (document.getElementById('cancel-reason')?.value || '').trim();
            closeModal('modal-cancel');
            vscode.postMessage({
                command: 'cancelReview',
                reason: reason,
                reviewId: '${this.escapeJs(thread.reviewId || thread.id)}',
                artifactId: '${this.escapeJs(thread.artifactId || thread.artifactName || '')}',
                activeFile: currentActiveFile
            });
        }

        function sanitizeId(str) {
            return str.replace(/[^a-zA-Z0-9_-]/g, '_');
        }

        // Live SLA Countdown Timer in Review Thread Header
        function updateThreadSlaLive() {
            const badge = document.getElementById('thread-sla-badge');
            const txt = document.getElementById('thread-sla-txt');
            if (!badge || !txt) return;
            if (badge.getAttribute('data-is-resolved') === 'true') return;

            const deadlineStr = badge.getAttribute('data-sla-deadline');
            const submittedStr = badge.getAttribute('data-submitted-at');
            const targetMins = parseFloat(badge.getAttribute('data-sla-target') || '1440');

            let deadlineMs = deadlineStr ? new Date(deadlineStr).getTime() : 0;
            if ((!deadlineMs || isNaN(deadlineMs)) && submittedStr) {
                deadlineMs = new Date(submittedStr).getTime() + targetMins * 60 * 1000;
            }
            if (!deadlineMs || isNaN(deadlineMs)) return;

            const now = Date.now();
            const diffMs = deadlineMs - now;
            const diffSec = Math.floor(diffMs / 1000);
            const diffMin = Math.floor(diffMs / (60 * 1000));

            if (diffMs < 0) {
                const overdueMin = Math.abs(diffMin);
                const overdueHours = Math.floor(overdueMin / 60);
                const remMin = overdueMin % 60;
                const remSec = Math.abs(diffSec % 60);
                txt.textContent = '🚨 SLA Breached (' + overdueHours + 'h ' + remMin + 'm ' + remSec + 's overdue)';
                badge.className = 'sla-badge sla-breached';
            } else {
                const hours = Math.floor(diffMin / 60);
                const mins = diffMin % 60;
                const secs = Math.abs(diffSec % 60);
                txt.textContent = '⏱️ ' + hours + 'h ' + mins + 'm ' + secs + 's remaining';
                if (diffMin <= 60) {
                    badge.className = 'sla-badge sla-warning';
                } else {
                    badge.className = 'sla-badge sla-on-track';
                }
            }
        }
        setInterval(updateThreadSlaLive, 1000);
        setTimeout(updateThreadSlaLive, 50);
    </script>
</body>
</html>`;
    }

    private computeSplitRows(lineChanges: LineChangeData[]): Array<{
        left: { lineNum?: number; content: string; type: number };
        right: { lineNum?: number; content: string; type: number };
    }> {
        const rows: Array<{
            left: { lineNum?: number; content: string; type: number };
            right: { lineNum?: number; content: string; type: number };
        }> = [];

        let i = 0;
        while (i < lineChanges.length) {
            const lc = lineChanges[i];
            const lcType = this.normalizeLineType(lc.type);
            if (lcType === 2) {
                rows.push({
                    left: { lineNum: lc.oldLineNumber, content: lc.content, type: 2 },
                    right: { lineNum: lc.newLineNumber, content: lc.content, type: 2 }
                });
                i++;
            } else {
                const deletedChunk: LineChangeData[] = [];
                const addedChunk: LineChangeData[] = [];

                while (i < lineChanges.length && this.normalizeLineType(lineChanges[i].type) !== 2) {
                    const currentType = this.normalizeLineType(lineChanges[i].type);
                    if (currentType === 1) {
                        deletedChunk.push(lineChanges[i]);
                    } else if (currentType === 0) {
                        addedChunk.push(lineChanges[i]);
                    } else {
                        break;
                    }
                    i++;
                }

                const maxLen = Math.max(deletedChunk.length, addedChunk.length);
                for (let k = 0; k < maxLen; k++) {
                    const del = deletedChunk[k];
                    const add = addedChunk[k];
                    rows.push({
                        left: del ? { lineNum: del.oldLineNumber, content: del.content, type: 1 } : { content: '', type: -1 },
                        right: add ? { lineNum: add.newLineNumber, content: add.content, type: 0 } : { content: '', type: -1 }
                    });
                }
            }
        }

        return rows;
    }

    private renderWordDiff(oldText: string, newText: string, isDeleted: boolean): string {
        const oldWords = oldText.split(/(\s+|[^\w\s])/);
        const newWords = newText.split(/(\s+|[^\w\s])/);

        let prefixLen = 0;
        while (prefixLen < oldWords.length && prefixLen < newWords.length && oldWords[prefixLen] === newWords[prefixLen]) {
            prefixLen++;
        }

        let suffixLen = 0;
        while (
            suffixLen < (oldWords.length - prefixLen) &&
            suffixLen < (newWords.length - prefixLen) &&
            oldWords[oldWords.length - 1 - suffixLen] === newWords[newWords.length - 1 - suffixLen]
        ) {
            suffixLen++;
        }

        const targetWords = isDeleted ? oldWords : newWords;
        const startDiff = prefixLen;
        const endDiff = targetWords.length - suffixLen;

        let result = '';
        for (let i = 0; i < targetWords.length; i++) {
            const wordEsc = this.escapeHtml(targetWords[i]);
            if (i >= startDiff && i < endDiff && targetWords[i].trim().length > 0) {
                result += `<span class="${isDeleted ? 'diff-word-deleted' : 'diff-word-added'}">${wordEsc}</span>`;
            } else {
                result += wordEsc;
            }
        }
        return result;
    }

    private renderFormattedFilePath(filePath: string): string {
        const norm = filePath.replace(/\\/g, '/');
        const lastSlash = norm.lastIndexOf('/');
        if (lastSlash === -1) {
            return `<span class="file-path-filename">${this.escapeHtml(norm)}</span>`;
        }
        const dir = norm.substring(0, lastSlash + 1);
        const file = norm.substring(lastSlash + 1);
        return `<span class="file-path-dir">${this.escapeHtml(dir)}</span><span class="file-path-filename">${this.escapeHtml(file)}</span>`;
    }

    private renderFileDiffSection(
        file: ArtifactFileDiffData,
        normPath: string,
        comments: ReviewCommentDto[],
        isActive: boolean,
        initialLine?: number,
        fileIndex = 0
    ): string {
        const fileId = this.sanitizeId(normPath);
        const total = (file.addedLinesCount || 0) + (file.deletedLinesCount || 0);
        let addSquares = total > 0 ? Math.round(((file.addedLinesCount || 0) / total) * 5) : 0;
        let delSquares = total > 0 ? Math.round(((file.deletedLinesCount || 0) / total) * 5) : 0;
        if (total > 0 && addSquares === 0 && file.addedLinesCount > 0) addSquares = 1;
        if (total > 0 && delSquares === 0 && file.deletedLinesCount > 0) delSquares = 1;
        while (addSquares + delSquares > 5) {
            if (addSquares > delSquares) addSquares--;
            else delSquares--;
        }
        const neuSquares = Math.max(0, 5 - addSquares - delSquares);

        const statSquares = `
        <span class="diff-stat-squares">
            ${'<span class="sq sq-add"></span>'.repeat(addSquares)}
            ${'<span class="sq sq-del"></span>'.repeat(delSquares)}
            ${'<span class="sq sq-neu"></span>'.repeat(neuSquares)}
        </span>`;

        const commentsByLine = new Map<number, ReviewCommentDto[]>();
        for (const c of comments) {
            const line = c.lineNumber || c.oldLineNumber || 0;
            if (!commentsByLine.has(line)) {
                commentsByLine.set(line, []);
            }
            commentsByLine.get(line)!.push(c);
        }

        const lineChanges = file.lineChanges || [];
        const unifiedRowsHtml = lineChanges.map((lc, idx) => {
            const normType = this.normalizeLineType(lc.type);
            const isAdded = normType === 0;
            const isDeleted = normType === 1;
            const lineClass = isAdded ? 'line-added' : (isDeleted ? 'line-deleted' : 'line-context');
            const marker = isAdded ? '+' : (isDeleted ? '-' : ' ');
            const lineTypeStr = isAdded ? 'Added' : (isDeleted ? 'Deleted' : 'Modified');
            const lineNum = lc.newLineNumber !== undefined ? lc.newLineNumber : null;
            const oldLineNum = lc.oldLineNumber !== undefined ? lc.oldLineNumber : null;

            const rowId = `row-unified-${fileId}-${idx}`;
            const commentBoxId = `cbox-unified-${fileId}-${idx}`;
            const textareaId = `ta-unified-${fileId}-${idx}`;

            const rawContent = (lc.content || '').replace(/[\r\n]+$/, '');
            let codeHtml = '';
            if (isDeleted && idx + 1 < lineChanges.length && this.normalizeLineType(lineChanges[idx + 1].type) === 0) {
                const nextRaw = (lineChanges[idx + 1].content || '').replace(/[\r\n]+$/, '');
                codeHtml = this.renderWordDiff(rawContent, nextRaw, true);
            } else if (isAdded && idx > 0 && this.normalizeLineType(lineChanges[idx - 1].type) === 1) {
                const prevRaw = (lineChanges[idx - 1].content || '').replace(/[\r\n]+$/, '');
                codeHtml = this.renderWordDiff(prevRaw, rawContent, false);
            } else {
                codeHtml = this.escapeHtml(rawContent);
            }

            const lineComments = (lineNum ? commentsByLine.get(lineNum) : undefined) ||
                                 (oldLineNum ? commentsByLine.get(oldLineNum) : undefined) || [];
            const commentsHtml = lineComments.map(c => this.renderInlineCommentThread(c, normPath)).join('\n');

            const hunkHeaderHtml = idx === 0 ? `
            <tr class="hunk-header-row">
                <td class="hunk-btn-cell" colspan="2">
                    <button class="btn-hunk-expand" title="Expand up">↑</button>
                    <button class="btn-hunk-expand" title="Expand down">↓</button>
                </td>
                <td class="hunk-code-cell" colspan="1">
                    <span class="hunk-range">@@ -${oldLineNum || 1},${file.deletedLinesCount || 1} +${lineNum || 1},${file.addedLinesCount || 1} @@</span> <span class="hunk-path">${this.escapeHtml(normPath)}</span>
                </td>
            </tr>` : '';

            return `
            ${hunkHeaderHtml}
            <tr class="diff-line-row ${lineClass}" id="${rowId}" data-file-id="${fileId}" data-file-path="${normPath}" data-row-idx="${idx}" data-line="${lineNum || ''}" data-old-line="${oldLineNum || ''}" data-line-type="${lineTypeStr}">
                <td class="line-num line-num-left" onmousedown="handleGutterMouseDown('${fileId}', ${idx}, event)">
                    <div class="line-num-inner">
                        <button class="btn-gutter-plus" onclick="event.stopPropagation(); selectAndOpenRange('${fileId}', ${idx}, ${idx})" title="Add line comment or drag for range">+</button>
                        <span class="num-text">${oldLineNum || ''}</span>
                    </div>
                </td>
                <td class="line-num line-num-right" onmousedown="handleGutterMouseDown('${fileId}', ${idx}, event)">
                    <div class="line-num-inner">
                        <span class="num-text">${lineNum || ''}</span>
                    </div>
                </td>
                <td class="line-code">
                    <div class="line-code-inner">
                        <span class="diff-marker">${marker}</span><span class="code-text">${codeHtml}</span>
                        <button class="btn-hover-comment" onclick="event.stopPropagation(); selectAndOpenRange('${fileId}', ${idx}, ${idx})">+ Comment</button>
                    </div>
                </td>
            </tr>
            ${lineComments.length > 0 ? `
            <tr class="inline-comment-row">
                <td colspan="3">
                    ${commentsHtml}
                </td>
            </tr>` : ''}`;
        }).join('\n');

        const splitRows = this.computeSplitRows(file.lineChanges || []);
        const splitRowsHtml = splitRows.map((sr, idx) => {
            const left = sr.left;
            const right = sr.right;
            const leftIsDel = left.type === 1;
            const leftClass = left.type === -1 ? 'split-empty' : (leftIsDel ? 'line-deleted' : 'line-context');
            const leftMarker = left.type === -1 ? '' : (leftIsDel ? '<span class="diff-marker split-marker-del">-</span>' : '<span class="diff-marker">&nbsp;</span>');
            const rightIsAdd = right.type === 0;
            const rightClass = right.type === -1 ? 'split-empty' : (rightIsAdd ? 'line-added' : 'line-context');
            const rightMarker = right.type === -1 ? '' : (rightIsAdd ? '<span class="diff-marker split-marker-add">+</span>' : '<span class="diff-marker">&nbsp;</span>');

            const leftTypeStr = left.type === 1 ? 'Deleted' : (left.type === 0 ? 'Added' : 'Unchanged');
            const rightTypeStr = right.type === 0 ? 'Added' : (right.type === 1 ? 'Deleted' : 'Unchanged');

            const leftComments = left.lineNum ? (commentsByLine.get(left.lineNum) || []) : [];
            const rightComments = right.lineNum ? (commentsByLine.get(right.lineNum) || []) : [];
            const allRowComments = Array.from(new Set([...leftComments, ...rightComments]));
            const rowCommentsHtml = allRowComments.map(c => this.renderInlineCommentThread(c, normPath)).join('\n');

            const leftRaw = (left.content || '').replace(/[\r\n]+$/, '');
            const rightRaw = (right.content || '').replace(/[\r\n]+$/, '');
            let leftCodeHtml = left.type !== -1 ? this.escapeHtml(leftRaw) : '';
            let rightCodeHtml = right.type !== -1 ? this.escapeHtml(rightRaw) : '';
            if (leftIsDel && rightIsAdd) {
                leftCodeHtml = this.renderWordDiff(leftRaw, rightRaw, true);
                rightCodeHtml = this.renderWordDiff(leftRaw, rightRaw, false);
            }

            return `
            <tr class="split-diff-row" id="row-split-${fileId}-${idx}">
                <td class="split-col-num ${leftClass}">
                    <div class="line-num-inner">
                        ${left.type !== -1 ? `<button class="btn-gutter-plus" onclick="openSplitCommentBox('${fileId}', ${idx}, 'left', '${left.lineNum || ''}', '${leftTypeStr}', '${this.escapeJs(normPath)}', '${this.escapeJs(left.content)}')" title="Add line comment">+</button>` : ''}
                        <span class="num-text">${left.lineNum || ''}</span>
                    </div>
                </td>
                <td class="split-col-code split-border-right ${leftClass}">
                    <div class="line-code-inner">
                        ${leftMarker}<span class="code-text">${leftCodeHtml || (left.type !== -1 ? ' ' : '')}</span>
                        ${left.type !== -1 ? `<button class="btn-hover-comment" onclick="openSplitCommentBox('${fileId}', ${idx}, 'left', '${left.lineNum || ''}', '${leftTypeStr}', '${this.escapeJs(normPath)}', '${this.escapeJs(left.content)}')">+ Comment</button>` : ''}
                    </div>
                </td>
                <td class="split-col-num ${rightClass}">
                    <div class="line-num-inner">
                        ${right.type !== -1 ? `<button class="btn-gutter-plus" onclick="openSplitCommentBox('${fileId}', ${idx}, 'right', '${right.lineNum || ''}', '${rightTypeStr}', '${this.escapeJs(normPath)}', '${this.escapeJs(right.content)}')" title="Add line comment">+</button>` : ''}
                        <span class="num-text">${right.lineNum || ''}</span>
                    </div>
                </td>
                <td class="split-col-code ${rightClass}">
                    <div class="line-code-inner">
                        ${rightMarker}<span class="code-text">${rightCodeHtml || (right.type !== -1 ? ' ' : '')}</span>
                        ${right.type !== -1 ? `<button class="btn-hover-comment" onclick="openSplitCommentBox('${fileId}', ${idx}, 'right', '${right.lineNum || ''}', '${rightTypeStr}', '${this.escapeJs(normPath)}', '${this.escapeJs(right.content)}')">+ Comment</button>` : ''}
                    </div>
                </td>
            </tr>
            ${allRowComments.length > 0 ? `
            <tr class="inline-comment-row">
                <td colspan="4">
                    ${rowCommentsHtml}
                </td>
            </tr>` : ''}`;
        }).join('\n');

        return `
        <div class="file-diff-container" id="diff-${fileId}" data-file="${normPath.toLowerCase()}">
            <div class="diff-file-header" onclick="toggleFileCollapse('${fileId}')">
                <div class="diff-file-title">
                    <span class="file-collapse-icon" id="collapse-icon-${fileId}">▼</span>
                    <span class="file-path-text" title="${normPath}">${this.renderFormattedFilePath(normPath)}</span>
                    <button class="btn-icon" title="Copy path" onclick="event.stopPropagation(); copyToClipboard('${normPath}')">📋</button>
                </div>
                <div class="diff-file-actions" onclick="event.stopPropagation();">
                    <span class="diff-stat-counts">
                        <span class="stat-added">+${file.addedLinesCount}</span>
                        <span class="stat-deleted">-${file.deletedLinesCount}</span>
                        ${statSquares}
                    </span>
                    <div class="file-action-btn-group">
                        <button class="btn-view-code">&lt;&gt;</button>
                        <button class="btn-view-code">📄</button>
                        <button class="btn-view-code">👥</button>
                    </div>
                    <label class="viewed-checkbox-label">
                        <input type="checkbox" onchange="toggleViewed('${fileId}', this.checked)" /> Viewed
                    </label>
                    <button class="btn-more-options">···</button>
                </div>
            </div>
            <div class="file-diff-body" id="file-body-${fileId}">
                <table class="diff-table diff-table-unified" style="display: table;">
                    <colgroup>
                        <col style="width: 44px;" />
                        <col style="width: 44px;" />
                        <col />
                    </colgroup>
                    <tbody>${unifiedRowsHtml}</tbody>
                </table>
                <table class="diff-table diff-table-split" style="display: none;">
                    <colgroup>
                        <col style="width: 44px;" />
                        <col style="width: calc(50% - 44px);" />
                        <col style="width: 44px;" />
                        <col style="width: calc(50% - 44px);" />
                    </colgroup>
                    <thead>
                        <tr class="split-table-head">
                            <th class="split-head-gutter"></th>
                            <th class="split-head-left">Base / Original (Old)</th>
                            <th class="split-head-gutter"></th>
                            <th class="split-head-right">Head / Modified (New)</th>
                        </tr>
                    </thead>
                    <tbody>${splitRowsHtml}</tbody>
                </table>
            </div>
        </div>`;
    }

    private renderInlineCommentThread(comment: ReviewCommentDto, normPath: string): string {
        const roleBadge = comment.authorRole === 'Reviewer' ? 'role-reviewer' : 'role-producer';
        const replyBoxId = `reply-box-${comment.id}`;
        const replyTaId = `reply-ta-${comment.id}`;

        const isRange = Boolean(comment.lineRange || (comment.startLineNumber && comment.endLineNumber && comment.startLineNumber !== comment.endLineNumber));
        const lineBadgeText = isRange
            ? `Lines ${comment.lineRange || `${comment.startLineNumber}–${comment.endLineNumber}`}`
            : (comment.lineNumber ? `Line ${comment.lineNumber}` : (comment.oldLineNumber ? `Line ${comment.oldLineNumber}` : 'File'));

        const repliesHtml = (comment.replies || []).map(r => {
            const rRoleBadge = r.authorRole === 'Reviewer' ? 'role-reviewer' : 'role-producer';
            return `
            <div class="reply-item">
                <div class="comment-header">
                    <span><strong>${r.authorEmail}</strong> <span class="role-badge ${rRoleBadge}">${r.authorRole}</span></span>
                    <span style="font-size: 0.75rem; color: #888;">${new Date(r.createdAt).toLocaleTimeString()}</span>
                </div>
                <div class="comment-body">${this.escapeHtml(r.comment)}</div>
            </div>`;
        }).join('\n');

        return `
        <div class="inline-thread-container">
            <div class="comment-header">
                <span>
                    <strong>${comment.authorEmail}</strong>
                    <span class="role-badge ${roleBadge}">${comment.authorRole}</span>
                    <span style="background-color: ${isRange ? '#1f6feb' : '#21262d'}; color: #c9d1d9; font-size: 0.72rem; padding: 1px 6px; border-radius: 10px; margin-left: 6px; font-weight: ${isRange ? 'bold' : 'normal'};">${lineBadgeText}</span>
                </span>
                <span style="font-size: 0.75rem; color: #888;">${new Date(comment.createdAt).toLocaleTimeString()}</span>
            </div>
            <div class="comment-body">${this.escapeHtml(comment.comment)}</div>
            ${repliesHtml}
            <div style="margin-top: 8px;">
                <button class="btn btn-cancel" style="font-size: 0.75rem; padding: 2px 8px;" onclick="toggleReplyBox('${replyBoxId}')">💬 Reply</button>
            </div>
            <div id="${replyBoxId}" class="inline-reply-box" style="display: none;">
                <textarea id="${replyTaId}" placeholder="Write reply..."></textarea>
                <div style="display: flex; justify-content: flex-end; gap: 6px;">
                    <button class="btn btn-cancel" onclick="toggleReplyBox('${replyBoxId}')">Cancel</button>
                    <button class="btn btn-approve" onclick="submitReply('${comment.id}', '${replyTaId}')">Send</button>
                </div>
            </div>
        </div>`;
    }

    private escapeHtml(str?: string): string {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    private escapeJs(str?: string): string {
        if (!str) return '';
        return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    }

    private sanitizeId(str: string): string {
        return str.replace(/[^a-zA-Z0-9_-]/g, '_');
    }
}
