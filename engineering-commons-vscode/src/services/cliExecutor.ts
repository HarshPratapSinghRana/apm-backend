import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface CliExecutionResult {
    exitCode: number;
    stdout: string;
    stderr: string;
    success: boolean;
}

export interface ICliExecutor {
    executeAsync(command: string, args: string[], cwd?: string): Promise<CliExecutionResult>;
}

export class DefaultCliExecutor implements ICliExecutor {
    private defaultExecutable: string;

    constructor(defaultExecutable = 'engineering-commons') {
        this.defaultExecutable = defaultExecutable;
    }

    private resolveInvocation(command?: string, cwd?: string): { executable: string; argsPrefix: string[]; effectiveCwd: string } {
        const rawCmd = (command || this.defaultExecutable || 'engineering-commons').trim();
        const workspaceFolders = vscode.workspace?.workspaceFolders;
        const workspaceRoot = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : undefined;
        const effectiveCwd = cwd || workspaceRoot || process.cwd();

        // 1. If custom command is an absolute or directly existing file
        if (rawCmd !== 'engineering-commons' && fs.existsSync(rawCmd)) {
            if (rawCmd.endsWith('.csproj')) {
                return { executable: 'dotnet', argsPrefix: ['run', '--project', rawCmd, '--'], effectiveCwd };
            }
            if (rawCmd.endsWith('.dll')) {
                return { executable: 'dotnet', argsPrefix: [rawCmd], effectiveCwd };
            }
            return { executable: rawCmd, argsPrefix: [], effectiveCwd };
        }

        // 2. If custom command is a relative path within workspace
        if (rawCmd !== 'engineering-commons') {
            const relPath = path.resolve(effectiveCwd, rawCmd);
            if (fs.existsSync(relPath)) {
                if (relPath.endsWith('.csproj')) {
                    return { executable: 'dotnet', argsPrefix: ['run', '--project', relPath, '--'], effectiveCwd };
                }
                if (relPath.endsWith('.dll')) {
                    return { executable: 'dotnet', argsPrefix: [relPath], effectiveCwd };
                }
                return { executable: relPath, argsPrefix: [], effectiveCwd };
            }
            // Fall back to executing custom command directly
            return { executable: rawCmd, argsPrefix: [], effectiveCwd };
        }

        // 3. If default 'engineering-commons', search user .cip/bin, extension bundle, and workspace directories
        const homeDir = process.env.USERPROFILE || process.env.HOME || '';
        const userCipBin = path.join(homeDir, '.cip', 'bin');

        const candidatePaths = [
            path.join(userCipBin, 'engineering-commons.exe'),
            path.join(userCipBin, 'EngineeringCommonsCli.exe'),
            path.join(userCipBin, 'engineering-commons.cmd'),
            path.join(userCipBin, 'EngineeringCommonsCli.dll'),
            path.join(userCipBin, 'engineering-commons'),
            path.join(effectiveCwd, 'EngineeringCommonsCli', 'bin', 'Debug', 'net10.0', 'EngineeringCommonsCli.exe'),
            path.join(effectiveCwd, 'EngineeringCommonsCli', 'bin', 'Release', 'net10.0', 'EngineeringCommonsCli.exe'),
            path.join(effectiveCwd, 'EngineeringCommonsCli', 'bin', 'Debug', 'net8.0', 'EngineeringCommonsCli.exe'),
            path.join(effectiveCwd, 'EngineeringCommonsCli', 'bin', 'Release', 'net8.0', 'EngineeringCommonsCli.exe'),
            path.join(effectiveCwd, 'bin', 'Debug', 'net10.0', 'EngineeringCommonsCli.exe'),
            path.join(effectiveCwd, 'bin', 'Release', 'net10.0', 'EngineeringCommonsCli.exe'),
            path.join(effectiveCwd, 'EngineeringCommonsCli', 'bin', 'Debug', 'net10.0', 'EngineeringCommonsCli.dll'),
            path.join(effectiveCwd, 'EngineeringCommonsCli', 'EngineeringCommonsCli.csproj')
        ];

        for (const candidate of candidatePaths) {
            if (fs.existsSync(candidate)) {
                if (candidate.endsWith('.csproj')) {
                    return { executable: 'dotnet', argsPrefix: ['run', '--project', candidate, '--'], effectiveCwd };
                }
                if (candidate.endsWith('.dll')) {
                    return { executable: 'dotnet', argsPrefix: [candidate], effectiveCwd };
                }
                return { executable: candidate, argsPrefix: [], effectiveCwd };
            }
        }

        // 4. Default fallback to global command name
        return { executable: 'engineering-commons', argsPrefix: [], effectiveCwd };
    }

    public async executeAsync(command = this.defaultExecutable, args: string[] = [], cwd?: string, timeoutMs = 60000): Promise<CliExecutionResult> {
        return new Promise<CliExecutionResult>((resolve) => {
            const { executable, argsPrefix, effectiveCwd } = this.resolveInvocation(command, cwd);
            const fullArgs = [...argsPrefix, ...args];

            let hasCompleted = false;
            let stdout = '';
            let stderr = '';

            const config = vscode.workspace?.getConfiguration ? vscode.workspace.getConfiguration('engineeringCommons') : undefined;
            const rawBackendUrl = config?.get<string>('backendUrl') || process.env.ENGINEERING_COMMONS_BACKEND_URL;
            const backendUrl = (rawBackendUrl && !rawBackendUrl.includes('localhost'))
                ? rawBackendUrl.trim().replace(/\/+$/, '')
                : 'https://ecommerce-app-chi-wine.vercel.app';

            const proc = spawn(executable, fullArgs, {
                cwd: effectiveCwd,
                shell: true,
                env: {
                    ...process.env,
                    ENGINEERING_COMMONS_BACKEND_URL: backendUrl
                }
            });

            // 60-second execution safety timeout
            const timer = setTimeout(() => {
                if (!hasCompleted) {
                    hasCompleted = true;
                    try {
                        proc.kill('SIGKILL');
                    } catch {}
                    resolve({
                        exitCode: 124,
                        stdout: stdout.trim(),
                        stderr: (stderr || `Execution timed out after ${Math.round(timeoutMs / 1000)}s.`).trim(),
                        success: false
                    });
                }
            }, timeoutMs);

            proc.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('error', (err) => {
                if (!hasCompleted) {
                    hasCompleted = true;
                    clearTimeout(timer);
                    resolve({
                        exitCode: 1,
                        stdout: stdout.trim(),
                        stderr: (stderr || err.message).trim(),
                        success: false
                    });
                }
            });

            proc.on('close', (code) => {
                if (!hasCompleted) {
                    hasCompleted = true;
                    clearTimeout(timer);
                    const exitCode = code ?? 0;
                    resolve({
                        exitCode,
                        stdout: stdout.trim(),
                        stderr: stderr.trim(),
                        success: exitCode === 0
                    });
                }
            });
        });
    }
}
