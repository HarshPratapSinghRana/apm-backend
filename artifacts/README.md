# Standalone AI Artifacts Reference Guide
[![Ecosystem: Engineering Commons](https://img.shields.io/badge/Ecosystem-Engineering_Commons-blue.svg)]()
[![Status: Certified](https://img.shields.io/badge/Status-Certified-brightgreen.svg)]()
[![Author: Harsh Pratap Singh Rana](https://img.shields.io/badge/Author-Harsh_Pratap_Singh_Rana-orange.svg)]()

This directory contains standalone AI artifacts, prompt templates, and specialized skills published to the Engineering Commons marketplace.

---

## 📦 Artifacts Catalog & Usage Guide

### 1. `api-test-generator.skill.md`
- **Type**: Skill
- **Main Work**: Autonomously parses OpenAPI / Swagger specifications and generates end-to-end integration tests using xUnit, Mocha, or Pytest with boundary test cases, happy paths, and error scenarios.
- **How to Use**:
  ```bash
  engineering-commons install api-test-generator
  ```
  In Copilot Chat: *"Generate comprehensive xUnit tests for the endpoints defined in swagger.json."*

### 2. `cip-telemetry-sdk.md`
- **Type**: Skill / SDK
- **Main Work**: Provides zero-overhead OpenTelemetry-compatible instrumentation for AI agent invocations, token utilization tracking, duration metrics, and developer activity logging.
- **How to Use**:
  ```bash
  engineering-commons install cip-telemetry-sdk
  ```
  In code: Import and call `recordAgentInvocation({ artifactName, durationMs, success: true })`.

### 3. `git-smart-commit.md`
- **Type**: Skill / Prompt
- **Main Work**: Analyzes git staging area diffs (`git diff --cached`) and generates standardized Conventional Commits (`feat:`, `fix:`, `chore:`) with concise bullet-pointed summaries of functional changes.
- **How to Use**:
  ```bash
  engineering-commons install git-smart-commit
  ```
  In Copilot Chat: *"Review staged changes and generate a conventional commit message."*

### 4. `graphql-schema-guardian.md`
- **Type**: Skill / Linter
- **Main Work**: Audits GraphQL schemas and resolver implementations for breaking changes, circular references, query depth vulnerabilities, and N+1 database resolution patterns.
- **How to Use**:
  ```bash
  engineering-commons install graphql-schema-guardian
  ```
  In Copilot Chat: *"Audit this GraphQL schema for breaking changes against our previous schema."*

### 5. `memory-mcp-server.md`
- **Type**: MCP Server
- **Main Work**: Provides an external knowledge graph and persistent contextual memory server for AI agents across different coding sessions.
- **How to Use**:
  ```bash
  engineering-commons install memory-mcp-server
  ```
  Connect via Claude or Antigravity MCP settings to persist entity relationships.

### 6. `powerautomate-sync-engine.md`
- **Type**: Solution / Integration
- **Main Work**: Connects Engineering Commons review workflows to Microsoft Power Automate, SharePoint Lists, and Microsoft Teams for real-time stakeholder approvals and notifications.
- **How to Use**:
  ```bash
  engineering-commons install powerautomate-sync-engine
  ```

### 7. `system-architect-prompt.md`
- **Type**: Prompt
- **Main Work**: Principal solutions architect prompt for synthesizing multi-tier enterprise system architectures, technology evaluation trade-offs, and cloud migration roadmaps.
- **How to Use**:
  ```bash
  engineering-commons install system-architect-prompt
  ```

### 8. `terraform-compliance-guard.md`
- **Type**: Skill / Security Auditor
- **Main Work**: Scans Terraform infrastructure-as-code files (`.tf`) for cloud security misconfigurations (public S3 buckets, open ingress 0.0.0.0/0, missing encryption at rest) and CIS benchmark compliance.
- **How to Use**:
  ```bash
  engineering-commons install terraform-compliance-guard
  ```
  In Copilot Chat: *"Audit main.tf for CIS benchmark violations and unencrypted storage resources."*

---
*Maintained by **Harsh Pratap Singh Rana** (`harsh.rana@maqsoftware.com`) • Engineering Commons Ecosystem*
