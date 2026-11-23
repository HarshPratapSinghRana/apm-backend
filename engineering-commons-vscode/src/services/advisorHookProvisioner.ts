import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { IAuthenticationStatusProvider } from './authenticationStatusProvider';

export const ADVISOR_SKILL_NAME = 'engineering-commons-advisor';

export const ADVISOR_SKILL_MD = `---
name: engineering-commons-advisor
description: Autonomous Engineering Commons AI Artifact Advisor & Matcher. Analyzes developer requirements and searches the Engineering Commons catalog to recommend, match, and install the best-fit AI agents, skills, MCP servers, and prompt templates.
type: skill
version: 1.0.0
domain: AI Governance & Artifact Discovery
category: Developer Tools
tags:
  - engineering-commons
  - artifact-discovery
  - copilot-assistant
  - recommendation-engine
  - cip
argument-hint: 'Ask @copilot or engineering-commons-advisor to find artifacts, recommend tools for your current task, or search Engineering Commons'
---

# Engineering Commons Artifact Advisor & Matcher Skill

The **Engineering Commons Advisor** is an autonomous intelligence skill for GitHub Copilot, Antigravity, and Claude. It connects developers directly to the **Engineering Commons Enterprise AI Registry**, instantly identifying, matching, and recommending the highest-impact certified artifacts (agents, skills, prompts, packages, and MCP servers) for any technical problem or workflow.

---

## 🎯 When to Activate This Skill

Activate this skill whenever:
1. A developer asks questions like:
   - *"Is there an artifact in Engineering Commons for [problem]?"*
   - *"How can I automate [testing / API validation / database migrations / security review]?"*
   - *"What tool or agent should I use to [solve problem]?"*
   - *"Recommend the best Engineering Commons artifacts for my workspace."*
2. A developer encounters a complex engineering workflow and needs enterprise-certified tooling (e.g., zero-downtime database migrations, Playwright E2E synthesis, GraphQL schema linting, Terraform security compliance, FinOps cost auditing).

---

## 🔍 How to Discover & Match Artifacts

### Step 1: Read the Catalog
Inspect the local Engineering Commons catalog reference located at:
- \`.github/skills/engineering-commons-advisor/references/catalog.json\`
- Or \`.agents/skills/engineering-commons-advisor/references/catalog.json\`
- Or run \`engineering-commons list\` in the terminal for the live synced registry.

### Step 2: Semantic Intent & Keyword Matching
Score candidate artifacts by matching user requirements against:
- **\`useCases\`**: Exact business/engineering problems solved.
- **\`keyFeatures\`**: Built-in capabilities.
- **\`tags\` / \`techStack\`**: Matching programming languages (TypeScript, C#, Python, SQL), frameworks (xUnit, Playwright, Apollo, Terraform), or cloud providers (Azure, AWS).
- **\`description\` & \`domain\`**: Core domain relevance.

### Step 3: Present Structured Recommendations
Always format your response with high clarity and actionable installation steps:

\`\`\`markdown
### 🏆 Recommended Artifact: [<Artifact Title> (\`<artifact-name>\`)]
- **Type**: \`<artifactType>\` (e.g. \`skill\`, \`agent\`, \`prompt\`, \`mcpserver\`)
- **Domain**: \`<domain>\` | **Certification**: Verified Enterprise Certified ✅
- **Why It's the Best Match**:
  <Explain precisely how this artifact solves the user's specific problem>
- **Key Capabilities**:
  - <Capability 1>
  - <Capability 2>
  - <Capability 3>

#### 📦 Installation
Run in terminal:
\`\`\`bash
engineering-commons install <artifact-name>
\`\`\`
*Or in VS Code: Open the **Engineering Commons** activity bar tab, find \`<artifact-name>\`, and click **Install**.*

#### 🚀 How to Use Once Installed
<Explain how to invoke it, e.g. @<artifact-name> in Copilot, or using the prompt / skill instructions>
\`\`\`

## ⚡ Zero-API Direct Disk Access
All artifact frontmatter, descriptions, capabilities, use cases, and metadata are automatically loaded into your workspace in a **single API call** when logging into the Engineering Commons extension and opening the marketplace.
They are pre-cached directly in:
\`\`\`
.github/skills/engineering-commons-advisor/references/catalog.json
\`\`\`
**No external API call is ever made by this skill.** You have immediate, offline-ready direct disk access to the entire catalog and its frontmatter.

---

## 🔐 Authentication & Marketplace Sync Note
- The local catalog reference provides immediate, offline-ready matching for all core artifacts with zero API calls.
- When logged into Engineering Commons (\`engineeringCommons.login\` or \`engineering-commons login\`) and opening the marketplace, all latest and private enterprise artifacts are loaded in a single API call and cached directly to disk for this skill.
`;

