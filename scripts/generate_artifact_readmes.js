const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const skillsData = [
  {
    name: 'architecture-reviewer',
    title: 'Principal Enterprise Solutions Architecture Reviewer',
    type: 'agent / skill',
    category: 'Architecture & System Design',
    techStack: ['Distributed Systems', 'Microservices', 'Kubernetes', 'Cloud (Azure/AWS/GCP)', 'Event-Driven Architecture', 'Kafka / RabbitMQ'],
    mainWork: 'Evaluates enterprise distributed system designs, microservices architectures, cloud infrastructure, and data workflows for high availability, fault tolerance, API contract governance, consistency models (ACID vs BASE, Saga), Zero-Trust security, and FinOps cloud cost optimization.',
    capabilities: [
      'Distributed systems resilience (Circuit Breaker, Bulkhead, Retry with exponential backoff)',
      'Consistency model audit (Eventual Consistency, Saga pattern, Transactional Outbox, 2PC)',
      'API Governance & Contract Safety (gRPC, REST, GraphQL schema evolution, zero breaking changes)',
      'Zero-Trust Cloud Security (mTLS, OIDC/OAuth2, least-privilege IAM, secret rotation)',
      'FinOps cloud cost optimization (auto-scaling thresholds, egress reduction, reserved instance sizing)'
    ],
    copilotInvocation: '@architecture-reviewer review this distributed payment workflow for split-brain and network partition risks',
    samplePrompts: [
      'Review our microservices architecture diagram and identify single points of failure (SPOF) and latency bottlenecks.',
      'Audit our event-driven architecture using Kafka for message ordering guarantees and poison pill handling.',
      'Evaluate our database sharding and cross-region replication strategy for Disaster Recovery (RPO < 1m, RTO < 5m).'
    ]
  },
  {
    name: 'csharp-reviewer',
    title: 'Senior C# & .NET Enterprise Reviewer',
    type: 'agent / skill',
    category: 'Backend Code Review & Security',
    techStack: ['C# 12 / C# 13', '.NET 8 / 9 / 10', 'ASP.NET Core', 'Entity Framework Core', 'xUnit / NUnit', 'Roslyn Analyzers'],
    mainWork: 'Audits C# and .NET codebases for allocation efficiency (Span<T>, Memory<T>, ArrayPool), async state machine overhead, Entity Framework Core query evaluation, and enterprise security (Roslyn analyzers, OWASP Top 10, path traversal in Path.Combine, TLS verification, mass assignment, SQLi).',
    capabilities: [
      'Modern C# idioms: Primary constructors, collection expressions, pattern matching, record structs',
      'High-throughput zero-allocation auditing: ReadOnlySpan<char>, ReadOnlyMemory<T>, ValueTask<T>',
      'EF Core optimization: Client-side evaluation elimination, .AsNoTracking(), batch update checks',
      'OWASP security: Path traversal in Path.Combine (CWE-22), SQLi in FromSqlRaw, unsafe TLS bypass',
      'Automated Roslyn static analysis compliance: Clean build under latest analysis rules'
    ],
    copilotInvocation: '@csharp-reviewer review this ASP.NET Core controller and repository for memory leaks and EF Core N+1 queries',
    samplePrompts: [
      'Audit this C# service for string allocation bottlenecks in high-frequency parsing loops.',
      'Check our Entity Framework Core queries for unintended client evaluation and missing database indexes.',
      'Review this file upload and path manipulation code for Path Traversal (CWE-22) vulnerabilities.'
    ]
  },
  {
    name: 'typescript-reviewer',
    title: 'Senior TypeScript & Full-Stack Security Reviewer',
    type: 'agent / skill',
    category: 'Frontend & Node.js Code Review',
    techStack: ['TypeScript 5.x', 'React 18 / 19', 'Next.js 14 / 15', 'Node.js', 'Express', 'Mocha / Jest'],
    mainWork: 'Enforces strict type safety (any elimination, discriminated unions, type guards), React/Next.js best practices, memory leak prevention, and comprehensive web security (XSS, Prototype Pollution, ReDoS, CSRF, SSRF, Express Path Traversal, strict TLS verification).',
    capabilities: [
      'Strict type soundness: Eliminates `any`, enforces discriminated unions, strict null checks, exhaustiveness',
      'React & Next.js performance: Re-render cascades, memoization pitfalls, hydration mismatches, Server Components',
      'Node.js & Express security: Prototype pollution prevention, path traversal in express.static/fs, ReDoS defense',
      'Zero-Trust transport: Flags `rejectUnauthorized: false` and ensures strict TLS certificate checks',
      'Memory leak detection: Unsubscribed event listeners, unclosed timers, and dangling Webview message listeners'
    ],
    copilotInvocation: '@typescript-reviewer review this React hook and Next.js Server Action for memory leaks and hydration errors',
    samplePrompts: [
      'Audit our TypeScript codebase to replace all `any` usages with type guards and discriminated unions.',
      'Review this Express.js file download route for directory traversal and SSRF vulnerabilities.',
      'Inspect this React component tree for unnecessary re-renders and missing useEffect dependencies.'
    ]
  },
  {
    name: 'python-reviewer',
    title: 'Senior Python & Data Science Security Reviewer',
    type: 'agent / skill',
    category: 'Backend & AI/ML Code Review',
    techStack: ['Python 3.10 - 3.13', 'FastAPI / Flask / Django', 'PySpark / Pandas / NumPy', 'Asyncio', 'Pydantic v2', 'Pytest'],
    mainWork: 'Performs deep static analysis and security auditing for Python applications, async concurrency pipelines, data science workflows, and AI/ML services. Audits typing, GIL contention, memory leaks, and automated security (Bandit, OWASP Top 10, SQLi, command injection via subprocess, insecure deserialization via pickle, SSRF, path traversal).',
    capabilities: [
      'Python 3.12+ idioms: Structural pattern matching, type parameter syntax (PEP 695), exception groups',
      'Asyncio concurrency safety: Task cancellation handling, event loop blocking detection, TaskGroup usage',
      'High-risk security auditing: Insecure deserialization (pickle/yaml.load), command injection in subprocess/os.system',
      'Data engineering performance: Vectorized Pandas/Polars operations vs slow Python loops, PySpark lazy evaluation',
      'Dependency vulnerability scanning: Safety/Bandit checks, insecure SSL context verification'
    ],
    copilotInvocation: '@python-reviewer review this FastAPI router and Pandas data pipeline for subprocess injection and memory profiling',
    samplePrompts: [
      'Check this data processing script for Pandas memory efficiency and vectorize row-by-row apply calls.',
      'Audit this API endpoint for remote code execution risks in subprocess.run and pickle deserialization.',
      'Review our asyncio worker pool for unhandled task exceptions and event loop starvation.'
    ]
  },
  {
    name: 'java-reviewer',
    title: 'Enterprise Java & Spring Boot Security Reviewer',
    type: 'agent / skill',
    category: 'Enterprise Backend Code Review',
    techStack: ['Java 17 / 21 LTS', 'Spring Boot 3.x', 'Spring Security 6', 'Hibernate / JPA', 'Virtual Threads (Project Loom)', 'JUnit 5'],
    mainWork: 'Audits enterprise Java and Spring Boot applications for modern LTS patterns, virtual thread concurrency safety, Spring Security configurations, JPA/Hibernate N+1 queries, and critical enterprise security flaws (SpotBugs, OWASP Top 10, SQLi, XXE, insecure deserialization, LDAP/JNDI injection, CSRF/CORS).',
    capabilities: [
      'Modern Java 21 LTS patterns: Records, sealed classes, pattern matching for switch, virtual threads',
      'Spring Boot 3 & Security 6: Method-level authorization (@PreAuthorize), stateless JWT, CSRF protection',
      'JPA & Hibernate performance: N+1 query detection, fetch join optimization, batch inserts, second-level cache',
      'Enterprise security scanning: XML External Entity (XXE) injection, JNDI lookups, Log4j style exploits, SQLi in Criteria API',
      'Concurrency correctness: Thread pool sizing, Virtual Thread pin detection (synchronized vs ReentrantLock)'
    ],
    copilotInvocation: '@java-reviewer audit this Spring Boot REST controller and JPA repository for N+1 queries and Spring Security bypasses',
    samplePrompts: [
      'Review our Spring Data JPA queries for Hibernate N+1 problems and excessive eager fetching.',
      'Check our Spring Security 6 filter chain configuration for CORS/CSRF vulnerabilities.',
      'Audit this multi-threaded Java 21 service for synchronized blocks pinning virtual threads.'
    ]
  },
  {
    name: 'go-reviewer',
    title: 'Autonomous Go (Golang) Systems Reviewer',
    type: 'agent / skill',
    category: 'Systems & Microservices Code Review',
    techStack: ['Go 1.22 / 1.23', 'Goroutines & Channels', 'gRPC & Protocol Buffers', 'Gin / Echo / Chi', 'Gorm / sqlx', 'Go Test / Testify'],
    mainWork: 'Performs deep static analysis and systems correctness audits for Go codebases. Evaluates goroutine leaks, channel deadlock prevention, race condition detection, escape analysis/memory allocations, and comprehensive security vulnerability scanning (Gosec, command injection, unvalidated redirects, insecure crypto).',
    capabilities: [
      'Go 1.22+ idioms: Range over integers/functions, loop variable scoping fixes, slices/maps packages',
      'Concurrency audit: Goroutine leak detection, unbuffered channel deadlocks, context.WithTimeout propagation',
      'Memory & escape analysis: Pointer escape to heap audit, sync.Pool buffer reuse, zero-allocation serialization',
      'Security auditing (Gosec): Unsanitized os/exec.Command calls, path traversal in net/http, insecure TLS MinVersion',
      'Error handling governance: Structured error wrapping (fmt.Errorf with %w), errors.Is / errors.As patterns'
    ],
    copilotInvocation: '@go-reviewer inspect this Go gRPC service and worker pool for goroutine leaks and race conditions',
    samplePrompts: [
      'Analyze this Go concurrent pipeline for context cancellation handling and channel closing deadlocks.',
      'Review this HTTP handler for memory allocation hotspots using escape analysis patterns.',
      'Audit our Go codebase for command injection vulnerabilities in os/exec and unsafe file path joins.'
    ]
  },
  {
    name: 'cpp-reviewer',
    title: 'Senior C & Modern C++ Systems Reviewer',
    type: 'agent / skill',
    category: 'Systems Correctness & Memory Safety',
    techStack: ['C++17 / C++20 / C++23', 'C11 / C17', 'RAII & Smart Pointers', 'std::span / std::string_view', 'Valgrind / ASan', 'CMake'],
    mainWork: 'Specializes in memory safety, systems correctness, and high-performance engineering for C and modern C++. Detects buffer overflows, use-after-free, double-free, dangling pointers, undefined behavior, integer overflows, and concurrency race conditions while enforcing RAII and modern smart pointer idioms.',
    capabilities: [
      'Memory safety & Lifetime audit: Buffer overflows, Use-After-Free (UAF), Double-Free, dangling references',
      'Modern C++ idioms: RAII everywhere, std::unique_ptr/std::shared_ptr, std::span, std::string_view, concepts',
      'Undefined Behavior (UB) prevention: Integer overflow/underflow, uninitialized variables, strict aliasing violations',
      'Concurrency correctness: std::atomic operations, memory ordering (acquire-release vs sequential consistency)',
      'Sanitizer compliance: Prepares code to pass AddressSanitizer (ASan), UndefinedBehaviorSanitizer (UBSan), and TSan'
    ],
    copilotInvocation: '@cpp-reviewer audit this C++ network parser and ring buffer for buffer overflows and lifetime errors',
    samplePrompts: [
      'Review this custom memory allocator for use-after-free and alignment issues.',
      'Inspect this multithreaded C++20 ring buffer for race conditions and atomic memory ordering bugs.',
      'Refactor raw pointer arithmetic in this image processing loop to use std::span and bounds safety.'
    ]
  },
  {
    name: 'work-timeline-tracker',
    title: 'Autonomous Work Timeline & Standup Tracker',
    type: 'agent / skill',
    category: 'Developer Productivity & Task Lifecycle',
    techStack: ['JSON / Markdown Storage', 'CLI Lifecycle Tracking', 'Git Hooks', 'Telemetry Integration', 'Automated Standup Reports'],
    mainWork: 'Autonomously records start times, milestones, context switches, bug investigations, and task completions with duration calculation. Generates automated developer standup reports, sprint summaries, and productivity analytics.',
    capabilities: [
      'Task lifecycle logging: Start, pause, resume, milestone, and completion tracking with timestamps',
      'Context switch detection: Records when developer switches between different bugfixes, features, or reviews',
      'Automated standup report generation: Formats yesterday/today/blockers markdown for daily team standups',
      'Sprint duration analytics: Calculates active development vs review vs debugging duration breakdown',
      'Zero-overhead local storage: Persists structured timeline events in .timeline/ or local session store'
    ],
    copilotInvocation: '@work-timeline-tracker generate my standup report for today based on recent task milestones',
    samplePrompts: [
      'Start tracking milestone "Refactoring backend review comment endpoints" for artifact certification.',
      'Record context switch: Investigating high-severity npm advisory GHSA-xcx6-jx8p-x3h5.',
      'Generate a comprehensive standup summary showing all completed tasks, duration, and PR diffs.'
    ]
  },
  {
    name: 'engineering-commons-advisor',
    title: 'Autonomous Engineering Commons AI Artifact Advisor & Matcher',
    type: 'agent / skill',
    category: 'AI Marketplace Recommendation',
    techStack: ['Catalog Semantic Matching', 'Engineering Commons Marketplace', 'Engineering Commons CLI', 'Copilot Prompt Templates'],
    mainWork: 'Analyzes developer requirements, code context, and architectural challenges to search the Engineering Commons catalog and recommend, match, and install the best-fit AI agents, skills, MCP servers, prompts, and solutions.',
    capabilities: [
      'Semantic requirement matching: Maps fuzzy developer descriptions to certified marketplace artifacts',
      'Cross-stack suitability scoring: Recommends exact language reviewers based on active workspace file types',
      '1-click installation automation: Generates exact `engineering-commons install <name>` commands',
      'Copilot invocation synthesis: Provides immediate chat prompt examples tailored to developer code',
      'Zero-hallucination guarantee: Verifies matched artifacts strictly against the certified catalog'
    ],
    copilotInvocation: '@engineering-commons-advisor recommend the best AI artifacts for auditing my Azure Data Factory and Power BI pipelines',
    samplePrompts: [
      'What AI artifacts should I install to review my C# ASP.NET Core microservice for security vulnerabilities?',
      'Find tools and prompt libraries in Engineering Commons for Medallion Lakehouse architecture and PySpark profiling.',
      'Recommend artifacts to track my daily engineering tasks and automate my standup reports.'
    ]
  }
];

