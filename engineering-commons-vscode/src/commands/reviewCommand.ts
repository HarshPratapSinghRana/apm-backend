import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import { IAuthenticationStatusProvider } from '../services/authenticationStatusProvider';
import { ReviewContentProvider } from '../services/reviewContentProvider';

export interface PendingReview {
    id: string;
    artifactId: string;
    producerEmail: string;
    submittedAt: string;
    feedback?: string;
}

export interface LineChange {
    oldLineNumber?: number;
    newLineNumber?: number;
    type: number; // 0=Added, 1=Deleted, 2=Unchanged
    content: string;
}

export interface ArtifactFileDiff {
    path: string;
    changeType: number; // 0=Added, 1=Deleted, 2=Modified, 3=Unchanged
    oldContent?: string;
    newContent?: string;
    lineChanges: LineChange[];
    addedLinesCount: number;
    deletedLinesCount: number;
}

export interface ArtifactDiff {
    reviewId: string;
    artifactName: string;
    currentVersion?: string;
    submittedVersion?: string;
    producerEmail?: string;
    submittedAt?: string;
    filesChangedCount: number;
    addedFilesCount: number;
    modifiedFilesCount: number;
    deletedFilesCount: number;
    unchangedFilesCount: number;
    files: ArtifactFileDiff[];
}

