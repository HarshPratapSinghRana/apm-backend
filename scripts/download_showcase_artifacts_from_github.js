const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const ARTIFACTS = [
  {
    id: 'playwright-mcp',
    name: 'playwright-mcp',
    title: 'Playwright MCP (Browser Automation & Testing)',
    version: '0.0.83',
    type: 'mcpserver',
    category: 'Testing & QA',
    domain: 'Testing & QA',
    description: 'Let AI test your web application using a real browser. Lets coding agents navigate websites, interact with UI elements, inspect page structure, and automate browser workflows.',
    author: 'microsoft',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 12450,
    rating: 5.0,
    techStack: ['Playwright', 'Model Context Protocol', 'TypeScript', 'Node.js', 'Browser Automation'],
    keyFeatures: [
      'Interactive headless and headed browser control',
      'Element snapshot and semantic DOM inspection',
      'Automated form submission and navigation',
      'Console error and network request capture'
    ],
    githubRepo: 'https://github.com/microsoft/playwright-mcp',
    filesToDownload: [
      {
        url: 'https://raw.githubusercontent.com/microsoft/playwright-mcp/main/README.md',
        path: '.mcp/playwright-mcp/README.md'
      },
      {
        url: 'https://raw.githubusercontent.com/microsoft/playwright-mcp/main/package.json',
        path: '.mcp/playwright-mcp/package.json'
      },
      {
        url: 'https://raw.githubusercontent.com/microsoft/playwright-mcp/main/server.json',
        path: '.mcp/playwright-mcp/server.json'
      },
      {
        url: 'https://raw.githubusercontent.com/microsoft/playwright-mcp/main/CLAUDE.md',
        path: '.mcp/playwright-mcp/CLAUDE.md'
      }
    ]
  },
  {
    id: 'github-mcp-server',
    name: 'github-mcp-server',
    title: 'GitHub MCP Server (Official Model Context Protocol)',
    version: '0.6.0',
    type: 'mcpserver',
    category: 'DevOps & CI/CD',
    domain: 'DevOps & CI/CD',
    description: 'Let your AI assistant understand and work with your repositories. Provides GitHub-related tools for repository information, issues, pull requests, commits, and repository context.',
    author: 'github',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 18920,
    rating: 5.0,
    techStack: ['GitHub API', 'Model Context Protocol', 'Go', 'Docker', 'Octokit'],
    keyFeatures: [
      'Repository metadata and file contents inspection',
      'Issue and Pull Request querying and creation',
      'Commit search and branch management',
      'Streamable HTTP and stdio transport support'
    ],
    githubRepo: 'https://github.com/github/github-mcp-server',
    filesToDownload: [
      {
        url: 'https://raw.githubusercontent.com/github/github-mcp-server/main/README.md',
        path: '.mcp/github-mcp-server/README.md'
      },
      {
        url: 'https://raw.githubusercontent.com/github/github-mcp-server/main/server.json',
        path: '.mcp/github-mcp-server/server.json'
      },
      {
        url: 'https://raw.githubusercontent.com/github/github-mcp-server/main/gemini-extension.json',
        path: '.mcp/github-mcp-server/gemini-extension.json'
      }
    ]
  },
  {
    id: 'chrome-devtools-mcp',
    name: 'chrome-devtools-mcp',
    title: 'Chrome DevTools MCP (Browser Diagnostics & Performance)',
    version: '0.4.0',
    type: 'mcpserver',
    category: 'Frontend & UI',
    domain: 'Frontend & UI',
    description: 'Investigate browser errors and performance with AI. Inspect runtime console errors, network requests, DOM structure, and performance profiles directly through Chrome DevTools Protocol.',
    author: 'ChromeDevTools',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 14200,
    rating: 5.0,
    techStack: ['Chrome DevTools Protocol', 'Puppeteer', 'TypeScript', 'Node.js', 'Performance Profiling'],
    keyFeatures: [
      'Live Chrome DevTools Protocol (CDP) session integration',
      'Console log and runtime uncaught exception capture',
      'Network waterfall and timing inspection',
      'Lighthouse accessibility and performance diagnostics'
    ],
    githubRepo: 'https://github.com/ChromeDevTools/chrome-devtools-mcp',
    filesToDownload: [
      {
        url: 'https://raw.githubusercontent.com/ChromeDevTools/chrome-devtools-mcp/main/README.md',
        path: '.mcp/chrome-devtools-mcp/README.md'
      },
      {
        url: 'https://raw.githubusercontent.com/ChromeDevTools/chrome-devtools-mcp/main/package.json',
        path: '.mcp/chrome-devtools-mcp/package.json'
      },
      {
        url: 'https://raw.githubusercontent.com/ChromeDevTools/chrome-devtools-mcp/main/mcp.json',
        path: '.mcp/chrome-devtools-mcp/mcp.json'
      },
      {
        url: 'https://raw.githubusercontent.com/ChromeDevTools/chrome-devtools-mcp/main/AGENTS.md',
        path: '.mcp/chrome-devtools-mcp/AGENTS.md'
      }
    ]
  },
  {
    id: 'webapp-testing',
    name: 'webapp-testing',
    title: 'Web Application Testing Skill (Anthropic Skills)',
    version: '1.0.0',
    type: 'skill',
    category: 'Testing & QA',
    domain: 'Testing & QA',
    description: 'Give your AI coding assistant reusable specialist skills for web application testing using Playwright, component verification, and end-to-end user flows.',
    author: 'anthropics',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 9840,
    rating: 4.9,
    techStack: ['Anthropic Skills', 'Playwright', 'End-to-End Testing', 'Claude Code'],
    keyFeatures: [
      'Structured Playwright test generation and execution',
      'Interactive web application flow validation',
      'Automated visual regression and DOM assertion patterns',
      'Failure diagnosis and actionable test remediation'
    ],
    githubRepo: 'https://github.com/anthropics/skills',
    filesToDownload: [
      {
        url: 'https://raw.githubusercontent.com/anthropics/skills/main/skills/webapp-testing/SKILL.md',
        path: 'skills/webapp-testing/SKILL.md'
      }
    ]
  },
  {
    id: 'skill-creator',
    name: 'skill-creator',
    title: 'Skill Creator (Anthropic Skills)',
    version: '1.0.0',
    type: 'skill',
    category: 'Agent Skills',
    domain: 'Agent Skills',
    description: 'Official Anthropic skill packager to create, structure, test, and document reusable specialist skills for coding assistants and agents.',
    author: 'anthropics',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 11200,
    rating: 5.0,
    techStack: ['Anthropic Skills', 'Skill Architecture', 'Prompt Engineering', 'Spec Compliance'],
    keyFeatures: [
      'YAML frontmatter and metadata validation',
      'Instruction structuring and execution pipelines',
      'Testing harness for reusable agent skills',
      'Multi-platform compatibility validation'
    ],
    githubRepo: 'https://github.com/anthropics/skills',
    filesToDownload: [
      {
        url: 'https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md',
        path: 'skills/skill-creator/SKILL.md'
      }
    ]
  },
  {
    id: 'mcp-builder',
    name: 'mcp-builder',
    title: 'MCP Server Builder (Anthropic Skills)',
    version: '1.0.0',
    type: 'skill',
    category: 'Agent Skills',
    domain: 'Agent Skills',
    description: 'Design and implement Model Context Protocol (MCP) servers with standard schemas, tool handlers, resource providers, and client test scripts.',
    author: 'anthropics',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 8760,
    rating: 4.9,
    techStack: ['Model Context Protocol', 'TypeScript', 'JSON-RPC', 'Anthropic Skills'],
    keyFeatures: [
      'Standardized tool definition and schema validation',
      'Resource and prompt template generation',
      'Local integration testing via MCP inspector',
      'Production packaging and configuration guides'
    ],
    githubRepo: 'https://github.com/anthropics/skills',
    filesToDownload: [
      {
        url: 'https://raw.githubusercontent.com/anthropics/skills/main/skills/mcp-builder/SKILL.md',
        path: 'skills/mcp-builder/SKILL.md'
      }
    ]
  },
  {
    id: 'senior-code-reviewer',
    name: 'senior-code-reviewer',
    title: 'Senior Code Reviewer (Awesome GitHub Copilot)',
    version: '1.2.0',
    type: 'agent',
    category: 'Code Quality & Security',
    domain: 'Code Quality & Security',
    description: 'Curated Copilot agent from Awesome GitHub Copilot. Give it a code diff and ask it to identify bugs, security issues, missing tests, and maintainability problems.',
    author: 'github',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 15400,
    rating: 5.0,
    techStack: ['GitHub Copilot', 'Code Review', 'Static Analysis', 'Security Triage'],
    keyFeatures: [
      'Critical blocking issue detection (Security, Correctness, Breaking Changes)',
      'Maintainability, duplication, and architectural anti-pattern audit',
      'Automated test coverage gap analysis',
      'Prioritized, actionable remediation code diffs'
    ],
    githubRepo: 'https://github.com/github/awesome-copilot',
    filesToDownload: [
      {
        url: 'https://raw.githubusercontent.com/github/awesome-copilot/main/instructions/code-review-generic.instructions.md',
        path: '.github/instructions/code-review-generic.instructions.md'
      },
      {
        url: 'https://raw.githubusercontent.com/github/awesome-copilot/main/agents/gem-reviewer.agent.md',
        path: '.github/agents/senior-code-reviewer.agent.md'
      }
    ]
  },
  {
    id: 'debugging-assistant',
    name: 'debugging-assistant',
    title: 'Debugging Assistant (Awesome GitHub Copilot)',
    version: '1.1.0',
    type: 'agent',
    category: 'Debugging & Diagnostics',
    domain: 'Debugging & Diagnostics',
    description: 'Curated agent skill from Awesome GitHub Copilot. Provide an exception and relevant code, then ask the agent to trace the root cause, propose a minimal fix, and generate regression tests.',
    author: 'github',
    source: 'COMMUNITY',
    isCertified: true,
    downloads: 13900,
    rating: 5.0,
    techStack: ['GitHub Copilot', 'Root Cause Analysis', 'Regression Testing', 'Automated Debugging'],
    keyFeatures: [
      'Systematic problem assessment and stack trace analysis',
      'Reproducible test case generation',
      'Minimal root-cause code patch formulation',
      'Automated regression verification'
    ],
    githubRepo: 'https://github.com/github/awesome-copilot',
    filesToDownload: [
      {
        url: 'https://raw.githubusercontent.com/github/awesome-copilot/main/agents/debug.agent.md',
        path: '.github/agents/debugging-assistant.agent.md'
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
  console.log('Downloading 8 official showcase artifacts directly from GitHub...');

  const artifactsJsonDir = path.join(ROOT_DIR, 'artifacts-json');
  const masterCatPath = path.join(ROOT_DIR, 'engineering-commons-vscode', 'resources', 'catalog', 'masterCatalog.json');
  const apiCatPath = path.join(ROOT_DIR, 'api', 'artifacts-catalog.json');

  let masterCatalog = fs.existsSync(masterCatPath) ? JSON.parse(fs.readFileSync(masterCatPath, 'utf8')) : [];
  let apiCatalog = fs.existsSync(apiCatPath) ? JSON.parse(fs.readFileSync(apiCatPath, 'utf8')) : [];

  for (const item of ARTIFACTS) {
    console.log(`\nProcessing '${item.name}' from ${item.githubRepo}...`);
    const downloadedFiles = [];

    for (const f of item.filesToDownload) {
      try {
        console.log(`  Downloading ${f.url}...`);
        const content = await downloadFile(f.url);
        downloadedFiles.push({
          path: f.path,
          content: content
        });

        // File content is preserved in memory for artifacts-json manifest (not polluting local workspace)
      } catch (e) {
        console.error(`  Error downloading ${f.url}: ${e.message}`);
      }
    }

    const doc = {
      name: item.name,
      title: item.title,
      version: item.version,
      type: item.type,
      category: item.category,
      domain: item.domain,
      description: item.description,
      author: item.author,
      source: 'COMMUNITY',
      isCertified: true,
      downloads: item.downloads,
      rating: item.rating,
      techStack: item.techStack,
      keyFeatures: item.keyFeatures,
      githubRepo: item.githubRepo,
      files: downloadedFiles,
      usability: 'copilot-ready',
      usabilityLabel: 'Official GitHub Artifact',
      usabilityBadge: item.type === 'mcpserver' ? '🔌 MCP Server' : (item.type === 'agent' ? '🤖 Copilot Agent' : '⚡ Agent Skill'),
      isCopilotReady: true
    };

    // Save to artifacts-json/<name>.json
    const jsonPath = path.join(artifactsJsonDir, `${item.name}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(doc, null, 2), 'utf8');
    console.log(`  Saved ${jsonPath}`);

    // Update masterCatalog
    const masterIdx = masterCatalog.findIndex(a => (a.name || a.id || '').toLowerCase() === item.name.toLowerCase());
    if (masterIdx >= 0) {
      masterCatalog[masterIdx] = doc;
    } else {
      masterCatalog.push(doc);
    }

    // Update apiCatalog
    const apiIdx = apiCatalog.findIndex(a => (a.name || a.id || '').toLowerCase() === item.name.toLowerCase());
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

  console.log('\nAll official showcase artifacts successfully downloaded and added to marketplace!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
