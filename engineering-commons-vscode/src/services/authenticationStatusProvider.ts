import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';

export interface IAuthenticationStatusProvider {
    isAuthenticated(): Promise<boolean>;
    getToken(): Promise<string | undefined>;
    getEmail(): Promise<string | undefined>;
    getRole(): Promise<string | undefined>;
    readonly onDidChangeAuthentication: vscode.Event<boolean>;
    notifyAuthChanged(): void;
    logout?(): Promise<void>;
}

export class SessionFileAuthStatusProvider implements IAuthenticationStatusProvider {
    private sessionFilePath: string;
    private _onDidChangeAuthentication = new vscode.EventEmitter<boolean>();
    public readonly onDidChangeAuthentication = this._onDidChangeAuthentication.event;

    constructor(customSessionPath?: string) {
        if (customSessionPath) {
            this.sessionFilePath = customSessionPath;
        } else {
            const home = os.homedir();
            this.sessionFilePath = path.join(home, '.engineering-commons', 'session.json');
        }
    }

    public async isAuthenticated(): Promise<boolean> {
        const token = await this.getToken();
        return !!token && token.trim().length > 0;
    }

    public async getToken(): Promise<string | undefined> {
        try {
            // 1. Check ~/.engineering-commons/token.json
            const engTokenFile = path.join(os.homedir(), '.engineering-commons', 'token.json');
            if (fs.existsSync(engTokenFile)) {
                const content = fs.readFileSync(engTokenFile, 'utf-8');
                const data = JSON.parse(content);
                if (data?.access_token) {
                    return data.access_token;
                }
            }

            // 2. Check ~/.engineering-commons/session.json
            if (fs.existsSync(this.sessionFilePath)) {
                const content = fs.readFileSync(this.sessionFilePath, 'utf-8');
                const data = JSON.parse(content);
                return data?.ssoToken || data?.token;
            }
            return undefined;
        } catch {
            return undefined;
        }
    }

    public async getEmail(): Promise<string | undefined> {
        try {
            if (fs.existsSync(this.sessionFilePath)) {
                const content = fs.readFileSync(this.sessionFilePath, 'utf-8');
                const data = JSON.parse(content);
                if (data?.email && typeof data.email === 'string' && data.email.trim().length > 0) {
                    return data.email.trim();
                }
            }

            const engTokenFile = path.join(os.homedir(), '.engineering-commons', 'token.json');
            if (fs.existsSync(engTokenFile)) {
                const content = fs.readFileSync(engTokenFile, 'utf-8');
                const data = JSON.parse(content);
                if (data?.email && typeof data.email === 'string' && data.email.trim().length > 0) {
                    return data.email.trim();
                }
            }

            const token = await this.getToken();
            if (token && typeof token === 'string' && token.includes('.')) {
                try {
                    const parts = token.split('.');
                    if (parts.length >= 2) {
                        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                        const payloadJson = Buffer.from(base64, 'base64').toString('utf8');
                        const payload = JSON.parse(payloadJson);
                        const email = payload?.email || payload?.unique_name || payload?.upn || payload?.preferred_username || payload?.name || payload?.sub ||
                                      payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
                                      payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
                        if (email && typeof email === 'string' && email.trim().length > 0) {
                            return email.trim();
                        }
                    }
                } catch {
                    // ignore jwt decode errors
                }
            }

            return undefined;
        } catch {
            return undefined;
        }
    }

    public async getRole(): Promise<string | undefined> {
        try {
            if (!fs.existsSync(this.sessionFilePath)) {
                return undefined;
            }
            const content = fs.readFileSync(this.sessionFilePath, 'utf-8');
            const data = JSON.parse(content);
            if (data?.role && typeof data.role === 'string' && data.role.trim().length > 0) {
                return data.role.trim().toUpperCase();
            }

            const email = (await this.getEmail()) || '';
            const lowerEmail = email.toLowerCase();
            if (lowerEmail.includes('admin')) return 'ADMIN';
            if (lowerEmail.includes('reviewer')) return 'REVIEWER';
            if (lowerEmail.includes('contributor') || lowerEmail.includes('producer')) return 'CONTRIBUTOR';
            // Mechanism: When any user logs in with MAQ SSO (@maqsoftware.com), they automatically have CONTRIBUTOR role
            if (lowerEmail.includes('@maqsoftware.com') || (lowerEmail.length > 0 && lowerEmail !== 'consumer@test.com')) {
                return 'CONTRIBUTOR';
            }
            return 'CONSUMER';
        } catch {
            return undefined;
        }
    }

    public notifyAuthChanged(): void {
        this.isAuthenticated().then(isAuth => {
            this._onDidChangeAuthentication.fire(isAuth);
        });
    }

    public async logout(): Promise<void> {
        try {
            if (fs.existsSync(this.sessionFilePath)) {
                try { fs.unlinkSync(this.sessionFilePath); } catch {}
            }
            const home = os.homedir();
            const engDir = path.join(home, '.engineering-commons');
            const engTokenFile = path.join(engDir, 'token.json');
            if (fs.existsSync(engTokenFile)) {
                try { fs.unlinkSync(engTokenFile); } catch {}
            }
            const engSessionFile = path.join(engDir, 'session.json');
            if (fs.existsSync(engSessionFile)) {
                try { fs.unlinkSync(engSessionFile); } catch {}
            }
            const cipTokensCache = path.join(home, '.engineering-commons', 'tokens_cache.json');
            if (fs.existsSync(cipTokensCache)) {
                try { fs.unlinkSync(cipTokensCache); } catch {}
            }
        } catch {}
        this.notifyAuthChanged();
    }
}
