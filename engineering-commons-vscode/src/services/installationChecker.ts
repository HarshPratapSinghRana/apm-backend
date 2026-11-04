import * as path from 'path';
import * as fs from 'fs';

export interface InstalledArtifactCheck {
    isInstalled: boolean;
    version?: string;
    type?: string;
    installedPath?: string;
    placedFiles?: string[];
}

export interface InstalledArtifactSummary {
    name: string;
    version: string;
    type: string;
    installedPath?: string;
}

/**
 * Normalizes an artifact name from package identifiers (e.g. "org/pkg#v1.0.0" -> "pkg")
 */
export function normalizeArtifactName(rawName: string): string {
    if (!rawName) return '';
    let name = rawName.trim();
    // Remove version tag e.g. #v1.0.0 or #1.0.0
    const hashIdx = name.indexOf('#');
    if (hashIdx !== -1) {
        name = name.substring(0, hashIdx);
    }
    // Remove org prefix e.g. harshpratapsinghrana1/
    const slashIdx = name.lastIndexOf('/');
    if (slashIdx !== -1) {
        name = name.substring(slashIdx + 1);
    }
    // Remove company.cip. prefix if present
    if (name.startsWith('company.cip.')) {
        name = name.substring('company.cip.'.length);
    }
    return name.trim();
}

/**
 * Checks if a specific artifact is installed and verified to exist on local disk in the workspace.
 * If all files for the artifact were deleted from disk, returns isInstalled: false.
 */