export const FIND_ARTIFACT_PROMPT_MD = `---
name: find-artifact
description: Find and recommend the best-matching Engineering Commons AI artifacts for your task or engineering challenge
argument-hint: 'Describe your requirement or technical problem (e.g., "automated API tests with xUnit", "database migration safety", "FinOps")'
---

Read the Engineering Commons catalog at \`.github/skills/engineering-commons-advisor/references/catalog.json\` and recommend the top 1-3 best-matching artifacts for the following developer need:

**User Requirement**: {{input}}

Follow the guidelines in the \`engineering-commons-advisor\` skill:
1. Explain why each artifact is the best match.
2. Outline key capabilities and use cases.
3. Provide the exact installation command (\`engineering-commons install <name>\`).
4. Detail how to invoke and execute the artifact with GitHub Copilot once installed.
`;

export const COPILOT_INSTRUCTIONS_HEADER = `## Engineering Commons AI Artifact Advisor & Discovery`;
export const COPILOT_INSTRUCTIONS_SNIPPET = `
## Engineering Commons AI Artifact Advisor & Discovery
This workspace is integrated with **Engineering Commons**.
Whenever a user asks for tools, skills, agents, prompts, or workflows to solve an engineering problem (such as testing, security auditing, database migrations, GraphQL governance, FinOps, or code review):

1. Consult the Engineering Commons catalog in \`.github/skills/engineering-commons-advisor/references/catalog.json\` or activate the \`engineering-commons-advisor\` skill.
2. Recommend the best-matching enterprise-certified AI artifact from Engineering Commons.
3. Provide the exact command to install it: \`engineering-commons install <artifact-name>\`.
`;

export class AdvisorHookProvisioner {
    /**
     * Provisions the advisor skill, copilot instructions, and prompt templates into workspace folders.
     * Guaranteed ZERO API / network calls. Uses bundled catalog and templates only.
     */
    public static provisionWorkspaceHooks(workspaceRoot: string, extensionUri?: vscode.Uri): boolean {
        if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
            return false;
        }

        try {
            // 1. Load bundled offline catalog from extension resources
            let masterCatalogJson = '[]';
            if (extensionUri) {
                const catalogPath = path.join(extensionUri.fsPath, 'resources', 'catalog', 'masterCatalog.json');
                if (fs.existsSync(catalogPath)) {
                    try {
                        masterCatalogJson = fs.readFileSync(catalogPath, 'utf8');
                    } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }
                }
            }

