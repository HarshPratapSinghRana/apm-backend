import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import * as https from 'https';
import { IAuthenticationStatusProvider } from './authenticationStatusProvider';
import { CompositeArtifactUsageTracker } from './usageTracker';

export const DEFAULT_SSO_TENANT_ID = 'e4d98dd2-9199-42e5-ba8b-da3e763ede2e';
export const DEFAULT_SSO_CLIENT_ID = 'a5f3ba81-4c95-4c74-afd9-38b72cf39156';
export const DEFAULT_SSO_SCOPES = 'User.Read Sites.Read.All Sites.ReadWrite.All offline_access openid profile email';
export const DEFAULT_ALLOWED_DOMAINS = ['maqsoftware.com', 'company.com', 'test.com'];

export interface SsoLoginResult {
    success: boolean;
    email?: string;
    role?: string;
    name?: string;
    error?: string;
}

/**
 * Executes the primary Microsoft SSO Login workflow.
 * Uses Enterprise Device Code Flow by default (with corporate App ID) for guaranteed SharePoint & Graph API access.
 */
export async function executeMicrosoftSsoLogin(
    authProvider: IAuthenticationStatusProvider,
    usageTracker?: CompositeArtifactUsageTracker,
    backendUrlOverride?: string
): Promise<SsoLoginResult> {
    return executeMicrosoftDeviceCodeSsoLogin(authProvider, usageTracker, backendUrlOverride);
}

/**
 * Enterprise Microsoft SSO via Entra ID Device Code Flow.
 * Works seamlessly across all teammate machines without requiring VS Code tenant admin consent.
 */
