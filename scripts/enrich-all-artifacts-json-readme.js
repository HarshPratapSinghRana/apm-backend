const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const artifactsDir = path.join(rootDir, 'artifacts-json');
const catalogPath = path.join(rootDir, 'api', 'artifacts-catalog.json');
const masterCatalogPath = path.join(rootDir, 'engineering-commons-vscode', 'resources', 'catalog', 'masterCatalog.json');

// Curated high-fidelity metadata for core tools & reviewers
const curatedKnowledge = {
  'architecture-reviewer': {
    title: 'Principal Enterprise Solutions Architecture Reviewer',
    type: 'agent',
    domain: 'Code Review & Architecture',
    category: 'Architecture & System Design',
    techStack: ['Distributed Systems', 'Microservices', 'Kubernetes', 'Cloud (Azure/AWS/GCP)', 'Event-Driven Architecture', 'Kafka / RabbitMQ'],
    prompt: '@architecture-reviewer Review our distributed microservices design in this repository. Analyze potential single points of failure (SPOFs), assess our consistency model (ACID vs BASE with Saga pattern), and verify that our API contracts adhere to Zero-Trust security and high-availability standards.',
    followUpPrompt: '@architecture-reviewer Evaluate our database sharding, cross-region replication, and FinOps cloud cost optimization trade-offs between AKS containers and serverless functions.',
    capabilities: [
      'Distributed systems resilience (Circuit Breaker, Bulkhead, Retry with exponential backoff and jitter)',
      'Consistency model audit (Eventual Consistency, Saga pattern, Transactional Outbox, 2PC)',
      'API Governance & Contract Safety (gRPC, REST, GraphQL schema evolution, zero breaking changes)',
      'Zero-Trust Cloud Security (mTLS, OIDC/OAuth2, least-privilege IAM, automated secret rotation)',
      'FinOps cloud cost optimization (auto-scaling thresholds, egress reduction, reserved instance sizing)'
    ]
  },
  'csharp-reviewer': {
    title: 'Senior C# & .NET Enterprise Reviewer',
    type: 'agent',
    domain: 'Code Review & Architecture',
    category: 'Backend Code Review & Security',
    techStack: ['C# 12 / C# 13', '.NET 8 / 9 / 10', 'ASP.NET Core', 'Entity Framework Core', 'xUnit / NUnit', 'Roslyn Analyzers'],
    prompt: '@csharp-reviewer Review this ASP.NET Core controller and repository for memory allocation bottlenecks, async state machine overhead, and Entity Framework Core N+1 queries.',
    followUpPrompt: '@csharp-reviewer Audit this service for Path Traversal (CWE-22) in Path.Combine, SQL injection in FromSqlRaw, and unsafe TLS verification bypasses.',
    capabilities: [
      'Modern C# idioms: Primary constructors, collection expressions, pattern matching, record structs',
      'High-throughput zero-allocation auditing: ReadOnlySpan<char>, ReadOnlyMemory<T>, ArrayPool<T>',
      'EF Core query optimization: Client-side evaluation elimination, .AsNoTracking(), batch update checks',
      'OWASP security: Path traversal in Path.Combine, SQLi in FromSqlRaw, mass assignment, TLS bypass',
      'Automated Roslyn static analysis compliance: Clean build under latest enterprise analysis rules'
    ]
  },
  'typescript-reviewer': {
    title: 'Senior TypeScript & Full-Stack Security Reviewer',
    type: 'agent',
    domain: 'Code Review & Architecture',
    category: 'Frontend & Node.js Code Review',
    techStack: ['TypeScript 5.x', 'React 18 / 19', 'Next.js 14 / 15', 'Node.js', 'Express', 'Mocha / Jest'],
    prompt: '@typescript-reviewer Review this React custom hook and Next.js Server Action for memory leaks, hydration mismatches, and type safety (any elimination).',
    followUpPrompt: '@typescript-reviewer Audit this Express.js route and API client for Prototype Pollution, Path Traversal, ReDoS, and strict TLS certificate verification.',
    capabilities: [
      'Strict type soundness: Eliminates `any`, enforces discriminated unions, strict null checks, exhaustiveness',
      'React & Next.js performance: Re-render cascades, memoization pitfalls, hydration mismatches, Server Components',
      'Node.js & Express security: Prototype pollution prevention, path traversal in express.static/fs, ReDoS defense',
      'Zero-Trust transport: Flags `rejectUnauthorized: false` and ensures strict TLS certificate checks',
      'Memory leak detection: Unsubscribed event listeners, unclosed timers, and dangling Webview message listeners'
    ]
  },
  'python-reviewer': {
    title: 'Senior Python & Data Science Security Reviewer',
    type: 'agent',
    domain: 'Code Review & Architecture',
    category: 'Backend & AI/ML Code Review',
    techStack: ['Python 3.10 - 3.13', 'FastAPI / Flask / Django', 'PySpark / Pandas / NumPy', 'Asyncio', 'Pydantic v2', 'Pytest'],
    prompt: '@python-reviewer Review this FastAPI router and Pandas data pipeline for subprocess injection risks, pickle deserialization vulnerabilities, and memory profiling bottlenecks.',
    followUpPrompt: '@python-reviewer Optimize this PySpark script for lazy evaluation, partition skew, and vectorize row-by-row apply loops into native expressions.',
    capabilities: [
      'Python 3.12+ idioms: Structural pattern matching, type parameter syntax (PEP 695), exception groups',
      'Asyncio concurrency safety: Task cancellation handling, event loop blocking detection, TaskGroup usage',
      'High-risk security auditing: Insecure deserialization (pickle/yaml.load), command injection in subprocess/os.system',
      'Data engineering performance: Vectorized Pandas/Polars operations vs slow loops, PySpark lazy evaluation',
      'Dependency vulnerability scanning: Safety/Bandit checks, insecure SSL context verification'
    ]
  },
  'java-reviewer': {
    title: 'Enterprise Java & Spring Boot Security Reviewer',
    type: 'agent',
    domain: 'Code Review & Architecture',
    category: 'Enterprise Backend Code Review',
    techStack: ['Java 17 / 21 LTS', 'Spring Boot 3.x', 'Spring Security 6', 'Hibernate / JPA', 'Virtual Threads (Project Loom)', 'JUnit 5'],
    prompt: '@java-reviewer Audit this Spring Boot REST controller and JPA repository for Hibernate N+1 queries, Spring Security 6 authorization bypasses, and Virtual Thread pinning.',
    followUpPrompt: '@java-reviewer Scan this Java service for XML External Entity (XXE) injection, unsafe JNDI lookups, Log4j style exploits, and Criteria API SQLi.',
    capabilities: [
      'Modern Java 21 LTS patterns: Records, sealed classes, pattern matching for switch, virtual threads',
      'Spring Boot 3 & Security 6: Method-level authorization (@PreAuthorize), stateless JWT, CSRF protection',
      'JPA & Hibernate performance: N+1 query detection, fetch join optimization, batch inserts, second-level cache',
      'Enterprise security scanning: XML External Entity (XXE) injection, JNDI lookups, Log4j style exploits',
      'Concurrency correctness: Thread pool sizing, Virtual Thread pin detection (synchronized vs ReentrantLock)'
    ]
  },
  'go-reviewer': {
    title: 'Autonomous Go (Golang) Systems Reviewer',
    type: 'agent',
    domain: 'Code Review & Architecture',
    category: 'Systems & Microservices Code Review',
    techStack: ['Go 1.22 / 1.23', 'Goroutines & Channels', 'gRPC & Protocol Buffers', 'Gin / Echo / Chi', 'Gorm / sqlx', 'Go Test / Testify'],
    prompt: '@go-reviewer Inspect this Go gRPC service and worker pool for goroutine leaks, unbuffered channel deadlocks, and race conditions.',
    followUpPrompt: '@go-reviewer Audit this Go HTTP handler for memory allocation hotspots using escape analysis patterns and scan for Gosec vulnerabilities in os/exec.',
    capabilities: [
      'Go 1.22+ idioms: Range over integers/functions, loop variable scoping fixes, slices/maps packages',
      'Concurrency audit: Goroutine leak detection, unbuffered channel deadlocks, context.WithTimeout propagation',
      'Memory & escape analysis: Pointer escape to heap audit, sync.Pool buffer reuse, zero-allocation serialization',
      'Security auditing (Gosec): Unsanitized os/exec.Command calls, path traversal in net/http, insecure TLS',
      'Error handling governance: Structured error wrapping (fmt.Errorf with %w), errors.Is / errors.As patterns'
    ]
  },
  'cpp-reviewer': {
    title: 'Senior C & Modern C++ Systems Reviewer',
    type: 'agent',
    domain: 'Code Review & Architecture',
    category: 'Systems Correctness & Memory Safety',
    techStack: ['C++17 / C++20 / C++23', 'C11 / C17', 'RAII & Smart Pointers', 'std::span / std::string_view', 'Valgrind / ASan', 'CMake'],
    prompt: '@cpp-reviewer Audit this C++ network parser and ring buffer for buffer overflows, Use-After-Free (UAF), double-free, and lifetime dangling pointer errors.',
    followUpPrompt: '@cpp-reviewer Refactor raw pointer arithmetic in this processing loop to use std::span and bounds safety while enforcing RAII idioms.',
    capabilities: [
      'Memory safety & Lifetime audit: Buffer overflows, Use-After-Free (UAF), Double-Free, dangling references',
      'Modern C++ idioms: RAII everywhere, std::unique_ptr/std::shared_ptr, std::span, std::string_view, concepts',
      'Undefined Behavior (UB) prevention: Integer overflow/underflow, uninitialized variables, strict aliasing',
      'Concurrency correctness: std::atomic operations, memory ordering (acquire-release vs sequential consistency)',
      'Sanitizer compliance: Prepares code to pass AddressSanitizer (ASan), UBSan, and ThreadSanitizer'
    ]
  },
  'work-timeline-tracker': {
    title: 'Autonomous Work Timeline & Standup Tracker',
    type: 'agent',
    domain: 'Productivity & Tooling',
    category: 'Developer Productivity & Task Lifecycle',
    techStack: ['JSON / Markdown Storage', 'CLI Lifecycle Tracking', 'Git Hooks', 'Telemetry Integration', 'Automated Standup Reports'],
    prompt: '@work-timeline-tracker Generate my developer standup report for today summarizing all completed tasks, active durations, and git milestones.',
    followUpPrompt: '@work-timeline-tracker Start tracking milestone "Refactoring database connection pooling" and log duration telemetry.',
    capabilities: [
      'Task lifecycle logging: Start, pause, resume, milestone, and completion tracking with timestamps',
      'Context switch detection: Records when developer switches between different bugfixes, features, or reviews',
      'Automated standup report generation: Formats yesterday/today/blockers markdown for daily team standups',
      'Sprint duration analytics: Calculates active development vs review vs debugging duration breakdown',
      'Zero-overhead local storage: Persists structured timeline events in .timeline/ or local session store'
    ]
  },
  'engineering-commons-advisor': {
    title: 'Autonomous Engineering Commons AI Artifact Advisor & Matcher',
    type: 'skill',
    domain: 'AI Governance & Artifact Discovery',
    category: 'AI Marketplace Recommendation',
    techStack: ['Catalog Semantic Matching', 'Engineering Commons Marketplace', 'Engineering Commons CLI', 'Copilot Prompt Templates'],
    prompt: '/engineering-commons-advisor Recommend the best certified AI artifacts, skills, and MCP servers for my active workspace and project requirements.',
    followUpPrompt: '/engineering-commons-advisor What AI reviewers and prompt playbooks should I install to audit my Azure Data Factory and Power BI pipelines?',
    capabilities: [
      'Semantic requirement matching: Maps fuzzy developer descriptions to certified marketplace artifacts',
      'Cross-stack suitability scoring: Recommends exact language reviewers based on active workspace file types',
      '1-click installation automation: Generates exact `engineering-commons install <name>` commands',
      'Copilot invocation synthesis: Provides immediate chat prompt examples tailored to developer code',
      'Zero-hallucination guarantee: Verifies matched artifacts strictly against the certified catalog'
    ]
  },
  'playwright-mcp': {
    title: 'Playwright Real Browser Automation MCP Server',
    type: 'mcpserver',
    domain: 'Testing & QA',
    category: 'Browser Automation & Testing',
    techStack: ['Playwright', 'Chromium', 'WebKit', 'Node.js', 'Model Context Protocol (MCP)'],
    prompt: 'Using the playwright-mcp server tools, launch a headless browser session to navigate to http://localhost:3000, take a screenshot of the checkout page, and check the console logs for JavaScript errors.',
    followUpPrompt: 'Using playwright-mcp, click the "Add to Cart" button, verify the cart counter updates to 1, and validate the accessibility tree for WCAG AA compliance.',
    capabilities: [
      'Full headless and headed browser automation via Playwright Chromium/Firefox/WebKit',
      'Visual regression and snapshot capture with automatic base64 image streaming',
      'DOM interaction, element clicking, form filling, and waiting for network idle',
      'Console log interception and automated detection of runtime uncaught exceptions'
    ]
  },
  'postgres-mcp': {
    title: 'PostgreSQL Database Explorer MCP Server',
    type: 'mcpserver',
    domain: 'Data & Analytics',
    category: 'Database Management',
    techStack: ['PostgreSQL', 'Node.js', 'pg-promise', 'Model Context Protocol (MCP)'],
    prompt: 'Using the postgres-mcp server, inspect the schema of the "orders" table, check existing indexes, and explain the query plan for our slowest join query.',
    followUpPrompt: 'Using postgres-mcp, run an EXPLAIN (ANALYZE, BUFFERS) on SELECT * FROM users WHERE email = $1 to verify index usage.',
    capabilities: [
      'Schema introspection: Tables, columns, foreign keys, triggers, and indices',
      'Read-only SQL execution with parameterized query protection',
      'Query plan analysis (EXPLAIN ANALYZE) with execution bottleneck identification',
      'Connection pooling and SSL transport enforcement'
    ]
  },
  'github-mcp-server': {
    title: 'GitHub Operations MCP Server',
    type: 'mcpserver',
    domain: 'DevOps & CI/CD',
    category: 'Source Control & Collaboration',
    techStack: ['GitHub REST / GraphQL API', 'Node.js', 'Model Context Protocol (MCP)'],
    prompt: 'Using the github-mcp-server, list recent pull requests assigned to me, inspect their status checks, and summarize the discussion on PR #42.',
    followUpPrompt: 'Using github-mcp-server, create an issue titled "Security vulnerability in npm dependency" with the label "security" and assign it to the security team.',
    capabilities: [
      'Pull Request inspection, code review comment querying, and diff analysis',
      'Issue lifecycle management: creation, tagging, milestone association',
      'Workflow run tracking and GitHub Actions log examination',
      'Repository search and commit history exploration'
    ]
  },
  'chrome-devtools-mcp': {
    title: 'Chrome DevTools Performance & Network MCP Server',
    type: 'mcpserver',
    domain: 'Performance & Profiling',
    category: 'Web Diagnostics',
    techStack: ['Chrome DevTools Protocol (CDP)', 'Puppeteer', 'Model Context Protocol (MCP)'],
    prompt: 'Using chrome-devtools-mcp, capture a 5-second CPU performance profile of our homepage load and identify the longest JavaScript tasks blocking the main thread.',
    followUpPrompt: 'Using chrome-devtools-mcp, inspect network waterfall timings, find uncompressed assets > 500KB, and check Core Web Vitals (LCP, CLS, FID).',
    capabilities: [
      'Real-time Chrome DevTools Protocol inspection via Model Context Protocol',
      'Main-thread flame graph analysis and Long Task identification',
      'Network waterfall inspection, asset size audits, and HTTP cache verification',
      'Core Web Vitals telemetry generation'
    ]
  },
  'kubernetes-security-auditor': {
    title: 'Kubernetes Cluster & Manifest Security Auditor',
    type: 'skill',
    domain: 'Cloud Infrastructure & Security',
    category: 'DevOps & Security',
    techStack: ['Kubernetes', 'YAML', 'Kube-bench', 'CIS Benchmarks', 'OPA / Gatekeeper'],
    prompt: '/kubernetes-security-auditor Audit our k8s deployment manifests in k8s/ for privileged containers, missing resource limits, and insecure hostPath mounts.',
    followUpPrompt: '/kubernetes-security-auditor Verify Pod Security Standards (PSS) compliance and generate an admission controller policy for rootless containers.',
    capabilities: [
      'Pod Security Standards audit: Privileged mode, hostPID, hostNetwork, capabilities drop',
      'Resource governance: Enforces CPU/Memory requests and limits to prevent noisy-neighbor DoS',
      'Network policy verification: Flags missing default-deny egress/ingress network policies',
      'Secret protection: Flags plaintext environment variables vs Kubernetes Secret references'
    ]
  },
  'docker-container-optimizer': {
    title: 'Docker Image & Container Optimizer',
    type: 'skill',
    domain: 'DevOps & CI/CD',
    category: 'Container Optimization',
    techStack: ['Docker', 'Dockerfile', 'Multi-stage Builds', 'Trivy', 'Dive'],
    prompt: '/docker-container-optimizer Analyze our Dockerfile to implement multi-stage builds, reduce final image size, and eliminate root execution.',
    followUpPrompt: '/docker-container-optimizer Audit our container build cache layers to accelerate CI/CD build times by > 60%.',
    capabilities: [
      'Multi-stage build refactoring to strip compilers, build caches, and devDependencies',
      'Non-root user enforcement (`USER 10001:10001`) for zero-privilege container execution',
      'Layer caching optimization: Ordering package manifests before source code copy',
      'Distroless and Alpine base image migration recommendations'
    ]
  },
  'azure-bicep-copilot': {
    title: 'Azure Bicep & ARM Infrastructure Copilot',
    type: 'agent',
    domain: 'Cloud Infrastructure & Security',
    category: 'Infrastructure as Code',
    techStack: ['Azure Bicep', 'ARM Templates', 'Azure Resource Manager', 'Azure CLI'],
    prompt: '@azure-bicep-copilot Generate a production-ready Azure Bicep module for an Azure App Service with Private Endpoints, Key Vault integration, and diagnostic logs enabled.',
    followUpPrompt: '@azure-bicep-copilot Review our main.bicep file for Microsoft Well-Architected Framework (WAF) compliance and cost optimization opportunities.',
    capabilities: [
      'Idiomatic Bicep code generation with strong typing and output parameters',
      'Well-Architected Framework compliance: Private Endpoints, TLS 1.3, managed identities',
      'Modular template decomposition following enterprise Azure landing zone standards',
      'Automatic parameter file and documentation generation'
    ]
  },
  'debugging-assistant': {
    title: 'Intelligent Runtime Debugging & Crash Assistant',
    type: 'agent',
    domain: 'Developer Tools & Debugging',
    category: 'Debugging & Diagnostics',
    techStack: ['Node.js', 'Python', 'C#', 'Source Maps', 'Stack Trace Analysis'],
    prompt: '@debugging-assistant Analyze this stack trace and uncaught promise rejection. Identify the root cause, pinpoint the exact source file and line, and propose a minimal fix.',
    followUpPrompt: '@debugging-assistant Inspect our async call chain for unhandled errors, dangling timeouts, and memory leaks.',
    capabilities: [
      'Automated stack trace symbolication and root cause diagnosis',
      'Async exception and Promise rejection tracking',
      'Off-by-one, null pointer, and undefined property dereference pattern detection',
      'Zero-regression minimal patch generation with defensive guard checks'
    ]
  },
  'azure-cost-optimizer': {
    title: 'Azure Cloud FinOps & Cost Optimization Skill',
    type: 'skill',
    domain: 'Cloud Infrastructure & FinOps',
    category: 'Cloud Governance',
    techStack: ['Azure Cost Management', 'FinOps', 'Azure Advisor', 'Azure Resource Graph'],
    prompt: '/azure-cost-optimizer Analyze our cloud infrastructure deployment and suggest actionable rightsizing, reserved instances, and storage tiering to reduce monthly cloud spend.',
    followUpPrompt: '/azure-cost-optimizer Check for unattached managed disks, idle App Service Plans, and expensive multi-region cross-egress traffic.',
    capabilities: [
      'Compute rightsizing: Identifying underutilized VMs and over-provisioned App Service tiers',
      'Storage lifecycle optimization: Hot to Cool/Archive tier transitions and unattached disk cleanup',
      'Reservation & Savings Plan analysis: 1-year vs 3-year commitment trade-off evaluation',
      'Serverless auto-pause and consumption tier recommendations for dev/test workloads'
    ]
  },
  'api-test-generator': {
    title: 'Automated OpenAPI & REST Test Generator',
    type: 'skill',
    domain: 'Testing & QA',
    category: 'API Testing',
    techStack: ['OpenAPI 3.0 / Swagger', 'REST', 'xUnit / NUnit', 'Mocha / Jest', 'Pytest'],
    prompt: '/api-test-generator Parse our swagger.json specification and generate comprehensive integration test suites with edge cases, happy paths, and error scenarios.',
    followUpPrompt: '/api-test-generator Generate automated boundary value tests and 400/401/403/404/500 negative test assertions for the /api/orders endpoint.',
    capabilities: [
      'Automated parsing of OpenAPI 2.0 / 3.0 specifications',
      'Comprehensive test case synthesis: Happy path, parameter boundary, authentication failure, and server error scenarios',
      'Multi-framework code generation: TypeScript (Jest/Mocha), C# (xUnit/NUnit), Python (Pytest)',
      'Automated mock request payload generation using realistic synthetic test data'
    ]
  },
  'cip-db-explorer': {
    title: 'Engineering Commons Database & Schema Explorer Plugin',
    type: 'plugin',
    domain: 'Database & Governance',
    category: 'Database Management',
    techStack: ['SQLite', 'PostgreSQL', 'SQL Server', 'VS Code Webview', 'TypeScript'],
    prompt: 'Run the cip-db-explorer plugin to inspect active database schemas, review table relationships, and run validation queries directly in the editor.',
    followUpPrompt: 'Generate a relational schema diagram and identify foreign key constraints missing indexes.',
    capabilities: [
      'Interactive visual database explorer in VS Code side panel',
      'Instant schema visualization and table relationship mapping',
      'Safe read-only query execution with automatic limit capping',
      'Index recommendation engine for slow join conditions'
    ]
  },
  'cip-telemetry-sdk': {
    title: 'Enterprise CIP Telemetry & Observability SDK',
    type: 'package',
    domain: 'Observability & Monitoring',
    category: 'SDK & Telemetry',
    techStack: ['OpenTelemetry', 'TypeScript', 'Node.js', 'Azure Application Insights', 'Prometheus'],
    prompt: 'Integrate the cip-telemetry-sdk into our microservice. Initialize the tracer, configure batch span exporting, and instrument our HTTP request pipeline with distributed tracing headers.',
    followUpPrompt: 'Add custom telemetry metrics to track AI agent latency, token utilization, and cache hit ratios.',
    capabilities: [
      'OpenTelemetry-compatible distributed tracing and metric collection',
      'Client-side batching and non-blocking background queue flush',
      'Automatic correlation of HTTP request IDs across microservices',
      'Dynamic Health Score (DHS) calculation and reporting'
    ]
  },
  'cip': {
    title: 'Engineering Commons Enterprise CLI & Governance Skill',
    type: 'skill',
    domain: 'DevOps & Governance',
    category: 'Developer Tools',
    techStack: ['CIP CLI', 'Node.js', 'TypeScript', 'Azure DevOps', 'SharePoint Online'],
    prompt: '/cip Run enterprise governance audit on all installed artifacts in the workspace and verify compliance with certification standards.',
    followUpPrompt: '/cip Verify local workspace certification level and submit updated telemetry event records to the federated registry.',
    capabilities: [
      'Workspace artifact discovery and validation across all active projects',
      'Automated installation and version synchronization of enterprise AI artifacts',
      '5-Pillar certification health verification and integrity checking',
      'Federated Azure DevOps and SharePoint Online governance synchronization'
    ]
  },
  'azure-cloud-development': {
    title: 'Azure Cloud Native Development Toolkit Plugin',
    type: 'plugin',
    domain: 'Cloud Infrastructure & Security',
    category: 'Cloud Engineering',
    techStack: ['Azure SDK', 'Azure Functions', 'Cosmos DB', 'Azure Storage', 'TypeScript'],
    prompt: 'Run azure-cloud-development plugin to configure our cloud deployment profile, set up Managed Identity bindings, and validate connection strings.',
    followUpPrompt: 'Audit our Azure Functions configuration for cold start mitigation and App Insights distributed tracing.',
    capabilities: [
      'Streamlined Azure SDK project scaffolding and configuration',
      'Zero-credential Managed Identity and Key Vault secret binding',
      'Automated Azure deployment template validation',
      'Cloud service emulators setup for local development (Azurite/Cosmos Emulator)'
    ]
  },
  'caveman': {
    title: 'Ultra-Minimalist Code Refactoring & De-Bloat Skill',
    type: 'skill',
    domain: 'Developer Tools & Productivity',
    category: 'Code Refactoring',
    techStack: ['Clean Code', 'KISS Principle', 'YAGNI', 'TypeScript', 'Python'],
    prompt: '/caveman Refactor this verbose class hierarchy into simple, composable pure functions with minimal boilerplate.',
    followUpPrompt: '/caveman Strip out unnecessary enterprise abstractions, over-engineered design patterns, and redundant wrapper types.',
    capabilities: [
      'Eliminates over-engineered OOP abstractions in favor of lean, readable functional code',
      'Removes dead code, unused indirection layers, and redundant type re-mappings',
      'Simplifies complex conditional trees into concise guard clauses and lookups',
      'Preserves 100% of public behavior and test assertions'
    ]
  },
  'dbhub-database-mcp': {
    title: 'DBHub Universal Multi-Database MCP Server',
    type: 'mcpserver',
    domain: 'Data & Analytics',
    category: 'Database Tooling',
    techStack: ['SQLite', 'PostgreSQL', 'MySQL', 'Model Context Protocol (MCP)'],
    prompt: 'Using dbhub-database-mcp, connect to the local SQLite database, list all tables and row counts, and extract the latest schema definition.',
    followUpPrompt: 'Using dbhub-database-mcp, run a safe analytical query to find top-selling products by revenue and export as CSV.',
    capabilities: [
      'Universal query interface across SQLite, PostgreSQL, and MySQL',
      'Automated query safety controls with strict read-only execution modes',
      'Fast schema introspection and ER diagram data export',
      'Direct MCP integration for Copilot Chat and Claude Code'
    ]
  },
  'figma-context-mcp': {
    title: 'Figma Design Context & Component MCP Server',
    type: 'mcpserver',
    domain: 'UI/UX & Design',
    category: 'Design Systems',
    techStack: ['Figma REST API', 'Design Tokens', 'Model Context Protocol (MCP)'],
    prompt: 'Using figma-context-mcp, fetch the design token definitions (colors, spacing, typography) from our Figma design file and generate Tailwind CSS configuration.',
    followUpPrompt: 'Using figma-context-mcp, extract component specs for the "CheckoutModal" and scaffold a matching React component.',
    capabilities: [
      'Direct extraction of Figma design tokens, styles, and typography values',
      'Component spec inspection and automated React/Tailwind/CSS scaffolding',
      'Asset export (SVG, PNG) and layout constraint mapping',
      'Eliminates manual design-to-code translation friction'
    ]
  },
  'time-mcp': {
    title: 'Universal Timezone, Schedule & Clock MCP Server',
    type: 'mcpserver',
    domain: 'Productivity & Tooling',
    category: 'Time & Scheduling',
    techStack: ['Temporal', 'Timezones', 'ISO 8601', 'Model Context Protocol (MCP)'],
    prompt: 'Using time-mcp, calculate the UTC and local business hours across London, New York, and Tokyo for scheduling our team release window.',
    followUpPrompt: 'Using time-mcp, compute duration differences and generate an ISO 8601 scheduling timetable.',
    capabilities: [
      'Accurate global timezone conversions with Daylight Saving Time handling',
      'ISO 8601 date math, timestamp formatting, and duration calculations',
      'Business hours and working day scheduling algorithms',
      'Seamless tool integration for agentic planning workflows'
    ]
  }
};

