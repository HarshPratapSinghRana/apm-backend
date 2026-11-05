# Senior Python & Data Science Security Reviewer
[![Type: agent / skill](https://img.shields.io/badge/Type-agent%20%2F%20skill-blue.svg)]()
[![Status: Certified](https://img.shields.io/badge/Status-Certified-brightgreen.svg)]()
[![Category: Backend & AI/ML Code Review](https://img.shields.io/badge/Category-Backend%20%26%20AI%2FML%20Code%20Review-purple.svg)]()
[![Author: Harsh Pratap Singh Rana](https://img.shields.io/badge/Author-Harsh_Pratap_Singh_Rana-orange.svg)]()

> **Artifact Name**: `python-reviewer`  
> **Main Work**: Performs deep static analysis and security auditing for Python applications, async concurrency pipelines, data science workflows, and AI/ML services. Audits typing, GIL contention, memory leaks, and automated security (Bandit, OWASP Top 10, SQLi, command injection via subprocess, insecure deserialization via pickle, SSRF, path traversal).

---

## 📌 What is the Main Work of this Artifact?

**python-reviewer** is a certified Engineering Commons AI artifact designed to autonomously solve:

Performs deep static analysis and security auditing for Python applications, async concurrency pipelines, data science workflows, and AI/ML services. Audits typing, GIL contention, memory leaks, and automated security (Bandit, OWASP Top 10, SQLi, command injection via subprocess, insecure deserialization via pickle, SSRF, path traversal).

Instead of manually reviewing code or consulting disjointed documentation, developers install this artifact to get instant, deep automated analysis, line-level code replacements, and compliance verification directly inside their development environment.

---

## 🛠️ Supported Technology Stack

- **Python 3.10 - 3.13**
- **FastAPI / Flask / Django**
- **PySpark / Pandas / NumPy**
- **Asyncio**
- **Pydantic v2**
- **Pytest**

---

## 🎯 Key Capabilities & Review Dimensions

- Python 3.12+ idioms: Structural pattern matching, type parameter syntax (PEP 695), exception groups
- Asyncio concurrency safety: Task cancellation handling, event loop blocking detection, TaskGroup usage
- High-risk security auditing: Insecure deserialization (pickle/yaml.load), command injection in subprocess/os.system
- Data engineering performance: Vectorized Pandas/Polars operations vs slow Python loops, PySpark lazy evaluation
- Dependency vulnerability scanning: Safety/Bandit checks, insecure SSL context verification

---

## 🚀 How to Install & Use This Artifact

### 1. Installation via Engineering Commons CLI
Run this command from any terminal in your project root:
```bash
engineering-commons install python-reviewer
```
*(or install via the **Engineering Commons VS Code Extension** by clicking **Install** in the Market Explorer tab).*

### 2. How to Invoke in GitHub Copilot Chat
Once installed, open GitHub Copilot Chat in VS Code and invoke the artifact directly:
```text
@python-reviewer review this FastAPI router and Pandas data pipeline for subprocess injection and memory profiling
```

### 3. How to Invoke in Antigravity IDE
Open the Antigravity Chat panel and summon the skill:
```text
Please run python-reviewer on the current active file to check for security vulnerabilities and performance bottlenecks.
```

---

## 💡 Practical Workflow Prompts & Examples

### Example 1: Targeted Component Review
```text
Check this data processing script for Pandas memory efficiency and vectorize row-by-row apply calls.
```

### Example 2: Deep Security & Bug Audit
```text
Audit this API endpoint for remote code execution risks in subprocess.run and pickle deserialization.
```

### Example 3: Performance & Architecture Optimization
```text
Review our asyncio worker pool for unhandled task exceptions and event loop starvation.
```

---

## 📊 Expected Output & Review Artifacts

When you invoke **python-reviewer**, you receive a structured report containing:
1. **Executive Verdict & Health Score**: High-level pass/fail assessment and risk categorization.
2. **Critical Vulnerabilities & Bugs**: Precise line-number references with CWE / OWASP classification.
3. **Optimized Code Diffs**: Drop-in unified replacement snippets that preserve existing features.
4. **Best-Practice Guidance**: Actionable steps aligned with enterprise architectural governance.

---
*Maintained by **Harsh Pratap Singh Rana** (`harsh.rana@maqsoftware.com`) • Engineering Commons Ecosystem*
