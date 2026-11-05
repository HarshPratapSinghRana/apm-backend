---
name: playbook-analysis-15
title: "Decide how to handle schema drift (additive changes, type changes, breaking changes)"
type: prompt
category: "Prompt Playbook"
subcategory: "Analysis & Planning"
stage: "Analysis"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "analysis", "power-bi", "fabric", "pyspark", "data-factory", "sql-server", "lakehouse", "security", "etl"]
description: "Executing this prompt will generate a technical governance framework that safeguards your data platform against unexpected upstream changes. The AI will produce PySpark validation logic, a versioning strategy, and a compatibility matrix that distinguishes between safe and breaking changes. The final outcome is a proactive drift policy that prevents pipeline failures and ensures that downstream analytics remain stable even as source data evolves, reducing manual troubleshooting time."
---

# Decide how to handle schema drift (additive changes, type changes, breaking changes)

Act as a Principal Data Engineer and Architect specializing in Modern Data Lakehouse architectures. Your task is to design a robust Schema Drift and Compatibility Strategy to ensure pipeline resilience and data integrity across an evolving data ecosystem.

Context to Provide:
• Storage Format: {e.g., Delta Lake, Parquet, Avro}
• Ingestion Engine: {e.g., Azure Data Factory, Spark Structured Streaming, Fabric Data Factory}
• Source Systems: {e.g., NoSQL APIs with fluid schemas, SQL Databases, IoT JSON Payloads}
• Downstream Consumer: {e.g., Power BI, ML Models, SQL Analytics}

Requirements:
Please provide a comprehensive technical strategy for managing schema evolution, including:

• Drift Handling Policies:
1. Define the rules for Additive Changes (New columns): When to allow "Auto-Merge" vs. when to enforce explicit schema updates.
2. Define the strategy for Breaking Changes (Renamed columns, Deleted columns, or Data Type changes): Explain the use of "Dead Letter Queues" or pipeline halts to prevent data corruption.
• Technical Implementation (Spark/Delta):
1. Provide a PySpark code snippet demonstrating how to enable mergeSchema vs. overwriteSchema and how to catch AnalysisException during drift.
2. Explain how to implement a Schema Validator function that checks incoming data against a registered "Contract" before it reaches the Silver layer.
• Compatibility Evolution Rules:
1. Define the compatibility mode for the architecture (e.g., Backward Compatible, Forward Compatible, or Full).
2. Suggest a strategy for Schema Versioning (e.g., using a Schema Registry or a version metadata column) to track changes over time.
• Alerting & Governance:
1. Propose an Automated Alerting Workflow (e.g., via Azure Monitor or Teams) that triggers whenever a schema change is detected but not yet approved.
2. Create a Schema Change Matrix mapping change types to their allowed impact level (e.g., "Auto-Approve" for Additive vs. "Manual Review" for Type changes).

Output Format:
• Use standard Markdown.
• Include distinct blocks for PySpark/SQL logic.
• Provide a "Schema Drift Response Checklist" for Data Engineers at the end.
