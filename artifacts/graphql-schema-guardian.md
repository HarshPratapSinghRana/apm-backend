---
name: graphql-schema-guardian
type: skill
version: 1.0.0
domain: API Design & Microservices
category: API & Microservices
description: Zero-Breaking-Change GraphQL Schema Verifier, Apollo Federation Subgraph Linter, and Query Complexity Cost Analyzer.
author: Enterprise API Architecture <api-governance@maqsoftware.com>
tags:
  - graphql
  - apollo-federation
  - schema-linting
  - breaking-changes
  - query-complexity
  - subgraphs
useCases:
  - Detecting breaking changes in GraphQL schema AST (removed fields, non-null additions)
  - Validating Apollo Federation v2 directives (@key, @shareable, @external, @requires)
  - Calculating and enforcing query depth limits and cyclomatic AST cost budgets
  - Verifying Relay Cursor Connection pagination specs
argument-hint: 'Ask @copilot or engineering-commons-advisor to verify GraphQL schema changes, check Apollo Federation directives, or analyze query complexity'
---

# GraphQL Schema Guardian Skill

**Artifact Name**: `graphql-schema-guardian`  
**Artifact Type**: `skill`  
**Version**: `1.0.0`  
**Category**: `API & Microservices`  
**Author**: `Engineering Commons`  
**License**: `MIT`  
**Foundation**: [GraphQL-Inspector & Apollo Federation Specifications](https://github.com/kamilkisiela/graphql-inspector)

---

## Overview

**GraphQL Schema Guardian** is an enterprise schema governance skill designed for federated microservices architectures. It performs static AST analysis on GraphQL SDL files (`.graphql`, `.gql`) to detect breaking changes, enforce deprecation timelines, and validate Apollo Federation v2 subgraph boundaries.

By running during pull requests and developer reviews, it prevents breaking API changes from taking down frontend consumers and mobile apps.

---

## Change Classification Engine

Changes are classified according to semantic risk:

| Classification | Examples | CI/CD Action |
| :--- | :--- | :--- |
| **BREAKING** | Removed field, changed scalar type, added non-null argument | **BLOCKED** unless explicit override provided |
| **DANGEROUS** | Changed default argument value, changed description, added enum value to query return | **WARNING** requiring reviewer acknowledgment |
| **NON-BREAKING** | Added optional field, added new query/mutation, deprecated field | **PASS** |

---

## Apollo Federation Directives Checked
- `@key(fields: "...")`
- `@shareable`
- `@override(from: "...")`
- `@inaccessible`
- `@tag(name: "...")`

---

## Installation & Usage

```bash
engineering-commons install graphql-schema-guardian
```

Execute schema verification:
```bash
/skill graphql-schema-guardian --schema src/schema.graphql --old-schema schema.master.graphql
```
