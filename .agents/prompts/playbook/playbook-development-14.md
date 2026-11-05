---
name: playbook-development-14
title: "Implement schema drift handling mechanism (ADF Mapping Data Flow or PySpark)"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "pyspark", "data-factory", "sql-server", "lakehouse", "security", "etl"]
description: "Agent provides a schema-drift–tolerant ingestion design using Azure Data Factory Mapping Data Flow to ensure pipelines continue running even when the source schema changes. The solution enables Allow Schema Drift in the source and sink transformations, with Auto-mapping to automatically land new columns into the Bronze layer. Optional Infer Drifted Column Types helps detect types for new fields dynamically, while rule-based or pattern-based mappings can be used when stricter control is required.  The pipeline passes dynamic parameters (table name, schema, load type, target path, runId) from the pipeline to the data flow and follows a metadata-driven pattern: Lookup metadata → ForEach table → Execute Data Flow → Log results. The drift strategy ensures new columns are ingested automatically, missing columns are filled with null/defaults, and type changes are handled with safe casting.  All drift events and execution details are logged into an INGESTION_LOG_TABLE (runId, dataset, detected columns, action taken, status, error), enabling monitoring, retries, and alerts while keeping Bronze ingestion resilient and scalable."
---

# Implement schema drift handling mechanism (ADF Mapping Data Flow or PySpark)

You are an Azure Data Factory Architect and Data Integration Specialist specializing in resilient, schema-agnostic ingestion patterns and Mapping Data Flow (MDF) optimization.

[Context & Vision]
The goal is to design and detail an implementation to handle schema drift using ADF Mapping Data Flows for a Bronze landing pipeline. We must ensure that pipelines are "drift-aware"—meaning they do not fail when source schemas change (added/removed columns or type changes). The system must automatically ingest drifted data while maintaining a detailed audit trail of these changes for downstream governance.

Project Configuration (Variables)
Orchestration Tool: Azure Data Factory (Mapping Data Flows)
Source Type: [e.g., SQL Server, SAP, REST, Parquet]
Sink/Destination: [e.g., ADLS Gen2 Delta, Azure SQL]
Metadata Table: [Name of table storing source-to-sink mappings]
Logging Store: INGESTION_LOG_TABLE
Environment: [DEV / UAT / PROD]

Requirements & Constraints
Pillar 1: Data Flow Transformation Settings
Source: Enable Allow Schema Drift. Provide guidance on when to enable Infer drifted column types based on performance vs. accuracy.
Sink: Enable Allow Schema Drift and Auto-mapping. Provide an alternative approach using Rule-based mapping for scenarios where auto-mapping is insufficient.
Dynamic Parameterization: Show how to pass parameters (Table, Schema, Load Type, Target Path, RunId) from the Pipeline to the Data Flow.
Pillar 2: Drift Handling Strategy
New Columns: Logic to land them in Bronze automatically without manual intervention.
Missing Columns: Logic to populate nulls or default values to prevent pipeline breakage.
Type Changes: Define the behavior for safe casting and how to handle incompatible type shifts.
Pillar 3: Pipeline Activity Sequence
Workflow: Define the sequence: Lookup Metadata → ForEach → Execute Data Flow → Log Result.
Drift Detection & Logging: Propose a schema for INGESTION_LOG_TABLE to track runId, dataset, detected_columns, action_taken, and status.
Pillar 4: Best Practices & Guardrails
Address the implications of late-binding and where strict schema enforcement should occur (e.g., Silver/Gold layers).
Define Failure Handling and an alerting strategy for critical drift events.

Output Format
Please provide the response in Markdown including:
Section A: Architecture Overview: A conceptual flow of the drift-handling process.
Section B: ADF Configuration Checklist: Step-by-step pipeline settings.
Section C: Data Flow Transformations: Detailed list of transformations including key expressions and Pattern Rules (byName / byPosition).
Section D: Logging Schema & DDL: SQL DDL for the logging table and sample data rows.

Section E: Operations & Alerts: Strategy for failure handling and notification triggers.
