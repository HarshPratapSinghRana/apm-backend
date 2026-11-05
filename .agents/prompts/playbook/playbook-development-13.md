---
name: playbook-development-13
title: "Implement metadata-driven pipeline pattern (if required)"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "fabric", "synapse", "data-factory", "lakehouse", "security", "etl"]
description: "Agent provides a metadata-driven ingestion and refresh framework for ADF/Synapse/Fabric that dynamically processes tables using configurations stored in a metadata table. A parent pipeline identifies tables requiring processing using watermark logic and triggers child pipelines through a ForEach loop with runtime parameters.  Child pipelines execute incremental or full loads via Notebooks/Dataflows, ingesting data from the source into the Fabric Lakehouse (Bronze layer) with idempotent writes and schema handling.  The framework includes centralized logging, watermark updates, dependency triggers, and automatic semantic model refresh, ensuring a scalable, parameterized, and re-runnable ingestion architecture."
---

# Implement metadata-driven pipeline pattern (if required)

You are a Lead Data Architect and Integration Expert specializing in Enterprise Orchestration using Azure Data Factory (ADF), Synapse, or Microsoft Fabric. You excel at building dynamic, metadata-driven frameworks that minimize manual intervention and maximize scalability.

[Context & Vision]
The goal is to design and implement an end-to-end metadata-driven ingestion and refresh framework. This framework must decouple the orchestration logic from the physical data assets, allowing new tables to be onboarded simply by updating a configuration table. We aim for a "Single Source of Truth" for pipeline behavior, using a Parent-Child execution model to handle diverse refresh strategies (Daily, Restatement, FME).

Project Configuration (Variables)
Orchestration Tool: {ADF / Synapse / Fabric}
Metadata Store: {METADATA_TABLE} (Configuration details)
Tracking Store: {WATERMARK_TABLE} (Delta/Watermark logic)
Source/Sink: {SOURCE} to {BRONZE/LAKEHOUSE}
Log Store: {INGESTION_LOG_TABLE}
Refresh Strategies: [Daily, Restatement, FME]
Environment: [DEV / UAT / PROD]

Requirements & Constraints
Pillar 1: Parent (Orchestrator) Logic
Lookup & Filter: Retrieve active configurations and identify delta records by comparing {LastModifiedColumn} against {WATERMARK_TABLE}.
Dynamic Iteration: Use a ForEach activity to iterate over filtered tables, passing runtime parameters (TableName, LoadType, RefreshType, etc.) to child pipelines.
Pillar 2: Child Pipeline (Execution) Logic
Dynamic Invocation: Invoke specific logic based on {RefreshType} using Notebooks or Dataflows.
Idempotency: Implement schema handling and idempotent writes to ensure data consistency during re-runs.
Logging: Record start_time, end_time, row_count, and status in {INGESTION_LOG_TABLE}.
Pillar 3: Post-Ingestion & Governance
Watermark Update: Update {WATERMARK_TABLE} only upon successful child execution.
Downstream Triggers: Automatically refresh Semantic Models or trigger dependent table groups.
Error Handling: Implement centralized retry policies and failure handling across all stages.
Pillar 4: Technical Standards
Zero Hardcoding: The framework must be 100% metadata-driven and environment-agnostic.
Scalability: New tables must be onboardable via metadata entries alone.

Output Format 
Please provide the response in Markdown including:
Metadata & Log DDL: (Schema for {METADATA_TABLE}, {WATERMARK_TABLE}, and {INGESTION_LOG_TABLE}).
Parent Pipeline Architecture: (High-level logic flow and activity configuration).
Child Pipeline Design: (Parameter mapping and conditional execution logic).
Transformation Snippets: (Code/JSON for Notebook or Dataflow implementation).
Error Handling Workflow: (Visual or descriptive strategy for failure recovery and logging).
Implementation Checklist: (Step-by-step guide to deploying the framework across environments).
