import * as vscode from 'vscode';
import { ICliExecutor } from '../services/cliExecutor';
import { IAuthenticationStatusProvider } from '../services/authenticationStatusProvider';
import { IUsageLogger } from '../services/usageLogger';

export async function executeUpdateCommand(
    cliExecutor: ICliExecutor,
    authProvider: IAuthenticationStatusProvider,
    usageLogger: IUsageLogger,
    artifactName?: string,
    cliExecutable = 'engineering-commons'
): Promise<boolean> {
    const isAuth = await authProvider.isAuthenticated();
    if (!isAuth) {
        const action = await vscode.window.showWarningMessage(
            'You are not logged in to Engineering Commons.',
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
            prompt: 'Enter artifact name to update',
            placeHolder: 'e.g. design-reviewer'
        });
    }

    if (!target) {
        return false;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    const workspaceRoot = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : undefined;

    const progressOptions: vscode.ProgressOptions = {
        location: vscode.ProgressLocation.Notification,
        title: `Updating '${target}' via Engineering Commons...`,
        cancellable: false
    };

    return await vscode.window.withProgress(progressOptions, async () => {
        const result = await cliExecutor.executeAsync(cliExecutable, ['update', target!], workspaceRoot);

        if (result.success) {
            vscode.window.showInformationMessage(`✓ Successfully updated '${target}'.`);

            // Log UPDATE usage event
            await usageLogger.logActionAsync(
                'UPDATE',
                target,
                'agent',
                '1.0.0',
                workspaceRoot
            );
            return true;
        } else {
            const errorMsg = result.stderr || result.stdout || 'Update failed.';
            vscode.window.showErrorMessage(`Engineering Commons Update Error: ${errorMsg}`);
            return false;
        }
    });
}
