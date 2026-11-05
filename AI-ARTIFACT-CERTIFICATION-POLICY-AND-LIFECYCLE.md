# Enterprise AI Artifact Certification & Lifecycle Policy

This document outlines the **official criteria, evaluation pillars, and automatic expiration lifecycle** for certifying AI Artifacts (Agents, Skills, MCP Servers, Plugins, Prompts, and Packages) within the Engineering Commons ecosystem.

---

## 1. Executive Overview

The **Enterprise Certified Badge (✓ Certified)** signals that an AI artifact has been rigorously reviewed for **Security, Safety, Operational Reliability, and Active Community Utility**.

Certification is **not permanent**; it is an active trust state that requires ongoing maintenance, regular usage, and adherence to security standards.

```
       [ Submission ]
             │
             ▼
     ┌───────────────┐
     │ 5-Pillar Auto │ ──❌ Fails ──► [ Needs Revision ]
     │ & Peer Review │
     └───────────────┘
             │ Passed
             ▼
    ┌─────────────────┐
    │  ✓ CERTIFIED    │ ◄─── Renewal (Active Usage + Updates)
    └─────────────────┘
             │
     [ Inactivity / Time ]
             │
             ▼
     ┌───────────────┐
     │ Warning Grace │ (14 Days Warning to Producer)
     │    Period     │
     └───────────────┘
             │ No Action
             ▼
    ┌─────────────────┐
    │  CERTIFICATION  │ (Badge removed, reverts to standard Public)
    │     EXPIRED     │
    └─────────────────┘
```

---

## 2. On What Basis Is an Artifact Certified? (5 Core Pillars)

To qualify for the **✓ Certified** badge, an artifact must pass evaluation across five standard pillars:

### Pillar 1: Security & Secrets Hygiene (Mandatory Pass)
* **No Hardcoded Secrets**: Zero API keys, Personal Access Tokens (PATs), or private endpoints hardcoded in prompts or code.
* **Sanitized Inputs**: Prompt templates must protect against prompt injection and jailbreak techniques.
* **Safe External Network Calls**: MCP servers and plugins must only connect to declared, whitelisted corporate domains.

### Pillar 2: Functional Reliability & Documentation
* **Complete Metadata**: Valid `cip.yml` / `SKILL.md` containing accurate description, parameters, author, and version.
* **Working Demonstration**: Reproducible examples of prompt inputs and expected structured outputs.
* **Deterministic Execution**: The skill or agent must execute reliably across supported models without runtime exceptions.

### Pillar 3: Peer & Reviewer Sign-Off
* **Multi-Reviewer Consensus**: At least **1 verified Reviewer** must approve the submission diff in the VS Code review panel.
* **No Unresolved Feedback**: All inline review comments and change requests must be resolved and closed.

### Pillar 4: Compatibility & Packaging
* **Standard File Structure**: Complies with Engineering Commons layout (`skills/`, `agents/`, `tools/`).
* **Clean Dependencies**: Uses supported runtime versions (Node.js, Python, .NET, or MCP protocol v1.0).

### Pillar 5: Baseline Adoption & Utility
* For newly created artifacts: Undergoes initial sandbox trial.
* For existing artifacts: Successfully installed and tested in at least 2 distinct user environments with zero fatal errors.

---

## 3. Certification Scoring Rubric

Reviewers evaluate submissions using this standard 100-point rubric (Minimum passing score: **85 / 100**):

| Evaluation Category | Weight | Passing Criteria |
|:---|:---:|:---|
| **Security & Privacy** | 30% | 0 vulnerabilities, no leaked credentials, input sanitization. |
| **Accuracy & Prompt Safety** | 25% | Consistent outputs, handles edge cases, no hallucination loops. |
| **Documentation & Usability** | 20% | Clear setup guide, defined inputs/outputs, troubleshooting notes. |
| **Code Quality & Architecture** | 15% | Clean error handling, low latency, no redundant dependencies. |
| **Community Test / Feedback** | 10% | Verified positive feedback and active peer testing. |

---

## 4. Certification Expiration & Inactivity Rules

To prevent stale, abandoned, or outdated artifacts from misleading users, certifications automatically expire under the following policies:

### 4.1 Inactivity-Based Expiration (No Downloads or Invocations)

| Timeframe | Inactivity Status | Automated System Action |
|:---:|:---|:---|
| **Day 1 – 45** | **Active** | Artifact maintains full **✓ Certified** status. |
| **Day 45** *(No usage for 45 days)* | **Low Activity Warning** | Notification sent to original Producer: *"Artifact has had 0 downloads/invocations in 45 days. Certification will expire in 15 days without activity."* |
| **Day 60** *(No usage for 60 days)* | **Certification Expired** | **✓ Certified badge is automatically removed.** Artifact remains publicly available as a regular artifact (does not break existing installs). |

---

### 4.2 Time-Based Revalidation (Standard TTL)

Even actively used artifacts must be re-verified periodically:

* **Maximum Certification Validity (TTL)**: **180 Days (6 Months)**.
* **Reason**: Underlying LLM models, API protocols, and dependencies evolve rapidly over 6 months.
* **Renewal Grace Period**: At **Day 166** (14 days before 180-day expiry), the author receives an automated prompt:
  * Click **"Request Re-Certification"** $\rightarrow$ Re-runs automated security & compatibility test $\rightarrow$ Extends certification for another 180 days.

---

### 4.3 Breaking Changes or Security Vulnerabilities (Immediate Revocation)

Certification is **immediately revoked** if:
1. An updated version introduces a security vulnerability or leaked credential.
2. A critical bug is reported that causes LLM tool failure or data corruption.
3. An authorized Reviewer clicks **"Revoke Certification"** with a specified reason.

---

## 5. Certification Lifecycle States

| Status State | Badge Displayed | In Marketplace Filter | Meaning |
|:---|:---:|:---:|:---|
| **Certified** | `✓ Certified` (Blue Badge) | Appears under `Certified` filter | Fully compliant, actively used, verified safe. |
| **Warning / Grace** | `✓ Expiring Soon` (Amber Badge) | Appears under `Certified` filter | Needs activity or re-verification within 14 days. |
| **Standard / Uncertified** | *None* | Excluded from `Certified` filter | Public and safe to use, but without enterprise guarantee. |
| **Revoked** | *None* | Excluded from `Certified` filter | Certification revoked by reviewer due to flaw or inactivity. |

---

## 6. How to Re-Certify an Expired Artifact

If an artifact loses its certification due to 60-day inactivity or 180-day TTL expiration, the original producer can restore certification via:

1. **Self-Service Verification (Minor Update)**:
   * Producer pushes an update or verifies compatibility in the VS Code Extension $\rightarrow$ Clicks **"Submit for Re-Certification"**.
2. **Reviewer Fast-Track**:
   * Reviewer runs the one-click verification check $\rightarrow$ Clicks **"Certify"** in the Artifact Details panel.
   * Artifact immediately regains the **✓ Certified** badge.

---

## 7. Summary Table for Quick Reference

```
┌──────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
│ Criteria                     │ Rule Limit                   │ Action on Violation          │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Inactivity Threshold         │ 60 Consecutive Days          │ Auto-Expire Certification    │
│ Advance Inactivity Warning   │ 45 Days (15-day notice)      │ Notification to Producer     │
│ Maximum Validity (TTL)       │ 180 Days (6 Months)          │ Re-verification Required     │
│ Security Flaw / Secret Leak  │ Immediate                    │ Instant Revocation           │
│ Min Review Score             │ 85 / 100 Points              │ Submission Blocked           │
└──────────────────────────────┴──────────────────────────────┴──────────────────────────────┘
```
