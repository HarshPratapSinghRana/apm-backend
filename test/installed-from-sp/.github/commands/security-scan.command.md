---
name: security-scan
type: command
version: 1.0.0
description: AI Command to analyze workspace security, detect leaked credentials, and check OWASP Top 10 vulnerabilities
---

# Security Scan Command

Perform an automated security analysis across the current workspace.

## Audit Workflow
1. Scan source files for hardcoded API keys, JWT secrets, database connection strings, and private credentials.
2. Analyze code for OWASP Top 10 security vulnerabilities (SQL injection, XSS, insecure deserialization, path traversal).
3. Check package manifests for vulnerable or deprecated dependencies.
4. Output findings in a prioritized severity table (Critical, High, Medium, Low) with concrete remediation recommendations.
