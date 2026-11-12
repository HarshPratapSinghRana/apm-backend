# CIP #1067 – Engineering Commons
## Architecture & Code Review Guide

This guide is designed for your **code review with an external reviewer**. It breaks down every major file, explains how the files connect to each other, and provides clear visual diagrams and tables so you can confidently link what code is doing what.

---

## 1. Visual Project Tree View

Below is the end-to-end structural hierarchy of the **CIP #1067 – Engineering Commons** repository, showing how the client layers, backend services, CLI, and storage models link together.

```
CIP-Engineering Commons/
├── 📁 engineering-commons-vscode/        # [PILLAR 1] VS Code Extension (TypeScript)
│   ├── 📁 src/
│   │   ├── 📄 extension.ts              # Extension entry point, lifecycle & command registry
│   │   ├── 📁 commands/                 # User-triggered command handlers
│   │   │   ├── 📄 loginCommand.ts       # Microsoft Entra ID SSO & credential login
│   │   │   ├── 📄 installCommand.ts     # 1-click workspace install & ZIP packaging
│   │   │   ├── 📄 listCommand.ts        # Artifact catalog query and JSON parsing
│   │   │   ├── 📄 contributeCommand.ts  # Workspace scanning and publishing modal
│   │   │   ├── 📄 reviewCommand.ts      # Multi-file PR diff inspection
│   │   │   ├── 📄 updateCommand.ts      # In-place artifact version updater
│   │   │   └── 📄 visibilityCommand.ts  # Public / Private whitelist access control
│   │   ├── 📁 views/                    # Webview & tree UI providers
│   │   │   ├── 📄 engineeringCommonsSidebarWebviewProvider.ts  # Primary Explorer Sidebar
│   │   │   ├── 📄 artifactTreeDataProvider.ts                 # Activity Bar Tree View
│   │   │   ├── 📄 artifactDetailsWebviewProvider.ts           # Interactive details modal
│   │   │   ├── 📄 threadWebviewProvider.ts                    # GitHub-like PR diff & comments
│   │   │   ├── 📄 contributeWebviewProvider.ts                # Submission & metadata form
│   │   │   └── 📄 usageDashboardWebviewProvider.ts            # Analytics & telemetry dashboard
│   │   └── 📁 services/                 # Background business logic & integrations
│   │       ├── 📄 ssoService.ts         # Microsoft Entra ID Device Code & Native SSO
│   │       ├── 📄 cliExecutor.ts        # Asynchronous CLI process runner
│   │       ├── 📄 cliProvisioner.ts     # Silent background CLI extractor
│   │       ├── 📄 advisorHookProvisioner.ts  # Zero-network Copilot advisor installer
│   │       ├── 📄 installationChecker.ts # Disk-verified artifact validator
│   │       ├── 📄 usageTracker.ts       # OpenTelemetry collector aggregator
│   │       ├── 📄 notificationCoordinator.ts # Polling background notification daemon
│   │       └── 📁 sharepoint/           # SharePoint Online integration
│   │           ├── 📄 sharepointClient.ts          # Graph API REST client
│   │           ├── 📄 sharepointArtifactService.ts # List sync & JSON representations
│   │           ├── 📄 sharepointBountyService.ts   # Gamified task tracking
│   │           └── 📄 sharepointTelemetryService.ts # Enterprise telemetry batcher
│   └── 📁 test/                         # 131 automated unit & integration test cases
│
├── 📁 EngineeringCommonsCli/             # [PILLAR 2] Command-Line Interface (C# / .NET 10)
│   ├── 📄 Program.cs                    # CLI entry point, DI container & command dispatcher
│   ├── 📁 Commands/                     # Command classes (Login, Install, Contribute, etc.)
│   └── 📁 Services/                     # Artifact classifiers, storage, and diff engines
│
├── 📁 cip-backend-dotnet/               # [PILLAR 3] Enterprise REST API (ASP.NET Core / .NET 10)
│   ├── 📄 Program.cs                    # Server bootstrap, security headers, SQLite & routing
│   ├── 📁 Controllers/                  # REST controllers (Artifacts, Reviews, Admin, Telemetry)
│   ├── 📁 Data/                         # EF Core CipDbContext and schema migrations
│   ├── 📁 Events/                       # Domain event publisher (Review notification events)
│   └── 📁 Services/                     # Azure DevOps Git service, Email engine, Bounties
│
└── 📁 docs/                             # Architecture specifications & deployment strategy
    └── 📄 AZURE-DEPLOYMENT-STRATEGY-100-TO-1000-USERS.md # Container Apps $0 free tier roadmap
```