function generateSkillReadme(s) {
  return `# ${s.title}
[![Type: ${s.type}](https://img.shields.io/badge/Type-${encodeURIComponent(s.type)}-blue.svg)]()
[![Status: Certified](https://img.shields.io/badge/Status-Certified-brightgreen.svg)]()
[![Category: ${s.category}](https://img.shields.io/badge/Category-${encodeURIComponent(s.category)}-purple.svg)]()
[![Author: Harsh Pratap Singh Rana](https://img.shields.io/badge/Author-Harsh_Pratap_Singh_Rana-orange.svg)]()

> **Artifact Name**: \`${s.name}\`  
> **Main Work**: ${s.mainWork}

---

## 📌 What is the Main Work of this Artifact?

**${s.name}** is a certified Engineering Commons AI artifact designed to autonomously solve:

${s.mainWork}

Instead of manually reviewing code or consulting disjointed documentation, developers install this artifact to get instant, deep automated analysis, line-level code replacements, and compliance verification directly inside their development environment.

---

## 🛠️ Supported Technology Stack

${s.techStack.map(t => `- **${t}**`).join('\n')}

---

## 🎯 Key Capabilities & Review Dimensions

${s.capabilities.map(c => `- ${c}`).join('\n')}

---

## 🚀 How to Install & Use This Artifact

### 1. Installation via Engineering Commons CLI
Run this command from any terminal in your project root:
\`\`\`bash
engineering-commons install ${s.name}
\`\`\`
*(or install via the **Engineering Commons VS Code Extension** by clicking **Install** in the Market Explorer tab).*

### 2. How to Invoke in GitHub Copilot Chat
Once installed, open GitHub Copilot Chat in VS Code and invoke the artifact directly:
\`\`\`text
${s.copilotInvocation}
\`\`\`

### 3. How to Invoke in Antigravity IDE
Open the Antigravity Chat panel and summon the skill:
\`\`\`text
Please run ${s.name} on the current active file to check for security vulnerabilities and performance bottlenecks.
\`\`\`

---

## 💡 Practical Workflow Prompts & Examples

### Example 1: Targeted Component Review
\`\`\`text
${s.samplePrompts[0]}
\`\`\`

### Example 2: Deep Security & Bug Audit
\`\`\`text
${s.samplePrompts[1]}
\`\`\`

### Example 3: Performance & Architecture Optimization
\`\`\`text
${s.samplePrompts[2]}
\`\`\`

---

## 📊 Expected Output & Review Artifacts

When you invoke **${s.name}**, you receive a structured report containing:
1. **Executive Verdict & Health Score**: High-level pass/fail assessment and risk categorization.
2. **Critical Vulnerabilities & Bugs**: Precise line-number references with CWE / OWASP classification.
3. **Optimized Code Diffs**: Drop-in unified replacement snippets that preserve existing features.
4. **Best-Practice Guidance**: Actionable steps aligned with enterprise architectural governance.

---
*Maintained by **Harsh Pratap Singh Rana** (\`harsh.rana@maqsoftware.com\`) • Engineering Commons Ecosystem*
`;
}