export async function executeMicrosoftDeviceCodeSsoLogin(
    authProvider: IAuthenticationStatusProvider,
    usageTracker?: CompositeArtifactUsageTracker,
    backendUrlOverride?: string
): Promise<SsoLoginResult> {
    const config = vscode.workspace.getConfiguration('engineeringCommons');
    const tenantId = config.get<string>('ssoTenantId') || process.env.SSO_TENANT_ID || DEFAULT_SSO_TENANT_ID;
    const clientId = config.get<string>('ssoClientId') || process.env.SSO_CLIENT_ID || DEFAULT_SSO_CLIENT_ID;
    const scopes = DEFAULT_SSO_SCOPES;

    try {
        // Step 1: Request Device Code from Microsoft Entra ID
        const deviceData = await requestDeviceCodeAsync(tenantId, clientId, scopes);
        const { user_code: userCode, device_code: deviceCode, verification_uri: verificationUri, expires_in: expiresIn, interval = 5 } = deviceData;

        if (!userCode || !deviceCode) {
            throw new Error('Device code response from Microsoft Entra ID was incomplete.');
        }

        // Copy code to clipboard & launch browser
        try {
            await vscode.env.clipboard.writeText(userCode);
        } catch {}

        const uriToOpen = verificationUri || 'https://microsoft.com/devicelogin';
        try {
            await vscode.env.openExternal(vscode.Uri.parse(uriToOpen));
        } catch {}

        // Show prompt with action buttons
        vscode.window.showInformationMessage(
            `MAQ Microsoft SSO: Code [ ${userCode} ] copied to clipboard. Enter it in your browser at ${uriToOpen}`,
            'Copy Code Again',
            'Open Browser'
        ).then(async (action) => {
            if (action === 'Copy Code Again') {
                await vscode.env.clipboard.writeText(userCode);
                vscode.window.showInformationMessage(`✓ Code ${userCode} copied to clipboard!`);
            } else if (action === 'Open Browser') {
                await vscode.env.openExternal(vscode.Uri.parse(uriToOpen));
            }
        });

        // Step 2: Poll token with visual progress
        const tokenResult = await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `MAQ Microsoft SSO: Waiting for sign-in (Code: ${userCode})...`,
                cancellable: true
            },
            async (progress, cancellationToken) => {
                const maxAttempts = Math.max(30, Math.floor(expiresIn / Math.max(interval, 2)));
                let pollInterval = interval;

                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    if (cancellationToken.isCancellationRequested) {
                        return { success: false, error: 'Authentication cancelled by user.' };
                    }

                    await sleep(pollInterval * 1000);

                    if (cancellationToken.isCancellationRequested) {
                        return { success: false, error: 'Authentication cancelled by user.' };
                    }

                    const poll = await pollTokenAsync(tenantId, clientId, deviceCode);
                    if (poll.success && poll.access_token) {
                        return {
                            success: true,
                            access_token: poll.access_token,
                            id_token: poll.id_token
                        };
                    }

                    if (poll.pending) {
                        if (poll.slowDown) {
                            pollInterval += 5;
                        }
                        progress.report({ message: `Waiting for authorization in browser (${attempt + 1}/${maxAttempts})...` });
                        continue;
                    }

                    if (poll.error) {
                        return { success: false, error: poll.error };
                    }
                }

                return { success: false, error: 'Device authentication polling timed out. Please try again.' };
            }
        );

        if (!tokenResult.success || !tokenResult.access_token) {
            const errorMsg = tokenResult.error || 'Authentication failed or was cancelled.';
            if (!errorMsg.includes('cancelled')) {
                vscode.window.showErrorMessage(`MAQ SSO Login Failed: ${errorMsg}`);
            }
            return { success: false, error: errorMsg };
        }

        // Step 3: Resolve user info from Graph API & ID token
        const userInfo = await resolveUserInfoAsync(tokenResult.access_token, tokenResult.id_token);
        const email = (userInfo.email || '').trim().toLowerCase();
        const displayName = userInfo.name || email;

        if (!email || !email.includes('@')) {
            const errorMsg = 'Could not resolve a valid email address from your Microsoft account.';
            vscode.window.showErrorMessage(`SSO Error: ${errorMsg}`);
            return { success: false, error: errorMsg };
        }

        // Step 4: Domain Check
        if (!isAllowedDomain(email)) {
            const errorMsg = `Access Denied: Only @maqsoftware.com accounts are permitted. Signed in as: ${email}`;
            vscode.window.showErrorMessage(`MAQ SSO: ${errorMsg}`);
            return { success: false, error: errorMsg };
        }

        // Step 5: Determine user role
        let role = determineUserRole(email);
        let cipToken = tokenResult.access_token;

        // Step 6: Notify Backend if available (graceful fallback)
        const config = vscode.workspace.getConfiguration('engineeringCommons');
        const backendUrl = (backendUrlOverride || config.get<string>('backendUrl') || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/$/, '');
        try {
            const ssoResponse = await callBackendSsoAsync(backendUrl, tokenResult.access_token, email, displayName);
            if (ssoResponse && ssoResponse.token) {
                cipToken = ssoResponse.token;
                if (ssoResponse.user?.role) {
                    role = ssoResponse.user.role.toUpperCase();
                }
            }
        } catch (err) {
            console.warn('[MAQ SSO] Backend notification skipped/offline, using client session:', err);
        }

        // Step 7: Save session across both ~/.engineering-commons and ~/.engineering-commons
        saveSessionFiles(email, cipToken, tokenResult.access_token, role, displayName);

        // Step 8: Notify views
        authProvider.notifyAuthChanged();

        if (usageTracker) {
            await usageTracker.logOperationAsync('ACTIVATED', 'engineering-commons', 'sso_microsoft', '1.0.0', 'EngineeringCommons');
        }

        vscode.window.showInformationMessage(`✓ Welcome! Successfully signed in via MAQ Microsoft SSO as ${email} (${role})`);
        return { success: true, email, role, name: displayName };

    } catch (err: any) {
        const errorMsg = err?.message || String(err);
        vscode.window.showErrorMessage(`MAQ Microsoft SSO Login Failed: ${errorMsg}`);
        return { success: false, error: errorMsg };
    }
}

/**
 * Native VS Code Microsoft Account Sign-in (Fallback).
 * Uses standard scopes (User.Read, email, profile) requiring no tenant admin consent.
 */