            // Fallback: check workspace relative resources if run during development/testing
            if (masterCatalogJson === '[]') {
                const candidates = [
                    path.join(__dirname, '..', '..', '..', 'resources', 'catalog', 'masterCatalog.json'),
                    path.join(__dirname, '..', '..', 'resources', 'catalog', 'masterCatalog.json'),
                    path.join(__dirname, '..', 'resources', 'catalog', 'masterCatalog.json'),
                    path.join(process.cwd(), 'engineering-commons-vscode', 'resources', 'catalog', 'masterCatalog.json'),
                    path.join(process.cwd(), 'resources', 'catalog', 'masterCatalog.json')
                ];
                for (const cand of candidates) {
                    if (fs.existsSync(cand)) {
                        try {
                            const content = fs.readFileSync(cand, 'utf8');
                            if (content && content.trim() !== '[]') {
                                masterCatalogJson = content;
                                break;
                            }
                        } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }
                    }
                }
            }

            try {
                const parsedCat = JSON.parse(masterCatalogJson);
                if (Array.isArray(parsedCat)) {
                    for (const item of parsedCat) {
                        if (!item.installCommand && (item.name || item.id)) {
                            item.installCommand = 'engineering-commons install ' + (item.name || item.id);
                        }
                    }
                    masterCatalogJson = JSON.stringify(parsedCat, null, 2);
                }
            } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }

            // 2. Install .github/skills/engineering-commons-advisor/SKILL.md
            const githubSkillDir = path.join(workspaceRoot, '.github', 'skills', ADVISOR_SKILL_NAME);
            const githubRefDir = path.join(githubSkillDir, 'references');
            if (!fs.existsSync(githubRefDir)) {
                fs.mkdirSync(githubRefDir, { recursive: true });
            }
            fs.writeFileSync(path.join(githubSkillDir, 'SKILL.md'), ADVISOR_SKILL_MD, 'utf8');
            fs.writeFileSync(path.join(githubRefDir, 'catalog.json'), masterCatalogJson, 'utf8');

            // 3. Install .agents/skills/engineering-commons-advisor/SKILL.md
            const agentsSkillDir = path.join(workspaceRoot, '.agents', 'skills', ADVISOR_SKILL_NAME);
            const agentsRefDir = path.join(agentsSkillDir, 'references');
            if (!fs.existsSync(agentsRefDir)) {
                fs.mkdirSync(agentsRefDir, { recursive: true });
            }
            fs.writeFileSync(path.join(agentsSkillDir, 'SKILL.md'), ADVISOR_SKILL_MD, 'utf8');
            fs.writeFileSync(path.join(agentsRefDir, 'catalog.json'), masterCatalogJson, 'utf8');

            // 4. Install .github/prompts/find-artifact.prompt.md
            const promptsDir = path.join(workspaceRoot, '.github', 'prompts');
            if (!fs.existsSync(promptsDir)) {
                fs.mkdirSync(promptsDir, { recursive: true });
            }
            fs.writeFileSync(path.join(promptsDir, 'find-artifact.prompt.md'), FIND_ARTIFACT_PROMPT_MD, 'utf8');

            // 5. Install or update .github/copilot-instructions.md
            const githubDir = path.join(workspaceRoot, '.github');
            if (!fs.existsSync(githubDir)) {
                fs.mkdirSync(githubDir, { recursive: true });
            }
            const copilotInstructionsPath = path.join(githubDir, 'copilot-instructions.md');
            if (!fs.existsSync(copilotInstructionsPath)) {
                fs.writeFileSync(copilotInstructionsPath, `# GitHub Copilot Workspace Instructions\n${COPILOT_INSTRUCTIONS_SNIPPET}\n`, 'utf8');
            } else {
                const existing = fs.readFileSync(copilotInstructionsPath, 'utf8');
                if (!existing.includes(COPILOT_INSTRUCTIONS_HEADER)) {
                    fs.writeFileSync(copilotInstructionsPath, existing.trim() + '\n\n' + COPILOT_INSTRUCTIONS_SNIPPET + '\n', 'utf8');
                }
            }

            // 6. Ensure cip.yml exists
            const cipYmlPath = path.join(workspaceRoot, 'cip.yml');
            if (!fs.existsSync(cipYmlPath)) {
                fs.writeFileSync(cipYmlPath, 'name: workspace\nversion: 1.0.0\ntype: workspace\n', 'utf8');
            }

            return true;
        } catch (e) {
            console.warn('[AdvisorHookProvisioner] Failed to provision workspace hooks:', e);
            return false;
        }
    }

    /**
     * Listens to authentication changes and synchronizes the catalog only AFTER user logs in.
     */
    public static registerAuthSync(
        authProvider: IAuthenticationStatusProvider,
        backendUrl: string,
        workspaceRootSupplier: () => string | undefined,
        context?: vscode.ExtensionContext
    ): vscode.Disposable {
        const syncCatalog = async () => {
            const isAuth = await authProvider.isAuthenticated();
            if (!isAuth) {
                return;
            }

            const token = await authProvider.getToken();
            if (!token) {
                return;
            }

            const workspaceRoot = workspaceRootSupplier();
            if (!workspaceRoot) {
                return;
            }

            try {
                // Fetch latest marketplace catalog from backend in a single API call
                const url = (backendUrl || 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io').replace(/\/+$/, '') + '/api/artifacts';
                const items = await AdvisorHookProvisioner.fetchJsonAsync<any[]>(url, token);
                if (Array.isArray(items) && items.length > 0) {
                    AdvisorHookProvisioner.syncLiveCatalogFromArtifacts(items, workspaceRoot);
                }
            } catch (e) {
                // Fail silently on network errors
            }
        };

        // Listen to login event
        const sub = authProvider.onDidChangeAuthentication((isAuth) => {
            if (isAuth) {
                syncCatalog().catch(() => {});
            }
        });

        // If already authenticated on startup, sync live catalog
        authProvider.isAuthenticated().then((isAuth) => {
            if (isAuth) {
                syncCatalog().catch(() => {});
            }
        }).catch(() => {});

        if (context) {
            context.subscriptions.push(sub);
        }

        return sub;
    }

    /**
     * Persists all marketplace artifacts with full frontmatter, descriptions, capabilities, and use cases
     * directly into the workspace skill references from a single marketplace load.
     * Guarantees that skills (GitHub Copilot, Antigravity) can read all frontmatter locally with ZERO API calls.
     */
    public static syncLiveCatalogFromArtifacts(items: any[], workspaceRoot?: string): boolean {
        if (!Array.isArray(items) || items.length === 0) {
            return false;
        }

        const ws = workspaceRoot || (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
            ? vscode.workspace.workspaceFolders[0].uri.fsPath
            : undefined);

        if (!ws || !fs.existsSync(ws)) {
            return false;
        }

        try {
            const catalogRefPath = path.join(ws, '.github', 'skills', ADVISOR_SKILL_NAME, 'references', 'catalog.json');
            const agentsRefPath = path.join(ws, '.agents', 'skills', ADVISOR_SKILL_NAME, 'references', 'catalog.json');
            const cipCachePath = path.join(ws, '.cip', 'catalog-cache.json');

            // Read existing catalog to merge
            let existingCatalog: any[] = [];
            if (fs.existsSync(catalogRefPath)) {
                try {
                    existingCatalog = JSON.parse(fs.readFileSync(catalogRefPath, 'utf8'));
                } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }
            }

            const mergedMap = new Map<string, any>();
            for (const item of existingCatalog) {
                const clean = (item.name || item.id || '').replace(/^leap-/, '').toLowerCase();
                if (clean) mergedMap.set(clean, item);
            }

            for (const item of items) {
                const rawName = (item.name || item.id || item.rawId || '').trim();
                const clean = rawName.replace(/^leap-/, '').toLowerCase();
                if (!clean) continue;

                const existing = mergedMap.get(clean) || {};
                const useCases = (Array.isArray(item.useCases) && item.useCases.length > 0)
                    ? item.useCases
                    : (Array.isArray(item.keyFeatures) && item.keyFeatures.length > 0
                        ? item.keyFeatures.slice(0, 4)
                        : existing.useCases || []);

                const keyFeatures = (Array.isArray(item.keyFeatures) && item.keyFeatures.length > 0)
                    ? item.keyFeatures
                    : existing.keyFeatures || [];

                const tags = Array.isArray(item.techStack) && item.techStack.length > 0
                    ? item.techStack
                    : (Array.isArray(item.tags) && item.tags.length > 0 ? item.tags : existing.tags || []);

                mergedMap.set(clean, {
                    ...existing,
                    id: item.id || rawName,
                    name: rawName,
                    title: item.title || existing.title || rawName.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                    type: item.type || existing.type || 'agent',
                    version: item.version || existing.version || '1.0.0',
                    category: item.category || item.domain || existing.category || 'Engineering',
                    domain: item.domain || item.category || existing.domain || 'Engineering',
                    description: item.description || existing.description || '',
                    tags: tags,
                    useCases: useCases,
                    keyFeatures: keyFeatures,
                    isCertified: Boolean(item.isCertified !== undefined ? item.isCertified : existing.isCertified),
                    installCommand: 'engineering-commons install ' + clean
                });
            }

            const updatedCatalog = Array.from(mergedMap.values());
            const updatedStr = JSON.stringify(updatedCatalog, null, 2);

            const writeIfChanged = (targetPath: string, content: string) => {
                try {
                    if (fs.existsSync(targetPath)) {
                        const current = fs.readFileSync(targetPath, 'utf8');
                        if (current === content) {
                            return; // Content is unchanged, do not write
                        }
                    }
                    const dir = path.dirname(targetPath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    fs.writeFileSync(targetPath, content, 'utf8');
                } catch (err) {
            console.debug('[EngineeringCommons] Handled error:', err);
        }
            };

            writeIfChanged(catalogRefPath, updatedStr);
            writeIfChanged(agentsRefPath, updatedStr);
            writeIfChanged(cipCachePath, updatedStr);

            return true;
        } catch (e) {
            console.warn('[AdvisorHookProvisioner] Failed to sync live catalog from artifacts:', e);
            return false;
        }
    }

    private static fetchJsonAsync<T>(urlStr: string, token: string): Promise<T | null> {
        return new Promise((resolve) => {
            try {
                const url = new URL(urlStr);
                const isHttps = url.protocol === 'https:';
                const client = isHttps ? https : http;

                const options = {
                    hostname: url.hostname,
                    port: url.port || (isHttps ? 443 : 80),
                    path: url.pathname + url.search,
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    timeout: 8000
                };

                const req = client.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const parsed = data ? JSON.parse(data) : null;
                            resolve(parsed);
                        } catch {
                            resolve(null);
                        }
                    });
                });

                req.on('error', () => resolve(null));
                req.on('timeout', () => {
                    req.destroy();
                    resolve(null);
                });
                req.end();
            } catch {
                resolve(null);
            }
        });
    }
}
