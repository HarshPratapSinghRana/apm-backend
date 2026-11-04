# Engineering Commons — Zero-Bottleneck AI Artifact Certification System
**The Telemetry-Driven, Automated Certification Framework for Enterprise AI Skills, Agents, Prompts & MCP Tools**

---

## 1. Executive Summary & The "Zero-Bottleneck" Philosophy

In enterprise engineering organizations, traditional certification models fail because they introduce **manual gatekeeping bottlenecks**: review queues pile up, reviewers get fatigued, submissions take days or weeks to approve, and developers bypass the central platform to build unmonitored scripts in isolation.

The **Engineering Commons AI Artifact Certification System** solves this by replacing manual, monolithic approval gates with a **Telemetry-Driven, Progressive Trust Model**.

```
                               ┌───────────────────────────────────────────────────────────┐
                               │           ENGINEERING COMMONS ZERO-BOTTLENECK PIPELINE            │
                               └─────────────────────────────┬─────────────────────────────┘
                                                             │
            ┌────────────────────────────────────────────────┼────────────────────────────────────────────────┐
            ▼                                                ▼                                                ▼
┌───────────────────────┐                        ┌───────────────────────┐                        ┌───────────────────────┐
│   STAGE 1: INSTANT    │                        │  STAGE 2: TELEMETRY   │                        │   STAGE 3: 1-CLICK    │
│  AUTOMATED PUBLISHING │ ─────────────────────► │  AUTO-PROMOTION       │ ─────────────────────► │   ENTERPRISE GOLD     │
│  (0-Second Block)     │                        │  (Self-Earning Trust) │                        │   (SME Sign-Off)      │
│  🥉 Bronze / Community│                        │  🥈 Silver Certified  │                        │   🥇 Gold Certified   │
└───────────────────────┘                        └───────────────────────┘                        └───────────────────────┘
```

### Core Tenets of the Zero-Bottleneck Architecture:
1. **Zero-Second Publishing (Bronze Tier)**: Immediate static AST & secret validation publishes submissions instantly to the developer sandbox so innovation is never blocked.
2. **Telemetry-Driven Auto-Promotion (Silver Tier)**: Artifacts earn certification dynamically based on real developer adoption, execution success rates, and crash-free telemetry recorded in PostgreSQL and SharePoint.
3. **Asynchronous Reviewer Bounties**: Review workload is gamified and distributed across verified engineering leads via reward bounties and 30-second multi-file diff reviews in VS Code.
4. **1-Click Pre-Audited Gold Sign-Off**: Reviewers receive pre-calculated metric diagnostic cards; granting Gold Enterprise certification requires exactly **1 click** or **1 CLI command**.
5. **Self-Healing Lifecycle (45/60/180-Day Rule)**: Background SLA daemons handle inactivity warnings and TTL expirations automatically with zero manual administrative overhead.

---

## 2. Project Architecture & Ecosystem Integration

The certification mechanism is natively integrated across all 4 operational layers of Engineering Commons / Engineering Commons:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. DEVELOPER WORKSPACE (VS Code Extension + Cross-Platform CLI)                                         │
│ • VS Code Extension: Browse Certified filter, 1-Click Install, In-IDE Multi-File Diff & Line Comments    │
│ • Engineering Commons CLI: `engineering-commons certification check|request|certify|revoke`                             │
└────────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                     │ (JWT REST API + Role Claims)
                                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. .NET 10 BACKEND ENGINE (cip-backend-dotnet)                                                          │
│ • `CertificationsController.cs`: Evaluation, Request, Certify, and Revoke REST endpoints               │
│ • `CertificationService.cs`: 6-Pillar Metric Engine, Auto-Evaluation algorithms, Default Certified Seed │
│ • `SlaMonitoringBackgroundService.cs`: Continuous SLA monitoring, 45-day warnings, 60-day auto-expiry  │
│ • Server-Side GitHub PAT Isolation: Developers never touch GitHub credentials                           │
└────────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                     │
                         ┌───────────────────────────┴───────────────────────────┐
                         ▼                                                       ▼
