import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface RegisteredArtifactFile {
    relativePath: string;
    normalizedPath: string;
}

export interface RegisteredArtifact {
    id: string;
    name: string;
    version: string;
    type: string; // "agent", "skill", "plugin", "mcpserver", "prompt"
    installedPath?: string;
    files: string[];
    skillNames: string[];
    agentNames: string[];
    source?: string;
    cipPackage?: string;
}

export interface IArtifactRegistry {
    registerArtifact(artifact: RegisteredArtifact): void;
    unregisterArtifact(artifactId: string): void;
    resolveArtifactFromFilePath(filePath: string): RegisteredArtifact | undefined;
    resolveArtifactFromSkillName(skillName: string): RegisteredArtifact | undefined;
    resolveArtifactFromAgentName(agentName: string): RegisteredArtifact | undefined;
    getAllArtifacts(): RegisteredArtifact[];
    clear(): void;
    scanWorkspaceArtifacts(): Promise<void>;
}

export class ArtifactRegistry implements IArtifactRegistry {
    private artifacts: Map<string, RegisteredArtifact> = new Map();

    public registerArtifact(artifact: RegisteredArtifact): void {
        const id = artifact.id || artifact.name;
        const normalizedFiles = (artifact.files || []).map(f => this.normalizePath(f));
        const skillNames = (artifact.skillNames || [artifact.name]).map(s => s.toLowerCase());
        const agentNames = (artifact.agentNames || [artifact.name]).map(a => a.toLowerCase());

        this.artifacts.set(id.toLowerCase(), {
            ...artifact,
            id,
            files: normalizedFiles,
            skillNames,
            agentNames
        });
    }

    public unregisterArtifact(artifactId: string): void {
        this.artifacts.delete(artifactId.toLowerCase());
    }

    public resolveArtifactFromFilePath(filePath: string): RegisteredArtifact | undefined {
        if (!filePath) return undefined;
        let cleanPath = filePath;
        try {
            cleanPath = decodeURIComponent(filePath).replace(/^file:\/\/\/?/i, '');
        } catch {
            cleanPath = filePath.replace(/^file:\/\/\/?/i, '');
        }
        const norm = this.normalizePath(cleanPath);

        for (const artifact of this.artifacts.values()) {
            // 1. Check installed directory path prefix first (most specific)
            if (artifact.installedPath) {
                const normInstalled = this.normalizePath(artifact.installedPath);
                if (norm.startsWith(normInstalled) || normInstalled.startsWith(norm)) {
                    return artifact;
                }
            }
        }

        for (const artifact of this.artifacts.values()) {
            // 2. Check direct file membership
            if (artifact.files.some(f => norm.endsWith(f) || f.endsWith(norm) || norm.includes(f))) {
                return artifact;
            }

            // 3. Check if file path contains artifact name folder or basename
            const baseName = artifact.name.toLowerCase();
            if (norm.includes(`/${baseName}/`) || norm.includes(`\\${baseName}\\`) || norm.includes(baseName)) {
                return artifact;
            }
        }

        return undefined;
    }

