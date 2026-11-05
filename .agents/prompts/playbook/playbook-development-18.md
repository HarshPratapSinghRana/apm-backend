---
name: playbook-development-18
title: "Implement bronze → silver cleansing & standardization logic"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "fabric", "synapse", "databricks", "pyspark", "sql-server", "lakehouse", "etl"]
description: "Agent provides a production-hardened PySpark framework designed to promote data from the Bronze to Silver layer using an idempotent UPSERT (MERGE) strategy. Following strict organizational coding standards, the script encapsulates cleansing, type-standardization, and window-based deduplication into modular, testable Python functions. By utilizing the DeltaTable API, the framework ensures that historical records in the Silver layer are updated with the latest state (SCD Type 1) while maintaining a strict schema and appending necessary audit metadata."
---

# Implement bronze → silver cleansing & standardization logic

**Role**:
You are a Principal Data Engineer responsible for designing modular, scalable, and production-ready data transformation pipelines across Azure Databricks, Azure Synapse, and Microsoft Fabric.

**Task**:
Generate a production-ready, highly modular PySpark script for a "Bronze to Silver" ETL pipeline that performs robust MERGE (Upsert) operations and strictly adheres to organizational coding standards.

**Context**:
We need a standardized, modular PySpark codebase to cleanse, standardize, deduplicate, and merge incremental data from the Bronze layer into the Silver layer Delta tables.

**Organization Coding Standards:** {Add Coding Standards, e.g., PEP8, use modular Python functions with Google-style docstrings, prefix DataFrames with df_, use PySpark native functions}
**Source Bronze Details:** {Add Source Details, e.g., Table: default.bronze_sales, Watermark Column: _bronze_ingestion_timestamp}
**Target Silver Details:** {Add Target Details, e.g., Table: default.silver_sales, Primary Key(s): ['TransactionID', 'StoreCode'], Partition By: 'sales_month'}
**Required Transformations & Cleansing:** {Add Transformations, e.g., Deduplicate by keeping the latest record based on UpdatedDate. Trim whitespace from string columns. Cast OrderDate to DateType.}
**End Product Requirements:** {Add Requirements, e.g., Implement SCD Type 1 (Overwrite existing records). Ensure the final schema exactly matches the target table.}

**Instructions**:
Provide the COMPLETE, copy-pasteable PySpark notebook code. Do not use conversational filler. Output code in structured markdown blocks. The code MUST strictly adhere to the Organization Coding Standards provided. The pipeline MUST perform a robust MERGE (Upsert) operation using the PySpark DeltaTable API.

**Requirements**:

• Modular Design (Coding Standards Enforcement):
1. Generate the script using a modular design. Do not write one long procedural block.
2. Create distinct Python functions for each logical step with appropriate docstrings.
3. Function 1: read_bronze_data(...) to read the incremental Bronze data.
4. Function 2: apply_cleansing(...) to handle generic cleansing (e.g., whitespace trimming, null handling).
5. Function 3: apply_business_rules(...) to handle the specific standardization and type casting defined in Required Transformations.
6. Function 4: deduplicate_records(...) using PySpark Window functions to select the latest record per Primary Key.

• Cleansing and Standardization Logic:
1. Implement the logic defined in Required Transformations strictly using pyspark.sql.functions (e.g., F.trim(), F.coalesce(), F.upper()).
2. Append a mandatory _silver_processing_timestamp column to track when the record was promoted.

• Silver Layer MERGE (Upsert) Logic:
1. Implement the target load using the DeltaTable.forName() or DeltaTable.forPath() API.
2. Construct the dynamic merge condition using the Primary Key(s) defined in Target Silver Details.
3. Implement the Upsert logic based on the End Product Requirements (e.g., .whenMatchedUpdateAll() and .whenNotMatchedInsertAll()).
4. Include schema evolution logic (mergeSchema) if required by the context.

**Output Format**: 
Format everything in Markdown

Exactly ONE complete Python script code block containing all the modular functions and the main execution block (if __name__ == "__main__": or sequential execution flow) that ties them together, including comprehensive inline comments and error handling
