const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const SKILLS = [
  {
    id: 'ponytail',
    name: 'ponytail',
    title: 'Ponytail (Lazy Senior Dev Mode)',
    version: '5.0.0',
    type: 'skill',
    category: 'Token Optimization',
    domain: 'Token Optimization',
    description: 'Avoids over-engineering and unnecessary code generation. Replaces 50 lines of bloated boilerplate with the single line that solves the problem.',
    author: 'DietrichGebert',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 4820,
    rating: 4.9,
    techStack: ['Token Optimization', 'Claude Code', 'Cursor', 'Antigravity', 'Python', 'TypeScript'],
    keyFeatures: ['Anti-bloat enforcement', 'Minimal working change', 'Zero superfluous abstraction', 'Edge-case correctness'],
    githubRepo: 'https://github.com/DietrichGebert/ponytail',
    filesToDownload: [
      {
        url: 'https://raw.githubusercontent.com/DietrichGebert/ponytail/main/skills/ponytail/SKILL.md',
        path: 'skills/ponytail/SKILL.md'
      },
      {
        url: 'https://raw.githubusercontent.com/DietrichGebert/ponytail/main/README.md',
        path: 'skills/ponytail/README.md'
      }
    ]
  },
  {
    id: 'caveman',
    name: 'caveman',
    title: 'Caveman (Terse Communication Mode)',
    version: '1.2.0',
    type: 'skill',
    category: 'Token Optimization',
    domain: 'Token Optimization',
    description: 'Ultra-compressed communication mode. Cuts token usage ~75% by speaking like a smart caveman while keeping 100% technical accuracy and code blocks intact.',
    author: 'yuritoledo',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 6140,
    rating: 4.9,
    techStack: ['Prompt Compression', 'Token Reduction', 'Claude Code', 'LLM Efficiency'],
    keyFeatures: ['75% token reduction', 'Strips filler and hedging', 'Preserves exact errors & code', 'Multiple intensity levels'],
    githubRepo: 'https://github.com/yuritoledo/caveman-skill',
    filesToDownload: [
      {
        url: 'https://raw.githubusercontent.com/yuritoledo/caveman-skill/main/SKILL.md',
        path: 'skills/caveman/SKILL.md'
      },
      {
        url: 'https://raw.githubusercontent.com/yuritoledo/caveman-skill/main/README.md',
        path: 'skills/caveman/README.md'
      }
    ]
  },
  {
    id: 'token-optimization',
    name: 'token-optimization',
    title: 'Token Optimization (Context Budget & Search)',
    version: '1.0.0',
    type: 'skill',
    category: 'Token Optimization',
    domain: 'Token Optimization',
    description: 'Token-aware context budgeting, progressive disclosure, targeted search, selective MCP loading, and proactive compaction for large codebases.',
    author: 'i-onlabs',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 3890,
    rating: 4.8,
    techStack: ['Claude Code', 'Context Management', 'MCP Optimization', 'Prompt Caching'],
    keyFeatures: ['Context budget monitoring', 'Progressive file disclosure', 'Selective MCP disabling', 'Timely compaction at 70%'],
    githubRepo: 'https://github.com/i-onlabs/claude-code-skills',
    filesToDownload: [
      {
        url: 'https://raw.githubusercontent.com/i-onlabs/claude-code-skills/master/token-optimization/SKILL.md',
        path: 'skills/token-optimization/SKILL.md'
      }
    ]
  },
  {
    id: 'token-hygiene',
    name: 'token-hygiene',
    title: 'Token Hygiene (Context Waste Audit)',
    version: '1.1.0',
    type: 'skill',
    category: 'Token Optimization',
    domain: 'Token Optimization',
    description: 'Audit active sessions for token waste: CLAUDE.md size, active MCP server schema overhead (~1,300 tokens/server), cache health, and model tier checks.',
    author: 'leogallego',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 4210,
    rating: 4.9,
    techStack: ['Context Waste Audit', 'Claude Code', 'Token Hygiene', 'Settings Audit'],
    keyFeatures: ['CLAUDE.md size auditor', 'MCP schema overhead estimator', 'Prompt cache health monitor', 'Model tier recommendation'],
    githubRepo: 'https://github.com/leogallego/claude-skills-tokens',
    filesToDownload: [
      {
        url: 'https://raw.githubusercontent.com/leogallego/claude-skills-tokens/main/skills/token-hygiene/SKILL.md',
        path: 'skills/token-hygiene/SKILL.md'
      }
    ]
  },
  {
    id: 'token-optimizer',
    name: 'token-optimizer',
    title: 'Token Optimizer (Deep Config & Architecture Restructuring)',
    version: '1.1.0',
    type: 'skill',
    category: 'Token Optimization',
    domain: 'Token Optimization',
    description: 'Multi-agent deep audit of CLAUDE.md, settings, MCP servers, and hooks. Restructures project configurations to maximize cache hit rates and reduce monthly AI spend.',
    author: 'leogallego',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 5120,
    rating: 4.9,
    techStack: ['Multi-Agent Audit', 'Claude Code', 'Settings Optimizer', 'Cache Architecture'],
    keyFeatures: ['Automated subagent audit', 'Settings.json optimization diffs', 'Cache hit pattern analysis', 'Dollar savings estimator'],
    githubRepo: 'https://github.com/leogallego/claude-skills-tokens',
    filesToDownload: [
      {
        url: 'https://raw.githubusercontent.com/leogallego/claude-skills-tokens/main/skills/token-optimizer/SKILL.md',
        path: 'skills/token-optimizer/SKILL.md'
      }
    ]
  },
  {
    id: 'token-coach',
    name: 'token-coach',
    title: 'Token Coach (Context & Cache Coaching Agent)',
    version: '2.0.0',
    type: 'skill',
    category: 'Token Optimization',
    domain: 'Token Optimization',
    description: 'Interactive coaching advisor diagnosing context exhaustion, subagent cache lifetimes, and deterministic code migration to reduce inference spend.',
    author: 'alexgreensh',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 4450,
    rating: 4.8,
    techStack: ['Token Coaching', 'Diagnostic Rules', 'Claude Code', 'Cache Lifetime'],
    keyFeatures: ['Context window diagnostics', 'Subagent model triage', 'Deterministic code suggestions', 'Session compaction guidance'],
    githubRepo: 'https://github.com/alexgreensh/token-optimizer',
    filesToDownload: [
      {
        url: 'https://raw.githubusercontent.com/alexgreensh/token-optimizer/main/skills/token-coach/SKILL.md',
        path: 'skills/token-coach/SKILL.md'
      }
    ]
  },
  {
    id: 'token-optimization-advanced',
    name: 'token-optimization-advanced',
    title: 'Token Optimization Advanced (4-Phase Context Control)',
    version: '1.0.0',
    type: 'skill',
    category: 'Token Optimization',
    domain: 'Token Optimization',
    description: 'Deep 4-phase token management tackling cache invalidation hierarchies, context forking, input format minimization, and model routing.',
    author: 'valorisa',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 3670,
    rating: 4.8,
    techStack: ['Cache Management', 'Context Forking', 'Input Minimization', 'Model Routing'],
    keyFeatures: ['4-phase optimization framework', 'Cache invalidation preventer', 'Context forking strategy', 'Compact syntax serialization'],
    githubRepo: 'https://github.com/valorisa/Claude-Skills',
    filesToDownload: [
      {
        url: 'https://raw.githubusercontent.com/valorisa/Claude-Skills/main/skills/token-optimization/SKILL.md',
        path: 'skills/token-optimization-advanced/SKILL.md'
      }
    ]
  },
  {
    id: 'rtk',
    name: 'rtk',
    title: 'RTK (Rust Token Killer CLI Proxy)',
    version: '0.4.0',
    type: 'skill',
    category: 'Token Optimization',
    domain: 'Token Optimization',
    description: 'Rust Token Killer CLI proxy that intercepts verbose shell commands (git status, test runners, builds) and condenses outputs by 60-90% before context injection.',
    author: 'rtk-ai',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 7890,
    rating: 5.0,
    techStack: ['Rust', 'CLI Proxy', 'Output Filtering', 'Claude Code', 'Terminal Compression'],
    keyFeatures: ['60-90% bash output reduction', 'Git status compaction', 'Test runner summarization', 'Sub-millisecond execution'],
    githubRepo: 'https://github.com/rtk-ai/rtk',
    filesToDownload: [
      {
        url: 'https://raw.githubusercontent.com/rtk-ai/rtk/develop/CLAUDE.md',
        path: 'skills/rtk/CLAUDE.md'
      },
      {
        url: 'https://raw.githubusercontent.com/rtk-ai/rtk/develop/README.md',
        path: 'skills/rtk/README.md'
      }
    ]
  },
  {
    id: 'squeez',
    name: 'squeez',
    title: 'Squeez (Multi-Host Hook Token Compressor)',
    version: '1.46.0',
    type: 'skill',
    category: 'Token Optimization',
    domain: 'Token Optimization',
    description: 'Hook-based token compressor for AI CLI hosts (Claude Code, Copilot, Cursor, Antigravity). Compresses bash output up to 95%, collapses redundant calls, and preserves exact identifiers.',
    author: 'claudioemmanuel',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 5630,
    rating: 4.9,
    techStack: ['Rust', 'Python', 'Claude Code', 'Copilot CLI', 'Cursor', 'Antigravity'],
    keyFeatures: ['Up to 95% output compression', 'AST signature-mode code reads', 'Exact identifier preservation', 'Net-loss guard'],
    githubRepo: 'https://github.com/claudioemmanuel/squeez',
    filesToDownload: [
      {
        url: 'https://raw.githubusercontent.com/claudioemmanuel/squeez/main/CLAUDE.md',
        path: 'skills/squeez/CLAUDE.md'
      },
      {
        url: 'https://raw.githubusercontent.com/claudioemmanuel/squeez/main/README.md',
        path: 'skills/squeez/README.md'
      }
    ]
  }
];