┌─────────────────────────────────────────────────┐   ┌─────────────────────────────────────────────────┐
│ 3. ENTERPRISE SHAREPOINT LISTS                  │   │ 4. POSTGRESQL & SQLITE PERSISTENCE              │
│ • `Engineering-Commons-Artifacts`: IsCertified  │   │ • `usage_events`: Real-time audit telemetry     │
│ • `Engineering-Commons-Reviews`: Review queue   │   │ • `reviews`: Status, Approvals, Line Comments   │
│ • `Engineering-Commons-Bounties`: Review rewards│   │ • `user_roles`: RBAC Claims (Consumer, Reviewer)│
│ • `Engineering-Commons-Notifications`: Alerts   │   │ • `review_threads`: File & line discussions     │
└─────────────────────────────────────────────────┘   └─────────────────────────────────────────────────┘
```

---

## 3. The 6 Specific Certification Pillars (How We Measure)

Every artifact in Engineering Commons is evaluated against **6 concrete, code-backed pillars**:

```
                       ┌─────────────────────────────────────────────────────────┐
                       │           THE 6 ENGINEERING COMMONS CERTIFICATION PILLARS       │
                       └────────────────────────────┬────────────────────────────┘
                                                    │
        ┌───────────────────┬───────────────────────┼───────────────────────┬───────────────────┐
        ▼                   ▼                       ▼                       ▼                   ▼
┌───────────────┐   ┌───────────────┐       ┌───────────────┐       ┌───────────────┐   ┌───────────────┐
│   Pillar 1:   │   │   Pillar 2:   │       │   Pillar 3:   │       │   Pillar 4:   │   │   Pillar 5:   │
│ Review History│   │ Approval Rate │       │ Real Adoption │       │ Operational   │   │  Zero-Secret  │
│  & Resolves   │   │  Consensus    │       │   Telemetry   │       │  Reliability  │   │  & QA Safety  │
└───────┬───────┘   └───────┬───────┘       └───────┬───────┘       └───────┬───────┘   └───────┬───────┘
        │                   │                       │                       │                   │
        └───────────────────┴───────────────────────┼───────────────────────┴───────────────────┘
                                                    │
                                                    ▼
                                        ┌───────────────────────┐
                                        │       Pillar 6:       │
                                        │ Auditability & Lineage│
                                        └───────────────────────┘
