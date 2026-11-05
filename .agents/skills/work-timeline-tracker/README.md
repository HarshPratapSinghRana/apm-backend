# Autonomous Work Timeline & Standup Tracker
[![Type: agent / skill](https://img.shields.io/badge/Type-agent%20%2F%20skill-blue.svg)]()
[![Status: Certified](https://img.shields.io/badge/Status-Certified-brightgreen.svg)]()
[![Category: Developer Productivity & Task Lifecycle](https://img.shields.io/badge/Category-Developer%20Productivity%20%26%20Task%20Lifecycle-purple.svg)]()
[![Author: Harsh Pratap Singh Rana](https://img.shields.io/badge/Author-Harsh_Pratap_Singh_Rana-orange.svg)]()

> **Artifact Name**: `work-timeline-tracker`  
> **Main Work**: Autonomously records start times, milestones, context switches, bug investigations, and task completions with duration calculation. Generates automated developer standup reports, sprint summaries, and productivity analytics.

---

## 📌 What is the Main Work of this Artifact?

**work-timeline-tracker** is a certified Engineering Commons AI artifact designed to autonomously solve:

Autonomously records start times, milestones, context switches, bug investigations, and task completions with duration calculation. Generates automated developer standup reports, sprint summaries, and productivity analytics.

Instead of manually reviewing code or consulting disjointed documentation, developers install this artifact to get instant, deep automated analysis, line-level code replacements, and compliance verification directly inside their development environment.

---

## 🛠️ Supported Technology Stack

- **JSON / Markdown Storage**
- **CLI Lifecycle Tracking**
- **Git Hooks**
- **Telemetry Integration**
- **Automated Standup Reports**

---

## 🎯 Key Capabilities & Review Dimensions

- Task lifecycle logging: Start, pause, resume, milestone, and completion tracking with timestamps
- Context switch detection: Records when developer switches between different bugfixes, features, or reviews
- Automated standup report generation: Formats yesterday/today/blockers markdown for daily team standups
- Sprint duration analytics: Calculates active development vs review vs debugging duration breakdown
- Zero-overhead local storage: Persists structured timeline events in .timeline/ or local session store

---

## 🚀 How to Install & Use This Artifact

### 1. Installation via Engineering Commons CLI
Run this command from any terminal in your project root:
```bash
engineering-commons install work-timeline-tracker
```
*(or install via the **Engineering Commons VS Code Extension** by clicking **Install** in the Market Explorer tab).*

### 2. How to Invoke in GitHub Copilot Chat
Once installed, open GitHub Copilot Chat in VS Code and invoke the artifact directly:
```text
@work-timeline-tracker generate my standup report for today based on recent task milestones
```

### 3. How to Invoke in Antigravity IDE
Open the Antigravity Chat panel and summon the skill:
```text
Please run work-timeline-tracker on the current active file to check for security vulnerabilities and performance bottlenecks.
```

---

## 💡 Practical Workflow Prompts & Examples

### Example 1: Targeted Component Review
```text
Start tracking milestone "Refactoring backend review comment endpoints" for artifact certification.
```

### Example 2: Deep Security & Bug Audit
```text
Record context switch: Investigating high-severity npm advisory GHSA-xcx6-jx8p-x3h5.
```

### Example 3: Performance & Architecture Optimization
```text
Generate a comprehensive standup summary showing all completed tasks, duration, and PR diffs.
```

---

## 📊 Expected Output & Review Artifacts

When you invoke **work-timeline-tracker**, you receive a structured report containing:
1. **Executive Verdict & Health Score**: High-level pass/fail assessment and risk categorization.
2. **Critical Vulnerabilities & Bugs**: Precise line-number references with CWE / OWASP classification.
3. **Optimized Code Diffs**: Drop-in unified replacement snippets that preserve existing features.
4. **Best-Practice Guidance**: Actionable steps aligned with enterprise architectural governance.

---
*Maintained by **Harsh Pratap Singh Rana** (`harsh.rana@maqsoftware.com`) • Engineering Commons Ecosystem*
