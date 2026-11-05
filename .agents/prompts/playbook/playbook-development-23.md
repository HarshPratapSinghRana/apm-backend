---
name: playbook-development-23
title: "Implement schema drift/change detection & handling"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "fabric", "synapse", "databricks", "pyspark", "data-factory", "etl"]
description: "Platform-Agnostic Schema Drift & Change Detection Suite This agent provides a production-grade, reusable PySpark utility designed to enforce strict schema governance across distributed data platforms. It delivers the SchemaDriftDetector class, which leverages native Spark StructType serialization to perform deep programmatic diffing of data structures while remaining agnostic to column ordering. By automating the \"First-Run\" baseline creation and subsequent \"Future-Run\" drift analysis, this utility ensures that upstream schema changes are intercepted, logged, or blocked according to your specific organizational drift policies."
---

# Implement schema drift/change detection & handling

Act as a Principal Data Engineer. Generate a production-ready, highly modular PySpark utility class for "Schema Drift and Change Detection". 

STRICT EXECUTION RULES:
- NO SNIPPETS. Provide the COMPLETE, copy-pasteable PySpark code.
- No conversational filler. Output code in structured markdown blocks.
- The utility MUST be highly reusable across all notebooks.
- Do NOT use string matching for schemas; use deep programmatic comparison of Spark `StructField` objects (name and dataType) to ignore column order differences.
- The solution MUST be 100% platform-agnostic (ADF, Fabric, Synapse, Databricks).

 [USER CONTEXT & SCOPE - READ THIS FIRST]
- Metadata Storage Path: <ENTER_METADATA_PATH e.g., abfss://config@lake.dfs.core.windows.net/schemas/>
- Table / Entity Name: <ENTER_TABLE_NAME e.g., source_sales_data>
- Drift Policy: <ENTER_POLICY e.g., FAIL on removed/changed columns. ALLOW and log added columns.>

 1. The Goal: First-Run Storage & Future-Run Comparison
Create a reusable Python class (`SchemaDriftDetector`) that an engineer can invoke in any notebook. 
- **First Run:** If no baseline schema exists for the `Table Name` at the `Metadata Storage Path`, it must extract the schema from the incoming DataFrame, serialize it natively using `StructType.json()`, save it to the storage path, and return a "Baseline Created" status.
- **Future Runs:** It must load the stored JSON, deserialize it back into a PySpark `StructType`, and compare it against the incoming DataFrame's schema.

 2. The Utility Class (`SchemaDriftDetector`)
Generate the robust Python class with the following methods:
- `__init__(df, table_name, metadata_base_path)`: Initializes the detector with the incoming PySpark DataFrame and routing details.
- `_save_schema(schema_struct)`: Saves the `StructType` to the metadata path (abstracting platform-specific file writers using `dbutils.fs.put` or standard Spark write).
- `_load_schema()`: Safely attempts to load the schema from the metadata path. Returns `None` if it doesn't exist.
- `compare_schemas(baseline_schema, current_schema)`: The core diffing engine. It must return three distinct lists:
   1. `added_columns`: Columns in current but not in baseline.
   2. `missing_columns`: Columns in baseline but missing in current.
   3. `changed_columns`: Columns where the name exists in both, but the `dataType` has changed.
- `execute_drift_check()`: The main orchestration method. It handles the First-Run vs Future-Run logic and applies the user's `Drift Policy` (e.g., raising a `SchemaDriftException` if missing/changed columns are detected, or simply printing a warning for added columns).

 3. The Notebook Template (Developer Experience)
Generate a clean, 2-cell PySpark notebook template demonstrating how a developer actually imports and uses this utility in their daily ingestion notebooks.

CELL 1: Setup
 ... load incoming df_raw ...
_table_name = "raw_transactions"
p_metadata_path = "abfss://framework@myworkspace/schema_baselines/"

 CELL 2: Invoke Reusable Drift Check
detector = SchemaDriftDetector(df=df_raw, table_name=p_table_name, metadata_base_path=p_metadata_path)

try:
    drift_report = detector.execute_drift_check()
    print(drift_report)
except Exception as e:
     Fails the pipeline explicitly if the policy is breached
    raise e

 Deliverables Required
Provide exactly two code blocks:
1. The complete `SchemaDriftDetector` utility class, fully commented and ready to be saved as a shared module.
2. The Notebook Template demonstrating how to call it.
