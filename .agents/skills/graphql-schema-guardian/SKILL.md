---
name: graphql-schema-guardian
description: Zero-Breaking-Change GraphQL Schema Verifier, Apollo Federation Subgraph Linter, and Query Complexity Cost Analyzer.
version: 1.0.0
---

# GraphQL Schema Guardian Skill Instructions

## Capabilities
1. **Breaking Change Detection**:
   - Compares previous schema AST with incoming changes.
   - Flags breaking modifications:
     - Field removal or type change from non-nullable to nullable or vice versa.
     - Changing argument type from optional to required without default.
     - Removing an enum value or mutation response field.
2. **Apollo Federation v2 Validation**:
   - Validates `@key(fields: "id")` primary keys.
   - Enforces `@shareable` on cross-subgraph type extensions.
   - Detects orphaned `@external` fields lacking `@provides` or `@requires`.
3. **Query Complexity & Depth Budgeting**:
   - Calculates max AST depth and sets limit (default max depth: 7).
   - Detects cyclic recursive relationships (`User -> Posts -> Author -> Posts`).
   - Assigns cost weights to list fields (`first`, `limit`).

## AST Linting Checklist
- [ ] No fields removed from active queries without `@deprecated(reason: "...")` cycle for at least 2 minor versions.
- [ ] All input types have non-breaking additions (only optional fields added).
- [ ] Pagination conforms to Relay Cursor Connections specification (`edges`, `node`, `pageInfo`).
