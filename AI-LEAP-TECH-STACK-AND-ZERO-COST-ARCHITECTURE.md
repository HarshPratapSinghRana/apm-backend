# Comprehensive Analysis: AI Leap Tech Stack & Zero-Cost Architecture

## 1. Executive Summary

The **AI Leap** project (`MAQ Software AI Leap`) is an enterprise-grade AI solution accelerator, code intelligence portal, and artifact management platform. Architecturally, it solves a problem nearly identical to our **Engineering Commons (Artifact Package Manager)**: cataloging, analyzing, scaffolding, versioning, reviewing, and distributing AI artifacts, prompts, agents, and code templates across an engineering organization.

The standout engineering achievement of AI Leap is its **zero-cost operational model**. By strategically leveraging existing enterprise software licenses (Microsoft 365 / SharePoint), free-tier AI endpoints (Google Gemini Flash & Groq), local GPU tunneling (Ollama/vLLM over ngrok/Cloudflare), and a unified single-process monolith, **the platform runs in production at $0.00 to <$10.00/month**.

This document breaks down:
1. **The Complete Tech Stack** (Frontend, Backend, AI Inference, Identity, Storage).
2. **How Backend, Database, and Storage Are Made 100% Free**.
3. **Direct Comparison with Engineering Commons**.
4. **Concrete Architectural Patterns We Can Adopt** to slash our hosting and LLM costs to zero.

---

## 2. Complete Technology Stack Breakdown

```
+─────────────────────────────────────────────────────────────────────────────────+
|                                    FRONTEND                                     |
|  React 18 + Vite (TypeScript) | Tailwind CSS | shadcn/ui & Radix UI | Lucide   |
|  TanStack React Query | React Hook Form + Zod | Framer Motion | MSAL Browser   |
+────────────────────────────────────────┬────────────────────────────────────────+
                                         │ Compiled into /backend/templates
                                         ▼
+─────────────────────────────────────────────────────────────────────────────────+
|                       UNIFIED BACKEND MONOLITH (FastAPI)                        |
|  Python 3.11 + Uvicorn | FastAPI REST API & Static Files Host                   |
|  Semantic Kernel (Python) | OpenPyXL | Azure AI Document Intelligence           |
+────────────────────┬───────────────────┬───────────────────────────┬────────────+
                     │                   │                           │
                     ▼                   ▼                           ▼
       +──────────────────────+ +──────────────────+  +───────────────────────────+
       |   DATA & STORAGE     | |   AUTH & RBAC    |  |       AI INFERENCE        |
       |  SharePoint Lists    | |  Entra ID / MSAL |  |  Local LLM (Ollama/vLLM)  |
       |  SharePoint Docs/ZIP | |  User-delegated  |  |  Google Gemini 2.5 Flash  |
       |  GitHub API (Proxy)  | |  Graph API token |  |  Groq LLaMA 3 (Free Tier) |
       +──────────────────────+ +──────────────────+  |  Azure OpenAI (Fallback)  |
                                                      +───────────────────────────+
```

### 2.1. Frontend Architecture
* **Core Framework**: React 18.3.1 with TypeScript, bundled using **Vite**.
* **Styling & UI Kit**:
  * **Tailwind CSS** for responsive styling and dark mode theming (`next-themes`).
  * **Radix UI Primitives** (Dialog, Accordion, DropdownMenu, Popover, Tooltip, Select, Tabs, etc.) paired with **shadcn/ui** design patterns.
  * **Framer Motion** (`framer-motion` v12) for smooth micro-animations, transitions, and collapsible panels.
  * **Lucide React** for modern UI iconography.
* **State Management & Form Handling**:
  * **@tanstack/react-query** (v5) for server state caching, pagination, and optimistic updates.
  * **react-hook-form** with `@hookform/resolvers` for complex forms (solution submission, parameter evaluation).
* **Identity & Authentication**:
  * `@azure/msal-browser` (v4.18) & `@azure/msal-react` (v3.0).
  * Direct integration with corporate **Microsoft Entra ID (Azure AD)**.
  * Requests delegated scopes: `Sites.ReadWrite.All` and `AllSites.Write`.
