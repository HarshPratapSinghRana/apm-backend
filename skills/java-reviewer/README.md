# Enterprise Java & Spring Boot Security Reviewer
[![Type: agent / skill](https://img.shields.io/badge/Type-agent%20%2F%20skill-blue.svg)]()
[![Status: Certified](https://img.shields.io/badge/Status-Certified-brightgreen.svg)]()
[![Category: Enterprise Backend Code Review](https://img.shields.io/badge/Category-Enterprise%20Backend%20Code%20Review-purple.svg)]()
[![Author: Harsh Pratap Singh Rana](https://img.shields.io/badge/Author-Harsh_Pratap_Singh_Rana-orange.svg)]()

> **Artifact Name**: `java-reviewer`  
> **Main Work**: Audits enterprise Java and Spring Boot applications for modern LTS patterns, virtual thread concurrency safety, Spring Security configurations, JPA/Hibernate N+1 queries, and critical enterprise security flaws (SpotBugs, OWASP Top 10, SQLi, XXE, insecure deserialization, LDAP/JNDI injection, CSRF/CORS).

---

## 📌 What is the Main Work of this Artifact?

**java-reviewer** is a certified Engineering Commons AI artifact designed to autonomously solve:

Audits enterprise Java and Spring Boot applications for modern LTS patterns, virtual thread concurrency safety, Spring Security configurations, JPA/Hibernate N+1 queries, and critical enterprise security flaws (SpotBugs, OWASP Top 10, SQLi, XXE, insecure deserialization, LDAP/JNDI injection, CSRF/CORS).

Instead of manually reviewing code or consulting disjointed documentation, developers install this artifact to get instant, deep automated analysis, line-level code replacements, and compliance verification directly inside their development environment.

---

## 🛠️ Supported Technology Stack

- **Java 17 / 21 LTS**
- **Spring Boot 3.x**
- **Spring Security 6**
- **Hibernate / JPA**
- **Virtual Threads (Project Loom)**
- **JUnit 5**

---

## 🎯 Key Capabilities & Review Dimensions

- Modern Java 21 LTS patterns: Records, sealed classes, pattern matching for switch, virtual threads
- Spring Boot 3 & Security 6: Method-level authorization (@PreAuthorize), stateless JWT, CSRF protection
- JPA & Hibernate performance: N+1 query detection, fetch join optimization, batch inserts, second-level cache
- Enterprise security scanning: XML External Entity (XXE) injection, JNDI lookups, Log4j style exploits, SQLi in Criteria API
- Concurrency correctness: Thread pool sizing, Virtual Thread pin detection (synchronized vs ReentrantLock)

---

## 🚀 How to Install & Use This Artifact

### 1. Installation via Engineering Commons CLI
Run this command from any terminal in your project root:
```bash
engineering-commons install java-reviewer
```
*(or install via the **Engineering Commons VS Code Extension** by clicking **Install** in the Market Explorer tab).*

### 2. How to Invoke in GitHub Copilot Chat
Once installed, open GitHub Copilot Chat in VS Code and invoke the artifact directly:
```text
@java-reviewer audit this Spring Boot REST controller and JPA repository for N+1 queries and Spring Security bypasses
```

### 3. How to Invoke in Antigravity IDE
Open the Antigravity Chat panel and summon the skill:
```text
Please run java-reviewer on the current active file to check for security vulnerabilities and performance bottlenecks.
```

---

## 💡 Practical Workflow Prompts & Examples

### Example 1: Targeted Component Review
```text
Review our Spring Data JPA queries for Hibernate N+1 problems and excessive eager fetching.
```

### Example 2: Deep Security & Bug Audit
```text
Check our Spring Security 6 filter chain configuration for CORS/CSRF vulnerabilities.
```

### Example 3: Performance & Architecture Optimization
```text
Audit this multi-threaded Java 21 service for synchronized blocks pinning virtual threads.
```

---

## 📊 Expected Output & Review Artifacts

When you invoke **java-reviewer**, you receive a structured report containing:
1. **Executive Verdict & Health Score**: High-level pass/fail assessment and risk categorization.
2. **Critical Vulnerabilities & Bugs**: Precise line-number references with CWE / OWASP classification.
3. **Optimized Code Diffs**: Drop-in unified replacement snippets that preserve existing features.
4. **Best-Practice Guidance**: Actionable steps aligned with enterprise architectural governance.

---
*Maintained by **Harsh Pratap Singh Rana** (`harsh.rana@maqsoftware.com`) • Engineering Commons Ecosystem*
