# 🎙️ Engineering Commons — Complete 25-Minute Presentation & Demo Talk Track

A comprehensive, minute-by-minute presentation script designed to be delivered in **25 minutes**. It weaves the business problem, detailed architectural deep dives for all 4 components (Backend, VS Code Extension, CLI, PostgreSQL), live end-to-end persona walkthroughs, security invariants, and future roadmap into a single continuous narrative.

---

## ⏱️ Executive Presentation Timeline

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              25-MINUTE PRESENTATION TIMELINE                                │
├───────────────┬─────────────────────────────────────────────────────────────┬───────────────┤
│ Timing        │ Section & Stage                                             │ Primary Focus │
├───────────────┼─────────────────────────────────────────────────────────────┼───────────────┤
│ 00:00 – 03:00 │ Act 1: Enterprise Problem Statement & Business Motivation   │ Why We Built  │
│ 03:00 – 08:00 │ Act 2: Architecture Deep Dive (Backend, VS Code, CLI, DB)   │ Core Design   │
│ 08:00 – 17:00 │ Act 3: Live End-to-End Persona Demonstrations (All 3 Roles) │ Live Demo     │
│ 17:00 – 20:00 │ Act 4: Test Suite Verification & Enterprise Security Rules  │ Quality & Sec │
│ 20:00 – 22:30 │ Act 5: Executive Conclusion & Live Q&A Handling             │ Discussion    │
│ 22:30 – 25:00 │ Act 6: Future Work & Strategic Roadmap (MAQ SSO & AI Rec)   │ Future Vision │
└───────────────┴─────────────────────────────────────────────────────────────┴───────────────┘
```

---

## 🕒 **00:00 – 03:00 | Act 1: Enterprise Problem Statement & Business Motivation**

### 🖥️ Visual Slide:
Title Slide: **"Engineering Commons — Enterprise AI Artifact Management & Governance Platform"**

### 🗣️ Spoken Script:
> *"Good morning, everyone. Today, I'm excited to present **Engineering Commons**, an enterprise platform designed to govern, distribute, and track AI agents, prompts, skills, and plugins across our engineering teams.*
>
> *As our engineering organization rapidly adopted AI-assisted coding tools, we identified three critical enterprise challenges that were slowing down adoption and exposing the company to security risks:*
>
> 1. **Siloed Development & Duplication**: Developers were writing custom prompt templates, agent instructions, and workflow skills in isolation. There was no central company registry where engineers could discover, version, or reuse battle-tested AI assets.
> 2. **Severe Security Vulnerability (GitHub PAT Distribution)**: Accessing private AI repositories typically requires giving every developer a GitHub Personal Access Token (PAT) with private repository read/write access. Distributing PATs to hundreds of developer laptops creates an immense security risk of leaked credentials and unauthorized codebase modifications.
> 3. **Zero Visibility & Compliance**: Enterprise security teams had no audit trail of which developers were installing which AI tools, or what prompt instructions were active in client projects.
>
> *To solve these challenges, we engineered **Engineering Commons**: an internal marketplace ecosystem that isolates all GitHub credentials on the backend, introduces an automated review pipeline for contributions, and logs developer telemetry directly into PostgreSQL in real time."*

---

## 🕒 **03:00 – 08:00 | Act 2: Architecture Deep Dive (Why Each Component is Needed & How It Works)**

### 🖥️ Visual Slide:
Show the **Full System Architecture Diagram**:

```
                    ┌─────────────────────────┐
                    │       Developer         │
                    │   (VS Code / Terminal)  │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         │                                               │
         ▼                                               ▼
┌──────────────────┐                           ┌──────────────────┐
│ VS Code Extension│                           │ Engineering Commons CLI  │
│(engineering-commons-vscode)                          │ (EngineeringCommonsCli)  │
└────────┬─────────┘                           └────────┬─────────┘
         │                                               │
         │ (HTTP REST: Login, List, Telemetry)          │ (Direct Proxy API)
         └───────────────────────┬───────────────────────┘
                                 │
                                 ▼
                 ┌───────────────────────────────┐
                 │       .NET Backend API        │
                 │      (cip-backend-dotnet)     │
                 │   [Holds Server GitHub PAT]   │
                 └───────┬───────────────┬───────┘
                         │               │
            ┌────────────┘               └────────────┐
            ▼                                         ▼
