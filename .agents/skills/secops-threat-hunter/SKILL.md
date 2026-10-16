---
name: secops-threat-hunter
description: Workflow skill instructions for SecOps Threat Hunter Agent
version: 1.0.0
---

# SecOps Threat Hunter Skill

Step-by-step security auditing and threat detection guidelines.

## Verification Gates

1. **Authentication & Authorization**:
   - Verify every endpoint parses and validates user identity claims via secure tokens.
   - Assert role-based access control (RBAC) is applied server-side, not just in UI components.

2. **Input Sanitization & Injection Prevention**:
   - Check all database queries use parameterized commands (prevent SQL injection).
   - Ensure dynamic HTML output is properly encoded (prevent XSS).

3. **CORS & Transport Security**:
   - Confirm `Access-Control-Allow-Origin` is explicit and never `*` on authenticated routes.
   - Enforce HTTPS redirect and HSTS response headers.
