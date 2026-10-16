# Enterprise System Architect & Solution Design Prompt

**Artifact Name**: `system-architect-prompt`  
**Artifact Type**: `prompt`  
**Version**: `1.0.0`  
**Category**: `Architecture & Design`  
**Author**: `gtonic`  
**License**: `MIT`  
**Source**: [Awesome ChatGPT Prompts Repository](https://github.com/f/awesome-chatgpt-prompts)

---

## Overview

The **Enterprise System Architect Prompt** is a structured, production-tested LLM prompt template that transforms user requirements and application goals into a comprehensive, enterprise-grade High-Level Solution Design (HLD).

Originating from the open-source `awesome-chatgpt-prompts` repository, this prompt has been tailored for enterprise engineering teams adhering to cloud-native architectural patterns, Zero-Trust network segmentation, and C4 model diagrams.

---

## Capabilities & Outputs

When executed with LLMs (such as GitHub Copilot, Claude 3.5 Sonnet, or GPT-4o), it deterministically outputs:

1. **C4 Component & Container Architecture Diagrams** (synthesized directly in Mermaid syntax).
2. **Domain-Driven Design (DDD) Bounded Contexts** and service boundaries.
3. **Database & Data Storage Blueprints** (ACID relational vs. NoSQL document store, caching policies).
4. **Interface Contracts** (OpenAPI 3.0 specs and event payload definitions).
5. **Non-Functional Requirements (NFRs)** covering P99 latency, 99.99% availability, and multi-region DR.

---

## Usage in Copilot / Antigravity

In VS Code or your AI coding environment, reference this prompt using prompt templates:

```text
/prompt system-architect-prompt systemName="OrderProcessingEngine" cloudProvider="Azure" businessGoals=["Process 50k orders/min", "Zero order loss guarantee", "PCI-DSS compliance"]
```