// 1. Write README.md to .agents/skills/<name>/ and skills/<name>/
for (const s of skillsData) {
  const readmeContent = generateSkillReadme(s);

  const p1 = path.join(rootDir, '.agents', 'skills', s.name, 'README.md');
  const dir1 = path.dirname(p1);
  if (fs.existsSync(dir1)) {
    fs.writeFileSync(p1, readmeContent, 'utf8');
    console.log(`[README] Written: .agents/skills/${s.name}/README.md`);
  }

  const p2 = path.join(rootDir, 'skills', s.name, 'README.md');
  const dir2 = path.dirname(p2);
  if (fs.existsSync(dir2)) {
    fs.writeFileSync(p2, readmeContent, 'utf8');
    console.log(`[README] Written: skills/${s.name}/README.md`);
  }

  const p3 = path.join(rootDir, '.github', 'skills', s.name, 'README.md');
  const dir3 = path.dirname(p3);
  if (fs.existsSync(dir3)) {
    fs.writeFileSync(p3, readmeContent, 'utf8');
    console.log(`[README] Written: .github/skills/${s.name}/README.md`);
  }
}

// 2. Generate .github/agents/README.md
const agentsReadme = `# Engineering Commons GitHub Copilot Agents Guide
[![Status: Certified](https://img.shields.io/badge/Status-Certified-brightgreen.svg)]()
[![Ecosystem: Engineering Commons](https://img.shields.io/badge/Ecosystem-Engineering_Commons-blue.svg)]()
[![Author: Harsh Pratap Singh Rana](https://img.shields.io/badge/Author-Harsh_Pratap_Singh_Rana-orange.svg)]()

This directory contains native **GitHub Copilot Agent Definitions** (\`.agent.md\`). These agents enable specialized persona-driven code reviews, architecture analysis, and developer workflow automation directly within GitHub Copilot Chat and Antigravity IDE.

---

## 🤖 Available Agents & Their Main Work

| Agent Mention | Title | Main Work / Purpose | Primary Stack |
| :--- | :--- | :--- | :--- |
${skillsData.filter(s => s.name !== 'engineering-commons-advisor').map(s => 
`| \`@${s.name}\` | **${s.title}** | ${s.mainWork.slice(0, 110)}... | \`${s.techStack.slice(0, 3).join(', ')}\` |`
).join('\n')}