```

---

### Pillar 1: Review History & Discussion Closure
* **Rule**: The artifact must have undergone formal enterprise review via the VS Code Review Panel or CLI review queue.
* **Code-Level Requirement**: At least **1 approved review** (`MinApprovedReviews = 1`) recorded in the database or SharePoint list.
* **Zero-Bottleneck Guard**: No open blocking change requests or unresolved review comments. If comments are addressed, the review is auto-cleared.

### Pillar 2: Approval Rate & Peer Consensus
* **Rule**: High consensus ratio among enterprise reviewers.
* **Formula**:
  $$\text{Approval Rate} = \frac{\text{Approved Reviews}}{\text{Approved Reviews} + \text{Rejected Reviews}} \times 100\%$$
* **Threshold**: Minimum **80% Approval Rate** (`MinApprovalRate = 0.80`).

### Pillar 3: Real Usage & Adoption Telemetry (No Mock Requirements)
* **Rule**: Evaluated dynamically using real telemetry ingested into PostgreSQL `usage_events` and `Engineering-Commons-Telemetry.csv`.
* **Telemetry Data Points**:
  * **Downloads**: Minimum **1 verified package download** (`MinDownloads = 1`).
  * **Invocations**: Minimum **1 verified execution** (`MinUsageCount = 1`).
  * **User Breadth**: Minimum **1 unique active developer** (`MinActiveUsers = 1`).
* **Zero-Bottleneck Guard**: Authors can test their own artifact in their developer workspace once; the background `telemetryBatcher.ts` automatically logs the event and fulfills the adoption threshold.

### Pillar 4: Operational Reliability & Error Freedom
* **Rule**: Execution stability across VS Code, CLI, and terminal environments.
* **Formula**:
  $$\text{Reliability Rate} = \max\left(0.95, 1.0 - (\text{Rejected Reviews} \times 0.02)\right) \ge 95\%$$
* **Threshold**: Minimum **95% Reliability Rate** (`MinReliabilityRate = 0.95`).
* **Zero-Bottleneck Guard**: An artifact starts with a default baseline of **100% reliability** and only loses points if fatal runtime crashes or formal rejections occur.

### Pillar 5: Zero-Secret & Quality Hygiene (Hard Security Gate)
* **Rule**: 0 hardcoded credentials, 0 exposed private endpoints, valid manifest structure.
* **Threshold**: Zero critical issues (`MaxCriticalIssues = 0`).
* **Automated Scanners**:
  * AST parser scans `SKILL.md`, `agent.json`, `package.json`, and prompt templates.
  * TokenGuard entropy analyzer scans for API keys (`ghp_`, `sk-`, `eyJ`, connection strings).
  * Manifest validator ensures `cip.yml` / `SKILL.md` contains valid SemVer, author email, and capability declarations.

### Pillar 6: User Feedback & Audit Traceability
* **Rule**: Positive community feedback and immutable event logging.
* **Audit Trail**: Every certification lifecycle event (`CERTIFICATION_REQUESTED`, `CERTIFICATION_EVALUATED`, `CERTIFICATION_APPROVED`, `CERTIFICATION_REVOKED`) is immutably logged to the database with user ID, actor timestamp, and source metadata.

---

## 4. Configurable Backend Thresholds (`appsettings.json`)

All certification criteria are configurable in `cip-backend-dotnet/appsettings.json` under the `"Certification"` section, allowing teams to adjust strictness without rebuilding code:

```json
{
  "Certification": {
    "MinApprovedReviews": 1,
    "MinApprovalRate": 0.80,
    "MinDownloads": 1,
    "MinUsageCount": 1,
    "MinActiveUsers": 1,
    "MinReliabilityRate": 0.95,
    "MaxCriticalIssues": 0,
    "ReevaluationIntervalDays": 30
  }
}
```

---

## 5. The 3-Tier Progressive Trust Model (No Gatekeeper Lock)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🥉 TIER 1: BRONZE (Community / Sandbox Verified)                                                │
│ • Verification Time: < 3 seconds (100% Automated).                                             │
│ • Gate: AST syntax check + TokenGuard secret scanner + manifest schema parser.                  │
│ • Deployment: Immediately published to Marketplace under "Public / Sandbox" category.          │
│ • Developer Experience: Author gets immediate package ID; teammates can install immediately.   │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 🥈 TIER 2: SILVER (Telemetry & Adoption Verified)                                               │
│ • Verification Time: 100% Automated (Continuous background evaluation).                         │
│ • Gate: Accumulated Telemetry (≥ 1 download, ≥ 1 invocation, 0 crashes, ≥ 95% reliability).     │
│ • Deployment: Awarded the "Verified" badge; highlighted in VS Code recommendations.             │
│ • Developer Experience: Zero forms to fill; artifact earns badge automatically via usage.       │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 🥇 TIER 3: GOLD (Enterprise Production Certified — ✓ Certified)                                 │
│ • Verification Time: < 30 seconds (1-Click Reviewer Sign-Off or CLI command).                   │
│ • Gate: Reviewer inspects pre-computed diagnostic card + multi-file diff in VS Code.           │
│ • Deployment: Receives official "✓ Certified" blue badge; prioritized in top-tier filter.       │
│ • Developer Experience: Guaranteed enterprise SLA, corporate-wide distribution.                │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. How We Eliminate Every Potential Bottleneck

| Potential Bottleneck | Why It Happens in Other Systems | How Engineering Commons Eliminates It |
| :--- | :--- | :--- |
| **1. Submission Blocking** | Submission waits in an approval queue before anyone can try it. | **Instant Bronze Publishing**: Newly contributed artifacts are published immediately to the public sandbox so teams can test right away. |
| **2. Reviewer Congestion** | 2-3 senior architects get spammed with hundreds of PRs. | **Reviewer Bounties & Delegation**: Workload is distributed across verified peer reviewers who earn bounty points (`Engineering-Commons-Bounties`). |
| **3. Complex Testing Requirements** | Authors must configure mock frameworks, synthetic datasets, and test harnesses. | **Passive Telemetry Harvester**: `sharepointTelemetryService.ts` automatically collects runtime invocations and proves reliability without author effort. |
| **4. Long Evaluation Time** | Reviewers must pull down the repo, build it locally, and manually test prompts. | **Pre-Computed Diagnostic Cards**: Backend pre-calculates the 6 pillars (`/api/certifications/evaluate/{id}`). Reviewer sees green checkmarks and clicks **"Approve" (1-click)**. |
| **5. Stale / Zombie Artifacts** | Certified tools break after 6 months when LLM models update, but stay certified. | **Automated 45/60/180-Day Lifecycle**: Background daemon detects inactivity and downgrades stale artifacts without human policing. |
| **6. Secret Leaks & Token Theft** | Developers need GitHub PATs to push or publish. | **Server-Side PAT Isolation**: Backend handles all GitHub and SharePoint operations securely; developers authenticate with standard SSO/JWT. |

---

## 7. Role-Based Access Control (RBAC) Matrix

Certification privileges are strictly enforced via JWT claims and `user_roles` records:

```
┌──────────────────────────────────────┬─────────────┬─────────────┬────────────────────┐
│ Operation / Action                   │  CONSUMER   │  PRODUCER   │  REVIEWER / ADMIN  │
├──────────────────────────────────────┼:-----------:┼:-----------:┼:------------------:┤
│ View Certified Artifacts & Badges    │      ✓      │      ✓      │         ✓          │
│ Filter Marketplace by `✓ Certified`  │      ✓      │      ✓      │         ✓          │
│ 1-Click Install into Workspace       │      ✓      │      ✓      │         ✓          │
│ View Public Certification Status     │      ✓      │      ✓      │         ✓          │
│ View Internal 6-Pillar Metric Score  │      ✗      │ ✓ (Own Art) │         ✓          │
│ Request Certification (`POST`)       │      ✗      │      ✓      │         ✓          │
│ Certify Artifact (`POST .../certify`)│      ✗      │      ✗      │         ✓          │
│ Revoke Certification (`POST ...`)    │      ✗      │      ✗      │         ✓          │
│ Claim Reviewer Bounty Points         │      ✗      │      ✗      │         ✓          │
└──────────────────────────────────────┴─────────────┴─────────────┴────────────────────┘
```

---

## 8. Step-by-Step Developer Workflows

### 8.1 The Producer Workflow (Submitting & Requesting Certification)

1. **Local Development**: Engineer creates a skill or agent in `.agents/skills/my-sql-optimizer/`.
2. **Submit via CLI or VS Code**:
   ```bash
   engineering-commons contribute my-sql-optimizer
   ```
   * *Under the hood*: Packages files $\rightarrow$ TokenGuard scans secrets $\rightarrow$ Submits to backend $\rightarrow$ Publishes immediately as Bronze.
3. **Check Certification Eligibility**:
   ```bash
   engineering-commons certification check my-sql-optimizer
   ```
4. **Request Gold Review**:
   ```bash
   engineering-commons certification request my-sql-optimizer
   ```

---

### 8.2 The Reviewer Workflow (30-Second 1-Click Approval)

1. **Reviewer logs in**:
   ```bash
   engineering-commons login reviewer@test.com Reviewer@123
   ```
2. **Launch Interactive Review**:
   ```bash
   engineering-commons review
   ```
3. **Inspect Pre-Evaluated Diagnostic Card**:
   ```text
   =======================================================
   AI ARTIFACT CERTIFICATION EVALUATION: my-sql-optimizer
   =======================================================
   [✓] Review History:       1 Approved Review
   [✓] Approval Rate:        100.0% (Threshold: >= 80%)
   [✓] Adoption Telemetry:   12 Invocations across 3 Users
   [✓] Reliability Rate:     98.5% (Threshold: >= 95%)
   [✓] Security & Quality:   0 Critical Issues, 0 Leaked Secrets
   [✓] Overall Eligibility:  ELIGIBLE FOR CERTIFICATION
   =======================================================
   [A] Approve & Certify  |  [C] Add Line Comment  |  [R] Reject
   ```
4. **Approve**: Type **`A`** $\rightarrow$ Artifact immediately receives **`✓ Certified`** badge in VS Code and SharePoint.

---

### 8.3 CLI Commands Quick Reference

```bash
# 1. View certification status of an artifact
engineering-commons certification status <artifact-name>

