const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const artifactsDir = path.join(rootDir, 'artifacts-json');
const skillsDir = path.join(rootDir, '.agents', 'skills');
const artifactsMdDir = path.join(rootDir, 'artifacts');
const playbookDir = path.join(rootDir, '.agents', 'prompts', 'playbook');

const catalog = [];
const seen = new Set();

function parseFrontmatter(content) {
    const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/);
    if (!match) return { meta: {}, body: content };
    const meta = {};
    const lines = match[1].split(/\r?\n/);
    let currentKey = null;
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        if (trimmed.startsWith('- ') && currentKey) {
            if (!Array.isArray(meta[currentKey])) meta[currentKey] = [];
            meta[currentKey].push(trimmed.slice(2).trim().replace(/^['"]|['"]$/g, ''));
            continue;
        }
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx > 0) {
            currentKey = trimmed.slice(0, colonIdx).trim();
            const val = trimmed.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
            if (val === '') {
                meta[currentKey] = [];
            } else if (val.startsWith('[') && val.endsWith(']')) {
                try {
                    meta[currentKey] = JSON.parse(val);
                } catch {
                    meta[currentKey] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
                }
            } else {
                meta[currentKey] = val;
            }
        }
    }
    return { meta, body: match[2] };
}

// 1. Ingest from .agents/skills
if (fs.existsSync(skillsDir)) {
    for (const name of fs.readdirSync(skillsDir)) {
        const sPath = path.join(skillsDir, name, 'SKILL.md');
        if (fs.existsSync(sPath)) {
            const raw = fs.readFileSync(sPath, 'utf8');
            const { meta } = parseFrontmatter(raw);
            const artName = meta.name || name;
            const clean = artName.toLowerCase();
            if (!seen.has(clean)) {
                seen.add(clean);
                catalog.push({
                    id: artName,
                    name: artName,
                    title: meta.title || artName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    type: meta.type || 'skill',
                    version: meta.version || '1.0.0',
                    category: meta.category || meta.domain || 'Engineering',
                    domain: meta.domain || meta.category || 'Engineering',
                    description: meta.description || '',
                    tags: Array.isArray(meta.tags) ? meta.tags : [],
                    useCases: Array.isArray(meta.useCases) ? meta.useCases : [],
                    keyFeatures: Array.isArray(meta.keyFeatures) ? meta.keyFeatures : [],
                    isCertified: true,
                    installCommand: 'engineering-commons install ' + clean
                });
            }
        }
    }
}

// 2. Ingest from artifacts/*.md
if (fs.existsSync(artifactsMdDir)) {
    for (const f of fs.readdirSync(artifactsMdDir)) {
        if (!f.endsWith('.md') || f === 'README.md') continue;
        const filePath = path.join(artifactsMdDir, f);
        const raw = fs.readFileSync(filePath, 'utf8');
        const { meta } = parseFrontmatter(raw);
        if (meta.name) {
            const artName = meta.name;
            const clean = artName.toLowerCase();
            if (!seen.has(clean)) {
                seen.add(clean);
                catalog.push({
                    id: artName,
                    name: artName,
                    title: meta.title || artName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    type: meta.type || 'skill',
                    version: meta.version || '1.0.0',
                    category: meta.category || meta.domain || 'Engineering',
                    domain: meta.domain || meta.category || 'Engineering',
                    description: meta.description || '',
                    tags: Array.isArray(meta.tags) ? meta.tags : [],
                    useCases: Array.isArray(meta.useCases) ? meta.useCases : [],
                    keyFeatures: Array.isArray(meta.keyFeatures) ? meta.keyFeatures : [],
                    isCertified: true,
                    installCommand: 'engineering-commons install ' + clean
                });
            }
        }
    }
}

