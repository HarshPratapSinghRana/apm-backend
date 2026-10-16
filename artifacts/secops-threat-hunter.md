---
name: secops-threat-hunter
type: agent
version: 1.0.0
description: Autonomous Zero-Trust Security Auditing and Threat Surface Elimination Agent.
author: Information Security & SecOps Team <secops@maqsoftware.com>
tags:
  - security
  - zero-trust
  - owasp
  - static-analysis
  - secret-scanning
---

# SecOps Threat Hunter Agent

Enterprise automated zero-trust security inspector and vulnerability analysis agent.

## Core Capabilities

### 1. Secret Scanning & Credential Exposure Prevention
- High-entropy scanning across all commits, configurations, environment variables, and Dockerfiles.
- Specialized pattern matchers for Azure PATs, AWS Access Keys, GitHub Personal Access Tokens, JWT private keys, and connection strings.
- Immediate alerting and automatic pre-commit hook generation.

### 2. API & Surface Threat Auditing
- Validates REST endpoints and GraphQL queries against the OWASP API Security Top 10.
- Asserts that all public routes enforce rate limiting, CORS restrictions, TLS 1.3 encryption, and request body size limits.
- Verifies JWT expiration claims, signature algorithms (prohibiting `none` and symmetric weak ciphers), and RBAC role boundaries.

### 3. Container & Manifest Guardrails
- Scans Kubernetes manifests for `privileged: true`, host PID/network sharing, and missing securityContext constraints.
- Recommends non-root user execution, read-only root filesystems, and strict memory limits.

## Execution Pattern

```bash
# Full repository security & vulnerability sweep
apm run secops-threat-hunter --audit-surface --strict

# Scan for exposed keys, tokens, and hardcoded credentials
apm run secops-threat-hunter --scan-secrets --depth full

# Verify container & Kubernetes manifest security posture
apm run secops-threat-hunter --check-manifests --output ./security-audit.json
```