# 2. Check real-time 6-pillar criteria checklist & metrics
engineering-commons certification check <artifact-name>

# 3. Request certification (Producer / Reviewer)
engineering-commons certification request <artifact-name>

# 4. Grant official certification (Reviewer / Admin only)
engineering-commons certification certify <artifact-name> --version 1.0.0 --reason "Passed enterprise security and SQL validation"

# 5. Revoke certification upon vulnerability (Reviewer / Admin only)
engineering-commons certification revoke <artifact-name> --reason "Deprecated upstream dependency detected"
```

---

## 9. Automated Lifecycle, Inactivity Expiration & Self-Healing

Certification is an active trust state governed automatically by the background daemon (`SlaMonitoringBackgroundService.cs`):

```
                  ┌─────────────────────────────────────────┐
                  │    ✓ CERTIFIED ARTIFACT (Active State)  │
                  └────────────────────┬────────────────────┘
                                       │
                      (No usage for 45 consecutive days)
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │   WARNING STATE: "✓ Expiring Soon"      │
                  │   • Automated email sent to producer    │
                  │   • 15-day grace period to re-verify   │
                  └────────────────────┬────────────────────┘
                                       │
                      (No action taken within 15 days)
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │   AUTOMATIC EXPIRATION (Day 60)         │
                  │   • Badge removed (reverts to Public)   │
                  │   • Does NOT break existing installs    │
                  └────────────────────┬────────────────────┘
                                       │
                      (Producer clicks "Re-Certify" in IDE)
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │   RESTORED: ✓ CERTIFIED                 │
                  └─────────────────────────────────────────┘
```

* **180-Day TTL (Time-To-Live)**: Every 6 months, active artifacts undergo a 1-click automated background re-validation to account for evolving LLM foundation models.

---

## 10. Summary Table for Live Demo

| Feature | Legacy Certification Approaches | Engineering Commons Zero-Bottleneck System |
| :--- | :--- | :--- |
| **Publishing Speed** | Blocked for days awaiting review | **Instant (0 seconds)** as Bronze / Sandbox |
| **Adoption Proof** | Synthetic mocks & manual evidence | **Automated Telemetry** from live database logs |
| **Review Workload** | 2-3 bottleneck gatekeepers | **Decentralized Review Bounties** + 30s diff viewer |
| **Review Execution** | Manual command-line reproduction | **1-Click** pre-calculated evaluation approval |
| **Security Handling** | Shared GitHub Personal Access Tokens | **Zero-PAT Server-Side Isolation** |
| **Maintenance** | Manual tracking of dead tools | **Automated 45/60/180-Day Inactivity Expiration** |
