import * as vscode from 'vscode';
import { ICliExecutor } from '../services/cliExecutor';
import { IAuthenticationStatusProvider } from '../services/authenticationStatusProvider';

export async function executeVisibilityCommand(
    cliExecutor: ICliExecutor,
    authProvider: IAuthenticationStatusProvider,
    artifactName?: string,
    visibility?: 'public' | 'private',
    options?: {
        consumers?: string;
        contributors?: string;
        reviewers?: string;
    },
    cliExecutable = 'engineering-commons'
): Promise<boolean> {
    const isAuth = await authProvider.isAuthenticated();
    if (!isAuth) {
        const action = await vscode.window.showWarningMessage(
            'You must be logged in to manage artifact visibility.',
            'Login'
        );
        if (action === 'Login') {
            await vscode.commands.executeCommand('engineeringCommons.login');
        }
        return false;
    }

    let target = artifactName;
    if (!target) {
        target = await vscode.window.showInputBox({
            prompt: 'Enter the artifact name to change visibility for',
            placeHolder: 'e.g. my-custom-agent'
        });
    }

    if (!target) {
        return false;
    }

    let targetVis = visibility;
    if (!targetVis) {
        const picked = await vscode.window.showQuickPick(
            [
                { label: '🌐 Public', description: 'Make artifact accessible to everyone in the company', value: 'public' as const },
                { label: '🔒 Private', description: 'Restrict access to specific allowed users / consumers', value: 'private' as const }
            ],
            { placeHolder: `Select visibility for '${target}'` }
        );
        if (!picked) return false;
        targetVis = picked.value;
    }

    const cliArgs: string[] = ['visibility', target, targetVis];

    if (targetVis === 'private' && !options) {
        const consumers = await vscode.window.showInputBox({
            prompt: 'Allowed Consumers / Installers (comma-separated emails, optional)',
            placeHolder: 'e.g. tester1@company.com, user2@company.com (Leave blank for producer only)'
        });
        if (consumers && consumers.trim()) {
            cliArgs.push('--consumers', consumers.trim());
        }

        const contributors = await vscode.window.showInputBox({
            prompt: 'Allowed Contributors (comma-separated emails, optional)',
            placeHolder: 'e.g. dev1@company.com (Leave blank for producer only)'
        });
        if (contributors && contributors.trim()) {
            cliArgs.push('--contributors', contributors.trim());
        }

        const reviewers = await vscode.window.showInputBox({
            prompt: 'Designated Reviewers (comma-separated emails, optional)',
            placeHolder: 'e.g. lead@company.com (Leave blank for standard reviewers)'
        });
        if (reviewers && reviewers.trim()) {
            cliArgs.push('--reviewers', reviewers.trim());
        }
    } else if (options) {
        if (options.consumers) cliArgs.push('--consumers', options.consumers);
        if (options.contributors) cliArgs.push('--contributors', options.contributors);
        if (options.reviewers) cliArgs.push('--reviewers', options.reviewers);
    }

    const progressOptions: vscode.ProgressOptions = {
        location: vscode.ProgressLocation.Notification,
        title: `Updating visibility for '${target}' to ${targetVis}...`,
        cancellable: false
    };

    return await vscode.window.withProgress(progressOptions, async () => {
        const result = await cliExecutor.executeAsync(cliExecutable, cliArgs);
        if (result.success) {
            vscode.window.showInformationMessage(`✓ Successfully updated visibility of '${target}' to ${targetVis.toUpperCase()}.`);
            await vscode.commands.executeCommand('engineeringCommons.refreshTree');
            return true;
        } else {
            vscode.window.showErrorMessage(`Failed to update visibility: ${result.stderr || result.stdout || 'Unknown error'}`);
            return false;
        }
    });
}
