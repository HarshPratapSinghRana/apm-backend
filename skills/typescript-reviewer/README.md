# Senior TypeScript & Full-Stack Security Reviewer
[![Type: agent / skill](https://img.shields.io/badge/Type-agent%20%2F%20skill-blue.svg)]()
[![Status: Certified](https://img.shields.io/badge/Status-Certified-brightgreen.svg)]()
[![Category: Frontend & Node.js Code Review](https://img.shields.io/badge/Category-Frontend%20%26%20Node.js%20Code%20Review-purple.svg)]()
[![Author: Harsh Pratap Singh Rana](https://img.shields.io/badge/Author-Harsh_Pratap_Singh_Rana-orange.svg)]()

> **Artifact Name**: `typescript-reviewer`  
> **Main Work**: Enforces strict type safety (any elimination, discriminated unions, type guards), React/Next.js best practices, memory leak prevention, and comprehensive web security (XSS, Prototype Pollution, ReDoS, CSRF, SSRF, Express Path Traversal, strict TLS verification).

---

## 📌 What is the Main Work of this Artifact?

**typescript-reviewer** is a certified Engineering Commons AI artifact designed to autonomously solve:

Enforces strict type safety (any elimination, discriminated unions, type guards), React/Next.js best practices, memory leak prevention, and comprehensive web security (XSS, Prototype Pollution, ReDoS, CSRF, SSRF, Express Path Traversal, strict TLS verification).

Instead of manually reviewing code or consulting disjointed documentation, developers install this artifact to get instant, deep automated analysis, line-level code replacements, and compliance verification directly inside their development environment.

---

## 🛠️ Supported Technology Stack

- **TypeScript 5.x**
- **React 18 / 19**
- **Next.js 14 / 15**
- **Node.js**
- **Express**
- **Mocha / Jest**

---

## 🎯 Key Capabilities & Review Dimensions

- Strict type soundness: Eliminates `any`, enforces discriminated unions, strict null checks, exhaustiveness
- React & Next.js performance: Re-render cascades, memoization pitfalls, hydration mismatches, Server Components
- Node.js & Express security: Prototype pollution prevention, path traversal in express.static/fs, ReDoS defense
- Zero-Trust transport: Flags `rejectUnauthorized: false` and ensures strict TLS certificate checks
- Memory leak detection: Unsubscribed event listeners, unclosed timers, and dangling Webview message listeners

---

## 🚀 How to Install & Use This Artifact

### 1. Installation via Engineering Commons CLI
Run this command from any terminal in your project root:
```bash
engineering-commons install typescript-reviewer
```
*(or install via the **Engineering Commons VS Code Extension** by clicking **Install** in the Market Explorer tab).*

### 2. How to Invoke in GitHub Copilot Chat
Once installed, open GitHub Copilot Chat in VS Code and invoke the artifact directly:
```text
@typescript-reviewer review this React hook and Next.js Server Action for memory leaks and hydration errors
```

### 3. How to Invoke in Antigravity IDE
Open the Antigravity Chat panel and summon the skill:
```text
Please run typescript-reviewer on the current active file to check for security vulnerabilities and performance bottlenecks.
```

---

## 💡 Practical Workflow Prompts & Examples

### Example 1: Targeted Component Review
```text
Audit our TypeScript codebase to replace all `any` usages with type guards and discriminated unions.
```

### Example 2: Deep Security & Bug Audit
```text
Review this Express.js file download route for directory traversal and SSRF vulnerabilities.
```

### Example 3: Performance & Architecture Optimization
```text
Inspect this React component tree for unnecessary re-renders and missing useEffect dependencies.
```

---

## 📊 Expected Output & Review Artifacts

When you invoke **typescript-reviewer**, you receive a structured report containing:
1. **Executive Verdict & Health Score**: High-level pass/fail assessment and risk categorization.
2. **Critical Vulnerabilities & Bugs**: Precise line-number references with CWE / OWASP classification.
3. **Optimized Code Diffs**: Drop-in unified replacement snippets that preserve existing features.
4. **Best-Practice Guidance**: Actionable steps aligned with enterprise architectural governance.

---
*Maintained by **Harsh Pratap Singh Rana** (`harsh.rana@maqsoftware.com`) • Engineering Commons Ecosystem*