export function checkArtifactInstallation(workspaceRoot: string, rawArtifactName: string, fallbackType?: string): InstalledArtifactCheck {
    if (!workspaceRoot || !rawArtifactName) {
        return { isInstalled: false };
    }

    const artifactName = normalizeArtifactName(rawArtifactName);
    const cleanLower = artifactName.toLowerCase();
    const cipInstalledDir = path.join(workspaceRoot, '.cip', 'installed');

    // 1. Check .cip/installed/<artifactName>.json manifest
    const possibleManifests = [
        path.join(cipInstalledDir, `${artifactName}.json`),
        path.join(cipInstalledDir, `${cleanLower}.json`)
    ];

    for (const manifestPath of possibleManifests) {
        if (fs.existsSync(manifestPath)) {
            try {
                const raw = fs.readFileSync(manifestPath, 'utf8');
                const parsed = JSON.parse(raw);
                const placedFiles: string[] = Array.isArray(parsed.PlacedFiles) ? parsed.PlacedFiles :
                                             (Array.isArray(parsed.placedFiles) ? parsed.placedFiles : []);

                // If manifest lists placed files, verify that AT LEAST ONE placed file actually exists on disk!
                if (placedFiles.length > 0) {
                    const anyFileExists = placedFiles.some(rel => {
                        const full = path.join(workspaceRoot, rel.replace(/\//g, path.sep));
                        return fs.existsSync(full);
                    });

                    if (anyFileExists) {
                        return {
                            isInstalled: true,
                            version: parsed.Version || parsed.version || '1.0.0',
                            type: (parsed.ArtifactType || parsed.artifactType || fallbackType || 'agent').toLowerCase(),
                            placedFiles
                        };
                    } else {
                        // All placed files have been deleted from local disk!
                        return { isInstalled: false };
                    }
                }
            } catch {
                // fall through to canonical path checks
            }
        }
    }

    // 2. Check canonical directory & file locations on disk
    const checkPaths = [
        // Agents
        { p: path.join(workspaceRoot, '.github', 'agents', `${cleanLower}.agent.md`), type: 'agent' },
        { p: path.join(workspaceRoot, '.github', 'agents', `${cleanLower}.md`), type: 'agent' },
        { p: path.join(workspaceRoot, '.github', 'agents', cleanLower, `${cleanLower}.agent.md`), type: 'agent' },
        { p: path.join(workspaceRoot, 'agents', `${cleanLower}.agent.md`), type: 'agent' },
        { p: path.join(workspaceRoot, 'agents', `${cleanLower}.md`), type: 'agent' },

        // Skills
        { p: path.join(workspaceRoot, '.agents', 'skills', cleanLower, 'SKILL.md'), type: 'skill' },
        { p: path.join(workspaceRoot, '.github', 'skills', cleanLower, 'SKILL.md'), type: 'skill' },
        { p: path.join(workspaceRoot, 'skills', cleanLower, 'SKILL.md'), type: 'skill' },

        // Prompts
        { p: path.join(workspaceRoot, '.github', 'prompts', `${cleanLower}.prompt.md`), type: 'prompt' },
        { p: path.join(workspaceRoot, '.github', 'prompts', `${cleanLower}.md`), type: 'prompt' },
        { p: path.join(workspaceRoot, 'prompts', `${cleanLower}.prompt.md`), type: 'prompt' },
        { p: path.join(workspaceRoot, 'prompts', `${cleanLower}.md`), type: 'prompt' },

        // MCP Servers
        { p: path.join(workspaceRoot, '.mcp', cleanLower, 'server.json'), type: 'mcpserver' },
        { p: path.join(workspaceRoot, '.mcp', cleanLower, 'package.json'), type: 'mcpserver' },
        { p: path.join(workspaceRoot, '.mcp', cleanLower, 'index.js'), type: 'mcpserver' },
        { p: path.join(workspaceRoot, '.mcp', cleanLower, 'mcp.json'), type: 'mcpserver' },

        // Plugins
        { p: path.join(workspaceRoot, 'plugins', cleanLower, 'plugin.json'), type: 'plugin' },
        { p: path.join(workspaceRoot, '.github', 'plugins', cleanLower, 'plugin.json'), type: 'plugin' },

        // Commands
        { p: path.join(workspaceRoot, '.github', 'commands', `${cleanLower}.command.md`), type: 'command' },
        { p: path.join(workspaceRoot, '.github', 'commands', `${cleanLower}.md`), type: 'command' },
        { p: path.join(workspaceRoot, 'commands', `${cleanLower}.command.md`), type: 'command' },
        { p: path.join(workspaceRoot, 'commands', `${cleanLower}.md`), type: 'command' },

        // Packages
        { p: path.join(workspaceRoot, '.github', 'packages', cleanLower, 'cip.yml'), type: 'package' }
    ];

    for (const item of checkPaths) {
        if (fs.existsSync(item.p)) {
            return {
                isInstalled: true,
                version: '1.0.0',
                type: fallbackType || item.type,
                installedPath: item.p
            };
        }
    }

    // 3. Check cip.yml dependencies
    const cipYmlPath = path.join(workspaceRoot, 'cip.yml');
    if (fs.existsSync(cipYmlPath)) {
        try {
            const content = fs.readFileSync(cipYmlPath, 'utf8');
            const lines = content.split('\n');
            let inDeps = false;
            for (const line of lines) {
                if (line.trim().startsWith('dependencies:')) {
                    inDeps = true;
                    continue;
                }
                if (inDeps) {
                    if (line.startsWith(' ') || line.startsWith('\t')) {
                        const rawDep = line.trim().replace(/^-\s*/, '').trim();
                        const depName = normalizeArtifactName(rawDep).toLowerCase();
                        if (depName === cleanLower) {
                            // Extract version if present (e.g. #v1.0.0)
                            const vMatch = rawDep.match(/#v?([0-9\.]+)/);
                            const ver = vMatch ? vMatch[1] : '1.0.0';

                            // Verify at least one file/dir exists for this dependency
                            const possibleDirs = [
                                path.join(workspaceRoot, '.github', 'agents', cleanLower),
                                path.join(workspaceRoot, 'agents', cleanLower),
                                path.join(workspaceRoot, 'skills', cleanLower),
                                path.join(workspaceRoot, '.agents', 'skills', cleanLower),
                                path.join(workspaceRoot, 'plugins', cleanLower),
                                path.join(workspaceRoot, '.mcp', cleanLower)
                            ];
                            if (possibleDirs.some(d => fs.existsSync(d))) {
                                return {
                                    isInstalled: true,
                                    version: ver,
                                    type: fallbackType || 'agent'
                                };
                            }
                        }
                    } else if (line.trim().length > 0 && !line.trim().startsWith('#')) {
                        break;
                    }
                }
            }
        } catch { }
    }

    return { isInstalled: false };
}

/**
 * Returns all currently installed artifacts in the workspace that actually exist on local disk.
 */
export function getAllInstalledArtifacts(workspaceRoot: string): InstalledArtifactSummary[] {
    if (!workspaceRoot) return [];

    const results = new Map<string, InstalledArtifactSummary>();
    const cipInstalledDir = path.join(workspaceRoot, '.cip', 'installed');

    // 1. Scan .cip/installed/*.json manifests
    if (fs.existsSync(cipInstalledDir)) {
        try {
            const files = fs.readdirSync(cipInstalledDir);
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                const fullPath = path.join(cipInstalledDir, file);
                try {
                    const raw = fs.readFileSync(fullPath, 'utf8');
                    const parsed = JSON.parse(raw);
                    const name = parsed.ArtifactName || parsed.artifactName || path.basename(file, '.json');
                    const placedFiles: string[] = Array.isArray(parsed.PlacedFiles) ? parsed.PlacedFiles :
                                                 (Array.isArray(parsed.placedFiles) ? parsed.placedFiles : []);

                    // Verify that at least one placed file exists on disk
                    const anyExists = placedFiles.length === 0 || placedFiles.some(rel => {
                        return fs.existsSync(path.join(workspaceRoot, rel.replace(/\//g, path.sep)));
                    });

                    if (anyExists) {
                        const cleanName = normalizeArtifactName(name);
                        results.set(cleanName.toLowerCase(), {
                            name: cleanName,
                            version: parsed.Version || parsed.version || '1.0.0',
                            type: (parsed.ArtifactType || parsed.artifactType || 'agent').toLowerCase()
                        });
                    }
                } catch { }
            }
        } catch { }
    }

    // 2. Scan workspace canonical directories
    const scanLocations = [
        { dir: path.join(workspaceRoot, '.github', 'agents'), type: 'agent' },
        { dir: path.join(workspaceRoot, 'agents'), type: 'agent' },
        { dir: path.join(workspaceRoot, '.agents', 'skills'), type: 'skill' },
        { dir: path.join(workspaceRoot, 'skills'), type: 'skill' },
        { dir: path.join(workspaceRoot, '.github', 'skills'), type: 'skill' },
        { dir: path.join(workspaceRoot, '.github', 'prompts'), type: 'prompt' },
        { dir: path.join(workspaceRoot, 'prompts'), type: 'prompt' },
        { dir: path.join(workspaceRoot, '.mcp'), type: 'mcpserver' },
        { dir: path.join(workspaceRoot, 'plugins'), type: 'plugin' },
        { dir: path.join(workspaceRoot, '.github', 'commands'), type: 'command' },
        { dir: path.join(workspaceRoot, 'commands'), type: 'command' },
        { dir: path.join(workspaceRoot, '.github', 'packages'), type: 'package' }
    ];

    for (const loc of scanLocations) {
        if (!fs.existsSync(loc.dir)) continue;
        try {
            const entries = fs.readdirSync(loc.dir, { withFileTypes: true });
            for (const entry of entries) {
                const rawName = entry.name;
                const cleanName = normalizeArtifactName(
                    rawName.replace(/\.agent\.md$/i, '')
                           .replace(/\.skill\.md$/i, '')
                           .replace(/\.prompt\.md$/i, '')
                           .replace(/\.command\.md$/i, '')
                           .replace(/\.agent$/i, '')
                           .replace(/\.prompt$/i, '')
                           .replace(/\.skill$/i, '')
                           .replace(/\.md$/i, '')
                           .replace(/\.json$/i, '')
                           .replace(/\.ya?ml$/i, '')
                );

                if (!cleanName || cleanName.startsWith('.') || cleanName === 'readme' || cleanName === 'license') {
                    continue;
                }

                // If entry is a directory, ensure it contains the actual artifact definition file
                if (entry.isDirectory()) {
                    const fullSub = path.join(loc.dir, entry.name);
                    let validArtifact = false;
                    if (loc.type === 'skill') {
                        validArtifact = fs.existsSync(path.join(fullSub, 'SKILL.md')) || fs.existsSync(path.join(fullSub, 'skill.md'));
                    } else if (loc.type === 'plugin') {
                        validArtifact = fs.existsSync(path.join(fullSub, 'plugin.json')) || fs.existsSync(path.join(fullSub, '.github', 'plugins', cleanName, 'plugin.json'));
                    } else if (loc.type === 'mcpserver') {
                        validArtifact = fs.existsSync(path.join(fullSub, 'server.json')) || fs.existsSync(path.join(fullSub, 'package.json')) || fs.existsSync(path.join(fullSub, 'index.js')) || fs.existsSync(path.join(fullSub, 'mcp.json'));
                    } else if (loc.type === 'agent') {
                        validArtifact = fs.existsSync(path.join(fullSub, `${cleanName}.agent.md`)) || fs.existsSync(path.join(fullSub, `${cleanName}.md`)) || fs.existsSync(path.join(fullSub, 'agent.md'));
                    } else if (loc.type === 'package') {
                        validArtifact = fs.existsSync(path.join(fullSub, 'cip.yml')) || fs.existsSync(path.join(fullSub, 'cip.yaml'));
                    } else {
                        validArtifact = true;
                    }
                    if (!validArtifact) continue;
                }

                if (!results.has(cleanName.toLowerCase())) {
                    results.set(cleanName.toLowerCase(), {
                        name: cleanName,
                        version: '1.0.0',
                        type: loc.type,
                        installedPath: path.join(loc.dir, entry.name)
                    });
                }
            }
        } catch { }
    }

    // 3. Scan cip.yml dependencies
    const cipYmlPath = path.join(workspaceRoot, 'cip.yml');
    if (fs.existsSync(cipYmlPath)) {
        try {
            const content = fs.readFileSync(cipYmlPath, 'utf8');
            const lines = content.split('\n');
            let inDeps = false;
            for (const line of lines) {
                if (line.trim().startsWith('dependencies:')) {
                    inDeps = true;
                    continue;
                }
                if (inDeps) {
                    if (line.startsWith(' ') || line.startsWith('\t')) {
                        const rawDep = line.trim().replace(/^-\s*/, '').trim();
                        if (rawDep && !rawDep.startsWith('#') && rawDep !== 'cip:') {
                            const cleanName = normalizeArtifactName(rawDep);
                            const vMatch = rawDep.match(/#v?([0-9\.]+)/);
                            const ver = vMatch ? vMatch[1] : '1.0.0';

                            // Check if this artifact exists on disk
                            const check = checkArtifactInstallation(workspaceRoot, cleanName);
                            if (check.isInstalled && !results.has(cleanName.toLowerCase())) {
                                results.set(cleanName.toLowerCase(), {
                                    name: cleanName,
                                    version: ver,
                                    type: check.type || 'package'
                                });
                            }
                        }
                    } else if (line.trim().length > 0 && !line.trim().startsWith('#')) {
                        break;
                    }
                }
            }
        } catch { }
    }

    return Array.from(results.values());
}