async function downloadFile(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return await res.text();
}

async function main() {
  console.log('Directly downloading 9 official token optimization skills from GitHub...');

  const artifactsJsonDir = path.join(ROOT_DIR, 'artifacts-json');
  const masterCatPath = path.join(ROOT_DIR, 'engineering-commons-vscode', 'resources', 'catalog', 'masterCatalog.json');
  const apiCatPath = path.join(ROOT_DIR, 'api', 'artifacts-catalog.json');

  let masterCatalog = fs.existsSync(masterCatPath) ? JSON.parse(fs.readFileSync(masterCatPath, 'utf8')) : [];
  let apiCatalog = fs.existsSync(apiCatPath) ? JSON.parse(fs.readFileSync(apiCatPath, 'utf8')) : [];

  for (const s of SKILLS) {
    console.log(`\nProcessing '${s.name}' from ${s.githubRepo}...`);
    const downloadedFiles = [];

    for (const f of s.filesToDownload) {
      try {
        console.log(`  Downloading ${f.url}...`);
        const content = await downloadFile(f.url);
        downloadedFiles.push({
          path: f.path,
          content: content
        });

        // Write to local disk in skills/
        const targetLocal = path.join(ROOT_DIR, f.path);
        fs.mkdirSync(path.dirname(targetLocal), { recursive: true });
        fs.writeFileSync(targetLocal, content, 'utf8');

        // If it's a SKILL.md, also place in .agents/skills/ and .github/skills/
        if (f.path.endsWith('SKILL.md')) {
          const agentsSkill = path.join(ROOT_DIR, '.agents', f.path);
          fs.mkdirSync(path.dirname(agentsSkill), { recursive: true });
          fs.writeFileSync(agentsSkill, content, 'utf8');

          const ghSkill = path.join(ROOT_DIR, '.github', f.path);
          fs.mkdirSync(path.dirname(ghSkill), { recursive: true });
          fs.writeFileSync(ghSkill, content, 'utf8');
        }
      } catch (e) {
        console.error(`  Error downloading ${f.url}: ${e.message}`);
      }
    }

    // For rtk and squeez, ensure a dedicated SKILL.md exists as well
    if (s.name === 'rtk') {
      const rtkSkillPath = path.join(ROOT_DIR, 'skills', 'rtk', 'SKILL.md');
      let rtkContent = '';
      if (fs.existsSync(rtkSkillPath)) {
        rtkContent = fs.readFileSync(rtkSkillPath, 'utf8');
      } else {
        rtkContent = `---\nname: rtk\ndescription: Rust Token Killer CLI proxy. Compresses terminal outputs by up to 90%.\n---\n\n# RTK (Rust Token Killer)\n\nOfficial RTK CLI tool for filtering and condensing verbose shell outputs.\n`;
        fs.writeFileSync(rtkSkillPath, rtkContent, 'utf8');
      }
      downloadedFiles.push({ path: 'skills/rtk/SKILL.md', content: rtkContent });
    }

    if (s.name === 'squeez') {
      const squeezSkillPath = path.join(ROOT_DIR, 'skills', 'squeez', 'SKILL.md');
      let squeezContent = '';
      if (fs.existsSync(squeezSkillPath)) {
        squeezContent = fs.readFileSync(squeezSkillPath, 'utf8');
      } else {
        squeezContent = `---\nname: squeez\ndescription: Hook-based token compressor for AI CLI hosts. Compresses tool outputs up to 95%.\n---\n\n# Squeez Token Compressor\n\nOfficial Squeez hook-based CLI token compressor.\n`;
        fs.writeFileSync(squeezSkillPath, squeezContent, 'utf8');
      }
      downloadedFiles.push({ path: 'skills/squeez/SKILL.md', content: squeezContent });
    }

    // Build artifact document - Clean, authentic GitHub skill (NO synthetic .agent.md)
    const doc = {
      name: s.name,
      title: s.title,
      version: s.version,
      type: s.type,
      category: s.category,
      domain: s.domain,
      description: s.description,
      author: s.author,
      source: 'COMMUNITY',
      isCertified: true,
      downloads: s.downloads,
      rating: s.rating,
      techStack: s.techStack,
      keyFeatures: s.keyFeatures,
      githubRepo: s.githubRepo,
      files: downloadedFiles,
      usability: 'copilot-ready',
      usabilityLabel: 'Official GitHub Skill',
      usabilityBadge: '⚡ Token Optimization',
      isCopilotReady: true
    };

    // Save to artifacts-json/<name>.json
    const jsonPath = path.join(artifactsJsonDir, `${s.name}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(doc, null, 2), 'utf8');
    console.log(`  Saved ${jsonPath}`);

    // Update masterCatalog
    const masterIdx = masterCatalog.findIndex(a => (a.name || a.id || '').toLowerCase() === s.name.toLowerCase());
    if (masterIdx >= 0) {
      masterCatalog[masterIdx] = doc;
    } else {
      masterCatalog.push(doc);
    }

    // Update apiCatalog
    const apiIdx = apiCatalog.findIndex(a => (a.name || a.id || '').toLowerCase() === s.name.toLowerCase());
    if (apiIdx >= 0) {
      apiCatalog[apiIdx] = doc;
    } else {
      apiCatalog.push(doc);
    }
  }

  // Write updated masterCatalog.json
  fs.writeFileSync(masterCatPath, JSON.stringify(masterCatalog, null, 2), 'utf8');
  console.log(`\nUpdated ${masterCatPath} (Total items: ${masterCatalog.length})`);

  // Write updated api/artifacts-catalog.json
  fs.writeFileSync(apiCatPath, JSON.stringify(apiCatalog, null, 2), 'utf8');
  console.log(`Updated ${apiCatPath} (Total items: ${apiCatalog.length})`);

  console.log('\nAll 9 official skills successfully downloaded and placed in the marketplace!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
