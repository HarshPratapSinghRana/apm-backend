# AI Artifact Certification Rules & Standards

## Overview

The **AI Artifact Certification Mechanism** identifies and validates trusted, enterprise-grade AI artifacts (Agents, Skills, Plugins, MCP Servers, Prompts, and Commands) in the Engineering Commons Marketplace. 

Certification is governed by a **6-Pillar Evaluation Engine** combining code/prompt reviews, historical approvals, real usage telemetry from existing logging data, operational reliability, and security quality checks.

---

## 1. The 6 Certification Pillars

```
                     ┌─────────────────────────────────────────┐
                     │    AI Artifact Certification Engine     │
                     └────────────────────┬────────────────────┘
                                          │
    ┌───────────────────┬─────────────────┼─────────────────┬───────────────────┐
    ▼                   ▼                 ▼                 ▼                   ▼
┌─────────────┐ ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐
│  1. Review  │ │ 2. Approval │   │  3. Usage   │ │ 4. Relia-   │   │  5. Quality &   │
│   History   │ │    Rate     │   │ & Adoption  │ │   bility    │   │  Security Flags │
└─────────────┘ └─────────────┘   └─────────────┘   └─────────────┘   └─────────────────┘
                                          │
                                          ▼
                                ┌───────────────────┐
                                │ 6. User Feedback  │
                                │   & Audit Trail   │
                                └───────────────────┘
```

### Pillar 1: Review History
* **Requirement**: Artifact must have undergone formal enterprise review via the Review & Bounty system.
* **Default Threshold**: $\ge 1$ approved review (`MinApprovedReviews = 1`).
* **Rule**: Submissions with pending reviews, requested changes, or unaddressed comments cannot be certified.

### Pillar 2: Approval Rate & Consensus
* **Requirement**: High consensus ratio among enterprise reviewers.
* **Default Threshold**: $\ge 80\%$ approval rate (`MinApprovalRate = 0.80`).
* **Formula**:
  $$\text{Approval Rate} = \frac{\text{Approved Reviews}}{\text{Approved Reviews} + \text{Rejected Reviews}} \times 100\%$$

### Pillar 3: Real Usage & Adoption Telemetry
* **Requirement**: Real-world adoption verified through existing `usage_events` logging without creating synthetic metrics.
* **Default Thresholds**:
  * **Total Downloads**: $\ge 1$ verified installation (`MinDownloads = 1`).
  * **Total Invocations**: $\ge 1$ verified executions/invocations (`MinUsageCount = 1`).
  * **Active User Breadth**: $\ge 1$ unique developers/teams (`MinActiveUsers = 1`).

### Pillar 4: Reliability & Operational Stability
* **Requirement**: Reliable execution performance across supported environments (VS Code, CLI, Copilot).
* **Default Threshold**: $\ge 95\%$ operational reliability rate (`MinReliabilityRate = 0.95`).
* **Formula**:
  $$\text{Reliability Rate} = \max\left(95\%, 100\% - (\text{Rejected Reviews} \times 2\%)\right)$$

### Pillar 5: Quality & Security Checks
* **Requirement**: Clean security and quality posture with zero critical vulnerabilities or secret leaks.
* **Default Threshold**: 0 unresolved critical security or structural issues (`MaxCriticalIssues = 0`).
* **Rule**: Manifest (`cip.yml`) must follow structural standards and point to valid, non-tampered repository refs.

### Pillar 6: User Feedback & Audit Traceability
* **Requirement**: Positive reviewer feedback comments in discussion threads.
* **Audit Trail**: Every certification lifecycle event (`CERTIFICATION_REQUESTED`, `CERTIFICATION_EVALUATED`, `CERTIFICATION_APPROVED`, `CERTIFICATION_REVOKED`) is immutably logged to the `usage_events` table with actor timestamps and email identifiers.

---

## 2. Configurable Thresholds Reference

Configuration can be customized in backend `appsettings.json` under the `"Certification"` section:

| Parameter | Type | Default Value | Description |
|---|---|---|---|
| `MinApprovedReviews` | `int` | `1` | Minimum required approved reviews before eligibility |
| `MinApprovalRate` | `double` | `0.80` (80%) | Minimum approved-to-total review ratio |
| `MinDownloads` | `int` | `1` | Minimum recorded package installations |
| `MinUsageCount` | `int` | `1` | Minimum recorded artifact executions/invocations |
| `MinActiveUsers` | `int` | `1` | Minimum unique user breadth |
| `MinReliabilityRate` | `double` | `0.95` (95%) | Minimum reliability / success rate |
| `MaxCriticalIssues` | `int` | `0` | Maximum allowable critical/security issues |
| `ReevaluationIntervalDays` | `int` | `30` | Periodic re-evaluation interval (in days) |

---

## 3. Certification Lifecycle & Statuses

```
                   [ Submit / Contribute ]
                              │
                              ▼
                      [ NOT_CERTIFIED ]
                              │
                    (Criteria Evaluation)
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
        [ Ineligible ]                  [ ELIGIBLE ]
               │                             │
               │               (Reviewer / Admin Approval)
               │                             │
               │                             ▼
               │                       [ CERTIFIED ] ──(✓ Badge Displayed)
               │                             │
               │                 (Security / Standard Violation)
               │                             │
               └─────────────────────────────▼
                                        [ REVOKED ]
```

1. **NOT_CERTIFIED**: Default initial state for newly submitted artifacts.
2. **ELIGIBLE**: Artifact meets all 6 evaluation criteria thresholds and is ready for formal reviewer sign-off.
3. **CERTIFIED**: Officially certified by an authorized Reviewer or Admin (`artifact.certify`). Receives the **`✓ Certified`** badge.
4. **REVOKED**: Certification retracted due to a reported vulnerability or quality regression (`artifact.revoke_certification`).

---

## 4. Role-Based Access Control (RBAC) Rules

| Operation | Consumer | Producer | Reviewer / Admin |
|---|:---:|:---:|:---:|
| View `✓ Certified` Badges | ✓ | ✓ | ✓ |
| Filter by `Certified` Pill | ✓ | ✓ | ✓ |
| View Public Certification Info | ✓ | ✓ | ✓ |
| View Internal Metrics Breakdown | ✗ | ✓ (Own artifacts) | ✓ |
| Request Certification (`POST .../request`) | ✗ | ✓ | ✓ |
| Certify Artifact (`POST .../certify`) | ✗ | ✗ | ✓ |
| Revoke Certification (`POST .../revoke`) | ✗ | ✗ | ✓ |

---

## 5. CLI Commands Reference

```bash
# Check certification status of an artifact
engineering-commons certification status <artifact-name>

# Evaluate certification criteria checklist & live metrics
engineering-commons certification check <artifact-name>

# Request certification evaluation for a submitted artifact (Producer)
engineering-commons certification request <artifact-name>

# Certify an artifact (Reviewer/Admin only)
engineering-commons certification certify <artifact-name> [--version <version>] [--reason "<reason>"]

# Revoke certification with required reason (Reviewer/Admin only)
engineering-commons certification revoke <artifact-name> --reason "<reason>"
```

---

## 6. Default Seeded Certified Artifacts

For enterprise bootstrapping and baseline testing, the following core packages are pre-validated with certified status:

1. **`design-reviewer`**: Enterprise UI/UX and dark theme design audit agent.
2. **`accessibility-agent`**: WCAG 2.1 AA automated compliance verification agent.
3. **`accessibility-fix`**: Automated remediation agent for UI accessibility defects.
