# Principal Enterprise Solutions Architecture Reviewer
[![Type: agent / skill](https://img.shields.io/badge/Type-agent%20%2F%20skill-blue.svg)]()
[![Status: Certified](https://img.shields.io/badge/Status-Certified-brightgreen.svg)]()
[![Category: Architecture & System Design](https://img.shields.io/badge/Category-Architecture%20%26%20System%20Design-purple.svg)]()
[![Author: Harsh Pratap Singh Rana](https://img.shields.io/badge/Author-Harsh_Pratap_Singh_Rana-orange.svg)]()

> **Artifact Name**: `architecture-reviewer`  
> **Main Work**: Evaluates enterprise distributed system designs, microservices architectures, cloud infrastructure, and data workflows for high availability, fault tolerance, API contract governance, consistency models (ACID vs BASE, Saga), Zero-Trust security, and FinOps cloud cost optimization.

---

## 📌 What is the Main Work of this Artifact?

**architecture-reviewer** is a certified Engineering Commons AI artifact designed to autonomously solve:

Evaluates enterprise distributed system designs, microservices architectures, cloud infrastructure, and data workflows for high availability, fault tolerance, API contract governance, consistency models (ACID vs BASE, Saga), Zero-Trust security, and FinOps cloud cost optimization.

Instead of manually reviewing code or consulting disjointed documentation, developers install this artifact to get instant, deep automated analysis, line-level code replacements, and compliance verification directly inside their development environment.

---

## 🛠️ Supported Technology Stack

- **Distributed Systems**
- **Microservices**
- **Kubernetes**
- **Cloud (Azure/AWS/GCP)**
- **Event-Driven Architecture**
- **Kafka / RabbitMQ**

---

## 🎯 Key Capabilities & Review Dimensions

- Distributed systems resilience (Circuit Breaker, Bulkhead, Retry with exponential backoff)
- Consistency model audit (Eventual Consistency, Saga pattern, Transactional Outbox, 2PC)
- API Governance & Contract Safety (gRPC, REST, GraphQL schema evolution, zero breaking changes)
- Zero-Trust Cloud Security (mTLS, OIDC/OAuth2, least-privilege IAM, secret rotation)
- FinOps cloud cost optimization (auto-scaling thresholds, egress reduction, reserved instance sizing)

---

## 🚀 How to Install & Use This Artifact

### 1. Installation via Engineering Commons CLI
Run this command from any terminal in your project root:
```bash
engineering-commons install architecture-reviewer
```
*(or install via the **Engineering Commons VS Code Extension** by clicking **Install** in the Market Explorer tab).*

### 2. How to Invoke in GitHub Copilot Chat
Once installed, open GitHub Copilot Chat in VS Code and invoke the artifact directly:
```text
@architecture-reviewer review this distributed payment workflow for split-brain and network partition risks
```

### 3. How to Invoke in Antigravity IDE
Open the Antigravity Chat panel and summon the skill:
```text
Please run architecture-reviewer on the current active file to check for security vulnerabilities and performance bottlenecks.
```

---

## 💡 Practical Workflow Prompts & Examples

### Example 1: Targeted Component Review
```text
Review our microservices architecture diagram and identify single points of failure (SPOF) and latency bottlenecks.
```

### Example 2: Deep Security & Bug Audit
```text
Audit our event-driven architecture using Kafka for message ordering guarantees and poison pill handling.
```

### Example 3: Performance & Architecture Optimization
```text
Evaluate our database sharding and cross-region replication strategy for Disaster Recovery (RPO < 1m, RTO < 5m).
```

---

## 📊 Expected Output & Review Artifacts

When you invoke **architecture-reviewer**, you receive a structured report containing:
1. **Executive Verdict & Health Score**: High-level pass/fail assessment and risk categorization.
2. **Critical Vulnerabilities & Bugs**: Precise line-number references with CWE / OWASP classification.
3. **Optimized Code Diffs**: Drop-in unified replacement snippets that preserve existing features.
4. **Best-Practice Guidance**: Actionable steps aligned with enterprise architectural governance.

---
*Maintained by **Harsh Pratap Singh Rana** (`harsh.rana@maqsoftware.com`) • Engineering Commons Ecosystem*
