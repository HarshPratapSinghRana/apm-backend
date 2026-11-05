# Autonomous Go (Golang) Systems Reviewer
[![Type: agent / skill](https://img.shields.io/badge/Type-agent%20%2F%20skill-blue.svg)]()
[![Status: Certified](https://img.shields.io/badge/Status-Certified-brightgreen.svg)]()
[![Category: Systems & Microservices Code Review](https://img.shields.io/badge/Category-Systems%20%26%20Microservices%20Code%20Review-purple.svg)]()
[![Author: Harsh Pratap Singh Rana](https://img.shields.io/badge/Author-Harsh_Pratap_Singh_Rana-orange.svg)]()

> **Artifact Name**: `go-reviewer`  
> **Main Work**: Performs deep static analysis and systems correctness audits for Go codebases. Evaluates goroutine leaks, channel deadlock prevention, race condition detection, escape analysis/memory allocations, and comprehensive security vulnerability scanning (Gosec, command injection, unvalidated redirects, insecure crypto).

---

## 📌 What is the Main Work of this Artifact?

**go-reviewer** is a certified Engineering Commons AI artifact designed to autonomously solve:

Performs deep static analysis and systems correctness audits for Go codebases. Evaluates goroutine leaks, channel deadlock prevention, race condition detection, escape analysis/memory allocations, and comprehensive security vulnerability scanning (Gosec, command injection, unvalidated redirects, insecure crypto).

Instead of manually reviewing code or consulting disjointed documentation, developers install this artifact to get instant, deep automated analysis, line-level code replacements, and compliance verification directly inside their development environment.

---

## 🛠️ Supported Technology Stack

- **Go 1.22 / 1.23**
- **Goroutines & Channels**
- **gRPC & Protocol Buffers**
- **Gin / Echo / Chi**
- **Gorm / sqlx**
- **Go Test / Testify**

---

## 🎯 Key Capabilities & Review Dimensions

- Go 1.22+ idioms: Range over integers/functions, loop variable scoping fixes, slices/maps packages
- Concurrency audit: Goroutine leak detection, unbuffered channel deadlocks, context.WithTimeout propagation
- Memory & escape analysis: Pointer escape to heap audit, sync.Pool buffer reuse, zero-allocation serialization
- Security auditing (Gosec): Unsanitized os/exec.Command calls, path traversal in net/http, insecure TLS MinVersion
- Error handling governance: Structured error wrapping (fmt.Errorf with %w), errors.Is / errors.As patterns

---

## 🚀 How to Install & Use This Artifact

### 1. Installation via Engineering Commons CLI
Run this command from any terminal in your project root:
```bash
engineering-commons install go-reviewer
```
*(or install via the **Engineering Commons VS Code Extension** by clicking **Install** in the Market Explorer tab).*

### 2. How to Invoke in GitHub Copilot Chat
Once installed, open GitHub Copilot Chat in VS Code and invoke the artifact directly:
```text
@go-reviewer inspect this Go gRPC service and worker pool for goroutine leaks and race conditions
```

### 3. How to Invoke in Antigravity IDE
Open the Antigravity Chat panel and summon the skill:
```text
Please run go-reviewer on the current active file to check for security vulnerabilities and performance bottlenecks.
```

---

## 💡 Practical Workflow Prompts & Examples

### Example 1: Targeted Component Review
```text
Analyze this Go concurrent pipeline for context cancellation handling and channel closing deadlocks.
```

### Example 2: Deep Security & Bug Audit
```text
Review this HTTP handler for memory allocation hotspots using escape analysis patterns.
```

### Example 3: Performance & Architecture Optimization
```text
Audit our Go codebase for command injection vulnerabilities in os/exec and unsafe file path joins.
```

---

## 📊 Expected Output & Review Artifacts

When you invoke **go-reviewer**, you receive a structured report containing:
1. **Executive Verdict & Health Score**: High-level pass/fail assessment and risk categorization.
2. **Critical Vulnerabilities & Bugs**: Precise line-number references with CWE / OWASP classification.
3. **Optimized Code Diffs**: Drop-in unified replacement snippets that preserve existing features.
4. **Best-Practice Guidance**: Actionable steps aligned with enterprise architectural governance.

---
*Maintained by **Harsh Pratap Singh Rana** (`harsh.rana@maqsoftware.com`) • Engineering Commons Ecosystem*