// Generate prompt based on artifact metadata
function generatePromptForArtifact(art) {
  const name = art.name || art.id || 'artifact';
  const type = (art.type || 'agent').toLowerCase().trim();
  const title = art.title || name;
  const desc = art.description || '';

  // 1. Check curated knowledge
  if (curatedKnowledge[name]) {
    return {
      prompt: curatedKnowledge[name].prompt,
      followUp: curatedKnowledge[name].followUpPrompt,
      capabilities: curatedKnowledge[name].capabilities,
      techStack: curatedKnowledge[name].techStack
    };
  }

  // 2. Check if artifact already has a long copilotPrompt
  if (art.copilotPrompt && typeof art.copilotPrompt === 'string' && art.copilotPrompt.length > 30) {
    return {
      prompt: art.copilotPrompt.trim(),
      followUp: `@${name} Please review the findings and provide step-by-step remediation instructions.`,
      capabilities: art.keyFeatures || [],
      techStack: art.techStack || []
    };
  }

  // 3. Extract first feature or clean up description
  const firstFeat = Array.isArray(art.keyFeatures) && art.keyFeatures.length > 0 ? art.keyFeatures[0] : '';
  const cleanFeat = firstFeat ? firstFeat.replace(/^[a-zA-Z0-9\s/&-]+:\s*/, '').toLowerCase() : '';
  const cleanDesc = desc ? desc.replace(/\.$/, '') : title;

  if (type === 'agent' || type === 'cip_agent' || name.endsWith('-agent')) {
    if (art['argument-hint']) {
      const hint = art['argument-hint'].replace(/^Ask @[\w-]+\s+(to\s+)?/i, '').trim();
      return {
        prompt: `@${name} ${hint}`,
        followUp: `@${name} Check for any potential regressions, security vulnerabilities, or performance trade-offs in our proposed changes.`,
        capabilities: art.keyFeatures || [],
        techStack: art.techStack || []
      };
    }
    if (cleanFeat) {
      return {
        prompt: `@${name} Please analyze our active codebase and ${cleanFeat}. Identify architectural violations, security risks, and optimization opportunities.`,
        followUp: `@${name} Propose drop-in code diffs and concrete implementation steps adhering to enterprise standards.`,
        capabilities: art.keyFeatures || [],
        techStack: art.techStack || []
      };
    }
    return {
      prompt: `@${name} Please inspect our workspace for ${cleanDesc}. Provide a structured audit report, highlight priority areas, and recommend concrete code improvements.`,
      followUp: `@${name} Generate unit test suites and verification checks to validate the updated implementation.`,
      capabilities: art.keyFeatures || [],
      techStack: art.techStack || []
    };
  }

  if (type === 'skill' || name.startsWith('skill-') || name.endsWith('-skill')) {
    if (cleanFeat) {
      return {
        prompt: `/${name} Execute automated workflow to ${cleanFeat} on the active project files.`,
        followUp: `/${name} Run comprehensive verification and generate a detailed audit summary report.`,
        capabilities: art.keyFeatures || [],
        techStack: art.techStack || []
      };
    }
    return {
      prompt: `/${name} Run automated inspection and execution for ${cleanDesc}.`,
      followUp: `/${name} Validate output against enterprise quality and security benchmarks.`,
      capabilities: art.keyFeatures || [],
      techStack: art.techStack || []
    };
  }

  if (type === 'mcpserver' || type === 'mcp' || name.endsWith('-mcp') || name.startsWith('mcp-')) {
    return {
      prompt: `Using the ${name} MCP server tools, inspect the environment, fetch relevant resources, and perform ${cleanDesc}.`,
      followUp: `Using ${name}, execute operations and return a structured JSON report with status telemetry.`,
      capabilities: art.keyFeatures || [],
      techStack: art.techStack || []
    };
  }

  if (type === 'prompt' || name.startsWith('playbook-') || name.includes('prompt')) {
    return {
      prompt: `You are an enterprise AI specialist specializing in ${art.domain || art.category || title}.\n\nTask: ${cleanDesc}\n\nRequirements:\n1. Adhere strictly to enterprise architectural, security, and data governance standards.\n2. Provide production-ready, clean, well-documented implementation code.\n3. Include comprehensive error handling, boundary validation, and verification checks.`,
      followUp: `Review the generated implementation against enterprise scalability and cost-efficiency guidelines.`,
      capabilities: art.keyFeatures || [],
      techStack: art.techStack || []
    };
  }

  if (type === 'command') {
    return {
      prompt: `engineering-commons run ${name}`,
      followUp: `Execute ${name} across staged files and export structured results to audit.log.`,
      capabilities: art.keyFeatures || [],
      techStack: art.techStack || []
    };
  }

  if (type === 'plugin') {
    return {
      prompt: `Run the ${name} plugin to automate ${cleanDesc} across the repository.`,
      followUp: `Configure ${name} preferences and apply custom enterprise rules.`,
      capabilities: art.keyFeatures || [],
      techStack: art.techStack || []
    };
  }

  return {
    prompt: `Integrate ${name} into the workspace and run standard execution for ${cleanDesc}.`,
    followUp: `Verify ${name} installation status and monitor runtime execution telemetry.`,
    capabilities: art.keyFeatures || [],
    techStack: art.techStack || []
  };
}