* **Build Target**:
  * Configured in `frontend/vite.config.ts` to output directly to `backend/templates`:
    ```typescript
    build: {
      outDir: path.resolve(__dirname, "../backend/templates"),
      emptyOutDir: true
    }
    ```

### 2.2. Backend Architecture
* **Runtime & Framework**: **Python 3.11** with **FastAPI** and **Uvicorn** ASGI server.
* **Serving Pattern**: **Unified Single-Process Monolith**. FastAPI mounts the compiled React SPA directly (`/assets`, `/files`, `/usecasevideos`) and provides a catch-all route returning `index.html` for client-side routing.
* **AI Orchestration**:
  * **Microsoft Semantic Kernel** (`semantic-kernel[google,ollama]`) for agent workflows, chat pipelines, and prompt templating.
  * **OpenAI Client SDK** (compatible with Azure OpenAI, Groq, LiteLLM, Ollama, vLLM).
  * **Google GenAI SDK** (`google-genai`) for Gemini models.
* **Document & Data Processing**:
  * `openpyxl` for Excel report generation and metric exports.
  * `azure-ai-documentintelligence` for OCR and document parsing.
  * Native Python `zipfile` for automated code packaging, unpacking, and artifact bundling.

### 2.3. Identity & Access Control
* AI Leap uses **Frontend-Delegated Entra ID SSO**.
* The frontend browser authenticates against Microsoft Entra ID via MSAL.
* Upon login or solution submission, the browser acquires a Microsoft Graph Bearer Token and passes it in the `Authorization` or custom headers to the FastAPI backend.
* **Key Cost Benefit**: No dedicated authentication server (Auth0, Cognito, Firebase Auth) is needed. No backend client secrets or certificates are required to talk to Graph API.

---

## 3. Deep Dive: How AI Leap Operates 100% Free of Cost

Traditional cloud architectures incur recurring monthly bills across four major pillars:
1. **Database Hosting** (PostgreSQL / Azure SQL / CosmosDB: $15 - $70/mo)
2. **Object / Blob Storage** (Azure Blob / AWS S3: $5 - $20/mo)
3. **Application Compute** (Separate frontend static hosting + backend container: $15 - $40/mo)
4. **AI / LLM Inference** (OpenAI API tokens: $20 - $150+/mo)

AI Leap eliminates every single one of these expenses through 5 ingenious architectural hacks:

```
┌────────────────────────┬─────────────────────────────┬───────────────────────────┬──────────────┐
│ Traditional Expense    │ Traditional Cloud Choice    │ AI Leap Zero-Cost Choice  │ Monthly Cost │
├────────────────────────┼─────────────────────────────┼───────────────────────────┼──────────────┤
│ Relational Database    │ Azure SQL / AWS RDS         │ SharePoint Online Lists   │ $0.00        │
│ Blob / File Storage    │ Azure Blob / AWS S3         │ SharePoint Attachments/GH │ $0.00        │
│ Frontend Web Hosting   │ Azure Static Web Apps / S3  │ FastAPI Embedded Templates│ $0.00        │
│ Backend Compute        │ Azure App Service B1 / VM   │ Free F1 / Local Tunnel    │ $0.00        │
│ LLM Model API          │ Azure OpenAI / GPT-4o       │ Local GPU + Gemini Flash  │ $0.00        │
├────────────────────────┴─────────────────────────────┴───────────────────────────┼──────────────┤
│ TOTAL MONTHLY COST                                                                │ $0.00        │
└───────────────────────────────────────────────────────────────────────────────────┴──────────────┘
```

---

### Hack #1: SharePoint Lists as a Zero-Cost Relational Database
Instead of paying for Azure SQL or PostgreSQL, AI Leap stores all submissions, metadata, evaluations, user ratings, and feedback in **SharePoint Online Lists** using Microsoft Graph API (`backend/src/services/sharepoint_service.py`).

