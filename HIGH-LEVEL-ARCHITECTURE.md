# 🏛️ Engineering Commons — Zero-Cost Enterprise High-Level Architecture

![Engineering Commons Zero-Cost Enterprise Architecture](high-level-architecture.png)

```mermaid
flowchart LR
    %% Step 1: User Action
    USER["👤 User"] -->|"(1) Click Install / CLI run"| CLIENTS

    subgraph CLIENTS["Client Layer"]
        direction TB
        VSCODE["🧩 VS Code Extension<br/><b>engineering-commons-vscode</b><br/><i>Webview • Diff • Threads</i>"]
        CLI["⌨️ Engineering Commons CLI<br/><b>EngineeringCommonsCli (.NET)</b><br/><i>Packaging • Diffs • Install</i>"]
    end

    %% Identity & Auth
    VSCODE -.->|OAuth PKCE| ENTRA["🛡️ Microsoft Entra ID (SSO)<br/><i>Azure AD Auth<br/>@maqsoftware.com</i>"]
    CLI -.->|Device Code| ENTRA
    ENTRA -.->|Token Verify| APIGW
    ENTRA -.->|HTTP REST API| BACKEND

    %% Step 2: Download Request
    VSCODE -->|"(2) GET /api/artifacts/{id}/download<br/>HTTPS / Bearer Token"| APIGW
    CLI -->|"(2) GET /api/artifacts/{id}/download<br/>HTTPS / Bearer Token"| APIGW

    %% Middle: CIP Enterprise Backend Service
    subgraph BACKEND["CIP Enterprise Backend Service (Azure Container Apps • Serverless Consumption / .NET 10)"]
        direction TB
        APIGW["🔒 API Gateway & Auth Pipeline<br/><i>Bearer Token Validation • Corporate Domain Guard<br/>Role-Based Access Control (ADMIN / REVIEWER / PRODUCER)</i>"]
        
        APIGW -->|Resolve Package| CORE

        subgraph CORE["Core Domain Engine & Artifact Services"]
            direction TB
            CATALOG["📦 Artifact Catalog & Package Distribution<br/><i>Fetches from GitHub / ADO & AI Leap • Validates manifests • Streams to Client</i>"]
            DIFF["📝 Peer Review & Inline Diff Engine<br/><i>Side-by-Side Diffing • Line Comments • Approval Lifecycle</i>"]
            AQS["🛡️ Automated Quality Certification<br/><i>AQS Scoring (>=85%) • Reliability & Secret Hygiene Checks</i>"]
            NOTIF["🔔 In-App Notification Dispatcher<br/><i>Thread Event Alerts • Extension Badge Polling (5m sync)</i>"]
        end

        CORE -->|Microsoft Graph API / SharePoint REST| DB["☁️ Microsoft 365 SharePoint Online<br/><i>• Artifacts, Reviews, Bounties, Notifications &amp; Telemetry Lists<br/>• Documents Library for .zip Packages &amp; Binaries<br/>⚡ 100% Zero DB Cost • Native Enterprise M365 Storage</i>"]
    end

    %% Step 3: Fetch from External Sources
    CATALOG <-->|"(3) Server fetches package (PAT / Graph)<br/>Repos"| REPOS["🐙 GitHub / ADO Marketplace Store<br/><i>• Certified Artifact Releases<br/>• Immutable Version Tags (PAT)<br/>• Packaged Solution Source</i>"]
    
    CATALOG <-->|Prompts| PLAYBOOK["📖 AI SDLC Playbook Prompts & Templates<br/><i>• System Prompts & Roles<br/>• Prompt Engineering Specs</i>"]

    subgraph AILEAP["AI Leap Ecosystem & Solution Sources"]
        direction TB
        REPOS
        PLAYBOOK
        STORE["🟣 AI Leap Platform AI Artifacts Store<br/><i>• Agents<br/>• Skills<br/>• MCP Servers<br/>• Commands<br/>• Prompts</i>"]
    end

    %% Step 4 & 5: Stream to Local Workspace
    CATALOG ==>|"(4) Stream package to Client"| WORKSPACE

    subgraph WORKSPACE["Local Workspace (AI Artifacts Destination)"]
        direction TB
        WS_FILES["📁 .agents/skills/&lt;name&gt;/<br/>📁 .agents/agents/&lt;name&gt;.md<br/>📁 plugins/ &amp; .cip/ (MCP Tools)<br/><b>⚡ (5) Auto-extracted into .agents/skills/<br/>Ready for immediate AI assistant use</b>"]
    end
```

## 📌 Executive Architecture Summary for Management

Engineering Commons achieves **100% Zero Monthly Hosting Cost ($0.00/month)** for the entire enterprise by leveraging existing Microsoft 365 enterprise assets and serverless Azure cloud infrastructure:

1. **Client Tier**: 
   - **VS Code Extension** (`engineering-commons-vscode` / Engineering Commons) with a 15-minute in-memory cache and 1-hour batched telemetry logger.
   - **Engineering Commons CLI** (`EngineeringCommonsCli` / `engineering-commons` on .NET 10) with disk-verified local workspace discovery.
2. **Identity Tier**: 
   - **Microsoft Entra ID (Azure AD)** Corporate SSO with App Registration `a5f3ba81-4c95-4c74-afd9-38b72cf39156` and `@maqsoftware.com` domain guard.
3. **CQRS Read & Storage Tier (95% of Traffic &bull; $0 Cost)**: 
   - **Dedicated SharePoint Lists** (`Engineering-Commons-Artifacts`, `Engineering-Commons-Reviews`, `Engineering-Commons-Bounties`, `Engineering-Commons-Notifications`) and **Document Library Attachments** (`Engineering-Commons-Documents`).
   - Single Graph API call fetches up to 500 artifacts instantly; zero DB servers needed.
4. **Serverless Write & ADO Proxy Tier (5% of Traffic &bull; $0 Cost)**:
   - **Azure Functions (Consumption Plan)** running 24/7/365 within the **1,000,000 free monthly executions** and **400,000 free GB-seconds** allowance.
   - Securely holds `ADO_PAT` in encrypted Application Settings to proxy private Azure DevOps Git repo archives without exposing secrets or requiring individual ADO basic licenses for consumers.

---

### 📊 Free Quotas & Capacity Matrix

| Metric | Azure Free Tier Quota | Usage per 200 Users | Remaining Capacity | Cost |
| :--- | :--- | :--- | :--- | :---: |
| **Executions** | **1,000,000 / month** | ~90,000 / month | 910,000 free calls (91%) | **$0.00** |
| **Compute (GB-s)** | **400,000 GB-s / month** | ~500 GB-s / month | 399,500 GB-s (99.8%) | **$0.00** |
| **Outbound Data** | **100 GB / month** | ~4.6 GB / month | 95.4 GB (95.4%) | **$0.00** |
| **Annual Savings** | — | — | **$39,000 &mdash; $45,000 / year** | 💰 |

---

*Vector SVG Diagram also available at [high-level-architecture.svg](file:///c:/Users/HarshPratapSinghRana/Downloads/ecommerce-app/high-level-architecture.svg)*
