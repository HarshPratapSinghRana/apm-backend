---
name: playbook-development-10
title: "Implement dependency checks (file arrival, upstream completion, control tables)"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "fabric", "synapse", "databricks", "pyspark", "data-factory", "etl"]
description: "Agent provides a production-grade gating framework designed to prevent \"phantom executions\" in downstream pipelines. It delivers a dual-layered validation strategy: a DependencySniffer PySpark class for complex polling logic and an equivalent ADF/Fabric Orchestrator pattern for native UI-driven workflows. By synchronizing upstream metadata status with physical file arrival, this framework ensures that your ingestion pipelines only trigger when data is both logically complete and physically present."
---

# Implement dependency checks (file arrival, upstream completion, control tables)

**Role**:
You are a Principal Data Engineer responsible for robust data orchestration, dependency management, and file arrival polling architectures across Azure Data Factory (ADF), Microsoft Fabric, Azure Synapse, and Azure Databricks.

**Task**:
Generate a robust "Dependency Check & File Sniffer" framework that handles file arrival polling and upstream control table validation to ensure downstream pipelines do not execute prematurely.

**Context**:
We need a gating mechanism that halts pipeline execution until two exact conditions are met: the upstream control table confirms the upstream dependency has successfully completed today, and the expected files have physically arrived in the target location.

**Source Data Location:** {Add Source Path, e.g., abfss://landing@myaccount.dfs.core.windows.net/sales/inbound/}
**Expected File Pattern:** {Add File Pattern, e.g., sales_daily_*.parquet}
**Check Modification Date?:** {Add YES or NO, e.g., YES - files must be modified today}
**Max Wait Time (Timeout SLA):** {Add Timeout SLA in Minutes, e.g., 60}
**Upstream Control Table:** {Add Control Table, e.g., audit.pipeline_runs}
**Upstream Job Name:** {Add Upstream Job, e.g., SAP_Daily_Extract}

**Instructions**:
Provide the COMPLETE, copy-pasteable PySpark notebook code and pipeline expressions. Do not use conversational filler. Output code in structured markdown blocks. The PySpark solution MUST handle polling (waiting for files) with configurable timeouts and sleep intervals.

**Requirements**:
1. The Goal: File Arrival and Upstream Sniffer:
• Create a robust gating mechanism that halts pipeline execution until both conditions are met.
• Condition 1: The Upstream Control Table confirms the upstream dependency (Upstream Job Name) has successfully completed today.
• Condition 2: The expected files matching the Expected File Pattern have physically arrived in the Source Data Location (and, if requested, were modified today).

2. The PySpark Sniffer Utility (DependencySniffer):
• Generate a complete Python class (compatible with Databricks/Fabric/Synapse).
• Implement __init__(...) to accept the user context parameters dynamically.
• Implement check_upstream_status() to query the control table. If the upstream job status is not 'COMPLETED' for the current date, raise a DependencyNotMetError.
• Implement poll_for_files(polling_interval_sec=60) using dbutils.fs (or mssparkutils.fs dynamically) to list files in the source directory.
• The poller must loop and check if files matching the pattern exist.
• If Check Modification Date is YES, filter out files older than today's date.
• Sleep and retry until the files arrive OR the Max Wait Time SLA is exceeded.
• If it times out, explicitly raise a TimeoutError to fail the orchestrator pipeline.
• Implement execute_checks() to run both the upstream check and the file poller.

3. Native ADF / Fabric Pipeline Equivalent (The Orchestrator Approach):
• Provide the exact configuration and dynamic content expressions for ADF and Fabric Pipelines using native UI activities.
• Define a Validation Activity or Get Metadata + Until Loop pattern to sniff the exact Source Data Location and File Pattern.
• Define a Lookup Activity query to check the Control Table status.

**Output Format**: 
Format everything in Markdown

The complete DependencySniffer PySpark class and execution cell utilizing the User Context variables code block
The exact UI configuration steps and dynamic expressions for the ADF/Fabric pipeline equivalent code block
