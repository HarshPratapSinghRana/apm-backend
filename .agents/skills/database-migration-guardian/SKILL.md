---
name: database-migration-guardian
type: skill
version: 1.0.0
description: Zero-Downtime Database Schema Migration Verifier and Lock Hazard Prevention Skill for PostgreSQL, SQL Server, and MySQL.
author: Enterprise Data Architecture <data-platform@maqsoftware.com>
tags:
  - database
  - migrations
  - zero-downtime
  - postgresql
  - sqlserver
---

# Database Migration Guardian Skill

Specialized database engineering skill for validating database schema changes, eliminating table-lock hazards, and enforcing expandable/contractible two-phase deployments.

## Core Rules & Guardrails

### 1. Lock Hazard Prevention
- **Prohibit Table Rewrites**: Flags `ALTER TABLE ... ADD COLUMN` with non-null defaults without `DEFAULT ... NOT NULL` on pre-PG11 databases.
- **Concurrent Index Creation**: Mandates `CREATE INDEX CONCURRENTLY` in PostgreSQL and `ONLINE = ON` in SQL Server Enterprise to prevent exclusive write locks on large production tables.
- **Safe Column Renames**: Prohibits direct column renames. Mandates the Expand-Contract phase: add new column, dual-write in application, backfill asynchronously, and drop old column in subsequent release.

### 2. Foreign Key & Index Safety
- Verifies that all newly introduced foreign keys have corresponding indexes on the referencing column to prevent full-table scan locks during cascading deletes.
- Ensures `NOT VALID` constraint creation followed by a separate `VALIDATE CONSTRAINT` step to minimize transaction duration.

### 3. Reversibility & Rollback Scripts
- Asserts every up-migration has a corresponding, mathematically safe down-migration script.
- Validates transactional integrity (wrapping scripts in `BEGIN` / `COMMIT` blocks where supported by the database engine).

## Migration Checklist Summary

| Check | Risk Level | Requirement |
|-------|------------|-------------|
| Adding column with default | High | Add column nullable, backfill in batches, alter to NOT NULL |
| Creating index | Critical | Always use `CONCURRENTLY` (PostgreSQL) or `ONLINE = ON` (SQL Server) |
| Dropping column | High | Ensure no running application replica references the column before dropping |
| Changing column type | Critical | Create new column, dual-write, backfill, cutover |

## Execution Commands

```bash
# Verify migration script against production lock safety rules
apm run database-migration-guardian --check-file ./migrations/20261016_add_user_roles.sql

# Generate zero-downtime expand/contract migration templates
apm run database-migration-guardian --generate --action rename-column --table users --from name --to display_name
```
