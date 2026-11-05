---
name: playbook-design-5
title: "Create an approach document for ingestion type (Full, Incremental, CDC) including watermark / delta logic"
type: prompt
category: "Prompt Playbook"
subcategory: "Detailed Design"
stage: "Design"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "design", "lakehouse", "etl"]
description: "[Describe source systems, data volume, latency expectations, Transformation platform, target platform, batch/streaming, etc.] 1. Cosmos DB, 10 years of data in date format, every day data is published in source for previous day so we need that latest data is published daily in the source for the previous day, so we need to ingest the latest data, Databricks, ADLS, batch. 2. SQL , Hundreds of rows , Updates daily, ADF, ADLS, Batch  It will generate detailed documentation on the load types and suggest an incremental load for Cosmos and a full load for SQL based on the provided system context above."
---

# Create an approach document for ingestion type (Full, Incremental, CDC) including watermark / delta logic

You are a senior data platform architect.

Create a comprehensive approach document for designing data ingestion strategies supporting:
Full Load
Incremental Load
Change Data Capture (CDC)
You can give general idea on when to use which type of load pattern

At the end provide a summary table for what should be the load type for the below systems.
System Context:
**Describe source systems, data volume, latency expectations, Transformation platform, target platform, batch/streaming, etc.**
**Insert your context here **

The document must be implementation-focused

Constraints:
Assume distributed system
Assume at-least-once execution
Assume possibility of pipeline restarts
Avoid vague guidance
Provide concrete implementation patterns
