---
name: playbook-development-31
title: "Implement Databricks job orchestration (jobs, multi-task workflows)"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "fabric", "synapse", "databricks", "data-factory", "lakehouse"]
description: "Databricks Multi-Task Workflow & Orchestration Suite This agent provides a production-hardened configuration for automating enterprise data pipelines using the Databricks Jobs API 2.1. It delivers a modular, cost-efficient JSON payload that utilizes a shared Job Cluster to reduce startup latency and compute overhead while enforcing strict DAG (Directed Acyclic Graph) dependencies. Furthermore, the agent provides the necessary integration logic for external orchestrators and a comprehensive Operational Runbook, enabling L1/L2 support teams to perform \"Repair Runs\" that resume failed workflows from the point of failure without redundant compute costs."
---

# Implement Databricks job orchestration (jobs, multi-task workflows)

Act as a Principal Cloud Data Architect. Generate a complete, production-ready Databricks Multi-Task Workflow configuration (Jobs API 2.1+ JSON format), along with an Operational Runbook for error handling and the rerun framework.

STRICT EXECUTION RULES:
- NO SNIPPETS. Provide the COMPLETE, copy-pasteable JSON configuration.
- No conversational filler. Output configurations and runbook in structured markdown blocks.
- The JSON payload MUST use the modern `tasks` array format with `depends_on` for task dependencies.
- Incorporate explicit retry policies, timeouts, and alerting configurations.

**USER CONTEXT & SCOPE - READ THIS FIRST**
- Job Name: <ENTER_JOB_NAME e.g., Daily_Sales_Ingestion_Pipeline>
- Compute Strategy: <ENTER_COMPUTE e.g., Use a shared Job Cluster (Standard_DS3_v2, autoscale 2-8 nodes) for all tasks to save costs>
- Workflow Tasks & Dependencies: <ENTER_TASKS e.g., 1. raw_to_bronze, 2. bronze_to_silver (depends on 1), 3. silver_to_gold (depends on 2), 4. data_quality_check (depends on 3)>
- Alerting Destination: <ENTER_ALERTS e.g., Email alerts to data-ops@mycompany.com on Failure and Timeout>
- External Orchestrator: <ENTER_ORCHESTRATOR e.g., Triggered by ADF via Linked Service>

1. Databricks Multi-Task Workflow Configuration (JSON)
Generate the complete JSON payload required to create this job via the Databricks REST API or Terraform.
- Define the `job_clusters` array based on the `Compute Strategy` to share a single automated cluster across all tasks.
- Define the `tasks` array based on the `Workflow Tasks & Dependencies`.
- For each task, include:
  - `notebook_task` with a parameterized path.
  - `depends_on` to establish the DAG.
  - `max_retries`: Set to 1 for transient failures, with a `min_retry_interval_millis`.
  - `timeout_seconds`: To prevent runaway compute costs.
- Define `email_notifications` or `webhook_notifications` at the Job level for failures.
 2. The External Orchestrator Integration (ADF / Fabric / Synapse)
Provide the exact dynamic configuration needed for the external orchestrator to trigger this specific Databricks workflow.
- If the `External Orchestrator` is ADF or Synapse, provide the JSON configuration for the "Web Activity" (using Jobs API `/api/2.1/jobs/run-now`) OR the native "Databricks Job Activity".
- Explain how the orchestrator should capture the `run_id` and poll for the workflow status.

 3. Operational Runbook: Error Handling & Rerun Framework
Generate a Markdown-formatted standard operating procedure (SOP) for the L1/L2 support team.
- **Failure Identification:** How to read the Databricks job UI and identify which specific task failed in the DAG.
- **The Rerun Strategy (Repair Run):** Step-by-step instructions (and the API `/api/2.1/jobs/runs/repair` JSON payload) on how to restart ONLY the failed task and its downstream dependents without reprocessing the successful upstream tasks.
- **State Cleanup:** Instructions on how to manually clean up a Delta table or remove a bad file if a task failed midway through an upsert.

**Deliverables Required**
1. Complete Databricks Job JSON payload.
2. ADF/Fabric trigger activity configuration (JSON or expressions).
3. Markdown Operational Runbook covering failures and the Repair/Rerun framework.