┌───────────────────────┐                 ┌───────────────────────┐
│  PostgreSQL Database  │                 │    Private GitHub     │
│ (Neon.tech / Docker)  │                 │ Marketplace Repository│
│ - usage_events (audit)│                 │ (Agents, Skills,      │
│ - reviews (queue)     │                 │  Plugins, Prompts)    │
└───────────────────────┘                 └───────────────────────┘
```

---

### 🔍 **2.1 Deep Dive: The .NET Backend API (`cip-backend-dotnet`) (03:00 – 04:15)**

#### 🗣️ Spoken Script:
> *"Let's examine our first core pillar: the **.NET Backend Service**.*
>
> * **Why is the Backend needed?**
>   *The backend serves as our single enterprise security boundary. It alone holds the corporate GitHub Personal Access Token (PAT) securely in its server environment. Instead of distributing GitHub tokens to developer laptops, developers authenticate with their standard corporate credentials, and the backend securely proxies downloads and publishing.*
>
> * **How does it work internally?**
>   *Built with ASP.NET Core, it implements Token Authentication Middleware to enforce Role-Based Access Control (`CONSUMER`, `PRODUCER`, `REVIEWER`). It uses Entity Framework Core and Npgsql to manage connection pooling to PostgreSQL, coordinates the review queue, and integrates with the GitHub REST API (`PUT /contents/...`) to publish approved packages.*
>
> * **How is it used?**
>   *It exposes clean REST endpoints: `/api/auth/login` for JWT authentication, `/api/artifacts/{id}/download` for PAT-secured package downloads, `/api/artifacts/{id}/changes` for submissions, `/api/reviews/{id}/approve` for marketplace publishing, and `/api/usage` for asynchronous telemetry ingestion."*

---

### 🔍 **2.2 Deep Dive: The VS Code Extension (`engineering-commons-vscode`) (04:15 – 05:30)**

#### 🗣️ Spoken Script:
> *"Our second pillar is the **VS Code Extension**.*
>
> * **Why is the Extension needed?**
>   *Developers spend their workday inside the IDE. Forcing engineers to jump between external web browsers or terminals introduces friction. The extension brings our entire private AI marketplace directly into the VS Code Activity Bar with 1-click installation directly into the project's `.github/agents/` folder.*
>
> * **How does it work internally?**
>   *Written in TypeScript, it registers an `ArtifactTreeDataProvider` that organizes approved tools into Agents, Skills, and Plugins. It features an intelligent `DefaultCliExecutor` that automatically discovers the local workspace CLI executable without requiring manual PATH environment variable setup. Additionally, it features a background telemetry client (`createSanitizedUsageEvent`) that logs audit events asynchronously without blocking the user interface.*
>
> * **How is it used?**
>   *Developers click the Engineering Commons icon in the left Activity Bar to browse the catalog, hover over any item to click **Install (📥)** or **Update (🔄)**, or open the Command Palette (`Ctrl+Shift+P`) to run interactive actions like `Engineering Commons: Contribute`."*

---

### 🔍 **2.3 Deep Dive: The Cross-Platform CLI Tool (`EngineeringCommonsCli`) (05:30 – 06:45)**

#### 🗣️ Spoken Script:
> *"Our third pillar is the **Engineering Commons CLI**.*
>
> * **Why is the CLI needed?**
>   *While GUI extensions are ideal for local development, automated CI/CD pipelines, headless build agents, and terminal power users need scriptable command-line tools. The CLI ensures complete functional parity from the terminal.*
>
> * **How does it work internally?**
>   *Compiled into a fast, cross-platform C# .NET executable, it features an `IArtifactDiscoveryService` that recursively scans workspace folders for AI manifests (`.github/agents/`, `.github/prompts/`, `cip.yml`, `plugin.json`). It uses `IBackendClient` to communicate with the REST API and a secure `FileAuthTokenStore` storing session tokens locally in `%USERPROFILE%\.engineering-commons\session.json`.*
>
> * **How is it used?**
>   *Developers run commands such as `engineering-commons login`, `engineering-commons list`, `engineering-commons install <name>`, `engineering-commons contribute [name]`, and `engineering-commons review`."*

---

### 🔍 **2.4 Deep Dive: The PostgreSQL Database (Neon Cloud / Docker) (06:45 – 08:00)**

#### 🗣️ Spoken Script:
> *"Our fourth pillar is the **PostgreSQL Database**.*
>
> * **Why is PostgreSQL needed?**
>   *Enterprise compliance requires structured, immutable audit records of every AI tool installation, update, and submission. Ephemeral in-memory storage loses data whenever servers restart or scale. PostgreSQL provides ACID compliance, relational integrity, and indexed historical telemetry.*
>
> * **How does it work internally?**
>   *We mapped two core tables using EF Core: `usage_events` (with indexes on User ID, Timestamp, Action, and Artifact Name) and `reviews` for submission lifecycle tracking. We also built **Dual-Mode Persistence**: the backend connects to PostgreSQL (such as our live Neon Cloud database) when configured, and falls back gracefully to in-memory storage for isolated unit tests.*
>
> * **How is it used?**
>   *Every time a developer logs in, installs a package, submits a change, or approves a review, the backend automatically writes a record directly into PostgreSQL."*

---

## 🕒 **08:00 – 17:00 | Act 3: Live End-to-End Persona Demonstrations (10 Mins)**

---

### 🎬 **3.1 Backend Startup & Automatic PostgreSQL Schema Creation (08:00 – 09:30)**

#### 🖥️ Screen Action:
Verify connectivity to the Azure Container Apps hosted backend:
```powershell
curl https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io/api/health
```

#### 🗣️ Spoken Script:
> *"Let's start our live demonstration. Our backend is deployed and running live on Azure Container Apps.*
>
> *Notice what happens when we verify health: the hosted container backend connects to Azure DevOps and SharePoint, providing unified governance and marketplace APIs with enterprise SLA and zero local host dependencies."*

#### 🖥️ Point Out Output:
```text
✓ Service: apm-backend (Azure Container Apps)
✓ Status: Healthy (200 OK)
✓ Endpoint: https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io
```

---

### 🎬 **3.2 The Consumer Experience — 1-Click Install via Server PAT (09:30 – 12:00)**

#### 🖥️ Screen Action:
1. Open VS Code, click the **Engineering Commons** icon in the left Activity Bar.
2. Show the categorized tree of Agents, Skills, and Plugins.
3. Click **Install (📥)** on `design-reviewer` *(or run via CLI)*:
```powershell
dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj -- login consumer@test.com Consumer@123
dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj -- install design-reviewer
```

#### 🗣️ Spoken Script:
> *"Now let's experience the Consumer persona. A developer needs to install the approved `design-reviewer` AI agent into their project.*
>
> *In VS Code, we open the Activity Bar. We see the marketplace catalog categorized into Agents, Skills, and Plugins. We click **Install**.*
>
> *Notice the result: the agent file is downloaded directly into our project's `.github/agents/` folder. The consumer never entered a GitHub token, never logged into GitHub, and the files were delivered securely through the backend PAT proxy."*

---

### 🎬 **3.3 The Producer Experience — Workspace Discovery & Review Submission (12:00 – 14:00)**

#### 🖥️ Screen Action:
Login as Producer and submit a local artifact:
```powershell
dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj -- login producer@test.com Producer@123
dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj -- contribute design-reviewer
```

#### 🗣️ Spoken Script:
> *"Next is the Producer persona. When an engineer develops a new AI agent locally and wants to share it across the company, they don't need to manually create pull requests or zip files.*
>
> *They simply log in as a Producer and run `contribute`. Our tool scans the workspace, discovers all associated manifest and instruction files, packages them, and submits them to the backend review queue.*
>
> *Notice the output: a **Pending Review ID** has been created and stored in PostgreSQL."*

#### 🖥️ Point Out Output:
`SUCCESS: Artifact submitted successfully! Status: Pending [Review ID: c1e6...]`

---

### 🎬 **3.4 The Reviewer Experience — Interactive Diff Review & Live GitHub Publishing (14:00 – 15:30)**

#### 🖥️ Screen Action:
Login as Reviewer and launch interactive review CLI:
```powershell
dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj -- login reviewer@test.com Reviewer@123
dotnet run --project EngineeringCommonsCli/EngineeringCommonsCli.csproj -- review
```
Type **`A`** to approve.

#### 🗣️ Spoken Script:
> *"Now we switch to the Reviewer persona. A lead engineer or security reviewer logs in to inspect the review queue.*
>
> *Running `review` pulls all pending submissions. The reviewer can inspect the author details, proposed version, and exact file diffs. When I type **A** to approve, the backend marks the review approved in PostgreSQL and pushes the new files directly to our Private GitHub Marketplace repository."*

#### 🖥️ Point Out Output:
`✓ SUCCESS: Submission APPROVED! Artifact published to GitHub Marketplace.`

---

### 🎬 **3.5 Real-Time PostgreSQL Telemetry Verification (15:30 – 17:00)**

#### 🖥️ Screen Action:
Run the usage logs inspector script:
```powershell
.\show-usage-logs.ps1
```
*(Also display the live Neon.tech Console / table viewer)*

#### 🗣️ Spoken Script:
> *"Now, let's verify compliance and observability. Every single action we just completed across our Consumer, Producer, and Reviewer flows was logged in real time directly to our PostgreSQL database.*
>
> *Running `show-usage-logs.ps1` queries our database:"*

#### 🖥️ Point Out Table Output:
```text
id                                   userId            action     artifactName    source  timestamp
--                                   ------            ------     ------------    ------  ---------
edcda43c-7151-4627-b32a-eea1e727e51a reviewer@test.com APPROVE    design-reviewer backend 2026-08-19 13:59:10
bfe73315-5b91-42f6-8a54-306f8d9194b1 producer@test.com CONTRIBUTE design-reviewer backend 2026-08-19 13:58:05
0718a4d8-5166-4322-a396-9cb1d72d5ea9 consumer@test.com INSTALL    design-reviewer backend 2026-08-19 13:57:48
f644f0a0-e582-4df2-bd2d-1e7d1cef7e91 consumer@test.com LOGIN                      backend 2026-08-19 13:57:41
```

#### 🗣️ Spoken Script:
> *"Notice the columns: Action verb, Artifact Name, User ID, Source, and UTC Timestamp. Crucially, our telemetry data model enforces a strict **Zero-Secret Invariant**: passwords, session tokens, GitHub PATs, and source codes are strictly excluded."*

---

## 🕒 **17:00 – 20:00 | Act 4: Test Suite Verification & Enterprise Security Rules (3 Mins)**

### 🖥️ Screen Action:
Run the automated test suites:
```powershell
# 1. Backend & DbContext Tests (10 tests)
dotnet test cip-backend-dotnet.Tests/cip-backend-dotnet.Tests.csproj

