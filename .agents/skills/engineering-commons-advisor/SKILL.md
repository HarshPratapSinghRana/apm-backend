---
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
- `.github/skills/engineering-commons-advisor/references/catalog.json`
- Or `.agents/skills/engineering-commons-advisor/references/catalog.json`
- Or run `engineering-commons list` in the terminal for the live synced registry.

### Step 2: Semantic Intent & Keyword Matching
Score candidate artifacts by matching user requirements against:
- **`useCases`**: Exact business/engineering problems solved.
- **`keyFeatures`**: Built-in capabilities.
- **`tags` / `techStack`**: Matching programming languages (TypeScript, C#, Python, SQL), frameworks (xUnit, Playwright, Apollo, Terraform), or cloud providers (Azure, AWS).
- **`description` & `domain`**: Core domain relevance.

### Step 3: Present Structured Recommendations
Always format your response with high clarity and actionable installation steps:

```markdown
### 🏆 Recommended Artifact: [<Artifact Title> (`<artifact-name>`)]
- **Type**: `<artifactType>` (e.g. `skill`, `agent`, `prompt`, `mcpserver`)
- **Domain**: `<domain>` | **Certification**: Verified Enterprise Certified ✅
- **Why It's the Best Match**:
  <Explain precisely how this artifact solves the user's specific problem>
- **Key Capabilities**:
  - <Capability 1>
  - <Capability 2>
  - <Capability 3>

#### 📦 Installation
Run in terminal:
```bash
engineering-commons install <artifact-name>
```
*Or in VS Code: Open the **Engineering Commons** activity bar tab, find `<artifact-name>`, and click **Install**.*

#### 🚀 How to Use Once Installed
<Explain how to invoke it, e.g. @<artifact-name> in Copilot, or using the prompt / skill instructions>
```

## ⚡ Zero-API Direct Disk Access
All artifact frontmatter, descriptions, capabilities, use cases, and metadata are automatically loaded into your workspace in a **single API call** when logging into the Engineering Commons extension and opening the marketplace.
They are pre-cached directly in:
```
.github/skills/engineering-commons-advisor/references/catalog.json
```
**No external API call is ever made by this skill.** You have immediate, offline-ready direct disk access to the entire catalog and its frontmatter.

---

## 🔐 Authentication & Marketplace Sync Note
- The local catalog reference provides immediate, offline-ready matching for all core artifacts with zero API calls.
- When logged into Engineering Commons (`engineeringCommons.login` or `engineering-commons login`) and opening the marketplace, all latest and private enterprise artifacts are loaded in a single API call and cached directly to disk for this skill.
