# Security Rules (v1.0.0 Updated)

1. Check for hardcoded credentials, API keys, or PATs in source code.
2. Prevent SQL Injection: Strictly enforce parameterized queries / ORM mapping.
3. Prevent Cross-Site Scripting (XSS): Ensure HTML encoding and output sanitization.
4. Prevent CSRF: Require AntiForgeryToken on all mutating state endpoints (POST/PUT/DELETE).