export async function executeMicrosoftNativeSsoLogin(
    authProvider: IAuthenticationStatusProvider,
    usageTracker?: CompositeArtifactUsageTracker,
    backendUrlOverride?: string
): Promise<SsoLoginResult> {
    try {
        const session = await vscode.authentication.getSession(
            'microsoft',
            ['User.Read', 'email', 'profile', 'offline_access'],
            { createIfNone: true }
        );

        if (!session || !session.accessToken) {
            return { success: false, error: 'Sign-in cancelled or no token received.' };
        }

        const userInfo = await resolveUserInfoAsync(session.accessToken);
        let email = (userInfo.email || session.account?.label || '').trim().toLowerCase();
        let displayName = userInfo.name || session.account?.label || email;

        if (!email.includes('@')) {
            const errorMsg = 'Could not resolve a valid email address from your Microsoft account.';
            vscode.window.showErrorMessage(`SSO Error: ${errorMsg}`);
            return { success: false, error: errorMsg };
        }

        if (!isAllowedDomain(email)) {
            const errorMsg = `Access Denied: Only @maqsoftware.com accounts are permitted. Signed in as: ${email}`;
            vscode.window.showErrorMessage(`MAQ SSO: ${errorMsg}`);
            return { success: false, error: errorMsg };
        }

        let role = determineUserRole(email);
        let cipToken = session.accessToken;

        const config = vscode.workspace.getConfiguration('engineeringCommons');
        const backendUrl = (backendUrlOverride || config.get<string>('backendUrl') || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/$/, '');
        try {
            const ssoResponse = await callBackendSsoAsync(backendUrl, session.accessToken, email, displayName);
            if (ssoResponse && ssoResponse.token) {
                cipToken = ssoResponse.token;
                if (ssoResponse.user?.role) {
                    role = ssoResponse.user.role.toUpperCase();
                }
            }
        } catch {}

        saveSessionFiles(email, cipToken, session.accessToken, role, displayName);
        authProvider.notifyAuthChanged();

        if (usageTracker) {
            await usageTracker.logOperationAsync('ACTIVATED', 'engineering-commons', 'sso_microsoft', '1.0.0', 'EngineeringCommons');
        }

        vscode.window.showInformationMessage(`✓ Welcome! Successfully signed in as ${email} (${role})`);
        return { success: true, email, role, name: displayName };

    } catch (err: any) {
        const errorMsg = err?.message || String(err);
        vscode.window.showErrorMessage(`Microsoft Sign-in Failed: ${errorMsg}`);
        return { success: false, error: errorMsg };
    }
}

// ── Helper Utilities ────────────────────────────────────────────────────────

function isAllowedDomain(email: string): boolean {
    const lower = email.trim().toLowerCase();
    const envDomains = process.env.ALLOWED_SSO_DOMAINS;
    const domains = envDomains
        ? envDomains.split(',').map(d => d.trim().toLowerCase()).filter(Boolean)
        : DEFAULT_ALLOWED_DOMAINS;

    return domains.some(d => lower.endsWith(`@${d}`));
}

function determineUserRole(email: string): string {
    const lower = email.toLowerCase();
    if (lower === 'harsh.rana@maqsoftware.com' || lower.includes('admin')) {
        return 'ADMIN';
    }
    if (lower.includes('reviewer')) {
        return 'REVIEWER';
    }
    if (lower.includes('consumer')) {
        return 'CONSUMER';
    }
    return 'PRODUCER';
}

function saveSessionFiles(email: string, cipToken: string, ssoToken: string, role: string, name: string): void {
    const homeDir = os.homedir();
    const loginTime = new Date().toISOString();

    try {
        // 1. Save ~/.engineering-commons/session.json
        const cipDir = path.join(homeDir, '.engineering-commons');
        if (!fs.existsSync(cipDir)) {
            fs.mkdirSync(cipDir, { recursive: true });
        }
        const sessionFile = path.join(cipDir, 'session.json');
        const sessionPayload = {
            email: email,
            token: cipToken,
            ssoToken: ssoToken,
            role: role,
            name: name || email,
            loginTime: loginTime,
            authType: 'microsoft_sso'
        };
        fs.writeFileSync(sessionFile, JSON.stringify(sessionPayload, null, 2), 'utf-8');

        // 2. Save ~/.engineering-commons/token.json
        const engDir = path.join(homeDir, '.engineering-commons');
        if (!fs.existsSync(engDir)) {
            fs.mkdirSync(engDir, { recursive: true });
        }
        const tokenFile = path.join(engDir, 'token.json');
        const tokenPayload = {
            access_token: ssoToken,
            token_type: 'Bearer',
            email: email,
            name: name || email,
            role: role,
            saved_at: loginTime
        };
        fs.writeFileSync(tokenFile, JSON.stringify(tokenPayload, null, 2), 'utf-8');

        // 3. Save ~/.engineering-commons/session.json
        const engSessionFile = path.join(engDir, 'session.json');
        fs.writeFileSync(engSessionFile, JSON.stringify(sessionPayload, null, 2), 'utf-8');
    } catch (err) {
        console.warn('[MAQ SSO] Failed to write one or more session files:', err);
    }
}

async function resolveUserInfoAsync(accessToken: string, idToken?: string): Promise<{ email?: string; name?: string }> {
    let resolvedEmail: string | undefined;
    let resolvedName: string | undefined;

    // 1. Try decoding JWT claims from idToken or accessToken
    const tokensToTry = [idToken, accessToken].filter(Boolean) as string[];
    for (const tok of tokensToTry) {
        if (!tok.includes('.')) continue;
        try {
            const parts = tok.split('.');
            if (parts.length >= 2) {
                const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
                if (!resolvedEmail) {
                    resolvedEmail = payload.preferred_username || payload.upn || payload.email || payload.unique_name;
                }
                if (!resolvedName) {
                    resolvedName = payload.name;
                }
            }
        } catch {}
        if (resolvedEmail && resolvedEmail.includes('@')) break;
    }

    // 2. Query Microsoft Graph /v1.0/me
    if (!resolvedEmail || !resolvedEmail.includes('@')) {
        try {
            const graphUser = await fetchGraphUserProfileAsync(accessToken);
            if (graphUser.email) resolvedEmail = graphUser.email;
            if (graphUser.name && !resolvedName) resolvedName = graphUser.name;
        } catch {}
    }

    return { email: resolvedEmail, name: resolvedName };
}