# 2. CLI Tests (10 tests)
dotnet test EngineeringCommonsCli.Tests/EngineeringCommonsCli.Tests.csproj

# 3. VS Code Extension Tests (12 tests)
cd engineering-commons-vscode; npm test
```

### 🗣️ Spoken Script:
> *"To ensure enterprise quality and prevent regressions, the entire system is backed by comprehensive automated test suites covering all three layers — totaling **32 passing tests**.*
>
> *Let's summarize the three core security invariants we established:*
> 1. **PAT Isolation**: Developers never handle or store GitHub PATs.
> 2. **Zero-Secret Telemetry**: Sanitized audit events protect developer privacy and IP.
> 3. **Dual-Mode Persistence**: Robust PostgreSQL persistence with resilient fallback."*

---

## 🕒 **20:00 – 22:30 | Act 5: Executive Conclusion & Live Q&A Handling (2.5 Mins)**

### 🗣️ Closing Script:
> *"In summary, **Engineering Commons** provides the missing governance layer for enterprise AI coding. It empowers developers with a 1-click in-IDE experience, protects our enterprise by eliminating GitHub PAT distribution, and gives security teams complete audit visibility in PostgreSQL.*
>
> *Thank you very much for your time. I would now like to open the floor to any questions."*

---

### 💡 Evaluator Q&A Reference (Cheat Sheet)

* **Q1: Why doesn't the VS Code extension connect directly to PostgreSQL?**
  * **Answer**: *Direct client-to-database connections expose database credentials on developer laptops, require opening direct DB firewall ports, and bypass application authorization. Routing through our .NET backend guarantees JWT authentication, role enforcement, and connection pooling.*
* **Q2: What happens if PostgreSQL is temporarily offline or unreachable?**
  * **Answer**: *Engineering Commons implements Dual-Mode Persistence. If the database connection string is absent or offline, the backend gracefully falls back to in-memory storage so developer workflows and CI builds are never blocked.*
* **Q3: How are permissions enforced between different users?**
  * **Answer**: *We enforce Role-Based Access Control (RBAC) via claims embedded in the authenticated JWT token. For example, a Consumer attempting to approve a review or submit a change will receive an immediate HTTP 403 Forbidden.*

---

## 🕒 **22:30 – 25:00 | Act 6: Future Work & Strategic Roadmap (2.5 Mins)**

### 🗣️ Spoken Script (Roadmap Pitch):
> *"Looking ahead, we have planned three high-impact enhancements to take Engineering Commons from our working production proof-of-concept to an enterprise-wide intelligent AI platform across all MAQ Software engineering teams:"*

---

### 1. 🏢 Enterprise Single Sign-On (SSO) & MAQ Corporate Identity Integration

* **Current Implementation**: Lightweight JWT email & password authentication (ideal for POC and isolated development).
* **Future Evolution**:
  * **Microsoft Entra ID (Azure AD) / OAuth2 / OIDC Integration**: Seamless single sign-on supporting all corporate `@maqsoftware.com` email addresses.
  * **Automated Corporate Directory Role Provisioning**: Automatically map MAQ corporate groups (e.g., `MAQ-Developers`, `MAQ-Artifact-Creators`, `MAQ-Architecture-Leads`) to **Consumer**, **Producer**, and **Reviewer** permissions.
  * **Zero-Password Enterprise Security**: Integrates with corporate MFA and conditional access policies for zero-trust security.

---

### 2. 🧠 Context-Aware AI Artifact Recommendation Engine (Query & Codebase Scanning)

* **Current Implementation**: Developers browse marketplace categories or search by artifact type/name.
* **Future Evolution**:
  * **Natural Language Query Matching**: Developers can enter natural queries (e.g., *"I need an agent to audit accessibility and color contrast on our React design system"*), and the system returns the most relevant tools, plugins, and prompts.
  * **Whole Codebase & Project Context Analysis**: Developers can pass their active workspace or repository as a reference. The engine analyzes:
    * Project tech stack (`.NET 10`, `React`, `Angular`, `Python`, `Node.js`)
    * Package manifests (`package.json`, `.csproj`, `pom.xml`, `requirements.txt`)
    * Workspace file patterns and architecture
  * **Intelligent Tailored Suggestions**: Automatically recommends the exact combination of Agents, Skills, and Plugins optimized for the project's tech stack.
  * **Customizable Decision Insights (Decided by Harsh)**:
    * **Match Confidence Score**: e.g., `96% Match for React + Tailwind codebase`.
    * **"Why Recommended" Explanation**: Contextual reasons (e.g., *"Detected WCAG accessibility rules missing in component library"*).
    * **Compatibility & Health Badges**: Version compatibility with project dependencies.
    * **Organizational Popularity**: Internal star ratings and adoption metrics across MAQ projects.

---

### 3. 🎯 AI-Assisted Recommendation Endpoints & VS Code Smart Assistant

* **New Dedicated Backend Endpoints**:
  * `POST /api/artifacts/recommend` — Accepts codebase context (frameworks, dependencies, active files) or user queries and returns ranked recommendations.
  * `POST /api/artifacts/assist/select` — Interactive endpoint guiding developers through selecting the right artifact version and configuration for their specific use case.
  * `GET  /api/artifacts/{id}/compatibility` — Validates whether an artifact's prerequisites are satisfied by the current workspace.
* **VS Code Smart Assistant Integration**:
  * Adds a **"✨ Recommended for Your Project"** dynamic section in the VS Code Activity Bar that auto-populates when a workspace is opened.
  * Inline suggestion notifications when opening relevant file types (e.g., suggesting `design-reviewer` when editing UI components).
* **CLI Recommendation Support**:
  * `engineering-commons recommend --workspace .` — Headless project scanning and recommended installation command generator.