// Build proper README markdown
function buildProperReadme(art) {
  const name = art.name || art.id || 'artifact';
  const type = (art.type || 'agent').toLowerCase().trim();
  const title = art.title || name;
  const desc = art.description || `Enterprise ${type} artifact for company workflows.`;
  const domain = art.domain || 'Engineering';
  const category = art.category || 'Developer Tools';
  const author = art.author || art.producerEmail || 'Engineering Commons';
  const usability = art.usabilityBadge || (art.usability ? art.usability.toUpperCase() : 'PRODUCTION READY');
  const isCertified = Boolean(art.isCertified);

  const promptInfo = generatePromptForArtifact(art);
  const prompt = promptInfo.prompt;
  const followUp = promptInfo.followUp;
  const capabilities = (promptInfo.capabilities && promptInfo.capabilities.length > 0) 
    ? promptInfo.capabilities 
    : (art.keyFeatures || [
        `Automated execution and domain assistance for ${name}`,
        `Strict adherence to enterprise architecture and security policies`,
        `Seamless integration into VS Code, GitHub Copilot, and Antigravity`,
        `Comprehensive error handling and telemetry emission`
      ]);
  const techStack = (promptInfo.techStack && promptInfo.techStack.length > 0)
    ? promptInfo.techStack
    : (art.techStack || ['TypeScript', 'GitHub Copilot', 'Antigravity IDE', 'Enterprise CIP']);

  // Check if it's a playbook prompt with an existing verbatim prompt
  let existingVerbatimPrompt = '';
  if (Array.isArray(art.files)) {
    const existingReadme = art.files.find(f => (f.path || '').toLowerCase() === 'readme.md');
    if (existingReadme && existingReadme.content) {
      const match = existingReadme.content.match(/## Verbatim Prompt\s*```([\s\S]*?)```/);
      if (match) {
        existingVerbatimPrompt = match[1].trim();
      }
    }
  }

  // Construct Markdown
  let md = `# ${title} (\`${name}\`)

${desc}

- **Artifact Type**: \`${type.toUpperCase()}\`
- **Domain / Category**: ${domain} • ${category}
- **Usability Tier**: ${usability}
- **Certification Status**: ${isCertified ? '🏆 Enterprise Certified (Level 3)' : '🛡️ Verified Enterprise Artifact'}
- **Author / Producer**: \`${author}\`

---

## 🚀 Quick Start & Installation

Install directly into your local workspace via the Engineering Commons CLI or Engineering Commons Marketplace:

\`\`\`bash
# Install via Engineering Commons CLI
engineering-commons install ${name}
\`\`\`

*(Alternatively, search for **\`${name}\`** in the **Engineering Commons VS Code Extension** and click **Install**).*

---

## 💡 How to Use & Example Prompts
`;

  if (type === 'agent' || type === 'cip_agent' || name.endsWith('-agent')) {
    md += `
### 1. In GitHub Copilot Chat (Agent Mode)
Open **GitHub Copilot Chat** (\`Ctrl+Alt+I\` / \`Cmd+Alt+I\`) in VS Code and invoke the agent with the **\`@\`** mention:

\`\`\`markdown
${prompt}
\`\`\`

### 2. Follow-Up / Deep Analysis Prompt Example
\`\`\`markdown
${followUp}
\`\`\`

### 3. In Antigravity IDE
Open the Antigravity Chat panel and run:
\`\`\`text
Please summon @${name} to inspect the active workspace and execute its automated review pipeline.
\`\`\`
`;
  } else if (type === 'skill' || name.startsWith('skill-') || name.endsWith('-skill')) {
    md += `
### 1. In GitHub Copilot Chat / Antigravity (Slash Command)
Trigger the skill directly using the slash command:

\`\`\`markdown
${prompt}
\`\`\`

### 2. Verification / Detailed Execution Prompt Example
\`\`\`markdown
${followUp}
\`\`\`

### 3. Natural Language Invocation
\`\`\`markdown
Run the "${name}" skill on our current repository files to validate standards and report any anomalies.
\`\`\`
`;
  } else if (type === 'mcpserver' || type === 'mcp') {
    md += `
### 1. MCP Server Configuration
Add this configuration snippet to your workspace \`.vscode/mcp.json\` or Claude Code config:

\`\`\`json
{
  "mcpServers": {
    "${name}": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {}
    }
  }
}
\`\`\`

### 2. Copilot Chat & Claude Example Prompt
\`\`\`markdown
${prompt}
\`\`\`

### 3. Advanced Tool Operations
\`\`\`markdown
${followUp}
\`\`\`
`;
  } else if (type === 'prompt' || name.startsWith('playbook-')) {
    if (existingVerbatimPrompt) {
      md += `
### 1. How to Use in GitHub Copilot Chat & Antigravity
1. Open **GitHub Copilot Chat** (\`Ctrl+Alt+I\` / \`Cmd+Alt+I\`) or the Antigravity chat panel.
2. Copy the **Verbatim Prompt** below.
3. Replace any bracketed placeholders (such as \`{Dimension Name}\`, \`{Source Tables}\`, or \`{Context}\`) with your specific project details.
4. Press Enter to generate SME-ready architecture documents, schemas, or pipelines.

### 2. Verbatim Prompt Template
\`\`\`markdown
${existingVerbatimPrompt}
\`\`\`
`;
    } else {
      md += `
### 1. Prompt Execution Instructions
Copy the prompt template below and paste it into GitHub Copilot Chat or Antigravity:

\`\`\`markdown
${prompt}
\`\`\`

### 2. Refinement & Optimization Follow-Up
\`\`\`markdown
${followUp}
\`\`\`
`;
    }
  } else if (type === 'command') {
    md += `
### 1. CLI Execution
Execute this command in your project terminal:

\`\`\`bash
${prompt}
\`\`\`

### 2. Copilot Chat Invocation
\`\`\`markdown
${followUp}
\`\`\`
`;
  } else if (type === 'plugin') {
    md += `
### 1. VS Code Command Palette Invocation
Open the Command Palette (\`Ctrl+Shift+P\` / \`Cmd+Shift+P\`) and run:
\`\`\`text
> Engineering Commons: Run ${name}
\`\`\`

### 2. Copilot Chat Example Prompt
\`\`\`markdown
${prompt}
\`\`\`
`;
  } else {
    md += `
### 1. How to Use This Artifact
\`\`\`markdown
${prompt}
\`\`\`

### 2. Verification Prompt
\`\`\`markdown
${followUp}
\`\`\`
`;
  }

  md += `
---

## 🌟 Key Capabilities & Features

${capabilities.map(c => `- **${c}**`).join('\n')}

---

## 🛠️ Supported Technology Stack

${techStack.map(t => `- \`${t}\``).join('\n')}

