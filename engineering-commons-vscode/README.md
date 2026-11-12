# design-reviewer (`design-reviewer`)

Official AI Design Reviewer Subagent for automated UI consistency and WCAG accessibility audit.

- **Artifact Type**: `AGENT`
- **Domain / Category**: Engineering • Frontend & UI
- **Usability Tier**: 🤖 Copilot & Claude Ready
- **Certification Status**: 🏆 Enterprise Certified (Level 3)
- **Author / Producer**: `harsh.rana@maqsoftware.com`

---

## 🚀 Quick Start & Installation

Install directly into your local workspace via the Engineering Commons CLI or Engineering Commons Marketplace:

```bash
# Install via Engineering Commons CLI
engineering-commons install design-reviewer
```

*(Alternatively, search for **`design-reviewer`** in the **Engineering Commons VS Code Extension** and click **Install**).*

---

## 💡 How to Use & Example Prompts

### 1. In GitHub Copilot Chat (Agent Mode)
Open **GitHub Copilot Chat** (`Ctrl+Alt+I` / `Cmd+Alt+I`) in VS Code and invoke the agent with the **`@`** mention:

```markdown
@design-reviewer Please analyze our active codebase and design system compliance. Identify architectural violations, security risks, and optimization opportunities.
```

### 2. Follow-Up / Deep Analysis Prompt Example
```markdown
@design-reviewer Propose drop-in code diffs and concrete implementation steps adhering to enterprise standards.
```

### 3. In Antigravity IDE
Open the Antigravity Chat panel and run:
```text
Please summon @design-reviewer to inspect the active workspace and execute its automated review pipeline.
```

---

## 🌟 Key Capabilities & Features

- **Design system compliance**
- **Contrast check**
- **Responsive validation**

---

## 🛠️ Supported Technology Stack

- `WCAG 2.1 AA`
- `HTML5`
- `CSS3`
- `Design Tokens`

---

## 📋 What's Included & Expected Deliverables

When invoked, **`design-reviewer`** provides:
1. **Automated Diagnostic & Health Assessment**: Structured evaluation of workspace files against enterprise best practices.
2. **Actionable Remediation Diffs**: Line-level, unified diff proposals preserving existing business logic and code comments.
3. **Telemetry & Audit Logging**: Continuous tracking of execution duration, token efficiency, and safety compliance.

---

## 🛡️ Enterprise Compliance & Quality Standards
- **Zero Secret Leakage**: Enforced by git pre-commit hooks and automated CIP secret scans.
- **Strict Typing & Soundness**: Validated against rigorous compilation and linting rules.
- **Audited Telemetry**: Telemetry events recorded with Dynamic Health Score (DHS) governance.

---
*Maintained by **harsh.rana@maqsoftware.com** • Engineering Commons Ecosystem*