// 3. Ingest from artifacts-json
if (fs.existsSync(artifactsDir)) {
    for (const f of fs.readdirSync(artifactsDir)) {
        if (!f.endsWith('.json') || f === 'all-artifacts-bundle.json') continue;
        try {
            const item = JSON.parse(fs.readFileSync(path.join(artifactsDir, f), 'utf8'));
            const rawName = (item.name || item.id || f.replace('.json', '')).trim();
            const clean = rawName.replace(/^leap-/, '').toLowerCase();
            if (!seen.has(clean)) {
                seen.add(clean);
                const useCases = (Array.isArray(item.useCases) && item.useCases.length > 0)
                    ? item.useCases
                    : (Array.isArray(item.keyFeatures) ? item.keyFeatures.slice(0, 4) : []);
                const entry = {
                    id: rawName,
                    name: rawName,
                    title: item.title || rawName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    type: item.type || 'agent',
                    version: item.version || '1.0.0',
                    category: item.category || item.domain || 'Engineering',
                    subcategory: item.subcategory || item.stage || '',
                    domain: item.domain || item.category || 'Engineering',
                    description: item.description || '',
                    tags: Array.isArray(item.techStack) ? item.techStack : (Array.isArray(item.tags) ? item.tags : []),
                    useCases: useCases,
                    keyFeatures: Array.isArray(item.keyFeatures) ? item.keyFeatures : [],
                    isCertified: Boolean(item.isCertified),
                    installCommand: 'engineering-commons install ' + clean
                };
                if (item.copilotPrompt) entry.copilotPrompt = item.copilotPrompt;
                if (item.output) entry.output = item.output;
                if (item.task) entry.task = item.task;
                if (Array.isArray(item.files) && item.files.length > 0) entry.files = item.files;
                catalog.push(entry);
            }
        } catch (e) {}
    }
}

// 4. Ingest from .agents/prompts/playbook/*.md
if (fs.existsSync(playbookDir)) {
    for (const f of fs.readdirSync(playbookDir)) {
        if (!f.endsWith('.md') || f === 'README.md') continue;
        const filePath = path.join(playbookDir, f);
        const raw = fs.readFileSync(filePath, 'utf8');
        const { meta } = parseFrontmatter(raw);
        if (meta.name) {
            const artName = meta.name;
            const clean = artName.toLowerCase();
            if (!seen.has(clean)) {
                seen.add(clean);
                catalog.push({
                    id: artName,
                    name: artName,
                    title: meta.title || artName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    type: 'prompt',
                    version: meta.version || '1.0.0',
                    category: 'Prompt Playbook',
                    subcategory: meta.subcategory || meta.stage || 'Data Engineering',
                    domain: 'Data Engineering',
                    description: meta.description || '',
                    tags: Array.isArray(meta.tags) ? meta.tags : ['azure-bi', 'playbook', 'prompt'],
                    useCases: [meta.subcategory || 'Data Engineering Prompt', 'Azure BI & Fabric Development'],
                    keyFeatures: [
                        'Certified prompt from Azure BI & Data Engineering Playbook',
                        'Ready to run in Copilot & Antigravity Chat'
                    ],
                    isCertified: true,
                    installCommand: 'engineering-commons install ' + clean
                });
            }
        }
    }
}

// Save compiled catalog to all destinations
const outTargets = [
    path.join(rootDir, 'engineering-commons-vscode', 'resources', 'catalog', 'masterCatalog.json'),
    path.join(rootDir, 'api', 'artifacts-catalog.json'),
    path.join(rootDir, '.github', 'skills', 'engineering-commons-advisor', 'references', 'catalog.json')
];

const userExtMaster = path.join(process.env.USERPROFILE || '', '.vscode', 'extensions', 'company.engineering-commons-vscode-1.2.5', 'resources', 'catalog', 'masterCatalog.json');
if (fs.existsSync(path.dirname(userExtMaster))) {
    outTargets.push(userExtMaster);
}

for (const target of outTargets) {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(target, JSON.stringify(catalog, null, 2), 'utf8');
    console.log(`[Catalog] Compiled ${catalog.length} artifacts to ${target}`);
}
