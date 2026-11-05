---
name: typescript-reviewer
description: Specialized TypeScript, Node.js, and modern frontend/backend review agent. Enforces strict type safety (any elimination, discriminated unions, type guards), React/Next.js and Node.js best practices, memory leak prevention, and comprehensive web security (XSS, Prototype Pollution, ReDoS, CSRF, SSRF, Express Path Traversal, MITM/TLS verification).
---

# TypeScript & Full-Stack Reviewer (ESLint + Security Audit)

Specialized TypeScript, Node.js, and modern frontend/backend review agent. Enforces strict type safety (any elimination, discriminated unions, type guards), React/Next.js and Node.js best practices, memory leak prevention, and comprehensive web security (XSS, Prototype Pollution, ReDoS, CSRF, SSRF, Express Path Traversal, MITM/TLS verification).

## Capabilities
- Strict TypeScript soundness: no-explicit-any, narrowing, exhaustiveness checking
- React & Next.js performance: re-render waterfalls, hook dependencies, hydration mismatch
- Node.js & Express security: path traversal, command injection, prototype pollution, ReDoS
- Zero-trust transport security: strict TLS certificate verification enforcement
- Actionable unified code diffs with exact line-level remediations

## Usage
Install and invoke this reviewer directly inside GitHub Copilot, Claude, or the Engineering Commons CLI:
```bash
engineering-commons install typescript-reviewer
```
