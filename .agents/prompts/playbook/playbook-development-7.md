---
name: playbook-development-7
title: "Implement logging & audit activities (start time, end time, counts, status)"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "fabric", "synapse", "databricks", "pyspark", "data-factory", "etl"]
description: "Agent provides a production-grade, platform-agnostic logging framework designed to standardize telemetry across Databricks, Fabric, Synapse, and ADF. It delivers the IngestionLogger class, which serializes notebook metadata into structured JSON strings for automatic capture by Azure Monitor and Log Analytics. By abstracting the logging lifecycle into start(), end_success(), and end_failure() methods, this utility ensures high developer experience (DX) while protecting Spark performance through optimized row-counting logic and native exception re-raising."
---

# Implement logging & audit activities (start time, end time, counts, status)

**Role**:
You are a Principal Data Engineer responsible for designing high-performance, platform-agnostic data engineering frameworks and developer utilities.

**Task**:
Generate a highly abstracted, plug-and-play Python logging utility for Spark-based ingestion notebooks, along with a minimalist notebook template demonstrating its usage.

**Context**:
We need a standardized logging framework to improve the developer experience (DX) and maintain high performance. The framework must abstract away logging complexity without degrading Spark performance. Logs must be written as structured JSON to standard output (using Python's logging module), which native Azure telemetry (Log Analytics / App Insights) can automatically capture.

**Notebook Name:** {Add Notebook Name, e.g., load_dim_customer}
**Source Path:** {Add Source Path, e.g., /raw/sales/data.csv}
**Target Table:** {Add Target Table, e.g., gold.dim_customer}
**Environment:** {Add Environment, e.g., dev | test | prod}
**Pipeline Run ID:** {Add Pipeline Run ID}

**Instructions**:
Provide the COMPLETE, copy-pasteable PySpark code. Do not use conversational filler. Output code in structured markdown blocks. The solution MUST be 100% platform-agnostic (ADF, Fabric, Synapse, Databricks).

**Requirements**:
1. The Logging Utility Class (IngestionLogger):
• Generate a robust Python class using standard logging and json modules.
• Implement __init__(notebook_name, source_path, target_table, environment, pipeline_run_id) to initialize the logger, store context, and configure the Python logging module to output JSON strings.
• Implement start() to immediately log a structured JSON message with executionStatus = 'STARTED' and the UTC start time.
• Implement end_success(rows_written=None, target_df=None, dq_error_count=0, bad_record_count=0) to set status to 'COMPLETED' and log the UTC end time.
• CRITICAL PERFORMANCE RULE: end_success must accept either an integer rows_written OR a target_df. If target_df is passed, it must safely calculate .count(), but include inline comments warning the developer about Spark DAG re-computation if the DF is not cached.
• Implement end_failure(exception_object) to accept the Python exception object, extract the error type, message, and stacktrace. Log a structured JSON message with executionStatus = 'FAILED' and the UTC end time. It MUST explicitly RE-RAISE the exception so the orchestrator (ADF/Fabric) fails the activity.

2. The Notebook Template (Usage Guide):
• Generate a clean PySpark notebook template demonstrating how a developer uses this utility.
• Cell 1: Parameter Initialization (Dynamic platform agnostic code to get pipeline_run_id, env, source, target).
• Cell 2: Initialization and Start (Instantiate IngestionLogger and call start()).
• Cell 3: Core Logic Wrapped in Try/Except (Developer ingestion logic).
• Cell 4: End Success (Passing integer to avoid DAG re-compute or target_df).
• Cell 5: End Failure (Call end_failure(e)).

**Output Format**: 
Format everything in Markdown

The complete IngestionLogger utility class Python code block
The minimalist Notebook Template Python code block