---

## 🚀 How to Use GitHub Copilot Agents

### 1. In GitHub Copilot Chat
Type the agent handle followed by your request:
\`\`\`text
@csharp-reviewer please review this ASP.NET Core controller for memory allocations and EF Core queries.
\`\`\`
\`\`\`text
@typescript-reviewer audit this React custom hook for unnecessary re-renders and memory leaks.
\`\`\`
\`\`\`text
@architecture-reviewer review this distributed cache architecture for split-brain and cache avalanche risks.
\`\`\`

### 2. In Antigravity IDE
Mention the agent or instruct the assistant to follow the specific agent persona:
\`\`\`text
Act as @python-reviewer and audit our data processing pipeline for subprocess vulnerabilities.
\`\`\`

---
*Maintained by **Harsh Pratap Singh Rana** (\`harsh.rana@maqsoftware.com\`) • Engineering Commons Ecosystem*
`;

fs.writeFileSync(path.join(rootDir, '.github', 'agents', 'README.md'), agentsReadme, 'utf8');
console.log(`[README] Written: .github/agents/README.md`);

// 3. Generate .github/prompts/README.md
const promptsReadme = `# Engineering Commons Prompts & Playbook Guide
[![Status: Certified](https://img.shields.io/badge/Status-Certified-brightgreen.svg)]()
[![Total Prompts: 116](https://img.shields.io/badge/Total_Prompts-116-purple.svg)]()
[![Author: Harsh Pratap Singh Rana](https://img.shields.io/badge/Author-Harsh_Pratap_Singh_Rana-orange.svg)]()

This directory houses **GitHub Copilot Prompt Templates** (\`.prompt.md\`) that provide pre-engineered, standardized instructions for common development and data engineering tasks.

---

## 📜 Top-Level Prompts

### 1. \`/find-artifact\`
- **File**: [\`find-artifact.prompt.md\`](./find-artifact.prompt.md)
- **Main Work**: Searches the Engineering Commons catalog to find and recommend the best-matching AI agents, skills, and prompts for your exact task.
- **How to Use**:
  \`\`\`text
  /find-artifact I need automated unit testing and Roslyn security checks for my C# microservice
  \`\`\`

### 2. \`/azure-bi-playbook\`
- **File**: [\`azure-bi-playbook.prompt.md\`](./azure-bi-playbook.prompt.md)
- **Main Work**: Interactive prompt router for all 115 certified prompt templates from the **Azure BI & Data Engineering Playbook**.
- **How to Use**:
  \`\`\`text
  /azure-bi-playbook Design a Medallion Lakehouse architecture using Bronze, Silver, and Gold layers for retail sales data
  \`\`\`

---

## 📁 Azure BI & Data Engineering Playbook Prompts (115 Prompts)
Located in [\`playbook/\`](./playbook/):
- **Requirement Gathering (5)**: Source inventory, KPI glossary, mapping documents, acceptance criteria, DR rollback.
- **Analysis & Planning (16)**: SCD strategy, surrogate keys, data lineage, schema drift, query cost analysis.
- **Architecture & Design (12)**: Medallion Lakehouse, Fabric workspaces, semantic models, lakehouse partitioning.
- **Detailed Design (16)**: Star schema design, bridge tables, indexing, partitioning strategy.
- **Development & Implementation (58)**: PySpark profiling, SQL Server profiling, DAX measures, ADF pipelines, Delta Lake.
- **Deployment & CI/CD (2)**: Fabric Git integration, automated release pipelines.
- **Support & Maintenance (6)**: Pipeline telemetry, incident triage, performance tuning.

Full catalog and individual prompt details are available in [playbook/README.md](../../.agents/prompts/playbook/README.md).

---
*Maintained by **Harsh Pratap Singh Rana** (\`harsh.rana@maqsoftware.com\`) • Engineering Commons Ecosystem*
`;

