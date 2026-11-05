# Senior C# & .NET Enterprise Reviewer
[![Type: agent / skill](https://img.shields.io/badge/Type-agent%20%2F%20skill-blue.svg)]()
[![Status: Certified](https://img.shields.io/badge/Status-Certified-brightgreen.svg)]()
[![Category: Backend Code Review & Security](https://img.shields.io/badge/Category-Backend%20Code%20Review%20%26%20Security-purple.svg)]()
[![Author: Harsh Pratap Singh Rana](https://img.shields.io/badge/Author-Harsh_Pratap_Singh_Rana-orange.svg)]()

> **Artifact Name**: `csharp-reviewer`  
> **Main Work**: Audits C# and .NET codebases for allocation efficiency (Span<T>, Memory<T>, ArrayPool), async state machine overhead, Entity Framework Core query evaluation, and enterprise security (Roslyn analyzers, OWASP Top 10, path traversal in Path.Combine, TLS verification, mass assignment, SQLi).

---

## 📌 What is the Main Work of this Artifact?

**csharp-reviewer** is a certified Engineering Commons AI artifact designed to autonomously solve:

Audits C# and .NET codebases for allocation efficiency (Span<T>, Memory<T>, ArrayPool), async state machine overhead, Entity Framework Core query evaluation, and enterprise security (Roslyn analyzers, OWASP Top 10, path traversal in Path.Combine, TLS verification, mass assignment, SQLi).

Instead of manually reviewing code or consulting disjointed documentation, developers install this artifact to get instant, deep automated analysis, line-level code replacements, and compliance verification directly inside their development environment.

---

## 🛠️ Supported Technology Stack

- **C# 12 / C# 13**
- **.NET 8 / 9 / 10**
- **ASP.NET Core**
- **Entity Framework Core**
- **xUnit / NUnit**
- **Roslyn Analyzers**

---

## 🎯 Key Capabilities & Review Dimensions

- Modern C# idioms: Primary constructors, collection expressions, pattern matching, record structs
- High-throughput zero-allocation auditing: ReadOnlySpan<char>, ReadOnlyMemory<T>, ValueTask<T>
- EF Core optimization: Client-side evaluation elimination, .AsNoTracking(), batch update checks
- OWASP security: Path traversal in Path.Combine (CWE-22), SQLi in FromSqlRaw, unsafe TLS bypass
- Automated Roslyn static analysis compliance: Clean build under latest analysis rules

---

## 🚀 How to Install & Use This Artifact

### 1. Installation via Engineering Commons CLI
Run this command from any terminal in your project root:
```bash
engineering-commons install csharp-reviewer
```
*(or install via the **Engineering Commons VS Code Extension** by clicking **Install** in the Market Explorer tab).*

### 2. How to Invoke in GitHub Copilot Chat
Once installed, open GitHub Copilot Chat in VS Code and invoke the artifact directly:
```text
@csharp-reviewer review this ASP.NET Core controller and repository for memory leaks and EF Core N+1 queries
```

### 3. How to Invoke in Antigravity IDE
Open the Antigravity Chat panel and summon the skill:
```text
Please run csharp-reviewer on the current active file to check for security vulnerabilities and performance bottlenecks.
```

---

## 💡 Practical Workflow Prompts & Examples

### Example 1: Targeted Component Review
```text
Audit this C# service for string allocation bottlenecks in high-frequency parsing loops.
```

### Example 2: Deep Security & Bug Audit
```text
Check our Entity Framework Core queries for unintended client evaluation and missing database indexes.
```

### Example 3: Performance & Architecture Optimization
```text
Review this file upload and path manipulation code for Path Traversal (CWE-22) vulnerabilities.
```

---

## 📊 Expected Output & Review Artifacts

When you invoke **csharp-reviewer**, you receive a structured report containing:
1. **Executive Verdict & Health Score**: High-level pass/fail assessment and risk categorization.
2. **Critical Vulnerabilities & Bugs**: Precise line-number references with CWE / OWASP classification.
3. **Optimized Code Diffs**: Drop-in unified replacement snippets that preserve existing features.
4. **Best-Practice Guidance**: Actionable steps aligned with enterprise architectural governance.

---
*Maintained by **Harsh Pratap Singh Rana** (`harsh.rana@maqsoftware.com`) • Engineering Commons Ecosystem*
