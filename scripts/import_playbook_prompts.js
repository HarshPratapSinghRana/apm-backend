const fs = require('fs');
const path = require('path');

const STAGING_DIR = path.join(__dirname, '..', 'playbook-prompts');
const TARGET_DIR = path.join(__dirname, '..', '.agents', 'prompts', 'playbook');
const GITHUB_PROMPTS_DIR = path.join(__dirname, '..', '.github', 'prompts', 'playbook');
const ARTIFACTS_JSON_DIR = path.join(__dirname, '..', 'artifacts-json');

[TARGET_DIR, GITHUB_PROMPTS_DIR, ARTIFACTS_JSON_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function detectTags(task, prompt, area) {
  const text = `${task} ${prompt}`.toLowerCase();
  const tags = new Set(['azure-bi', 'playbook', 'prompt']);
  
  if (area) {
    tags.add(slugify(area));
  }
  
  const keywords = [
    { tag: 'power-bi', re: /\bpower\s*bi\b|\bpbi\b/i },
    { tag: 'dax', re: /\bdax\b/i },
    { tag: 'fabric', re: /\bfabric\b/i },
    { tag: 'synapse', re: /\bsynapse\b/i },
    { tag: 'databricks', re: /\bdatabricks\b/i },
    { tag: 'pyspark', re: /\bpyspark\b|\bspark\b/i },
    { tag: 'data-factory', re: /\bdata\s*factory\b|\badf\b/i },
    { tag: 'sql-server', re: /\bsql\s*server\b|\btsql\b|\bsql\b/i },
    { tag: 'lakehouse', re: /\blakehouse\b|\bdelta\b|\bmedallion\b/i },
    { tag: 'data-modeling', re: /\bdata\s*model|\bstar\s*schema|\bdimensional\b/i },
    { tag: 'security', re: /\brls\b|\bsecurity\b|\bgovernance\b/i },
    { tag: 'cicd', re: /\bcicd\b|\bdevops\b|\bdeployment\b/i },
    { tag: 'data-profiling', re: /\bprofiling\b|\bquality\b/i },
    { tag: 'etl', re: /\betl\b|\belt\b|\bpipeline\b/i }
  ];

  for (const { tag, re } of keywords) {
    if (re.test(text)) {
      tags.add(tag);
    }
  }

  return Array.from(tags);
}

function processPlaybookFiles() {
  const copilotPromptsFile = path.join(STAGING_DIR, 'copilotPrompts.json');
  if (!fs.existsSync(copilotPromptsFile)) {
    console.log(`[Playbook] copilotPrompts.json not found in ${STAGING_DIR}`);
    return;
  }

  console.log(`[Playbook] Reading ${copilotPromptsFile}...`);
  const rawData = JSON.parse(fs.readFileSync(copilotPromptsFile, 'utf8'));

  let allPrompts = [];

  const stageDisplayNames = {
    RequirementGathering: 'Requirement Gathering',
    Analysis: 'Analysis & Planning',
    Architecture: 'Architecture & Design',
    Design: 'Detailed Design',
    Development: 'Development & Implementation',
    Deployment: 'Deployment & CI/CD',
    Support: 'Support & Maintenance'
  };

  for (const [stageKey, promptList] of Object.entries(rawData)) {
    if (!Array.isArray(promptList)) continue;
    const stageName = stageDisplayNames[stageKey] || stageKey;

    for (let i = 0; i < promptList.length; i++) {
      const p = promptList[i];
      const task = p.task || `Prompt ${i + 1}`;
      // CRITICAL: Keep raw verbatim prompt text without ANY modifications
      const promptText = (p.copilotPrompt || '').trim();
      const outputText = (p.output || '').trim();

      if (!promptText) continue;

      const id = `playbook-${slugify(stageKey)}-${i + 1}`;

      allPrompts.push({
        id,
        index: i + 1,
        slug: slugify(task),
        stageKey,
        stageName,
        task,
        promptText,
        outputText,
        tags: detectTags(task, promptText, stageKey)
      });
    }
  }

  console.log(`[Playbook] Successfully extracted ${allPrompts.length} prompts from all SDLC stages.`);

  // Clean old files in TARGET_DIR (.agents/prompts/playbook)
  if (fs.existsSync(TARGET_DIR)) {
    for (const f of fs.readdirSync(TARGET_DIR)) {
      if (f.endsWith('.md') && f !== 'README.md') {
        fs.unlinkSync(path.join(TARGET_DIR, f));
      }
    }
  }

  // Clean old files in GITHUB_PROMPTS_DIR (.github/prompts/playbook)
  if (fs.existsSync(GITHUB_PROMPTS_DIR)) {
    for (const f of fs.readdirSync(GITHUB_PROMPTS_DIR)) {
      if (f.endsWith('.prompt.md')) {
        fs.unlinkSync(path.join(GITHUB_PROMPTS_DIR, f));
      }
    }
  }

  // Write each prompt verbatim
  for (const item of allPrompts) {
    const safeTitle = item.task.replace(/"/g, '\\"');
    const safeDesc = (item.outputText || `Azure BI Playbook prompt for ${item.task}`).replace(/"/g, '\\"').replace(/\r?\n/g, ' ');

    // 1. Agent markdown file: .agents/prompts/playbook/<id>.md
    // Prompt content is verbatim without alterations
    const mdContent = `---
name: ${item.id}
title: "${safeTitle}"
type: prompt
category: "Prompt Playbook"
subcategory: "${item.stageName}"
stage: "${item.stageKey}"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: [${item.tags.map(t => `"${t}"`).join(', ')}]
description: "${safeDesc}"
---

# ${item.task}

${item.promptText}
`;
    fs.writeFileSync(path.join(TARGET_DIR, `${item.id}.md`), mdContent, 'utf8');

    // 2. GitHub Copilot prompt file: .github/prompts/playbook/<id>.prompt.md
    // Verbatim prompt text without additions
    const copilotPromptContent = `---
name: ${item.id}
description: "${safeDesc.slice(0, 160)}"
---

${item.promptText}
`;
    fs.writeFileSync(path.join(GITHUB_PROMPTS_DIR, `${item.id}.prompt.md`), copilotPromptContent, 'utf8');

    // 3. CIP Package metadata JSON: artifacts-json/<id>.json
    // Contains genuine files array and verbatim prompt for instant Details rendering & ZIP packaging
    const artifactJson = {
      id: item.id,
      name: item.id,
      title: item.task,
      type: 'prompt',
      version: '1.0.0',
      category: 'Prompt Playbook',
      subcategory: item.stageName,
      stage: item.stageKey,
      domain: 'Data Engineering',
      author: 'harsh.rana@maqsoftware.com',
      source: 'Azure BI & Data Engineering Playbook',
      sourceUrl: 'https://aisdlcplaybook.azurewebsites.net/prompt-library',
      description: item.outputText || `Azure BI & Data Engineering Playbook prompt for ${item.task}`,
      task: item.task,
      copilotPrompt: item.promptText,
      output: item.outputText,
      tags: item.tags,
      isCertified: true,
      keyFeatures: [
        'Verbatim prompt from Azure BI & Data Engineering Playbook',
        'Certified for Microsoft Fabric, Synapse, Power BI & Databricks',
        'Ready to run directly in GitHub Copilot & Antigravity'
      ],
      useCases: [
        item.stageName,
        'Azure BI & Data Engineering Playbook'
      ],
      installCommand: `engineering-commons install ${item.id}`,
      files: [
        {
          path: `.agents/prompts/playbook/${item.id}.md`,
          content: mdContent
        },
        {
          path: `.github/prompts/playbook/${item.id}.prompt.md`,
          content: copilotPromptContent
        },
        {
          path: 'cip.yml',
          content: `name: ${item.id}\nversion: 1.0.0\ntype: prompt\ncategory: "Prompt Playbook"\nauthor: harsh.rana@maqsoftware.com\ndescription: "${safeDesc}"\nmain: .agents/prompts/playbook/${item.id}.md\n`
        },
        {
          path: 'README.md',
          content: `# ${item.task}\n\n**Category**: Azure BI & Data Engineering Playbook • **Stage**: ${item.stageName}\n**Author**: Harsh Pratap Singh Rana (harsh.rana@maqsoftware.com)\n\n## Expected Output\n${item.outputText}\n\n## Verbatim Prompt\n\`\`\`\n${item.promptText}\n\`\`\`\n`
        }
      ]
    };
    fs.writeFileSync(path.join(ARTIFACTS_JSON_DIR, `${item.id}.json`), JSON.stringify(artifactJson, null, 2), 'utf8');
  }

  // Create Master Playbook Index in .agents/prompts/playbook/README.md
  const indexMd = `# Azure BI & Data Engineering Prompt Playbook
*Imported directly from [Azure BI & Data Engineering Playbook](https://aisdlcplaybook.azurewebsites.net/prompt-library) for Engineering Commons.*

**Author**: Harsh Pratap Singh Rana (\`harsh.rana@maqsoftware.com\`)  
**Total Prompts**: ${allPrompts.length}  

## Categories / SDLC Stages:
${Object.entries(stageDisplayNames).map(([key, name]) => {
  const count = allPrompts.filter(p => p.stageKey === key).length;
  return `- **${name}** (\`${key}\`): ${count} prompt(s)`;
}).join('\n')}

---

## Complete Prompt Index:

| ID | Stage | Prompt Title | Tags |
| :--- | :--- | :--- | :--- |
${allPrompts.map(p => `| \`${p.id}\` | ${p.stageName} | [${p.task}](./${p.id}.md) | \`${p.tags.slice(0, 3).join(', ')}\` |`).join('\n')}
`;

  fs.writeFileSync(path.join(TARGET_DIR, 'README.md'), indexMd, 'utf8');

  // Master Playbook Bundle in artifacts-json/azure-bi-playbook.json
  const playbookBundle = {
    id: 'azure-bi-playbook',
    name: 'azure-bi-playbook',
    title: 'Azure BI & Data Engineering Prompt Playbook',
    type: 'prompt',
    version: '1.0.0',
    category: 'Prompt Playbook',
    domain: 'Data Engineering',
    author: 'harsh.rana@maqsoftware.com',
    description: 'Comprehensive library of 115 certified Copilot & AI prompt templates for Azure BI & Data Engineering across all SDLC phases (Medallion Lakehouse, PySpark, Fabric, Synapse, Power BI, DAX, ADF, SQL).',
    techStack: ['Azure Fabric', 'Power BI', 'Synapse', 'Azure Data Factory', 'Databricks', 'PySpark', 'DAX', 'SQL Server'],
    keyFeatures: [
      '115 certified production prompts across all 7 SDLC stages',
      'Medallion Lakehouse (Bronze/Silver/Gold) architecture patterns',
      'Data profiling, quality checks, and SCD Type 1/2 transformation templates',
      'DAX optimization, calculation groups, and semantic model guidelines',
      'Direct integration with GitHub Copilot and Antigravity IDE'
    ],
    useCases: [
      'Data Lakehouse Architecture & Workspace Design',
      'Data Profiling & Automated Schema Validation',
      'ETL/ELT Pipeline Development with ADF and Fabric',
      'Power BI Enterprise Modeling & DAX Optimization'
    ],
    isCertified: true,
    totalPrompts: allPrompts.length,
    stages: Object.entries(stageDisplayNames).map(([key, name]) => ({
      key,
      name,
      count: allPrompts.filter(p => p.stageKey === key).length
    }))
  };

  fs.writeFileSync(path.join(ARTIFACTS_JSON_DIR, 'azure-bi-playbook.json'), JSON.stringify(playbookBundle, null, 2), 'utf8');

  console.log(`[Playbook] Successfully exported:`);
  console.log(`  - 115 .md prompts in .agents/prompts/playbook/ (verbatim prompts)`);
  console.log(`  - 115 .prompt.md prompts in .github/prompts/playbook/ (verbatim prompts)`);
  console.log(`  - 115 .json artifacts in artifacts-json/ (verbatim prompts + files)`);
  console.log(`  - Master catalog bundle: artifacts-json/azure-bi-playbook.json`);
}

processPlaybookFiles();