function fetchJson<T>(urlStr: string, token?: string, method = 'GET', body?: any): Promise<{ status: number; data: T | null }> {
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

export async function executeReviewCommand(
    authProvider: IAuthenticationStatusProvider,
    contentProvider: ReviewContentProvider,
    backendUrl = 'https://cip-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io'
): Promise<void> {
    const isAuth = await authProvider.isAuthenticated();
    if (!isAuth) {
        vscode.window.showErrorMessage('You must be logged in as a Reviewer to inspect submissions.');
        return;
    }

    const role = (await authProvider.getRole?.()) || 'PRODUCER';
    if (role === 'CONSUMER') {
        vscode.window.showWarningMessage('You do not have permission for this. (Reviewing artifacts requires a Reviewer account).');
        return;
    }

    const token = await authProvider.getToken();
    const pendingRes = await fetchJson<PendingReview[]>(`${backendUrl}/api/reviews/pending`, token);

    if (pendingRes.status === 401 || pendingRes.status === 403) {
        vscode.window.showErrorMessage('Access Denied: You must be logged in with a REVIEWER account.');
        return;
    }

    const pendingList = pendingRes.data || [];
    if (pendingList.length === 0) {
        vscode.window.showInformationMessage('No pending submissions waiting for review.');
        return;
    }

    // 1. Pick a submission to review
    const submissionPicks = pendingList.map(p => ({
        label: `$(git-pull-request) ${p.artifactId}`,
        description: `by ${p.producerEmail}`,
        detail: `Submitted: ${new Date(p.submittedAt).toLocaleString()} | ID: ${p.id}`,
        review: p
    }));

    const pickedSubmission = await vscode.window.showQuickPick(submissionPicks, {
        placeHolder: 'Select a pending artifact submission to review'
    });

    if (!pickedSubmission) return;

    // 2. Fetch version diff from backend
    const diffRes = await fetchJson<ArtifactDiff>(`${backendUrl}/api/reviews/${pickedSubmission.review.id}/diff`, token);
    const diff = diffRes.data;

    if (!diff) {
        vscode.window.showErrorMessage(`Could not retrieve diff for submission ${pickedSubmission.review.id}.`);
        return;
    }

    interface ReviewQuickPickItem extends vscode.QuickPickItem {
        isAction: boolean;
        action?: 'approve' | 'reject' | 'thread';
        file?: ArtifactFileDiff;
    }

function normalizeFileChangeType(type: any): number {
    if (type === 0 || type === '0' || type === 'Added' || type === 'added') return 0;
    if (type === 1 || type === '1' || type === 'Deleted' || type === 'deleted') return 1;
    if (type === 2 || type === '2' || type === 'Modified' || type === 'modified') return 2;
    if (type === 3 || type === '3' || type === 'Unchanged' || type === 'unchanged') return 3;
    return 2;
}

    // 3. Interactive Review Loop
    let reviewing = true;
    while (reviewing) {
        const changeTypeNames = ['Added', 'Deleted', 'Modified', 'Unchanged'];
        const changeIcons = ['$(diff-added)', '$(diff-removed)', '$(diff-modified)', '$(check)'];

        const fileItems: ReviewQuickPickItem[] = diff.files.map(f => {
            const ct = normalizeFileChangeType(f.changeType);
            return {
                label: `${changeIcons[ct] || '$(file)'} ${f.path}`,
                description: `[${changeTypeNames[ct] || 'Changed'}] +${f.addedLinesCount} -${f.deletedLinesCount}`,
                file: f,
                isAction: false
            };
        });

        const actionItems: ReviewQuickPickItem[] = [
            {
                label: '$(comment-discussion) Open Conversation Thread',
                description: 'Open multi-message discussion thread with the producer',
                isAction: true,
                action: 'thread'
            },
            {
                label: '$(check) Approve Submission',
                description: 'Publish artifact to GitHub Marketplace with optional feedback',
                isAction: true,
                action: 'approve'
            },
            {
                label: '$(close) Reject Submission',
                description: 'Reject and send feedback to the producer',
                isAction: true,
                action: 'reject'
            }
        ];

        const pick = await vscode.window.showQuickPick<ReviewQuickPickItem>([...actionItems, ...fileItems], {
            placeHolder: `Reviewing ${diff.artifactName} (${diff.currentVersion ?? 'New'} ➔ ${diff.submittedVersion}) — ${diff.filesChangedCount} file(s) changed`
        });

        if (!pick) {
            reviewing = false;
            break;
        }

        if (pick.isAction) {
            if (pick.action === 'thread') {
                await vscode.commands.executeCommand('engineeringCommons.openThread', diff.reviewId, diff.artifactName);
            } else if (pick.action === 'approve') {
                const feedback = await vscode.window.showInputBox({
                    prompt: 'Optional Approval Notes / Reviewer Feedback',
                    placeHolder: 'e.g. Looks good! Approved for marketplace.'
                });

                const approveRes = await fetchJson<{ id: string }>(
                    `${backendUrl}/api/reviews/${diff.reviewId}/approve`,
                    token,
                    'POST',
                    { feedback: feedback || undefined }
                );

                if (approveRes.status === 200) {
                    vscode.window.showInformationMessage(`✓ Artifact '${diff.artifactName}' APPROVED and published to Marketplace!`);
                    reviewing = false;
                } else {
                    vscode.window.showErrorMessage(`Failed to approve submission (HTTP ${approveRes.status}).`);
                }
            } else if (pick.action === 'reject') {
                const feedback = await vscode.window.showInputBox({
                    prompt: 'Rejection Reason / Feedback for Producer (Required)',
                    placeHolder: 'e.g. Please update error handling and add docs.'
                });

                if (!feedback || feedback.trim().length === 0) {
                    vscode.window.showWarningMessage('Rejection cancelled: Feedback is required when rejecting a submission.');
                    continue;
                }

                const rejectRes = await fetchJson<{ id: string }>(
                    `${backendUrl}/api/reviews/${diff.reviewId}/reject`,
                    token,
                    'POST',
                    { feedback }
                );

                if (rejectRes.status === 200) {
                    vscode.window.showInformationMessage(`✓ Artifact '${diff.artifactName}' REJECTED. Feedback sent to ${diff.producerEmail}.`);
                    reviewing = false;
                } else {
                    vscode.window.showErrorMessage(`Failed to reject submission (HTTP ${rejectRes.status}).`);
                }
            }
        } else if (pick.file) {
            // Open native VS Code diff editor!
            const safePath = pick.file.path.replace(/\\/g, '/');
            const leftUri = vscode.Uri.parse(`cip-review://current/${safePath}?rev=${diff.reviewId}`);
            const rightUri = vscode.Uri.parse(`cip-review://submitted/${safePath}?rev=${diff.reviewId}`);

            contentProvider.setDocumentContent(leftUri, pick.file.oldContent || '(File does not exist in current approved version)');
            contentProvider.setDocumentContent(rightUri, pick.file.newContent || '(File deleted in submitted version)');

            const title = `${safePath} (${diff.currentVersion ?? 'Empty'} ↔ ${diff.submittedVersion ?? '1.0.0'})`;
            await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
        }
    }
}