fs.writeFileSync(path.join(rootDir, '.github', 'prompts', 'README.md'), promptsReadme, 'utf8');
console.log(`[README] Written: .github/prompts/README.md`);

// 4. Generate artifacts/README.md
const standaloneArtifactsReadme = `# Standalone AI Artifacts Reference Guide
[![Ecosystem: Engineering Commons](https://img.shields.io/badge/Ecosystem-Engineering_Commons-blue.svg)]()
[![Status: Certified](https://img.shields.io/badge/Status-Certified-brightgreen.svg)]()
[![Author: Harsh Pratap Singh Rana](https://img.shields.io/badge/Author-Harsh_Pratap_Singh_Rana-orange.svg)]()

This directory contains standalone AI artifacts, prompt templates, and specialized skills published to the Engineering Commons marketplace.

---

## 📦 Artifacts Catalog & Usage Guide

### 1. \`api-test-generator.skill.md\`
- **Type**: Skill
- **Main Work**: Autonomously parses OpenAPI / Swagger specifications and generates end-to-end integration tests using xUnit, Mocha, or Pytest with boundary test cases, happy paths, and error scenarios.
- **How to Use**:
  \`\`\`bash
  engineering-commons install api-test-generator
  \`\`\`
  In Copilot Chat: *"Generate comprehensive xUnit tests for the endpoints defined in swagger.json."*

### 2. \`cip-telemetry-sdk.md\`
- **Type**: Skill / SDK
- **Main Work**: Provides zero-overhead OpenTelemetry-compatible instrumentation for AI agent invocations, token utilization tracking, duration metrics, and developer activity logging.
- **How to Use**:
  \`\`\`bash
  engineering-commons install cip-telemetry-sdk
  \`\`\`
  In code: Import and call \`recordAgentInvocation({ artifactName, durationMs, success: true })\`.

### 3. \`git-smart-commit.md\`
- **Type**: Skill / Prompt
- **Main Work**: Analyzes git staging area diffs (\`git diff --cached\`) and generates standardized Conventional Commits (\`feat:\`, \`fix:\`, \`chore:\`) with concise bullet-pointed summaries of functional changes.
- **How to Use**:
  \`\`\`bash
  engineering-commons install git-smart-commit
  \`\`\`
  In Copilot Chat: *"Review staged changes and generate a conventional commit message."*

### 4. \`graphql-schema-guardian.md\`
- **Type**: Skill / Linter
- **Main Work**: Audits GraphQL schemas and resolver implementations for breaking changes, circular references, query depth vulnerabilities, and N+1 database resolution patterns.
- **How to Use**:
  \`\`\`bash
  engineering-commons install graphql-schema-guardian
  \`\`\`
  In Copilot Chat: *"Audit this GraphQL schema for breaking changes against our previous schema."*

### 5. \`memory-mcp-server.md\`
- **Type**: MCP Server
- **Main Work**: Provides an external knowledge graph and persistent contextual memory server for AI agents across different coding sessions.
- **How to Use**:
  \`\`\`bash
  engineering-commons install memory-mcp-server
  \`\`\`
  Connect via Claude or Antigravity MCP settings to persist entity relationships.

### 6. \`powerautomate-sync-engine.md\`
- **Type**: Solution / Integration
- **Main Work**: Connects Engineering Commons review workflows to Microsoft Power Automate, SharePoint Lists, and Microsoft Teams for real-time stakeholder approvals and notifications.
- **How to Use**:
  \`\`\`bash
  engineering-commons install powerautomate-sync-engine
  \`\`\`

### 7. \`system-architect-prompt.md\`
- **Type**: Prompt
- **Main Work**: Principal solutions architect prompt for synthesizing multi-tier enterprise system architectures, technology evaluation trade-offs, and cloud migration roadmaps.
- **How to Use**:
  \`\`\`bash
  engineering-commons install system-architect-prompt
  \`\`\`

### 8. \`terraform-compliance-guard.md\`
- **Type**: Skill / Security Auditor
- **Main Work**: Scans Terraform infrastructure-as-code files (\`.tf\`) for cloud security misconfigurations (public S3 buckets, open ingress 0.0.0.0/0, missing encryption at rest) and CIS benchmark compliance.
- **How to Use**:
  \`\`\`bash
  engineering-commons install terraform-compliance-guard
  \`\`\`
  In Copilot Chat: *"Audit main.tf for CIS benchmark violations and unencrypted storage resources."*

---
*Maintained by **Harsh Pratap Singh Rana** (\`harsh.rana@maqsoftware.com\`) • Engineering Commons Ecosystem*
`;

fs.writeFileSync(path.join(rootDir, 'artifacts', 'README.md'), standaloneArtifactsReadme, 'utf8');
console.log(`[README] Written: artifacts/README.md`);

console.log('[README] All READMEs successfully generated and synchronized!');
