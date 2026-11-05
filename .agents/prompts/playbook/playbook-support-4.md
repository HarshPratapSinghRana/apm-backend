---
name: playbook-support-4
title: "Ensure compatibility for downstream semantic model consumption (Power BI)"
type: prompt
category: "Prompt Playbook"
subcategory: "Support & Maintenance"
stage: "Support"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "support", "power-bi", "pyspark", "sql-server", "lakehouse", "data-profiling", "etl"]
description: "Agent provides a PySpark framework for safely updating Delta tables while maintaining compatibility with downstream Power BI semantic models. The solution performs a semantic schema comparison between the incoming DataFrame and the existing table (published contract). If a column used by Power BI is renamed or dropped, the update is blocked to prevent report failures.  The framework also captures Delta Lake commit information to map table versions with Power BI refresh cycles, ensuring traceability between data updates and BI reports.  A compatibility score is calculated during validation. If the score is 100%, the update proceeds; if it is below 100%, the data is quarantined and an alert is sent to the BI team. The system also supports rollback using Delta RESTORE and maintains metadata auditing through Spark SQL."
---

# Ensure compatibility for downstream semantic model consumption (Power BI)

**Role**:
You are a Lead Data Engineer and Power BI Architect specializing in the intersection of Delta Lake storage and Power BI Semantic Modeling. You have deep expertise in maintaining "Data Contracts" to ensure that upstream pipeline changes never break downstream dashboards or report visualizations.

**Context & Vision**  
The goal is to implement a PySpark framework to update Delta tables while ensuring zero-downtime and compatibility for downstream Power BI semantic models. We need to move beyond simple data loading by treating the table schema as a "Published Contract." Any change that would break a Power BI measure or relationship (such as dropping or renaming a column) must be intercepted before the Delta table is committed.

**Project Configuration (Variables)**  
• **Target Delta Table**: <Insert Table Name>  
• **Power BI Workspace**: <Insert Workspace Name/ID>  
• **Semantic Model (Dataset)**: <Insert Model Name>  
• **Compatibility Threshold**: 100% (Strict Mode)  
• **Rollback Strategy**: Delta Lake RESTORE  

**Requirements & Constraints**

• **Pillar 1: Semantic Contract Validation**  
1. **Schema Comparison**: Compare the incoming DataFrame schema against the "Published Contract" (the current Delta table schema used by Power BI).  
2. **Breaking Change Logic**: If a column required by Power BI is renamed or dropped, the update must be blocked immediately.  
3. **Additive Changes**: Allow new columns to be added as they do not break existing Power BI models (Schema Evolution).

• **Pillar 2: Versioning & Lineage**  
1. **Commit Tracking**: Capture commit_info from Delta Lake (DESCRIBE HISTORY) to explicitly map which Delta version corresponds to a specific Power BI report refresh.  
2. **Audit Trail**: Log these version mappings into a **bi_sync_audit** metadata table for end-to-end traceability.

• **Pillar 3: Monitoring & Quality Gates**  
1. **Compatibility Score**: Implement a function to calculate a "Compatibility Score."  
2. **Decision Logic**:  
   • If **100%**: Proceed with the MERGE or OVERWRITE.  
   • If **<100%**: Quarantine the data and trigger an automated alert to the BI/Reporting team.

• **Pillar 4: Zero-Downtime & Recovery**  
1. **Idempotency**: Use Delta Lake RESTORE to provide an instant rollback mechanism if post-load validation fails.  
2. **Metadata Auditing**: Use Spark SQL to perform all metadata and history checks for high performance.

**Output Format**

1. **Contract Validation Script**:  
(PySpark logic to compare schemas and identify breaking changes)

2. **Compatibility Scoring Engine**:  
(Function to calculate the % score and determine the "Go/No-Go" status)

3. **Delta Versioning & Sync Logic**:  
(Code to log Delta history and map it to BI refresh cycles)

4. **Rollback & Recovery Script**:  
(A pre-configured RESTORE command for emergency intervention)

5. **Alerting Template**:  
(Sample log entry or notification format for the BI team when schema drift or compatibility issues are detected)