function fetchGraphUserProfileAsync(accessToken: string): Promise<{ email?: string; name?: string }> {
    return new Promise((resolve) => {
        try {
            const req = https.request({
                hostname: 'graph.microsoft.com',
                path: '/v1.0/me',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json',
                    'User-Agent': 'EngineeringCommons/1.1.9'
                },
                timeout: 5000
            }, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const json = JSON.parse(data);
                            const email = json.mail || json.userPrincipalName;
                            const name = json.displayName;
                            resolve({ email, name });
                        } catch {
                            resolve({});
                        }
                    } else {
                        resolve({});
                    }
                });
            });
            req.on('error', () => resolve({}));
            req.on('timeout', () => { req.destroy(); resolve({}); });
            req.end();
        } catch {
            resolve({});
        }
    });
}

function requestDeviceCodeAsync(tenantId: string, clientId: string, scopes: string): Promise<{
    user_code: string;
    device_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
}> {
    return new Promise((resolve, reject) => {
        try {
            const params = new URLSearchParams({
                client_id: clientId,
                scope: scopes
            });
            const body = params.toString();

            const req = https.request({
                hostname: 'login.microsoftonline.com',
                path: `/${tenantId}/oauth2/v2.0/devicecode`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(body),
                    'User-Agent': 'EngineeringCommons/1.1.9'
                },
                timeout: 10000
            }, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error(`Failed to parse device code response: ${data}`));
                        }
                    } else {
                        reject(new Error(`Device code request failed (${res.statusCode}): ${data}`));
                    }
                });
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Device code request timed out')); });
            req.write(body);
            req.end();
        } catch (err) {
            reject(err);
        }
    });
}

function pollTokenAsync(tenantId: string, clientId: string, deviceCode: string): Promise<{
    success: boolean;
    access_token?: string;
    id_token?: string;
    error?: string;
    pending?: boolean;
    slowDown?: boolean;
}> {
    return new Promise((resolve) => {
        try {
            const params = new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
                client_id: clientId,
                device_code: deviceCode
            });
            const body = params.toString();

            const req = https.request({
                hostname: 'login.microsoftonline.com',
                path: `/${tenantId}/oauth2/v2.0/token`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(body),
                    'User-Agent': 'EngineeringCommons/1.1.9'
                },
                timeout: 10000
            }, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                            resolve({ success: true, access_token: json.access_token, id_token: json.id_token });
                        } else {
                            if (json.error === 'authorization_pending') {
                                resolve({ success: false, pending: true });
                            } else if (json.error === 'slow_down') {
                                resolve({ success: false, pending: true, slowDown: true });
                            } else {
                                resolve({ success: false, error: json.error_description || json.error || 'Token acquisition failed' });
                            }
                        }
                    } catch (e) {
                        resolve({ success: false, error: `Invalid response from token endpoint: ${data}` });
                    }
                });
            });
            req.on('error', (err) => resolve({ success: false, error: err.message }));
            req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Token polling timed out' }); });
            req.write(body);
            req.end();
        } catch (err: any) {
            resolve({ success: false, error: err?.message || String(err) });
        }
    });
}

function callBackendSsoAsync(backendUrl: string, token: string, email: string, name: string): Promise<any> {
    return new Promise((resolve, reject) => {
        try {
            const url = new URL(`${backendUrl}/api/auth/sso`);
            const payload = JSON.stringify({ token, email, name });
            const isHttps = url.protocol === 'https:';
            const requestLib = isHttps ? https : http;

            const req = requestLib.request(
                url,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload)
                    },
                    timeout: 3000
                },
                (res) => {
                    let data = '';
                    res.on('data', (chunk) => { data += chunk; });
                    res.on('end', () => {
                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                            try {
                                resolve(JSON.parse(data));
                            } catch {
                                resolve({ token });
                            }
                        } else {
                            reject(new Error(`Backend responded with status ${res.statusCode}: ${data}`));
                        }
                    });
                }
            );

            req.on('error', (err) => reject(err));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Backend request timed out.'));
            });

            req.write(payload);
            req.end();
        } catch (err) {
            reject(err);
        }
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

