---
name: api-test-generator
type: skill
version: 1.0.0
description: Automatically generates comprehensive xUnit and integration tests for REST API endpoints
---

# API Test Generator Skill

When requested to generate API tests:
1. Inspect controller action routes, HTTP methods, and input validation.
2. Produce mock data scenarios:
   - Happy path (200/201 response with correct payload)
   - Validation failure (400 Bad Request)
   - Unauthorized access (401/403)
   - Not found (404)
3. Use xUnit and Moq or TestWebApplicationFactory.
