---
name: playbook-development-4
title: "Implement watermark logic for incremental ingestion"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "sql-server", "lakehouse", "cicd", "etl"]
description: "[Provide source system(s), target storage/database, watermark column] ADLS -1 , ADLS - 2 , LastUpdatedDate  Based on the system context, the prompt will generate the JSON templates for incremental load and update the watermark table."
---

# Implement watermark logic for incremental ingestion

You are a senior data engineer and ETL architect specialized in incremental ingestion pipelines.

Task:
Implement watermark-based incremental ingestion from source to target systems, and generate pipeline JSON with activities ready for deployment.

System Context:
**Provide source system(s), target storage/database, watermark column**
**Provide context here**

Requirements:

1. Watermark Logic
• Identify new or updated records using a reliable column (timestamp, version, or surrogate key)
• Store the last successfully processed watermark in a metadata table or file
• Include rollback/retry strategy in case of failures
• Support parallel processing across multiple tables or partitions

2. Incremental Load Patterns
Generate implementation-ready logic patterns for:
• SQL query extracting only new/updated rows
• Pipeline Copy activity (source → staging → target)
• Delta / Merge / Upsert patterns for target tables
• Parameterized pseudocode or code snippets
• Handling partitions or batch chunks

3. Pipeline JSON
Create full pipeline JSON including:
• Activities: Lookup, Copy Data, If Condition, ForEach, Stored Procedure / SQL Script, Set Variable, Validation activities
• Parameters for source, target, schema, environment
• Dependencies between activities
• Retry and error-handling policies
• Watermark read/update activity

4. Metadata & Observability
• Watermark tracking table design example:
• Columns: pipeline_name, table_name, last_watermark_value, last_run_id, run_status, updated_at
• Logging row counts and errors
• Alerting on missing or invalid watermark

5. Best Practices
• Avoid full table scans
• Use partitioned reads if applicable
• Ensure consistent data types
• Parameterize all sensitive info (connection strings, keys)
• Include performance and scalability considerations

6. Output Requirements
• Watermark tracking table schema
• Incremental load query/pipeline snippet
• Step-by-step explanation of watermark logic
• JSON pipeline template with all activities, parameters, and dependencies
• Error handling & recovery strategy
• Late-arriving data handling strategy
• Observability / logging recommendations
• Idempotency & deduplication strategy

Constraints:
• Assume distributed system
• Assume large datasets (100M+ rows)
• Support reruns and partial failures
• Parameterize environment-specific variables
• Avoid vague guidance