#### Why is this free?
* Virtually every enterprise and technology company already pays for **Microsoft 365 (Office 365)** business licenses for email, Teams, and Word.
* SharePoint Online storage and Graph API calls are included in the existing subscription at **no incremental cost**.
* SharePoint Lists support structured schemas (text, numbers, choice fields, JSON payloads, dates) and up to **30 million items per list**.

#### How it works in code:
```python
# 1. Frontend user signs in with corporate Office 365 account via MSAL.
# 2. Browser acquires delegated Graph token with 'Sites.ReadWrite.All'.
# 3. Browser passes bearer token to FastAPI backend.
# 4. Backend creates item in corporate SharePoint list:
url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items"
payload = {
    "fields": {
        "Title": solution_name,
        "AuthorEmail": user_email,
        "AgentType": agent_type,
        "ReviewStatus": "Pending",
        "MetadataJson": json.dumps(metadata)
    }
}
requests.post(url, headers={"Authorization": f"Bearer {graph_token}"}, json=payload)
```

---

### Hack #2: SharePoint Attachments & GitHub as Zero-Cost File Storage
Instead of paying Azure Blob Storage egress fees and storage tiers:
1. **Uploaded Solution ZIPs**: Attached directly to the corresponding SharePoint list item via Graph API:
   ```python
   # Uploads up to 250MB attachment directly to list item without Azure Blob fees
   upload_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items/{item_id}/addAttachment"
   ```
2. **Versioned Code Repositories & Artifact Packages**: Stored in **GitHub Repositories**.
   * Code files, prompts, skills, and release archives are read directly from GitHub using a personal access token (PAT).
   * To prevent hitting GitHub's 5,000 requests/hour limit, `backend/src/api/routes/github_proxy.py` implements **in-memory caching** (`_tree_cache`, `_file_cache`).

---

### Hack #3: Unified Monolith (Vite SPA Served Directly from FastAPI)
Typically, teams deploy a frontend on Azure Static Web Apps ($9/mo for custom auth/slas) and a backend on Azure App Service ($13 - $54/mo).

AI Leap unifies them:
1. Vite compiles React into static files in `backend/templates/`.
2. FastAPI serves the assets on the exact same HTTP port:
   ```python
   # backend/app.py
   app.mount("/assets", StaticFiles(directory=str(_TEMPLATES_DIR / "assets")), name="static-assets")
   
   @app.get("/{filename:path}")
   async def serve_spa(filename: str):
       file_path = _TEMPLATES_DIR / filename
       if file_path.is_file():
           return FileResponse(str(file_path))
       return FileResponse(str(_TEMPLATES_DIR / "index.html"), media_type="text/html")
   ```
* **Result**:
  * Single container / single executable.
  * No Cross-Origin Resource Sharing (CORS) complexity in production.
  * Can be hosted on Azure App Service **F1 Free Tier** (1GB RAM, 60 CPU minutes/day) or on a local workstation behind a free tunnel.

---

### Hack #4: Multi-Provider Zero-Cost LLM Gateway
In `backend/llm_provider.py` and `backend/Services/llm.py`, AI Leap implements a dynamic routing gateway that prioritizes free compute:

```
                      ┌───────────────────────────┐
                      │    Incoming LLM Request   │
                      └─────────────┬─────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │  Check LLM_MODE in .env       │
                    └───────┬───────────────┬───────┘
                            │               │
                 LLM_MODE="local"     LLM_MODE="cloud"
                            │               │
                            ▼               ▼
                 ┌──────────────────┐  ┌─────────────────────────┐
                 │  Office GPU /    │  │ Check LLM_ACTIVE_SERVICE│
                 │  Workstation PC  │  └────┬──────────────┬──────┘
                 │  (Ollama / vLLM) │       │              │
                 │  via ngrok URL   │   "gemini"        "groq"
                 │  [$0.00 / mo]    │       │              │
                 └──────────────────┘       ▼              ▼
                                      ┌───────────┐  ┌───────────┐
                                      │Google AI  │  │Groq Cloud │
                                      │Studio Key │  │(LLaMA 3)  │
                                      │[$0.00/mo] │  │[$0.00/mo] │
                                      └───────────┘  └───────────┘
```