    public resolveArtifactFromSkillName(skillName: string): RegisteredArtifact | undefined {
        if (!skillName) return undefined;
        let target = skillName.trim().toLowerCase();
        target = target.replace(/^[@#/]/, '').replace(/^skill:/, '').replace(/^agent:/, '')
                       .replace(/\.skill\.md$/, '').replace(/\.agent\.md$/, '').replace(/\.md$/, '').trim();

        for (const artifact of this.artifacts.values()) {
            const artLower = artifact.name.toLowerCase();
            if (artifact.skillNames.includes(target) || artLower === target) {
                return artifact;
            }
            if (target.includes(artLower) || artLower.includes(target)) {
                return artifact;
            }
        }

        return undefined;
    }

    public resolveArtifactFromAgentName(agentName: string): RegisteredArtifact | undefined {
        if (!agentName) return undefined;
        let target = agentName.trim().toLowerCase();
        target = target.replace(/^[@#/]/, '').replace(/^agent:/, '').replace(/^skill:/, '')
                       .replace(/\.agent\.md$/, '').replace(/\.skill\.md$/, '').replace(/\.md$/, '').trim();

        for (const artifact of this.artifacts.values()) {
            const artLower = artifact.name.toLowerCase();
            if (artifact.agentNames.includes(target) || artLower === target) {
                return artifact;
            }
            if (target.includes(artLower) || artLower.includes(target)) {
                return artifact;
            }
        }

        return undefined;
    }

    public getAllArtifacts(): RegisteredArtifact[] {
        return Array.from(this.artifacts.values());
    }

    public clear(): void {
        this.artifacts.clear();
    }

    public async scanWorkspaceArtifacts(): Promise<void> {
        const workspaceFolders = vscode.workspace?.workspaceFolders || [];
        const roots: string[] = workspaceFolders.map(w => w.uri.fsPath);

        // Also add user home AI roots (.gemini, .copilot, .agents)
        const userHome = process.env.USERPROFILE || process.env.HOME;
        if (userHome) {
            roots.push(path.join(userHome, '.gemini', 'antigravity-ide', 'builtin'));
            roots.push(path.join(userHome, '.gemini', 'config'));
        }

        for (const rootPath of roots) {
            const searchDirs = [
                path.join(rootPath, '.github', 'skills'),
                path.join(rootPath, '.claude', 'skills'),
                path.join(rootPath, '.agents', 'skills'),
                path.join(rootPath, '.github', 'agents'),
                path.join(rootPath, 'agents'),
                path.join(rootPath, 'skills'),
                path.join(rootPath, 'prompts'),
                path.join(rootPath, 'plugins'),
                path.join(rootPath, '.mcp')
            ];

            for (const sDir of searchDirs) {
                if (!fs.existsSync(sDir)) continue;
                try {
                    const entries = fs.readdirSync(sDir, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path.join(sDir, entry.name);
                        const isDir = entry.isDirectory();
                        const rawName = entry.name;
                        const cleanName = rawName
                            .replace(/\.agent\.md$/i, '')
                            .replace(/\.skill\.md$/i, '')
                            .replace(/\.prompt\.md$/i, '')
                            .replace(/\.agent$/i, '')
                            .replace(/\.prompt$/i, '')
                            .replace(/\.skill$/i, '')
                            .replace(/\.md$/i, '')
                            .replace(/\.json$/i, '')
                            .replace(/\.ya?ml$/i, '')
                            .trim();

                        const artType = sDir.includes('skill') ? 'skill' :
                                       (sDir.includes('prompt') ? 'prompt' :
                                       (sDir.includes('plugin') ? 'plugin' :
                                       (sDir.includes('mcp') ? 'mcpserver' : 'agent')));

                        const files: string[] = [];
                        if (isDir) {
                            this.collectFilesRecursive(fullPath, files, fullPath);
                        } else {
                            files.push(this.normalizePath(entry.name));
                            files.push(this.normalizePath(fullPath));
                        }

                        const aliases = Array.from(new Set([
                            cleanName,
                            rawName,
                            path.parse(rawName).name,
                            `@${cleanName}`,
                            `agent:${cleanName}`,
                            `skill:${cleanName}`
                        ]));

                        this.registerArtifact({
                            id: cleanName,
                            name: cleanName,
                            version: '1.0.0',
                            type: artType,
                            installedPath: fullPath,
                            files,
                            skillNames: aliases,
                            agentNames: aliases,
                            source: 'WORKSPACE'
                        });
                    }
                } catch {
                    // ignore inaccessible dirs
                }
            }
        }
    }

    private collectFilesRecursive(dir: string, fileList: string[], baseDir: string): void {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const e of entries) {
                const p = path.join(dir, e.name);
                if (e.isDirectory()) {
                    this.collectFilesRecursive(p, fileList, baseDir);
                } else {
                    fileList.push(this.normalizePath(path.relative(baseDir, p)));
                }
            }
        } catch {
            // ignore
        }
    }

    private normalizePath(p: string): string {
        return p.replace(/\\/g, '/').replace(/^[a-zA-Z]:/, '').replace(/^\/+/, '/').toLowerCase();
    }
}
