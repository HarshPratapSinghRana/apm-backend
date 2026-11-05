---
name: playbook-development-21
title: "Implement merge/upsert logic for incremental/CDC loads"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "databricks", "pyspark", "lakehouse"]
description: "Agent generates a production-ready PySpark script that performs incremental data transformation and loading into a Delta table using an UPSERT (MERGE) strategy. The script reads the source table, filters new or updated records using a watermark column, and applies the required transformations or aggregations.  Using DeltaTable merge syntax, records are matched based on the defined primary key—existing records are updated, and new records are inserted. The script also supports schema evolution and includes comments explaining the merge logic, ensuring a scalable and efficient pipeline for maintaining curated Delta tables."
---

# Implement merge/upsert logic for incremental/CDC loads

You are an Expert Data Engineer specializing in Databricks, Spark optimization, and Delta Lake internals. You have deep expertise in implementing the Medallion Architecture and managing complex ACID transactions using Delta Merge logic.

[Context & Vision]
The goal is to write a robust PySpark script to perform an incremental data transformation and load it into a target Delta table using an "Upsert" (Merge) strategy. We need to move beyond simple overwrites by implementing a high-performance MERGE INTO pattern that synchronizes source updates and inserts while maintaining data integrity and supporting schema evolution.

Project Configuration (Variables)
• Source Table/View: <Insert Source Table Name>
• Target Delta Table: <Insert Target Delta Table Name>
• Primary Key / Merge Condition: <e.g., 'user_id' AND 'event_date'>
• Watermark Column: <e.g., updated_at or processing_time>
• Incremental Filter: [Insert Logic, e.g., source.updated_at > target.max_watermark]

Requirements & Constraints

• Pillar 1: Incremental Extraction & Transformation
1. Watermarking: Implement logic to filter the source data based on the provided watermark column to ensure only new or changed records are processed.
2. Aggregations/Logic: Apply the following transformation: <Describe logic, e.g., calculate daily sum of sales per user>.

• Pillar 2: Delta Merge (Upsert) Logic
1. Match Found: Update existing records in the target table with the new values from the source.
2. No Match Found: Insert new records from the source into the target table.
3. Implementation: Use the DeltaTable Python API (merge) for better readability and performance.

• Pillar 3: Schema & Performance
1. Schema Evolution: Ensure the merge operation supports Schema Evolution (e.g., using mergeSchema options) to handle new incoming columns.
2. Optimization: Include explicit handling for performance, such as whenNotMatchedBySource (if applicable) or specific join hints.
3. Documentation: Provide detailed inline comments explaining the merge criteria and the MATCHED vs NOTMATCHED logic.

Output Format 
Please provide the response in Markdown including:

• Environment & Imports: (Necessary Spark and Delta Lake library imports).
• Watermark Retrieval Logic: (Code to fetch the last processed timestamp from the target).
• Transformation & Merge Script: (The complete, parameterized PySpark script).
• Schema Evolution Strategy: (Code snippet showing how to handle drifting source columns).
• Performance & Tuning Guide: (Recommendations for Z-ORDERING or partitioning to optimize future merges).