1. **Local LLM via Tunnel (`LLM_MODE=local`)**:
   * A team workstation with an NVIDIA RTX GPU runs Ollama or vLLM hosting `qwen-9b-agent` or `deepseek-r1-tool-calling:8b`.
   * A free **ngrok** or **Cloudflare Tunnel** exposes port 11434 or 8080 as `https://xyz.ngrok-free.dev`.
   * The backend calls it using standard OpenAI SDK semantics. **LLM cost: $0.00.**
2. **Google Gemini Flash Free Tier (`LLM_ACTIVE_SERVICE=gemini`)**:
   * Google AI Studio provides API keys with **15 requests per minute, 1,500 requests per day, and 1 million TPM completely free of charge**.
   * Model used: `gemini-2.5-flash` or `gemini-1.5-flash`. **LLM cost: $0.00.**
3. **Groq Cloud Free Tier (`LLM_ACTIVE_SERVICE=groq`)**:
   * Blazing fast LLaMA 3 70B inference with generous rate limits. **LLM cost: $0.00.**
4. **Azure OpenAI (`gpt-4o`)**: Kept only as an optional enterprise fallback.

---

### Hack #5: Client-Delegated MSAL Authentication
* Standard enterprise web apps require a backend Azure App Registration with a Client Secret or Certificate, requiring privileged admin consent and tenant management.
* AI Leap uses **client-side MSAL authentication**. The user signs in directly in the browser.
* The frontend acquires Graph API tokens directly and sends them in HTTP headers to FastAPI.
* FastAPI acts as a passthrough executor using the user's existing permissions.
* If a user doesn't have permission to write to the SharePoint site, the Graph API natively returns 403 Forbidden.
* **Result**: Zero cost for IAM infrastructure, zero secrets to rotate on the backend.

---

## 4. Architectural Comparison: AI Leap vs. Engineering Commons

