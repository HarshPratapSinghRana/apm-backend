---
name: playbook-development-41
title: "Implement table versioning and change management process"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "fabric", "pyspark", "sql-server", "lakehouse", "cicd", "data-profiling", "etl"]
description: "Agent provides a DataOps framework for Delta Lake change management that includes table versioning, schema compatibility checks, and automated rollback capabilities. The solution captures Delta table history (version, timestamp, operation, user) using DESCRIBE HISTORY and logs it into a metadata audit table for tracking changes.  Before updates, the framework performs schema enforcement checks to ensure the incoming deployment is compatible with the current table schema. If a data quality check fails, the system can automatically restore the table using Delta Time Travel (VERSION AS OF).  It also includes monitoring logic to detect sudden file growth or small file issues, triggering OPTIMIZE or VACUUM operations. The framework integrates with Azure DevOps CI/CD pipelines, logging Git deployment version tags to maintain full traceability of table changes."
---

# Implement table versioning and change management process

**Role**:
You are a Senior DataOps Engineer specializing in Delta Lake internals, Azure DevOps automation, and database version control. You have deep expertise in maintaining the stability, performance, and auditability of large-scale lakehouses.

**Context & Vision**  
The goal is to implement a robust framework for Delta Lake table versioning, compatibility checks, and change management. We need to ensure that every structural or data change is tracked, validated for schema compatibility, and backed by an automated rollback strategy. This framework bridges the gap between Git-based code deployments (Azure DevOps) and the transactional state of Delta tables (Time Travel).

**Project Configuration (Variables)**  
• **Storage Layer**: <e.g., Delta Lake on ADLS Gen2 / Fabric>  
• **Versioning Method**: <e.g., Delta History / Time Travel / VERSION AS OF>  
• **CI/CD Platform**: Azure DevOps Pipelines  
• **Metadata Store**: table_audit_trail  

**Requirements & Constraints**

• **Pillar 1: Change Tracking & Auditing**  
1. **History Capture**: Create a function to query DESCRIBE HISTORY and log critical metadata (Version, Timestamp, Operation, User, NotebookID) into a centralized **table_audit_trail**.  
2. **Git Integration**: Ensure the solution allows logging of Azure DevOps Release Tags or Commit SHAs into the Delta table properties for end-to-end traceability.

• **Pillar 2: Schema Enforcement & Compatibility**  
1. **Pre-Deployment Check**: Implement a "Compatibility Gate" that compares the incoming code/schema version against the current table state before an UPDATE or ALTER is executed.  
2. **Logic**: Define the behavior for handling breaking changes vs. additive changes (e.g., fail the pipeline if a column is dropped).

• **Pillar 3: Automated Rollback & Recovery**  
1. **Recovery Script**: Design a PySpark/SQL script that utilizes Delta Time Travel (VERSION AS OF or TIMESTAMP AS OF) to restore a table to its last known healthy state if a post-load Data Quality (DQ) check fails.

• **Pillar 4: Maintenance & Performance Monitoring**  
1. **Health Metrics**: Provide logic to identify "Sudden File Growth" or "Small File Fragmentation" (high file count vs. low data volume).  
2. **Self-Healing**: Trigger VACUUM or OPTIMIZE operations automatically based on these metrics to maintain storage efficiency.

**Output Format**

1. **Audit Trail Script**:  
(SQL/PySpark logic for capturing and storing DESCRIBE HISTORY)

2. **Schema Compatibility Function**:  
(Code to validate incoming schema against the target)

3. **Automated Rollback Logic**:  
(A "Restore-on-Failure" script for Azure DevOps integration)

4. **Performance Maintenance Query**:  
(A monitoring script for file fragmentation and vacuuming)

5. **Azure DevOps Pipeline Snippet**:  
(YAML logic showing where these checks fit into the CI/CD flow)
