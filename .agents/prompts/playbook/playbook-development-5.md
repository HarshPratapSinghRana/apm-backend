---
name: playbook-development-5
title: "Implement dynamic file naming logic"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "fabric", "synapse", "databricks", "pyspark", "data-factory", "sql-server", "lakehouse", "etl"]
description: "Metadata-Driven Enterprise Ingestion Framework This agent provides a production-hardened, unified ingestion framework designed for scalability and idempotency across Azure Databricks, Fabric, and Synapse. It delivers a centralized Metadata Control Table."
---

# Implement dynamic file naming logic

Act as a Principal Azure Data Engineer. Your task is to generate a complete, production-ready, metadata-driven ingestion framework supporting FULL and INCREMENTAL loads across Azure Data Factory (ADF), Microsoft Fabric, Azure Synapse, and Databricks (PySpark).
 
STRICT EXECUTION RULES:
1. NO SNIPPETS. Provide the COMPLETE, copy-pasteable PySpark notebook code and FULL SQL scripts. 
2. No conversational filler or introductory fluff. Output code in structured markdown blocks.
3. Every solution must be 100% parameterized with zero hardcoded values.
 
 1. Mandatory Parameters
The framework (Pipelines & PySpark) must accept and utilize the following parameters dynamically:
• p_source_type (Table | File) — Indicates whether the source is a database table or a raw file.
• p_source_name / p_source_file_details (string) — Example: schema.table OR /raw/source_system/file.csv
• p_target_table_name (string) — Name of the target table where the data will be loaded.
• p_load_type (FULL | INCREMENTAL) — Defines whether the pipeline performs a full load or incremental load.
• p_watermark_column (string) — Column used to track incremental changes (e.g., ModifiedDate, CreatedDate, ID).
• p_incremental_granularity (DAY | MONTH | ID | CUSTOM) — Determines incremental processing logic.
• p_custom_filter (string, optional) — Custom filtering condition when CUSTOM incremental logic is used.
• p_partition_column (string) — MUST be used to partition the data at the destination (e.g., YearMonth, EventDate).
• p_target_base_path (string) — Base path where the processed data will be stored.
• p_file_format (parquet | delta | csv) — Specifies the output file format for the target dataset.
2. SQL DDL: Metadata Control Table
Provide the COMPLETE SQL DDL for a scalable control table supporting multiple sources.
Columns: SourceType, SourceName, TargetTableName, WatermarkColumn, PartitionColumn, IncrementalGranularity, LastWatermarkValue, MaxWatermarkInLastRun, LoadType, LastRunStatus, LastRunStartTime, LastRunEndTime, IsActive.
- Include the complete SQL Stored Procedure to update this table (On Success / On Failure).
 
 3. Dynamic Path, Partitioning & File Naming Logic
The target folder structure MUST auto-adjust based on the incremental granularity and the requested partition column. 
- DAY Incremental: `/base_path/<source>/<table>/<partition_column_value>/<year>/<month>/<day>/`
- MONTH Incremental: `/base_path/<source>/<table>/<partition_column_value>/<year>/<month>/`
 
File Name Format: `<Source>_<Table>_<LoadType>_<PartitionColumnValue>_<yyyyMMddHHmmss>.<format>`
 
Provide the exact string interpolation/expressions to generate these paths and filenames for:
1. ADF / Synapse / Fabric Pipelines (Dynamic Content Expressions)
2. Databricks (PySpark)
 
 4. COMPLETE PySpark Implementation (The Core Engine)
Generate the FULL, production-grade PySpark code (Databricks/Fabric compatible). 
The PySpark code MUST explicitly execute the following:
1. Read parameters (using dbutils.widgets).
2. Read the Control Table to fetch the LastWatermarkValue.
3. Dynamically read from the source (handle `p_source_type` = Table vs File).
4. Apply the Incremental Logic:
   - DAY: `filter(col(watermark) > last_watermark)`
   - MONTH: trunc date comparison
   - ID: `filter(col(watermark) > last_watermark)`
   - CUSTOM: apply `p_custom_filter`
5. Extract the MAX watermark from the newly read dataframe.
6. Write the data to the target:
   - MUST explicitly use `.partitionBy(p_partition_column)`.
   - MUST save the file using the dynamically generated File Name and Path from Section 3.
7. Wrap in robust Try/Catch block. If successful, write back to the Control Table with the new MAX watermark. If failed, log the error, update Control Table status to 'FAILED', and raise the exception.
  5. ADF / Fabric / Synapse Orchestration
Provide the exact dynamic expressions needed inside the pipeline activities:
1. Lookup Activity: Query to fetch control table metadata.
2. Notebook Activity: Passing all parameters to the PySpark notebook.
3. On-Failure path logic.
