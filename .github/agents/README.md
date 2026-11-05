# Engineering Commons GitHub Copilot Agents Guide
[![Status: Certified](https://img.shields.io/badge/Status-Certified-brightgreen.svg)]()
[![Ecosystem: Engineering Commons](https://img.shields.io/badge/Ecosystem-Engineering_Commons-blue.svg)]()
[![Author: Harsh Pratap Singh Rana](https://img.shields.io/badge/Author-Harsh_Pratap_Singh_Rana-orange.svg)]()

This directory contains native **GitHub Copilot Agent Definitions** (`.agent.md`). These agents enable specialized persona-driven code reviews, architecture analysis, and developer workflow automation directly within GitHub Copilot Chat and Antigravity IDE.

---

## 🤖 Available Agents & Their Main Work

| Agent Mention | Title | Main Work / Purpose | Primary Stack |
| :--- | :--- | :--- | :--- |
| `@architecture-reviewer` | **Principal Enterprise Solutions Architecture Reviewer** | Evaluates enterprise distributed system designs, microservices architectures, cloud infrastructure, and data w... | `Distributed Systems, Microservices, Kubernetes` |
| `@csharp-reviewer` | **Senior C# & .NET Enterprise Reviewer** | Audits C# and .NET codebases for allocation efficiency (Span<T>, Memory<T>, ArrayPool), async state machine ov... | `C# 12 / C# 13, .NET 8 / 9 / 10, ASP.NET Core` |
| `@typescript-reviewer` | **Senior TypeScript & Full-Stack Security Reviewer** | Enforces strict type safety (any elimination, discriminated unions, type guards), React/Next.js best practices... | `TypeScript 5.x, React 18 / 19, Next.js 14 / 15` |
| `@python-reviewer` | **Senior Python & Data Science Security Reviewer** | Performs deep static analysis and security auditing for Python applications, async concurrency pipelines, data... | `Python 3.10 - 3.13, FastAPI / Flask / Django, PySpark / Pandas / NumPy` |
| `@java-reviewer` | **Enterprise Java & Spring Boot Security Reviewer** | Audits enterprise Java and Spring Boot applications for modern LTS patterns, virtual thread concurrency safety... | `Java 17 / 21 LTS, Spring Boot 3.x, Spring Security 6` |
| `@go-reviewer` | **Autonomous Go (Golang) Systems Reviewer** | Performs deep static analysis and systems correctness audits for Go codebases. Evaluates goroutine leaks, chan... | `Go 1.22 / 1.23, Goroutines & Channels, gRPC & Protocol Buffers` |
| `@cpp-reviewer` | **Senior C & Modern C++ Systems Reviewer** | Specializes in memory safety, systems correctness, and high-performance engineering for C and modern C++. Dete... | `C++17 / C++20 / C++23, C11 / C17, RAII & Smart Pointers` |
| `@work-timeline-tracker` | **Autonomous Work Timeline & Standup Tracker** | Autonomously records start times, milestones, context switches, bug investigations, and task completions with ... | `JSON / Markdown Storage, CLI Lifecycle Tracking, Git Hooks` |

---

## 🚀 How to Use GitHub Copilot Agents

### 1. In GitHub Copilot Chat
Type the agent handle followed by your request:
```text
@csharp-reviewer please review this ASP.NET Core controller for memory allocations and EF Core queries.
```
```text
@typescript-reviewer audit this React custom hook for unnecessary re-renders and memory leaks.
```
```text
@architecture-reviewer review this distributed cache architecture for split-brain and cache avalanche risks.
```

### 2. In Antigravity IDE
Mention the agent or instruct the assistant to follow the specific agent persona:
```text
Act as @python-reviewer and audit our data processing pipeline for subprocess vulnerabilities.
```

---
*Maintained by **Harsh Pratap Singh Rana** (`harsh.rana@maqsoftware.com`) • Engineering Commons Ecosystem*