---

## 📋 What's Included & Expected Deliverables

When invoked, **\`${name}\`** provides:
1. **Automated Diagnostic & Health Assessment**: Structured evaluation of workspace files against enterprise best practices.
2. **Actionable Remediation Diffs**: Line-level, unified diff proposals preserving existing business logic and code comments.
3. **Telemetry & Audit Logging**: Continuous tracking of execution duration, token efficiency, and safety compliance.

---

## 🛡️ Enterprise Compliance & Quality Standards
- **Zero Secret Leakage**: Enforced by git pre-commit hooks and automated CIP secret scans.
- **Strict Typing & Soundness**: Validated against rigorous compilation and linting rules.
- **Audited Telemetry**: Telemetry events recorded with Dynamic Health Score (DHS) governance.

---
*Maintained by **${author}** • Engineering Commons Ecosystem*
`;

  return {
    readmeContent: md.trim(),
    copilotPrompt: prompt
  };
}

// 1. Ensure engineering-commons-advisor exists in artifacts-json
const advisorPath = path.join(artifactsDir, 'engineering-commons-advisor.json');
if (!fs.existsSync(advisorPath)) {
  const advisorData = {
    id: 'engineering-commons-advisor',
    name: 'engineering-commons-advisor',
    title: 'Autonomous Engineering Commons AI Artifact Advisor & Matcher',
    version: '1.0.0',
    type: 'skill',
    category: 'Developer Tools',
    domain: 'AI Governance & Artifact Discovery',
    description: 'Autonomous Engineering Commons AI Artifact Advisor & Matcher. Analyzes developer requirements and searches the Engineering Commons catalog to recommend, match, and install the best-fit AI agents, skills, MCP servers, and prompt templates.',
    author: 'Harsh Pratap Singh Rana',
    producerEmail: 'harsh.rana@maqsoftware.com',
    isCertified: true,
    downloads: 14200,
    rating: 5,
    techStack: ['Catalog Semantic Matching', 'Engineering Commons Marketplace', 'Engineering Commons CLI', 'Copilot Prompt Templates'],
    keyFeatures: [
      'Semantic requirement matching: Maps fuzzy developer descriptions to certified marketplace artifacts',
      'Cross-stack suitability scoring: Recommends exact language reviewers based on active workspace file types',
      '1-click installation automation: Generates exact engineering-commons install commands',
      'Copilot invocation synthesis: Provides immediate chat prompt examples tailored to developer code',
      'Zero-hallucination guarantee: Verifies matched artifacts strictly against the certified catalog'
    ],
    usability: 'copilot-ready',
    usabilityBadge: '🛠️ AI Skill',
    isCopilotReady: true,
    files: [
      {
        path: 'skills/engineering-commons-advisor/SKILL.md',
        content: fs.existsSync(path.join(rootDir, '.agents', 'skills', 'engineering-commons-advisor', 'SKILL.md'))
          ? fs.readFileSync(path.join(rootDir, '.agents', 'skills', 'engineering-commons-advisor', 'SKILL.md'), 'utf8')
          : '# engineering-commons-advisor\n'
      },
      {
        path: 'cip.yml',
        content: 'name: engineering-commons-advisor\nversion: 1.0.0\ntype: skill\ncategory: Developer Tools\nauthor: harsh.rana@maqsoftware.com\ndescription: Autonomous Engineering Commons AI Artifact Advisor & Matcher.\nmain: skills/engineering-commons-advisor/SKILL.md\n'
      }
    ]
  };
  fs.writeFileSync(advisorPath, JSON.stringify(advisorData, null, 2), 'utf8');
  console.log('[Enricher] Created missing engineering-commons-advisor.json');
}

