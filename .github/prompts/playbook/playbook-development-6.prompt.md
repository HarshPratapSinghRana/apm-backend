---
name: playbook-development-6
description: "Agent provides a production-hardened, unified ingestion framework designed for scalability and idempotency across Azure Databricks, Fabric, and Synapse. It deli"
---

**Role**:
You are a Principal Azure Data Engineer responsible for designing secure, enterprise-grade, metadata-driven ingestion frameworks across Azure Data Factory (ADF), Microsoft Fabric, Azure Synapse Analytics, and Databricks.

**Task**:
Generate a complete, production-ready, metadata-driven ingestion framework supporting FULL and INCREMENTAL loads utilizing dynamic parameters, a metadata control table, and scalable PySpark logic.

**Context**:
We need to build a reusable, 100% parameterized ingestion engine that handles both database tables and raw files, automatically manages watermarks, and dynamically routes data into partitioned data lake directories without any hardcoded values.

**Source Type:** {Add Source Type, e.g., Table | File}
**Source Name / File Details:** {Add Source Name, e.g., schema.table OR /raw/source_system/file.csv}
**Target Table Name:** {Add Target Table Name}
**Load Type:** {Add Load Type, e.g., FULL | INCREMENTAL}
**Watermark Column:** {Add Watermark Column, e.g., ModifiedDate, CreatedDate, ID}
**Incremental Granularity:** {Add Granularity, e.g., DAY | MONTH | ID | CUSTOM}
**Custom Filter:** {Add Custom Filter (Optional)}
**Partition Column:** {Add Partition Column, e.g., YearMonth, EventDate}
**Target Base Path:** {Add Target Base Path}
**File Format:** {Add File Format, e.g., parquet | delta | csv}

**Instructions**:
Create a complete, production-ready implementation. Do not use conversational filler or introductory fluff. Provide COMPLETE, copy-pasteable PySpark notebook code and FULL SQL scripts (no snippets). Every solution must be 100% parameterized with zero hardcoded values.

**Requirements**:
1. SQL DDL for Metadata Control Table:
• Provide the complete SQL DDL for a scalable control table supporting multiple sources.
• Required Columns: SourceType, SourceName, TargetTableName, WatermarkColumn, PartitionColumn, IncrementalGranularity, LastWatermarkValue, MaxWatermarkInLastRun, LoadType, LastRunStatus, LastRunStartTime, LastRunEndTime, IsActive.
• Include the complete SQL Stored Procedure to update this table (On Success / On Failure).

2. Dynamic Path, Partitioning, and File Naming Logic:
• The target folder structure MUST auto-adjust based on the incremental granularity and the requested partition column.
• For DAY Incremental: /base_path/<source>/<table>/<partition_column_value>/<year>/<month>/<day>/
• For MONTH Incremental: /base_path/<source>/<table>/<partition_column_value>/<year>/<month>/
• Define the File Name Format exactly as: <Source>_<Table>_<LoadType>_<PartitionColumnValue>_<yyyyMMddHHmmss>.<format>
• Provide the exact string interpolation and expressions to generate these paths and filenames for ADF/Synapse/Fabric Pipelines (Dynamic Content Expressions) and Databricks (PySpark).

3. COMPLETE PySpark Implementation (The Core Engine):
• Generate the FULL, production-grade PySpark code (Databricks/Fabric compatible).
• The code MUST explicitly read all parameters using dbutils.widgets.
• The code MUST read the Control Table to fetch the LastWatermarkValue.
• The code MUST dynamically read from the source handling the Source Type parameter (Table vs File).
• Apply the Incremental Logic based on Granularity (DAY: filter col > last_watermark, MONTH: trunc date comparison, ID: filter col > last_watermark, CUSTOM: apply custom filter).
• Extract the MAX watermark from the newly read dataframe.
• Write the data to the target explicitly using .partitionBy(Partition Column) and save using the dynamically generated File Name and Path.
• Wrap the entire process in a robust Try/Catch block. If successful, write back to the Control Table with the new MAX watermark. If failed, log the error, update Control Table status to FAILED, and raise the exception.

4. ADF / Fabric / Synapse Orchestration:
• Provide the exact dynamic expressions needed inside the pipeline activities.
• Provide the Lookup Activity query to fetch control table metadata.
• Provide the exact syntax for passing all parameters to the Notebook Activity.
• Provide the On-Failure path logic.

**Output Format**: 
Format everything in Markdown

SQL DDL and Stored Procedure complete code blocks
Dynamic Path and File Naming Expressions (ADF and PySpark)
Complete PySpark Implementation (The Core Engine) code block
ADF/Fabric/Synapse Orchestration dynamic expressions