---

## 2. Component Interaction & Data Flow

### A. Plain-Text System Flowchart (Universal Compatibility)

This diagram shows how all three pillars and cloud services interact:

```
+-----------------------------------------------------------------------------------------+
|                                1. DEVELOPER WORKSPACE                                   |
|                                                                                         |
|   +---------------------------------------------------------------------------------+   |
|   |                      VS Code Extension (extension.ts)                           |   |
|   |  - Registers 30+ Commands (Login, Install, Update, Contribute, Review)          |   |
|   |  - FileSystemWatchers auto-refresh UI on workspace changes                      |   |
|   +---------------------------------------------------------------------------------+   |
|                 |                                              |                        |
|                 v                                              v                        |
|   +-------------------------------------+        +----------------------------------+   |
|   | Sidebar Webview Provider            |        | CLI Process Executor             |   |
|   | (engineeringCommonsSidebar...)      |        | (cliExecutor.ts)                 |   |
|   | - Market Tab (Search & Filter)      |        | - Spawns binary asynchronously   |   |
|   | - Bounties Tab (Claim tasks)        |        | - Captures JSON stdout/stderr    |   |
|   | - My Work Tab (Assigned PR reviews) |        +----------------------------------+   |
|   +-------------------------------------+                      |                        |
+----------------------------------------------------------------|------------------------+
              |                               |                  |
              | Microsoft Entra ID Token      | REST / Graph     v Invokes Executable
              v                               v            +------------------------------+
+--------------------------+    +----------------------+   | 2. C# CLI (.NET 10)          |
| Microsoft Entra ID       |    | SharePoint Online    |   | (EngineeringCommonsCli.exe)  |
| - Corporate SSO Login    |    | - Artifact Lists     |   | - InstallCommand.cs          |
| - Device Code Flow       |    | - Bounty Definitions |   | - ContributeCommand.cs       |
| - OAuth2 Access Tokens   |    | - JSON Catalog Cache |   | - ReviewCommand.cs           |
+--------------------------+    +----------------------+   +------------------------------+
                                                                     |
                                                                     | HTTP REST
                                                                     v
+-----------------------------------------------------------------------------------------+
|                                3. ENTERPRISE BACKEND                                    |
|                         (cip-backend-dotnet on ASP.NET Core)                            |
|                                                                                         |
|   +---------------------------------------------------------------------------------+   |
|   | REST Controllers: ArtifactsController, ReviewsController, BountiesController   |   |
|   | Middleware: TokenAuthenticationMiddleware, Enterprise Security Headers (CSP)    |   |
|   +---------------------------------------------------------------------------------+   |
|                 |                                              |                        |
|                 v                                              v                        |
|   +-------------------------------------+        +----------------------------------+   |
|   | Database Persistence Layer          |        | Azure DevOps Git Service         |   |
|   | - SQLite (cip.db) via EF Core       |        | (AzureDevOpsMarketplaceService)  |   |
|   | - Zero-Cost In-Memory fallback      |        | - Pushes commits to Git Repos    |   |
|   | - Users, Roles, Reviews, Telemetry  |        | - Automated PR merge on approval |   |
|   +-------------------------------------+        +----------------------------------+   |
+-----------------------------------------------------------------------------------------+
```

---

### B. File-to-File Connection Matrix (How the Code Files Link Together)

This table shows the exact file relationships: **which file calls which file, using what mechanism, and why**:

| Source File | Connected Target File | Connection Mechanism | Purpose / What Happens |
|---|---|---|---|
| [`src/extension.ts`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/engineering-commons-vscode/src/extension.ts) | [`views/engineeringCommonsSidebarWebviewProvider.ts`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/engineering-commons-vscode/src/views/engineeringCommonsSidebarWebviewProvider.ts) | `window.registerWebviewViewProvider` | Mounts the primary sidebar GUI into VS Code Activity Bar container `engineering-commons-explorer`. |
| [`src/extension.ts`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/engineering-commons-vscode/src/extension.ts) | [`services/ssoService.ts`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/engineering-commons-vscode/src/services/ssoService.ts) | Function call: `executeMicrosoftSsoLogin()` | Authenticates corporate user via Microsoft Entra ID Device Code / Native SSO and stores token. |
| [`src/extension.ts`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/engineering-commons-vscode/src/extension.ts) | [`commands/installCommand.ts`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/engineering-commons-vscode/src/commands/installCommand.ts) | `commands.registerCommand('install')` | Triggered when user clicks "Install" or runs command palette. Delegates install logic. |
| [`commands/installCommand.ts`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/engineering-commons-vscode/src/commands/installCommand.ts) | [`services/cliExecutor.ts`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/engineering-commons-vscode/src/services/cliExecutor.ts) | Method: `executeAsync('install', ...)` | Executes the standalone CLI binary with command arguments (`engineering-commons install <pkg>`). |
| [`services/cliExecutor.ts`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/engineering-commons-vscode/src/services/cliExecutor.ts) | [`EngineeringCommonsCli/Program.cs`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/EngineeringCommonsCli/Program.cs) | Child Process OS Execution | Launches `EngineeringCommonsCli.exe` in background and reads JSON response from stdout. |
| [`EngineeringCommonsCli/Program.cs`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/EngineeringCommonsCli/Program.cs) | `EngineeringCommonsCli/Commands/InstallCommand.cs` | DI Resolution: `svc.GetRequiredService<InstallCommand>()` | Switch expression maps the `install` argument to the C# command handler. |
| `EngineeringCommonsCli/Commands/InstallCommand.cs` | `EngineeringCommonsCli/Services/ArtifactPlacementService.cs` | C# Method Call | Copies downloaded artifact files into `.github/agents/`, `.agents/skills/`, or `prompts/`. |
| `EngineeringCommonsCli/Commands/ContributeCommand.cs` | `EngineeringCommonsCli/Services/BackendClient.cs` | HTTP POST | Posts candidate artifact package to backend API (`POST /api/reviews`) to initiate PR review. |
| [`EngineeringCommonsCli/Services/BackendClient.cs`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/EngineeringCommonsCli/Program.cs) | [`cip-backend-dotnet/Program.cs`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/cip-backend-dotnet/Program.cs) | HTTP REST API / JSON | Sends HTTP requests to ASP.NET Core server (`/api/artifacts`, `/api/reviews`, `/api/bounties`). |
| [`cip-backend-dotnet/Program.cs`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/cip-backend-dotnet/Program.cs) | `cip-backend-dotnet/Controllers/ReviewsController.cs` | ASP.NET Core Route Mapping | Routes incoming review requests to the controller handler. |
| `cip-backend-dotnet/Controllers/ReviewsController.cs` | `cip-backend-dotnet/Services/AzureDevOpsMarketplaceService.cs` | C# Interface: `IMarketplaceService` | On review approval, commits the artifact files directly into Azure DevOps Git Repos via PAT. |
| `cip-backend-dotnet/Controllers/ReviewsController.cs` | `cip-backend-dotnet/Data/CipDbContext.cs` | Entity Framework Core | Persists review status, line comments, and timestamps into SQLite database (`cip.db`). |
| [`views/engineeringCommonsSidebarWebviewProvider.ts`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/engineering-commons-vscode/src/views/engineeringCommonsSidebarWebviewProvider.ts) | [`views/threadWebviewProvider.ts`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/engineering-commons-vscode/src/views/threadWebviewProvider.ts) | Method: `showThread(reviewId)` | Opens the GitHub-like side-by-side PR diff and comment conversation panel. |
| [`views/engineeringCommonsSidebarWebviewProvider.ts`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/engineering-commons-vscode/src/views/engineeringCommonsSidebarWebviewProvider.ts) | [`views/artifactDetailsWebviewProvider.ts`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/engineering-commons-vscode/src/views/artifactDetailsWebviewProvider.ts) | Method: `showArtifactDetails(item)` | Opens the interactive modal dialog showing artifact documentation, files, and install button. |
| [`src/extension.ts`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/engineering-commons-vscode/src/extension.ts) | [`services/advisorHookProvisioner.ts`](file:///c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering%20Commons/engineering-commons-vscode/src/services/advisorHookProvisioner.ts) | Method: `provisionWorkspaceHooks()` | Copies `.github/skills/engineering-commons-advisor` and updates Copilot instructions for AI recommendations. |

---

### C. Step-by-Step Lifecycle Traces (Execution Sequences)

#### Trace 1: When a User Installs an Artifact
```
[1] User clicks "Install" in Sidebar Webview (engineeringCommonsSidebarWebviewProvider.ts)
                          │
                          ▼ (vscode.postMessage)
[2] Extension Message Handler routes to installCommand.ts (src/extension.ts)
                          │
                          ▼ (DefaultCliExecutor)
[3] Asynchronous subprocess spawns CLI: "engineering-commons install <name>" (cliExecutor.ts)
                          │
                          ▼ (Command Dispatcher)
[4] CLI Program.cs resolves InstallCommand.cs (EngineeringCommonsCli)
                          │
                          ▼ (Placement Service)
[5] Artifact files are extracted into workspace: .github/agents/<name>.agent.md
                          │
                          ▼ (Filesystem Event)
[6] FileSystemWatcher in extension.ts detects disk change
                          │
                          ▼ (Debounced Refresh)
[7] Sidebar Webview detects file on disk via installationChecker.ts and updates button to "✓ Installed"!
```

#### Trace 2: When an Artifact is Contributed & Reviewed
```
[1] Contributor fills form in contributeWebviewProvider.ts
                          │
                          ▼
[2] contributeCommand.ts validates files and invokes CLI: "engineering-commons contribute <dir>"
                          │
                          ▼
[3] CLI ContributeCommand.cs packages files and calls REST API: POST /api/reviews
                          │
                          ▼
[4] Backend ReviewsController.cs creates review submission record in SQLite (cip.db)
                          │
                          ▼
[5] DomainEventPublisher.cs triggers ReviewAssignedEvent -> Email notification sent to Reviewers
                          │
                          ▼
[6] Reviewer opens threadWebviewProvider.ts in VS Code to inspect diff and add line comments
                          │
                          ▼
[7] When approved: AzureDevOpsMarketplaceService.cs commits artifact into Azure DevOps Git Repo!
```

---

## 3. Explaining Every Section Comment in Detail

### File 1: `engineering-commons-vscode/src/extension.ts`

This file is the **central nervous system** of the VS Code extension.

#### • File Header (`/* CIP #1067 – Engineering Commons VS Code Extension Main Entry Point */`)
- **What it does:** Explains the 5 architectural responsibilities of the extension: CLI auto-provisioning, Copilot advisor hooks, service layer wiring, webview view management, and command registration.

#### • SECTION 0: Background CLI & GitHub Copilot Advisor Auto-Provisioning
- **Code:** `AutoCliProvisioner.ensureInstalled(context)` & `AdvisorHookProvisioner.provisionWorkspaceHooks(workspace)`
- **What it does:** 
  1. Checks if the bundled `engineering-commons` CLI binary is installed on the developer's system. If missing, it extracts it into `~/.engineering-commons/bin` silently in the background.
  2. Injects `.github/skills/engineering-commons-advisor` and updates `.github/copilot-instructions.md` with zero network latency so GitHub Copilot can immediately recommend Engineering Commons artifacts when writing code.

#### • SECTION 1: Service Layer & Dependency Injection Instantiation
- **Code:** Instantiating `SessionFileAuthStatusProvider`, `SharePointClient`, `CompositeUsageClient`, `BackendUsageLogger`, `AgentDebugLogCollector`, `HttpReviewThreadService`, and `NotificationCoordinator`.
- **What it does:** 
  1. Sets up the authentication reader that detects active login sessions from `session.json`.
  2. Initializes OpenTelemetry log parsers that listen to VS Code tool usage without fabricating data.
  3. Starts a 5-minute background poller (`NotificationCoordinator`) to check for code review feedback, approval events, and access request statuses.

#### • SECTION 2: Views & Webview Providers Initialization
- **Code:** `new ArtifactTreeDataProvider(...)`, `new EngineeringCommonsSidebarWebviewProvider(...)`, and `window.registerWebviewViewProvider('engineering-commons-explorer', ...)`
- **What it does:** Mounts the primary GUI sidebar into the VS Code Activity Bar with `{ retainContextWhenHidden: true }` so tab states, searches, and scroll positions are never lost when switching editors.

#### • SECTION 3: Workspace File Watchers & Reactive Debounced Auto-Refresh
- **Code:** `createFileSystemWatcher('**/{.cip,.github,.agents,skills,agents,prompts,plugins,.mcp}/**')` and `ymlWatcher`
- **What it does:** Watches the developer's workspace for newly installed or deleted skills/agents. Uses a 2.5-second debounce timer (`debouncedRefreshAllViews`) and ignores internal log/telemetry files to avoid infinite reload loops.

#### • SECTION 4: Live Configuration Change Listener
- **Code:** `vscode.workspace.onDidChangeConfiguration(e => { ... affectsConfiguration('engineeringCommons.backendUrl') ... })`
- **What it does:** If an engineer updates the backend URL setting (e.g., switches between local dev and Azure Container Apps), this listener propagates the new URL to all active HTTP clients and view providers in real time without requiring a window reload.

#### • SECTION 5: VS Code Commands Registration
Registers all 30+ user actions grouped logically:
- **5.1 Authentication (`login`, `loginSso`, `logout`):** Supports 1-click Microsoft Entra ID Device Code SSO and clean cache invalidation on logout.
- **5.2 Artifact Lifecycle (`showArtifactDetails`, `list`, `install`, `downloadZip`, `update`, `contribute`, `deleteArtifact`):** Allows 1-click installation into workspaces, downloading offline ZIP packages, contributing local folders, and admin-only ADO deletion.
- **5.3 Code Review (`review`, `openThread`, `mySubmissions`):** Opens side-by-side or unified multi-file diff views and comment threads.
- **5.4 Notification Center (`openNotification`, `deleteNotification`, `clearNotifications`):** Routes notifications to the relevant diff thread or displays action dialogs (e.g. Approve/Reject Access Request).
- **5.5 Quality & Certification (`checkCertification`, `certifyArtifact`, `revokeCertification`):** Evaluates artifacts against enterprise rubric criteria (unit tests, security scan, SLA documentation).
- **5.6 RBAC Governance (`requestAccess`, `accessStatus`, `approveAccessRequest`, `rejectAccessRequest`, `revokeAccess`):** Manages role upgrades between `CONSUMER`, `PRODUCER`, `REVIEWER`, and `CERTIFIED_REVIEWER`.
- **5.7 Copilot Advisor Discovery (`findArtifact`):** Performs semantic multi-term keyword ranking across descriptions, tags, and use cases to return the top 10 best-match artifacts.

#### • SECTION 6: Subscriptions Cleanup & Extension Teardown
- **Code:** `context.subscriptions.push(...)` and `{ dispose: () => notificationCoordinator.stop() }`
- **What it does:** Guarantees that when VS Code closes or the extension is disabled, all background timers, file watchers, and memory event listeners are disposed cleanly without memory leaks.

---

### File 2: `engineering-commons-vscode/src/views/engineeringCommonsSidebarWebviewProvider.ts`

The central **React/HTML5 frontend** rendered inside the VS Code sidebar.

#### • File Header & UI Architecture
- **What it does:** Documents the 4 main tabs (`Market`, `Bounties`, `My work`, `Notifications`), responsive design rules, and top header layout.

#### • SECTION 1: Artifact Classification & Usability Utility Functions
- **Code:** `isPlaybookArtifact(item)` and `classifyArtifactUsability(item)`
- **What it does:** Inspects catalog items to identify their true type (Agent, Skill, MCP Server, Prompt Playbook, or Token Optimization) and filters out deprecated presentation decks (`.pptx`).

#### • SECTION 2: Provider Class, In-Memory Cache & Service Dependencies
- **Code:** `class EngineeringCommonsSidebarWebviewProvider` and `masterCatalogCache`
- **What it does:** Maintains an in-memory cache of marketplace artifacts to achieve sub-10ms instant tab switching and smooth search filtering.

#### • SECTION 3: Webview Message Dispatcher
- **Code:** `private async handleMessage(message: any)`
- **What it does:** The RPC bridge between webview JavaScript and VS Code APIs. When the user clicks a button in the webview, it sends a message (`switchTab`, `claimBounty`, `login`, `switchAccount`, `logout`, `requestAccess`), which this dispatcher executes safely.

#### • SECTION 4: HTML Template Rendering & Dynamic View Generation
- **Code:** `private async renderHtml(force = false)`
- **What it does:** Generates the responsive HTML:
  1. **Top Identity Bar:** Online status dot, email, role badge (`ADMIN`, `REVIEWER`, `PRODUCER`, `CONSUMER`).
  2. **Account Action Buttons:** Intelligently renders **`Login`** when unauthenticated, and switches to **`Switch`** (next to `Logout`) when authenticated.
  3. **Navigation Tabs:** Market, Bounties, and My Work with unread count badges.
  4. **Dynamic Tab Bodies:** Search bar, filter pills, bounty reward cards, and assigned code reviews.

#### • SECTION 5: Client-Side Webview JavaScript
- **Code:** `<script> const vscode = acquireVsCodeApi(); ... </script>`
- **What it does:** Handles client-side DOM events (instant keystroke filtering, pill click handlers, theme toggling, and calling `vscode.postMessage(...)`).

---

### File 3: `EngineeringCommonsCli/Program.cs`

The standalone **C# / .NET 10 console tool** for developers and CI/CD pipelines.

#### • File Header
- **What it does:** Explains the 3 duties: DI container initialization, argument switch dispatching, and session persistence into `~/.engineering-commons`.

#### • SECTION 1: Service Layer & Dependency Injection Setup
- **Code:** `services.AddSingleton<IAuthTokenStore, FileAuthTokenStore>()`, `services.AddSingleton<ISharePointGraphClient, SharePointGraphClient>()`, `services.AddSingleton<IBackendClient, BackendClient>()`
- **What it does:** Configures Microsoft.Extensions.DependencyInjection with services for token storage, SharePoint integration, artifact placement, and unified diff rendering.

#### • SECTION 2: Command Handler Registrations
- **Code:** `services.AddTransient<LoginCommand>()`, `services.AddTransient<InstallCommand>()`, `services.AddTransient<BountyCommand>()`, etc.
- **What it does:** Registers each CLI verb handler as a transient service so each execution receives clean dependencies.

#### • SECTION 3: Command Routing & Execution Switch Dispatcher
- **Code:** `return cmd switch { "login" => svc.GetRequiredService<LoginCommand>().Invoke(...), ... }`
- **What it does:** High-performance C# pattern-matching switch expression that maps CLI arguments to their corresponding command handler class.

#### • SECTION 4: Auxiliary Command Helpers
- **Code:** `HandleSetUrl(...)`, `HandleLogout(...)`, `ShowHelp(...)`
- **What it does:** Manages CLI configuration (`engineering-commons set-url <url>`), session logout, and formatting the console help screen.

---

### File 4: `cip-backend-dotnet/Program.cs`

The enterprise **ASP.NET Core REST API** running on .NET 10.

#### • File Header
- **What it does:** Summarizes backend capabilities: .env secret mapping, dual-mode database persistence, event-driven domain architecture, and enterprise HTTP security.

#### • SECTION 1: Local Environment & Azure DevOps Secret Mapping
- **Code:** `foreach (var envPath in envCandidates) { ... }`
- **What it does:** Automatically reads `.env` from local or parent directories and maps Azure DevOps (`AZURE_DEVOPS_TOKEN`) and GitHub secrets to ASP.NET Core configuration keys.

#### • SECTION 2: WebApplication Builder, JSON Converters & CORS Configuration
- **Code:** `builder.Services.AddControllers().AddNewtonsoftJson(...)`, `builder.Services.AddCors(...)`
- **What it does:** Configures JSON string enum converters (prevents numeric enum errors in TypeScript clients) and permissive CORS for development.

#### • SECTION 3: Database & Persistence Layer (SQLite / In-Memory Mode)
- **Code:** `var useInMemory = ... string.Equals(..., "ZERO_COST_MODE")`, `builder.Services.AddDbContext<CipDbContext>(...)`
- **What it does:** Supports **Zero-Cost In-Memory Mode** (for running without a database) and **Persistent SQLite Mode** (`cip.db`) via Entity Framework Core.

#### • SECTION 4: Service Layer Dependency Injection & Background Services
- **Code:** `builder.Services.AddSingleton<IDomainEventPublisher, ...>()`, `builder.Services.AddHostedService<SlaMonitoringBackgroundService>()`
- **What it does:** Registers domain event handlers (e.g., notifying producers when a review comment is added) and a background service that monitors review SLAs (24-hour deadline).

#### • SECTION 5: Database Schema Verification, Migrations & Role Seeding
- **Code:** `db.Database.EnsureCreated()`, `CREATE TABLE IF NOT EXISTS ...`, `ALTER TABLE ... ADD COLUMN ...`
- **What it does:** Automatically runs SQLite migrations on startup (creates `user_roles`, `user_access_requests`, `notifications`, `artifact_certifications`) and seeds default admin and reviewer accounts.

#### • SECTION 6: HTTP Middleware Pipeline, Security Headers & Endpoint Mapping
- **Code:** `app.Use(...)` security headers, `TokenAuthenticationMiddleware`, `app.MapControllers()`
- **What it does:** Enforces enterprise security headers (CSP, HSTS `max-age=31536000`, `X-Content-Type-Options: nosniff`), parses Bearer tokens via middleware, and exposes REST endpoints.

---

## 4. Quick Presentation Script for Your Code Review

When the external reviewer asks for a walkthrough, follow this 4-step script:

1. **Start with the Problem & Solution (30 seconds):**
   > *"Our project, CIP #1067 – Engineering Commons, is an internal developer platform for discovering, reviewing, and governing enterprise AI artifacts—such as Copilot Agents, Skills, Prompts, and MCP Servers."*

2. **Explain the 3-Tier Architecture (1 minute):**
   > *"We structured the system into three pillars:
   > 1. A **TypeScript VS Code Extension** that provides an integrated developer experience directly inside the IDE.
   > 2. A **C# / .NET 10 CLI** that enables automated pipeline execution and terminal usage.
   > 3. An **ASP.NET Core REST API** running on .NET 10 that handles storage in SQLite/SharePoint, PR reviews in Azure DevOps, and role governance."*

3. **Walk through the Key Files (2 minutes):**
   > *"In [`extension.ts`](../engineering-commons-vscode/src/extension.ts), Section 0 auto-provisions the CLI and Copilot advisor skill with zero network latency. Section 1 initializes our services and OpenTelemetry usage collectors. Section 5 registers our commands for Microsoft SSO, 1-click artifact installation, and PR reviews.
   > In [`engineeringCommonsSidebarWebviewProvider.ts`](../engineering-commons-vscode/src/views/engineeringCommonsSidebarWebviewProvider.ts), Section 4 dynamically renders our Market, Bounties, and My Work tabs with real-time RBAC enforcement."*

4. **Highlight Enterprise Readiness & Governance (30 seconds):**
   > *"Everything is enterprise-ready: we enforce Microsoft Entra ID Corporate SSO, maintain audit logs with OpenTelemetry, govern contributor permissions via RBAC (Consumer, Producer, Reviewer, Admin), and have 131 automated unit and integration tests passing."*
