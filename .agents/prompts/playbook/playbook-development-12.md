---
name: playbook-development-12
title: "Create ingestion control tables (watermark table, audit table, status table)"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "databricks", "sql-server", "lakehouse"]
description: "It will provide a single, executable SQL code block containing DDL statements to create three control tables (Control_Watermark, Control_Audit_Log, and Control_Batch_Status), utilizing platform-specific syntax for identity columns, indexes, and unique constraints, alongside explanatory inline comments and a sample INSERT statement for initializing a new high-water mark record."
---

# Create ingestion control tables (watermark table, audit table, status table)

Act as a **Senior Data Engineer / Database Architect** tasked with the design and writing of the DDL (Data Definition Language) scripts for a robust **Ingestion Control Framework**.

**Context to Provide** (Please fill in these details):
• **Target Database Platform**: {e.g., Azure SQL / Snowflake / Databricks Delta / PostgreSQL / Oracle}
• **Schema Name**: {e.g., ctl / meta / config}
• **Identity Column Logic**: {e.g., IDENTITY(1,1) / AUTOINCREMENT / SEQUENCE / UUID}
• **Date Function**: {e.g., GETUTCDATE() / CURRENT_TIMESTAMP / SYSDATE}

**Requirements**:
Please create the SQL CREATE TABLE statements for the following three control tables, adhering to best practices for naming conventions, data types, and indexing for the Target Database Platform listed above.

• **Watermark Table (Control_Watermark)**:
  1. **Purpose**: To store the high-water mark logic for incremental data loading.
  2. **Required Columns**: SourceSystem, TableName, WatermarkColumnName, WatermarkValue (support for both Date and Int types), and LastUpdated.
  3. **Constraint**: Ensure (SourceSystem, TableName) is unique.
• **Audit Table (Control_Audit_Log)**:
  1. **Purpose**: To log the execution history of data pipelines for monitoring and debugging.
  2. **Required Columns**: ExecutionID (Unique Run ID), PipelineName, SourceTableName, TargetTableName, StartTime, EndTime, DurationSeconds, Status (Success/Fail), RowsRead, RowsWritten, and ErrorMessage (nullable).
  3. **Indexing**: Suggest an index for fast querying by PipelineName and StartTime.
• **Status/Queue Table (Control_Batch_Status)**:
  1. **Purpose**: To track the active state of specific files or batches currently moving through the system.
  2. **Required Columns**: BatchID, FileName (or ObjectName), CurrentProcessingStage (e.g., 'Raw', 'Curated'), Status (e.g., 'Pending', 'Processing', 'Failed'), RetryCount, CreatedDate, and UpdatedDate.

**Output Format**:
• Provide a single SQL block formatted for easy execution.
• Include comments explaining the purpose of specific columns.
• Include a standard INSERT statement example for initializing a row in the Watermark table.
