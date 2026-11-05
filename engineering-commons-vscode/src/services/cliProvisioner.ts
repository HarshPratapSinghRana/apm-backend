import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { exec } from 'child_process';

export const DEFAULT_AZURE_BACKEND_URL = 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io';

export class AutoCliProvisioner {
    /**
     * Seeds ~/.engineering-commons/config.json and ~/.cip/config.json with the Azure Container Apps backend URL
     * if absent or pointing to localhost / vercel.
     */
    public static seedUserBackendConfig(targetUrl: string = DEFAULT_AZURE_BACKEND_URL): void {
        const homeDir = os.homedir();
        const configDirs = [
            path.join(homeDir, '.engineering-commons'),
            path.join(homeDir, '.cip')
        ];

        for (const dir of configDirs) {
            try {
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                const cfgFile = path.join(dir, 'config.json');
                let shouldWrite = true;
                if (fs.existsSync(cfgFile)) {
                    try {
                        const parsed = JSON.parse(fs.readFileSync(cfgFile, 'utf-8'));
                        const current = (parsed.backendUrl || parsed.url || '').trim();
                        if (current && !current.includes('localhost') && !current.includes('vercel.app')) {
                            shouldWrite = false;
                        }
                    } catch {
                        shouldWrite = true;
                    }
                }

                if (shouldWrite) {
                    fs.writeFileSync(cfgFile, JSON.stringify({
                        backendUrl: targetUrl,
                        url: targetUrl
                    }, null, 2), 'utf-8');
                }

                const sessionFile = path.join(dir, 'session.json');
                if (fs.existsSync(sessionFile)) {
                    try {
                        const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
                        if (!sessionData.backendUrl || sessionData.backendUrl.includes('localhost') || sessionData.backendUrl.includes('vercel.app')) {
                            sessionData.backendUrl = targetUrl;
                            fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2), 'utf-8');
                        }
                    } catch {}
                }
            } catch (e) {
                console.warn(`[AutoCliProvisioner] Could not seed config in ${dir}:`, e);
            }
        }
    }

    /**
     * Returns the global user-level CIP bin directory (e.g. C:\Users\<name>\.cip\bin or ~/.cip/bin)
     */
    public static getUserCipBinDir(): string {
        const homeDir = os.homedir();
        return path.join(homeDir, '.cip', 'bin');
    }

    /**
     * Ensures that the Engineering Commons CLI and launcher scripts are installed and configured on the user's machine.
     */
    public static async ensureInstalled(
        context: vscode.ExtensionContext,
        force = false
    ): Promise<{ success: boolean; binDir: string; message: string }> {
        const binDir = this.getUserCipBinDir();

        try {
            // Pre-seed backend configuration so CLI commands work with zero manual setup
            this.seedUserBackendConfig(DEFAULT_AZURE_BACKEND_URL);

            // 1. Ensure directory exists
            if (!fs.existsSync(binDir)) {
                fs.mkdirSync(binDir, { recursive: true });
            }

            // 2. Identify extension resources directory
            const extensionResourcesBin = path.join(context.extensionPath, 'resources', 'bin');

            // 3. Deploy launcher wrappers and binaries
            const isWindows = process.platform === 'win32';

            // Determine if bundled CLI binaries exist in resources/bin
            let bundledCliDll = '';
            let bundledCliExe = '';

            if (fs.existsSync(extensionResourcesBin)) {
                this.copyFolderRecursive(extensionResourcesBin, binDir, isWindows);

                const dllPath = path.join(binDir, 'EngineeringCommonsCli.dll');
                const exePath = path.join(binDir, 'EngineeringCommonsCli.exe');
                if (fs.existsSync(dllPath)) {
                    bundledCliDll = dllPath;
                }
                if (fs.existsSync(exePath)) {
                    bundledCliExe = exePath;
                }
            }

            // 4. Create / Update Windows launcher shims if on Windows
            if (isWindows) {
                // Remove legacy scripts if present to avoid PowerShell script execution policy errors
                for (const legacyPs of ['engineering-commons.ps1', 'engineering-commons.ps1']) {
                    const ps1Path = path.join(binDir, legacyPs);
                    if (fs.existsSync(ps1Path)) {
                        try { fs.unlinkSync(ps1Path); } catch {}
                    }
                }

                // Deploy native Windows binaries (never blocked by script execution policies)
                if (bundledCliExe && fs.existsSync(bundledCliExe)) {
                    for (const exeName of ['engineering-commons.exe', 'engineering-commons.exe']) {
                        const exeDest = path.join(binDir, exeName);
                        try { fs.copyFileSync(bundledCliExe, exeDest); } catch {}
                    }
                }

                let cmdContent = '';
                if (bundledCliExe && fs.existsSync(bundledCliExe)) {
                    cmdContent = `@echo off\r\nif "%ENGINEERING_COMMONS_BACKEND_URL%"=="" set "ENGINEERING_COMMONS_BACKEND_URL=${DEFAULT_AZURE_BACKEND_URL}"\r\n"%~dp0EngineeringCommonsCli.exe" %*\r\n`;
                } else if (bundledCliDll && fs.existsSync(bundledCliDll)) {
                    cmdContent = `@echo off\r\nif "%ENGINEERING_COMMONS_BACKEND_URL%"=="" set "ENGINEERING_COMMONS_BACKEND_URL=${DEFAULT_AZURE_BACKEND_URL}"\r\ndotnet "%~dp0EngineeringCommonsCli.dll" %*\r\n`;
                } else {
                    cmdContent = `@echo off\r\nif "%ENGINEERING_COMMONS_BACKEND_URL%"=="" set "ENGINEERING_COMMONS_BACKEND_URL=${DEFAULT_AZURE_BACKEND_URL}"\r\ndotnet run --project "%~dp0EngineeringCommonsCli.csproj" --no-launch-profile -- %*\r\n`;
                }

                fs.writeFileSync(path.join(binDir, 'engineering-commons.cmd'), cmdContent, 'utf-8');
                fs.writeFileSync(path.join(binDir, 'engineering-commons.cmd'), cmdContent, 'utf-8');
            } else {
                // POSIX shell launcher
                let shContent = `#!/usr/bin/env bash\n`;
                shContent += `if [ -z "$ENGINEERING_COMMONS_BACKEND_URL" ]; then\n    export ENGINEERING_COMMONS_BACKEND_URL="${DEFAULT_AZURE_BACKEND_URL}"\nfi\n`;
                if (bundledCliDll && fs.existsSync(bundledCliDll)) {
                    shContent += `exec dotnet "$(dirname "$0")/EngineeringCommonsCli.dll" "$@"\n`;
                } else {
                    shContent += `exec dotnet run --project "$(dirname "$0")/EngineeringCommonsCli.csproj" -- "$@"\n`;
                }
                fs.writeFileSync(path.join(binDir, 'engineering-commons'), shContent, { encoding: 'utf-8', mode: 0o755 });
                fs.writeFileSync(path.join(binDir, 'engineering-commons'), shContent, { encoding: 'utf-8', mode: 0o755 });
            }

            // 5. Inject into VS Code's integrated terminal PATH and Environment (Works immediately without restart)
            const pathSep = isWindows ? ';' : ':';
            context.environmentVariableCollection.prepend('PATH', `${binDir}${pathSep}`);
            context.environmentVariableCollection.replace('ENGINEERING_COMMONS_BACKEND_URL', DEFAULT_AZURE_BACKEND_URL);

            // 6. Check and update persistent user PATH
            const pathUpdated = await this.ensureInPersistentPath(binDir);

            const msg = pathUpdated
                ? `Engineering Commons CLI has been automatically installed to ${binDir} and added to your PATH.`
                : `Engineering Commons CLI is active and ready at ${binDir}.`;

            return { success: true, binDir, message: msg };
        } catch (err: any) {
            console.error('Failed to auto-provision CIP CLI:', err);
            return {
                success: false,
                binDir,
                message: `Failed to configure CIP CLI: ${err?.message || String(err)}`
            };
        }
    }

    /**
     * Adds the directory to the persistent user PATH if it is not already included.
     */
    private static async ensureInPersistentPath(binDir: string): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            if (process.platform === 'win32') {
                const checkAndSetScript = `
                    $targetDir = "${binDir.replace(/\\/g, '\\\\')}";
                    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User');
                    $normTarget = $targetDir.Trim().TrimEnd('\\', '/').ToLowerInvariant();
                    $parts = if ($userPath) { $userPath -split ';' | Where-Object { $_.Trim() -ne '' } } else { @() };
                    $found = $false;
                    foreach ($p in $parts) {
                        if ($p.Trim().TrimEnd('\\', '/').ToLowerInvariant() -eq $normTarget) {
                            $found = $true;
                            break;
                        }
                    }
                    if (-not $found) {
                        $newPath = if ($userPath) { "$userPath;$targetDir" } else { $targetDir };
                        [Environment]::SetEnvironmentVariable('Path', $newPath, 'User');
                        Write-Output 'UPDATED';
                    } else {
                        Write-Output 'ALREADY_PRESENT';
                    }
                `;

                exec(`powershell -NoProfile -Command "${checkAndSetScript.replace(/\r?\n/g, ' ')}"`, (err, stdout) => {
                    if (!err && stdout && stdout.includes('UPDATED')) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });
            } else {
                // Unix - best-effort append to .profile/.bashrc/.zshrc if not present
                try {
                    const home = os.homedir();
                    const bashrc = path.join(home, '.bashrc');
                    const zshrc = path.join(home, '.zshrc');
                    const exportLine = `\nexport PATH="$PATH:${binDir}"\n`;

                    for (const rc of [bashrc, zshrc]) {
                        if (fs.existsSync(rc)) {
                            const content = fs.readFileSync(rc, 'utf-8');
                            if (!content.includes(binDir)) {
                                fs.appendFileSync(rc, exportLine, 'utf-8');
                            }
                        }
                    }
                    resolve(true);
                } catch {
                    resolve(false);
                }
            }
        });
    }

    /**
     * Recursively copies all files and subdirectories from srcDir to destDir.
     */
    private static copyFolderRecursive(srcDir: string, destDir: string, isWindows: boolean): void {
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        // Try Node's native fs.cpSync if available (Node 16.7.0+)
        if (typeof (fs as any).cpSync === 'function') {
            try {
                (fs as any).cpSync(srcDir, destDir, { recursive: true, force: true });
                return;
            } catch {
                // fall through to manual recursive copy
            }
        }

        const entries = fs.readdirSync(srcDir, { withFileTypes: true });
        for (const entry of entries) {
            const src = path.join(srcDir, entry.name);
            const dest = path.join(destDir, entry.name);
            try {
                if (entry.isDirectory()) {
                    this.copyFolderRecursive(src, dest, isWindows);
                } else {
                    fs.copyFileSync(src, dest);
                    if (!isWindows) {
                        try {
                            fs.chmodSync(dest, 0o755);
                        } catch {}
                    }
                }
            } catch {
                // ignore individual file in-use errors
            }
        }
    }
}