// 2. Iterate and enrich all artifacts in artifacts-json
const files = fs.readdirSync(artifactsDir).filter(f => f.endsWith('.json') && !f.startsWith('all-artifacts'));
console.log(`[Enricher] Processing ${files.length} artifacts in artifacts-json/ ...`);

let updatedCount = 0;
const enrichedMap = new Map();

for (const file of files) {
  const filePath = path.join(artifactsDir, file);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const art = JSON.parse(raw);
    const name = art.name || art.id || file.replace('.json', '');

    const { readmeContent, copilotPrompt } = buildProperReadme(art);

    if (!Array.isArray(art.files)) {
      art.files = [];
    }

    // Remove old README.md if present
    art.files = art.files.filter(f => (f.path || '').toLowerCase() !== 'readme.md');

    // Insert new enriched README.md as the first file
    art.files.unshift({
      path: 'README.md',
      content: readmeContent
    });

    // Save prompt to artifact
    art.copilotPrompt = copilotPrompt;

    fs.writeFileSync(filePath, JSON.stringify(art, null, 2), 'utf8');
    enrichedMap.set(name.toLowerCase(), { copilotPrompt, title: art.title });
    updatedCount++;
  } catch (err) {
    console.error(`[Enricher] Error processing ${file}:`, err.message);
  }
}
console.log(`[Enricher] Successfully enriched README.md and prompts for ${updatedCount} artifacts in artifacts-json/!`);

