import * as vscode from 'vscode';
import { ICliExecutor } from '../services/cliExecutor';
import { IAuthenticationStatusProvider } from '../services/authenticationStatusProvider';
import { IUsageLogger } from '../services/usageLogger';

export interface DiscoveredArtifactItem {
    name: string;
    type: string;
    version: string;
    isPrivate?: boolean;
    isCertified?: boolean;
    isFeatured?: boolean;
    source?: string;
    domain?: string;
    title?: string;
    description?: string;
    architecture?: string;
    impact?: string;
    keyFeatures?: string[];
    impactMetrics?: any[];
    githubRepo?: string;
    videoUrl?: string;
    usability?: string;
    usabilityLabel?: string;
    usabilityBadge?: string;
    isCopilotReady?: boolean;
    category?: string;
    subcategory?: string;
    copilotPrompt?: string;
    output?: string;
    files?: any[];
}

export function parseListOutput(stdout: string): DiscoveredArtifactItem[] {
    const lines = stdout.split('\n');
    const items: DiscoveredArtifactItem[] = [];
    let parsing = false;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.startsWith('---')) {
            parsing = true;
            continue;
        }
        if (!parsing || !line || line.startsWith('Tip:')) continue;

        // Space separated tokens: NAME TYPE DOMAIN SOURCE VISIBILITY or NAME TYPE VERSION
        const tokens = line.split(/\s+/);
        if (tokens.length >= 1) {
            const isPrivate = line.includes('PRIVATE') || line.includes('🔒');
            const isLeap = line.includes('AI LEAP') || line.includes('🚀') || tokens[0].startsWith('leap-');
            const isCert = isLeap || line.includes('CERTIFIED') || line.includes('✓');
            let domain = 'General';
            let version = '1.0.0';
            if (tokens.length >= 3 && /^\d+\.\d+/.test(tokens[2])) {
                version = tokens[2];
            } else if (tokens.length >= 4 && tokens[2] !== '-') {
                domain = tokens[2];
            }
            items.push({
                name: tokens[0],
                type: tokens[1] || 'agent',
                version,
                isPrivate,
                isCertified: isCert,
                source: isLeap ? 'AI_LEAP' : 'CIP',
                domain
            });
        }
    }
    return items;
}

export async function executeListCommand(
    cliExecutor: ICliExecutor,
    authProvider: IAuthenticationStatusProvider,
    usageLogger: IUsageLogger,
    cliExecutable = 'engineering-commons'
): Promise<DiscoveredArtifactItem[]> {
    const isAuth = await authProvider.isAuthenticated();
    if (!isAuth) {
        const action = await vscode.window.showWarningMessage(
            'You are not logged in to Engineering Commons.',
            'Login'
        );
        if (action === 'Login') {
            await vscode.commands.executeCommand('engineeringCommons.login');
        }
        return [];
    }

    const result = await cliExecutor.executeAsync(cliExecutable, ['list']);

    if (!result.success) {
        const errorMsg = result.stderr || result.stdout || 'Failed to list artifacts.';
        vscode.window.showErrorMessage(`Engineering Commons List Failed: ${errorMsg}`);
        return [];
    }

    const items = parseListOutput(result.stdout);

    // Log LIST usage event
    await usageLogger.logActionAsync('LIST');

    if (items.length === 0) {
        vscode.window.showInformationMessage('No artifacts found in marketplace.');
        return [];
    }

    const pickItems = items.map((item) => ({
        label: `$(package) ${item.name}`,
        description: `[${item.type}] v${item.version}`,
        detail: `Engineering Commons artifact (${item.type})`,
        artifact: item
    }));

    const selected = await vscode.window.showQuickPick(pickItems, {
        placeHolder: 'Select an artifact to inspect or install'
    });

    if (selected) {
        const action = await vscode.window.showQuickPick(['Install Artifact', 'Update Artifact', 'Cancel'], {
            placeHolder: `Action for ${selected.artifact.name}:`
        });

        if (action === 'Install Artifact') {
            await vscode.commands.executeCommand('engineeringCommons.install', selected.artifact.name);
        } else if (action === 'Update Artifact') {
            await vscode.commands.executeCommand('engineeringCommons.update', selected.artifact.name);
        }
    }

    return items;
}
