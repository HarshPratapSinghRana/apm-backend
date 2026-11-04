import * as vscode from 'vscode';
import { ICliExecutor } from '../services/cliExecutor';
import { IAuthenticationStatusProvider } from '../services/authenticationStatusProvider';
import { CompositeArtifactUsageTracker } from '../services/usageTracker';
import { executeMicrosoftSsoLogin, executeMicrosoftDeviceCodeSsoLogin, executeMicrosoftNativeSsoLogin } from '../services/ssoService';

export async function executeSsoLoginCommand(
    authProvider: IAuthenticationStatusProvider,
    usageTracker: CompositeArtifactUsageTracker
): Promise<boolean> {
    const res = await executeMicrosoftSsoLogin(authProvider, usageTracker);
    return res.success;
}

export async function executeLoginCommand(
    cliExecutor: ICliExecutor,
    authProvider: IAuthenticationStatusProvider,
    usageTracker: CompositeArtifactUsageTracker,
    cliExecutable = 'engineering-commons'
): Promise<boolean> {
    const methodChoice = await vscode.window.showQuickPick(
        [
            {
                label: '$(organization) Sign in with MAQ Microsoft SSO (Recommended)',
                description: 'Corporate Entra ID login with direct SharePoint & Bounties access',
                method: 'device_sso'
            },
            {
                label: '$(azure) Sign in with VS Code Microsoft Account',
                description: 'Use your signed-in VS Code Microsoft profile',
                method: 'native_sso'
            },
            {
                label: '$(terminal) Sign in via CLI Terminal',
                description: 'Run "engineering-commons login --sso" directly in integrated terminal',
                method: 'cli_sso'
            },
            {
                label: '$(key) Sign in with Email & Password',
                description: 'Enter credentials manually (e.g. for development or testing)',
                method: 'credentials'
            }
        ],
        {
            placeHolder: 'Choose sign-in method for Engineering Commons'
        }
    );

    if (!methodChoice) {
        return false;
    }

    if (methodChoice.method === 'device_sso') {
        const res = await executeMicrosoftDeviceCodeSsoLogin(authProvider, usageTracker);
        return res.success;
    }

    if (methodChoice.method === 'native_sso') {
        const res = await executeMicrosoftNativeSsoLogin(authProvider, usageTracker);
        return res.success;
    }

    if (methodChoice.method === 'cli_sso') {
        const term = vscode.window.createTerminal('Engineering Commons SSO');
        term.show();
        term.sendText(`${cliExecutable} login --sso`);
        vscode.window.showInformationMessage('Complete sign-in in the opened terminal, then click Refresh in the sidebar.');
        return true;
    }

    const email = await vscode.window.showInputBox({
        prompt: 'Enter Engineering Commons email',
        placeHolder: 'e.g. consumer@test.com'
    });

    if (!email) {
        return false;
    }

    const password = await vscode.window.showInputBox({
        prompt: 'Enter Engineering Commons password',
        password: true
    });

    if (!password) {
        return false;
    }

    const result = await cliExecutor.executeAsync(cliExecutable, ['login', email, password]);

    if (result.success) {
        vscode.window.showInformationMessage(`✓ Successfully logged in to Engineering Commons as ${email}`);
        
        // Notify auth status change so all views update automatically
        authProvider.notifyAuthChanged();

        // Track LOGIN usage event (guaranteed: no password or token is ever logged)
        await usageTracker.logOperationAsync('ACTIVATED', 'engineering-commons', 'cli', '1.0.0', 'EngineeringCommons');
        return true;
    } else {
        const errorMsg = result.stderr || result.stdout || 'Login failed.';
        vscode.window.showErrorMessage(`Engineering Commons Login Failed: ${errorMsg}`);
        return false;
    }
}