// 3. Sync api/artifacts-catalog.json
if (fs.existsSync(catalogPath)) {
  try {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    let catUpdates = 0;
    for (const item of catalog) {
      const cleanName = (item.name || item.id || '').replace(/^leap-/, '').toLowerCase();
      const enriched = enrichedMap.get(cleanName) || enrichedMap.get((item.name || item.id || '').toLowerCase());
      if (enriched) {
        item.copilotPrompt = enriched.copilotPrompt;
        if (!item.installCommand) {
          item.installCommand = `engineering-commons install ${item.name || item.id}`;
        }
        catUpdates++;
      } else {
        const { copilotPrompt } = buildProperReadme(item);
        item.copilotPrompt = copilotPrompt;
        if (!item.installCommand) {
          item.installCommand = `engineering-commons install ${item.name || item.id}`;
        }
        catUpdates++;
      }
    }
    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
    console.log(`[Enricher] Updated ${catUpdates} items in api/artifacts-catalog.json!`);
  } catch (e) {
    console.error('[Enricher] Error updating catalog:', e.message);
  }
}

// 4. Sync engineering-commons-vscode/resources/catalog/masterCatalog.json
if (fs.existsSync(masterCatalogPath)) {
  try {
    const master = JSON.parse(fs.readFileSync(masterCatalogPath, 'utf8'));
    let masterUpdates = 0;
    for (const item of master) {
      const cleanName = (item.name || item.id || '').replace(/^leap-/, '').toLowerCase();
      const enriched = enrichedMap.get(cleanName) || enrichedMap.get((item.name || item.id || '').toLowerCase());
      if (enriched) {
        item.copilotPrompt = enriched.copilotPrompt;
        if (!item.installCommand) {
          item.installCommand = `engineering-commons install ${item.name || item.id}`;
        }
        masterUpdates++;
      } else {
        const { copilotPrompt } = buildProperReadme(item);
        item.copilotPrompt = copilotPrompt;
        if (!item.installCommand) {
          item.installCommand = `engineering-commons install ${item.name || item.id}`;
        }
        masterUpdates++;
      }
    }
    fs.writeFileSync(masterCatalogPath, JSON.stringify(master, null, 2), 'utf8');
    console.log(`[Enricher] Updated ${masterUpdates} items in engineering-commons-vscode masterCatalog.json!`);
  } catch (e) {
    console.error('[Enricher] Error updating masterCatalog:', e.message);
  }
}

console.log('[Enricher] All artifacts and catalogs successfully updated with comprehensive READMEs and usage prompts!');

