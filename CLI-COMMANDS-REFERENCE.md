# 📖 Engineering Commons CLI — Commands & CIP Integration Guide

> **Word Document Available**: [Engineering-Commons-CLI-Commands-Guide.docx](file:///c:/Users/HarshPratapSinghRana/Desktop/EMPN_HarshPratapSinghRana/ecommerce-app/Engineering-Commons-CLI-Commands-Guide.docx)

---

## 🏛️ 1. How Engineering Commons CLI Integrates with CIP

`EngineeringCommonsCli` (`engineering-commons`) is built on top of the **Agent Package Manager (CIP)** specification and extends it with enterprise governance, security, and lifecycle management via a 3-tier model:

1. **Client Workspace Tier (`EngineeringCommonsCli`)**: Handles workspace scanning, 7-tier heuristic artifact classification, multi-file atomic placement, and orphan cleanup via `.cip/installed/` manifests.
2. **Backend Governance Tier (ASP.NET Core)**: Provides JWT authentication (Producer, Reviewer, Consumer), review state machines (`Draft` $\rightarrow$ `Published`), unified diff calculation, line comments, and SQLite persistence.
3. **Private Marketplace Tier (GitHub Org)**: The backend securely downloads and pushes packages to private GitHub repos using its server-side PAT. **Developer CLI machines never touch or store GitHub tokens.**

---

## 📊 2. Quick Comparison: Base CIP vs. Enterprise Additions

| Command | 🛠️ Base CIP Capability | ⭐ Explicit Enterprise Addition (Ours) |
| :--- | :--- | :--- |
| **`login`** | Registry authentication concept | JWT Bearer token, password masking, role ingestion (`Reviewer`/`Producer`), zero GitHub PAT exposure. |
| **`list`** | Listing available packages | Backend gateway caching, category filtering (`--type agent/skill/plugin`), aligned tabular display. |
| **`list-versions`** | Version lookup | `(latest)` semver tag resolution, multi-file bundle mapping, install command suggestions. |
| **`install`** | Single-file copy to disk | Multi-file placement (`.github/agents`, `skills/`, `plugins/`), zip-slip defense, `.cip/installed/` manifest, SQLite telemetry. |
| **`update`** | Package overwrite | Orphan reconciliation: writes new files, updates modified files, and deletes obsolete/removed files automatically. |
| **`contribute`** | Manual package upload | 7-Tier heuristic classifier (scans & ignores non-artifact config files), multi-file bundling, review queue submission. |
| **`status`** | *(Not in base CIP)* | Producer dashboard: real-time status badges (`PENDING ⏳`, `APPROVED ✅`, `REJECTED ❌`), reviewer feedback notes. |
| **`review`** | *(Not in base CIP)* | Interactive terminal: colorized unified diff, file/line comments, thread messages, request changes, approval & GitHub publish. |
| **`comment / reply`** | *(Not in base CIP)* | Scriptable line-anchored comments and threaded replies for CI/CD and terminal automation. |

---

## 💻 3. Command-by-Command Reference & CIP Integration

---

### 🔹 `engineering-commons login`
* **Syntax**: `engineering-commons login [options] [email] [password]`
* **Purpose**: Authenticates the developer and establishes a persistent local JWT session. Supports traditional credentials as well as enterprise MAQ Microsoft SSO.
* **Options**:
  - `-s, --sso`: Sign in using MAQ Microsoft SSO (or reuse active VS Code session)
  - `-t, --token <token>`: Direct Microsoft SSO Bearer token (for CI/CD or automation)
  - `-f, --force`: Force new authentication even if an active session exists
  - `-e, --email <email>`: Email address for sign-in or SSO user hint
  - `-p, --password <pwd>`: Password for credential sign-in
  - `-r, --role <role>`: Requested role (`PRODUCER`, `REVIEWER`, `CONSUMER`)
  - `--tenant-id <id>`: Custom Microsoft Entra ID Tenant ID
  - `--client-id <id>`: Custom Microsoft Entra ID Client ID
  - `--no-browser`: Disable automatic browser launch for device code
* **⚙️ How it Integrates with CIP**: Replaces static registry tokens with enterprise JWT authentication. Credentials validate against ASP.NET Core; the local session stores role claims without ever touching GitHub PATs.
* **🛠️ Base CIP Concept**: Registry authentication concept.
* **⭐ Our Enterprise Addition**: Password masking prompt, JWT session cache (`FileAuthTokenStore`), role claim ingestion (`Reviewer` vs `Producer`), Entra ID Device Code SSO with browser auto-launch.
* **Example**:
  ```powershell
  # Credential login
  engineering-commons login reviewer@company.com password
  # Output: ✓ Login successful as reviewer@company.com (Role: REVIEWER)

  # Microsoft SSO login
  engineering-commons login --sso
  # Or with a direct token
  engineering-commons login --sso --token <token> --email user@maqsoftware.com
  ```

---

### 🔹 `engineering-commons sso` *(Alias: `sso-login`)*
* **Syntax**: `engineering-commons sso [options]`
* **Purpose**: 1-Click / Device sign in using corporate MAQ Microsoft SSO.
* **⚙️ How it Integrates with CIP**: Initiates Microsoft Entra ID device authorization, verifies identity against Microsoft Graph, validates corporate domain (`@maqsoftware.com`), registers with CIP backend (`/api/auth/sso`), and saves session to `~/.engineering-commons/session.json` (fully shared with VS Code extension).
* **Options**: Same as `engineering-commons login [options]`.
* **Example**:
  ```powershell
  engineering-commons sso
  # Initiates interactive Entra ID device login, opens browser, displays user code,
  # registers with backend, and stores session.
  ```

---

### 🔹 `engineering-commons list`
* **Syntax**: `engineering-commons list [--type <agent|skill|plugin|mcpserver|package>]`
* **Purpose**: Browses approved, published AI artifacts in the private marketplace.
* **⚙️ How it Integrates with CIP**: Queries the backend gateway proxy, which indexes artifacts in the private GitHub organization repository and caches catalog metadata.
* **🛠️ Base CIP Concept**: Listing packages from registry index.
* **⭐ Our Enterprise Addition**: Category filtering (`--type agent`), backend caching gateway, tabular formatting.
* **Example**:
  ```powershell
  engineering-commons list --type agent
  # Output:
  # NAME                 TYPE       VERSION 
  # --------------------------------------------
  # design-reviewer      agent      1.1.0   
  # enterprise-reviewer  agent      1.0.0   
  ```

---

### 🔹 `engineering-commons list-versions` *(Alias: `versions`)*
* **Syntax**: `engineering-commons list-versions <artifact-name>`
* **Purpose**: Displays all released historical and current versions of an artifact.
* **⚙️ How it Integrates with CIP**: Resolves semver releases from the private GitHub repository via backend metadata index.
* **🛠️ Base CIP Concept**: Querying package version history.
* **⭐ Our Enterprise Addition**: Highlights `(latest)` production version, maps underlying package bundle name, outputs ready-to-run install commands.
* **Example**:
  ```powershell
  engineering-commons list-versions design-reviewer
  # Output:
  # - 1.1.0 (latest)
  # - 1.0.0
  # To install: engineering-commons install design-reviewer --version 1.0.0
  ```

---

### 🔹 `engineering-commons install`
* **Syntax**: `engineering-commons install <artifact> [--version <version>]`
* **Purpose**: Downloads and installs an artifact into canonical workspace directories.
* **⚙️ How it Integrates with CIP**: Backend downloads the package from GitHub using its server-side PAT and streams contents to CLI. `ArtifactPlacementService` inspects artifact type and extracts multi-file structures safely.
* **🛠️ Base CIP Concept**: Downloading packages and placing files on disk.
* **⭐ Our Enterprise Addition**: Multi-file placement (`.github/agents/`, `skills/`, `plugins/`, `.mcp/`), zip slip path traversal defense, installation manifest tracking (`.cip/installed/<artifact>.json`), anonymous SQLite telemetry logging.
* **Example**:
  ```powershell
  engineering-commons install enterprise-reviewer --version 1.0.0
  # Output:
  # Installing multi-file package 'enterprise-reviewer' (4 files)...
  #   -> Placed: .github/agents/enterprise-reviewer/cip.yml
  #   -> Placed: .github/agents/enterprise-reviewer/rules/security-rules.md
  # ✓ Installed v1.0.0. Manifest registered at .cip/installed/enterprise-reviewer.json
  ```

---

### 🔹 `engineering-commons update`
* **Syntax**: `engineering-commons update <artifact>`
* **Purpose**: Reconciles an installed artifact with the newest version and removes obsolete files.
* **⚙️ How it Integrates with CIP**: Reads local `.cip/installed/<artifact>.json` manifest, compares file paths against latest package payload, and performs an atomic upgrade.
* **🛠️ Base CIP Concept**: Upgrading installed packages.
* **⭐ Our Enterprise Addition**: Orphan File Reconciliation Engine: writes new files, updates changed files, and safely deletes obsolete files removed in the new version while preserving workspace files.
* **Example**:
  ```powershell
  engineering-commons update design-reviewer
  # Output:
  # Found new version: v1.1.0 (installed: v1.0.0)
  #   - Updated: .github/agents/design-reviewer/instructions.md
  #   - Cleaned up obsolete file: legacy-notes.txt
  # ✓ Successfully updated design-reviewer to v1.1.0!
  ```

---

### 🔹 `engineering-commons contribute`
* **Syntax**: `engineering-commons contribute [artifact-name] [--public | --private] [--visibility public|private] [-c <contributors>] [-r <reviewers>] [--consumers <consumers>]`
* **Purpose**: Scans workspace, classifies AI artifacts, prompts for / configures visibility (Public vs. Private), builds packages, and submits them to the review queue.
* **⚙️ How it Integrates with CIP**: Integrates `ArtifactDiscoveryService` and 7-tier `ArtifactClassifier` to identify agents/skills/plugins, bundles related files, and submits them to `POST /api/artifacts/contribute` with RBAC visibility controls.
* **🛠️ Base CIP Concept**: Packaging local artifacts for publishing.
* **⭐ Our Enterprise Addition**: 
  * **Interactive Visibility Prompting**: When running `engineering-commons contribute`, CLI automatically prompts to select **Public** (Marketplace) or **Private** (Restricted team access).
  * **Explicit Visibility Flags**: `--public`, `--private` (`-p`), `--visibility <public|private>`, `--contributors` (`-c`), `--reviewers` (`-r`), `--consumers`.
  * **7-Tier Heuristic Classifier**: Identifies AI artifacts & filters non-artifact config files, multi-file directory bundling, submission to review queue (`Draft` $\rightarrow$ `Submitted`).
* **Examples**:
  ```powershell
  # Interactive mode with visibility prompt:
  engineering-commons contribute enterprise-reviewer

  # Explicit public submission:
  engineering-commons contribute enterprise-reviewer --public

  # Explicit private submission with team whitelists:
  engineering-commons contribute enterprise-reviewer --private -c "alice@company.com" -r "bob@company.com" --consumers "carol@company.com"
  ```

---

### 🔹 `engineering-commons status` *(Alias: `submissions`)*
* **Syntax**: `engineering-commons status [artifact-name]`
* **Purpose**: Displays submission lifecycle status, reviewer notes, and decision timestamps for producers.
* **⚙️ How it Integrates with CIP**: Queries `GET /api/artifacts/my/changes` to retrieve the state machine status from backend SQLite.
* **🛠️ Base CIP Concept**: *(Not present in base CIP)*.
* **⭐ Our Enterprise Addition**: Producer status dashboard, real-time status badges (`PENDING ⏳`, `CHANGES REQUESTED ⚠️`, `APPROVED ✅`, `REJECTED ❌`), reviewer feedback notes, decision timestamps.
* **Example**:
  ```powershell
  engineering-commons status
  # Output:
  # [1] Artifact: review-and-refactor | Status: [REJECTED] ❌
  #     Reviewer: reviewer@test.com | Decision At: 2026-08-20 19:11:13 UTC
  #     Feedback: "replace line 12 with updated validation rules."
  ```

---

### 🔹 `engineering-commons review` *(Interactive Workflow)*
* **Syntax**: `engineering-commons review [reviewId | artifact-name]`
* **Purpose**: Opens an interactive terminal review dashboard for reviewers to inspect diffs, comments, and take actions.
* **⚙️ How it Integrates with CIP**: Connects to `ReviewsController` to fetch unified diffs, review threads, and line comments. Submits decisions directly to backend approval/rejection endpoints.
* **🛠️ Base CIP Concept**: *(Not present in base CIP)*.
* **⭐ Our Enterprise Addition**: Colorized ANSI unified diff preview, file/line comment viewer, interactive action menu: `[1]` Add Comment, `[2]` Reply, `[3]` Post Message, `[4]` Request Changes, `[5]` Approve & Publish to GitHub, `[6]` Reject.
* **Example**:
  ```powershell
  engineering-commons review
  # Output:
  # --- UNIFIED DIFF (rules/security-rules.md) ---
  # + Require AntiForgeryToken on all endpoints.
  # 💬 FILE & LINE COMMENTS: [Line 2] Please add CSRF protection.
  # Select action [1-6]: 5 (Approve)
  # ✓ SUCCESS: Submission APPROVED! Published to GitHub Marketplace.
  ```

---

### 🔹 Direct Review Subcommands *(Scriptable CI/CD)*
* **`engineering-commons comment <reviewId> --file <path> [--line <n>] --comment <text>`**:
  * Anchors a review comment to an exact file and line number (`Modified`, `Added`, `Deleted`, `Context`).
* **`engineering-commons reply <reviewId> <commentId> --reply <text>`**:
  * Posts a threaded reply to an existing comment.
* **`engineering-commons request-changes <reviewId> --feedback <text>`**:
  * Transitions review to `ChangesRequested` and emits notification events to the producer.
* **`engineering-commons review approve <reviewId> [--feedback <text>]`**:
  * Approves review and publishes artifact to private GitHub marketplace.
* **`engineering-commons review reject <reviewId> [--feedback <text>]`**:
  * Rejects review with official explanation.

---

### 🔹 `engineering-commons request-access` *(Alias: `request-role`)*
* **Syntax**: `engineering-commons request-access [reviewer|certified-reviewer] [--reason <text>]`
* **Purpose**: Submits a formal access request for `REVIEWER` or `CERTIFIED_REVIEWER` privileges.
* **⚙️ How it Integrates with CIP**: By corporate policy, all MAQ employees authenticating via SSO default to `PRODUCER` / `CONSUMER` permissions. This command creates a tracked `user_access_request` record in the backend and dispatches high-priority notification alerts (via email and in-app thread) to Admin `harsh.rana@maqsoftware.com`.
* **Example**:
  ```powershell
  engineering-commons request-access reviewer --reason "Need to conduct code and prompt reviews for the AI Leap project"
  # Output:
  # ✓ Access request successfully submitted!
  #   Role Requested: REVIEWER
  #   Admin Notified: harsh.rana@maqsoftware.com
  #   Notification dispatched to admin inbox / thread.
  ```

---

### 🔹 `engineering-commons access-status` *(Alias: `my-requests`)*
* **Syntax**: `engineering-commons access-status`
* **Purpose**: Displays the authenticated user's active role, certified reviewer status, and history of access requests.
* **Example**:
  ```powershell
  engineering-commons access-status
  # Output:
  # User:                 developer@maqsoftware.com
  # Current Role:         PRODUCER
  # Certified Reviewer:   No
  #
  # REQUEST ID                            ROLE                 STATUS     SUBMITTED
  # ---------------------------------------------------------------------------------------
  # 550e8400-e29b-41d4-a716-446655440000  REVIEWER             PENDING    2026-09-09 22:30
  #   └─ Reason: Need to conduct code reviews
  ```

---

### 🔹 Admin Access Governance Commands *(harsh.rana@maqsoftware.com)*
* **`engineering-commons access-requests [pending|approved|rejected]`**:
  * Lists all incoming access requests from MAQ users with user email, role requested, reason, and status.
* **`engineering-commons approve-access <requestId> [--notes <text>]`**:
  * Approves the requested role, upgrades the user in `user_role_assignments`, and sends confirmation notifications to the user.
* **`engineering-commons reject-access <requestId> [--notes <text>]`**:
  * Rejects the request with optional explanatory feedback.
* **`engineering-commons revoke-access <userEmail> [--notes <text>]`**:
  * Revokes reviewer or certified reviewer privileges, immediately reverting the user back to default `PRODUCER` (consumer and producer) permissions.
* **`engineering-commons certify-reviewer <userEmail> [--notes <text>]`**:
  * Promotes an approved reviewer to **Certified Reviewer**, authorizing them to grant official certification badges to AI artifacts.

---

## 🛡️ 4. Key Enterprise Mechanisms Summary

1. **Role Governance & Admin Authorization**: All SSO users from MAQ receive standard `PRODUCER`/`CONSUMER` rights by default. Elevated `REVIEWER` and `CERTIFIED_REVIEWER` privileges require approval from Super Admin `harsh.rana@maqsoftware.com`.
2. **Dual-Channel Admin Notification**: Access requests trigger SMTP emails to `harsh.rana@maqsoftware.com` (when configured) with guaranteed fallback to the CIP in-app notification center and thread stream.
3. **7-Tier Heuristic Classifier**: Automatically recognizes agents (`.agent.md`), skills (`SKILL.md`), plugins, and MCP servers while ignoring 10+ normal workspace configuration files (`package.json`, `tsconfig.json`, `.gitignore`).
4. **Canonical Multi-File Placement**: Places agents in `.github/agents/<name>/`, skills in `skills/<name>/`, plugins in `plugins/<name>/`, and MCP configs in `.mcp/<name>/`, preserving all relative paths.
5. **Manifest & Orphan Reconciliation**: Writes `.cip/installed/<artifact>.json` tracking every placed file and content hash; automatically purges obsolete files during upgrades.
6. **Zero-Trust GitHub PAT Isolation**: The backend acts as the sole authenticated gateway to private GitHub repos; client machines never handle GitHub PATs.
7. **Review State Machine & Line Comments**: Enforces `Draft` $\rightarrow$ `Submitted` $\rightarrow$ `UnderReview` $\rightarrow$ `ChangesRequested` $\rightarrow$ `Resubmitted` $\rightarrow$ `Approved` $\rightarrow$ `Published` with threaded line-level commenting.