| Dimension | AI Leap (`MAQ Software AI Leap`) | Our Project (`Engineering Commons`) | Opportunity for CIP |
| :--- | :--- | :--- | :--- |
| **Primary Client** | Browser SPA (React 18 + Vite) | VS Code Extension + CLI + Webviews | Can embed unified web marketplace dashboard |
| **Backend Stack** | Python 3.11 + FastAPI + Uvicorn | ASP.NET Core 8/10 Web API (C#) | High performance already; can adopt static SPA hosting |
| **Relational DB** | **SharePoint Online Lists** ($0.00) | **SQLite (`cip.db`)** / PostgreSQL | Add optional SharePoint List sync for enterprise |
| **Package Storage** | SharePoint Attachments & GitHub Repos | GitHub Repositories & Local Folders | Maintain GitHub; add in-memory tree caching |
| **AI / LLM Engine** | Gemini Flash (Free) + Local GPU + Groq | Azure OpenAI / rule-based certification | **Add Gemini Flash & Ollama fallback (cuts $ to $0)** |
| **Identity & Auth** | Entra ID / MSAL (delegated tokens) | Static tokens / GitHub PAT / Local ID | Add Entra ID / MSAL option for enterprise orgs |
| **Team Sharing** | ngrok tunnel / Azure App Service | Cloudflare Tunnel (`cloudflared`) / Azure | **Cloudflare Tunnel already configured & ready!** |
| **Monthly Cost** | **$0.00 / month** | Currently planned $0 - $15/mo | **Can drop to $0.00 permanently** |

---

## 5. What We Can Adopt for Engineering Commons to Slash Costs

Here are **5 concrete, high-impact improvements** we can bring into Engineering Commons immediately:

### Adoption 1: Multi-Provider Free-Tier LLM Gateway (Save ~$20-$50/month)
* **Current State**: Our `CertificationService.cs` and AI review pipelines either run rule-based evaluations or prepare calls to Azure OpenAI (which incur pay-per-token charges).
* **AI Leap Pattern**: Introduce a multi-provider LLM connector into `cip-backend-dotnet`:
  1. **Google Gemini Flash (Free)**: Configure `GEMINI_API_KEY` using Google AI Studio. Gemini 2.0 Flash is extraordinarily fast, supports a 1M token context window, and is free for up to 1,500 requests/day. Perfect for automated artifact code reviews and security analysis!
  2. **Local Ollama Connector**: Point to `http://localhost:11434/v1` (or a shared team workstation tunneled over Cloudflare).
  3. **Fallback to Azure OpenAI**: Only when configured.
* **Impact**: 100% free automated artifact certifications, code reviews, and README generation.

### Adoption 2: In-Memory GitHub Tree & Asset Caching (Prevent Rate Limits)
* **Current State**: `GitHubMarketplaceService.cs` fetches tags, releases, and artifact trees directly. Under heavy team use, the GitHub PAT rate limit (5,000 req/hr) can be exhausted.
* **AI Leap Pattern**: Implement `_tree_cache` and `_file_cache` with a 15-minute sliding TTL in `GitHubMarketplaceService.cs` using .NET's native `IMemoryCache`:
  ```csharp
  if (_memoryCache.TryGetValue(cacheKey, out List<ArtifactDto> cachedArtifacts))
  {
      return cachedArtifacts;
  }
  // Otherwise fetch from GitHub and set cache with 15-min expiration
  ```
* **Impact**: 10x faster marketplace loading in the VS Code extension and zero risk of GitHub 403 rate-limiting.

### Adoption 3: Unified Web Marketplace Dashboard Hosted on .NET Backend
* **Current State**: Our marketplace is primarily viewed inside VS Code webview panels.
* **AI Leap Pattern**: We can compile a lightweight Vite/React dashboard into `cip-backend-dotnet/wwwroot` and enable `app.UseDefaultFiles()` and `app.UseStaticFiles()`.
* **Impact**: Managers and non-technical stakeholders can browse certified artifacts from a web browser on the same single server without hosting an extra web app.

### Adoption 4: SharePoint List Provider as an Optional Enterprise Persistence Layer
* **Current State**: `cip-backend-dotnet` stores reviews, usage telemetry, and thread comments in SQLite (`cip.db`). On cloud platforms like Azure App Service (Basic/Free), local SQLite files can have file-locking constraints if scaled.
* **AI Leap Pattern**: Implement an optional `ISharePointSyncService` or `SharePointReviewRepository` that logs artifact reviews and usage metrics directly to a corporate SharePoint list via Microsoft Graph API.
* **Impact**: Zero cloud database bills ($0 Azure SQL / $0 Postgres) when deploying Engineering Commons for enterprise clients.

### Adoption 5: Zero-Cost Team Sharing via Cloudflare Tunnel
* **Current State**: We already installed and configured `cloudflared` for Engineering Commons.
* **AI Leap Alignment**: AI Leap proved that hosting on an internal/developer machine and tunneling it externally is completely sufficient for an engineering team's daily workflow.
* **Command**:
  ```powershell
  & $env:USERPROFILE\.cip\bin\cloudflared.exe tunnel --url http://localhost:5000
  ```
* **Teammates' Configuration in VS Code**:
  ```json
  "engineeringCommons.backendUrl": "https://<assigned-cloudflare-domain>.trycloudflare.com"
  ```
* **Impact**: Instant team-wide sharing of the backend with zero hosting bills.

---

## 6. Recommended Next Implementation Steps

1. **Add Gemini 2.0 Flash / Ollama Adapter to .NET Backend**:
   - Create `ILlmProvider` and `GeminiLlmClient` in `cip-backend-dotnet/Services/Implementations/`.
   - Update `appsettings.json` with `LlmProvider: "Gemini"` and `GeminiApiKey`.
2. **Add In-Memory Caching to `GitHubMarketplaceService.cs`**:
   - Inject `IMemoryCache` into `GitHubMarketplaceService`.
   - Cache GitHub repository tree manifests for 10-15 minutes.
3. **Keep Backend Running over Cloudflare Tunnel**:
   - Maintain the active `cloudflared` tunnel so team members can connect their VS Code extensions at zero cost.
