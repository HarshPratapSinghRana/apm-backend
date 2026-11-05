# Senior C & Modern C++ Systems Reviewer
[![Type: agent / skill](https://img.shields.io/badge/Type-agent%20%2F%20skill-blue.svg)]()
[![Status: Certified](https://img.shields.io/badge/Status-Certified-brightgreen.svg)]()
[![Category: Systems Correctness & Memory Safety](https://img.shields.io/badge/Category-Systems%20Correctness%20%26%20Memory%20Safety-purple.svg)]()
[![Author: Harsh Pratap Singh Rana](https://img.shields.io/badge/Author-Harsh_Pratap_Singh_Rana-orange.svg)]()

> **Artifact Name**: `cpp-reviewer`  
> **Main Work**: Specializes in memory safety, systems correctness, and high-performance engineering for C and modern C++. Detects buffer overflows, use-after-free, double-free, dangling pointers, undefined behavior, integer overflows, and concurrency race conditions while enforcing RAII and modern smart pointer idioms.

---

## 📌 What is the Main Work of this Artifact?

**cpp-reviewer** is a certified Engineering Commons AI artifact designed to autonomously solve:

Specializes in memory safety, systems correctness, and high-performance engineering for C and modern C++. Detects buffer overflows, use-after-free, double-free, dangling pointers, undefined behavior, integer overflows, and concurrency race conditions while enforcing RAII and modern smart pointer idioms.

Instead of manually reviewing code or consulting disjointed documentation, developers install this artifact to get instant, deep automated analysis, line-level code replacements, and compliance verification directly inside their development environment.

---

## 🛠️ Supported Technology Stack

- **C++17 / C++20 / C++23**
- **C11 / C17**
- **RAII & Smart Pointers**
- **std::span / std::string_view**
- **Valgrind / ASan**
- **CMake**

---

## 🎯 Key Capabilities & Review Dimensions

- Memory safety & Lifetime audit: Buffer overflows, Use-After-Free (UAF), Double-Free, dangling references
- Modern C++ idioms: RAII everywhere, std::unique_ptr/std::shared_ptr, std::span, std::string_view, concepts
- Undefined Behavior (UB) prevention: Integer overflow/underflow, uninitialized variables, strict aliasing violations
- Concurrency correctness: std::atomic operations, memory ordering (acquire-release vs sequential consistency)
- Sanitizer compliance: Prepares code to pass AddressSanitizer (ASan), UndefinedBehaviorSanitizer (UBSan), and TSan

---

## 🚀 How to Install & Use This Artifact

### 1. Installation via Engineering Commons CLI
Run this command from any terminal in your project root:
```bash
engineering-commons install cpp-reviewer
```
*(or install via the **Engineering Commons VS Code Extension** by clicking **Install** in the Market Explorer tab).*

### 2. How to Invoke in GitHub Copilot Chat
Once installed, open GitHub Copilot Chat in VS Code and invoke the artifact directly:
```text
@cpp-reviewer audit this C++ network parser and ring buffer for buffer overflows and lifetime errors
```

### 3. How to Invoke in Antigravity IDE
Open the Antigravity Chat panel and summon the skill:
```text
Please run cpp-reviewer on the current active file to check for security vulnerabilities and performance bottlenecks.
```

---

## 💡 Practical Workflow Prompts & Examples

### Example 1: Targeted Component Review
```text
Review this custom memory allocator for use-after-free and alignment issues.
```

### Example 2: Deep Security & Bug Audit
```text
Inspect this multithreaded C++20 ring buffer for race conditions and atomic memory ordering bugs.
```

### Example 3: Performance & Architecture Optimization
```text
Refactor raw pointer arithmetic in this image processing loop to use std::span and bounds safety.
```

---

## 📊 Expected Output & Review Artifacts

When you invoke **cpp-reviewer**, you receive a structured report containing:
1. **Executive Verdict & Health Score**: High-level pass/fail assessment and risk categorization.
2. **Critical Vulnerabilities & Bugs**: Precise line-number references with CWE / OWASP classification.
3. **Optimized Code Diffs**: Drop-in unified replacement snippets that preserve existing features.
4. **Best-Practice Guidance**: Actionable steps aligned with enterprise architectural governance.

---
*Maintained by **Harsh Pratap Singh Rana** (`harsh.rana@maqsoftware.com`) • Engineering Commons Ecosystem*
