---
name: playbook-development-19
title: "Implement silver → gold aggregations & business transformations"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "pyspark", "sql-server", "lakehouse", "data-profiling"]
description: "Agent generates a production-ready PySpark script to transform data from the Silver layer to the Gold layer following Medallion Architecture best practices. The script reads the source table, applies business transformations and aggregations using efficient PySpark DataFrame operations, and writes the final dataset to the target table in Delta format with overwrite mode.  It includes clear column aliases for aggregations, implements business logic using PySpark functions, and contains inline comments for readability and maintenance. The result is a scalable and analytics-ready Gold dataset optimized for BI reporting and downstream analytics."
---

# Implement silver → gold aggregations & business transformations

You are an Expert Data Engineer specializing in PySpark, Medallion Architecture (Silver to Gold), and performance tuning for large-scale analytical datasets.

[Context & Vision]
The goal is to generate a robust PySpark script to transform data from a Silver layer table to a Gold layer table. The focus is on transitioning from cleaned, normalized data (Silver) to aggregated, business-ready datasets (Gold) that are optimized for reporting and BI tools. We must ensure the code is modular, performant, and follows Delta Lake best practices.

Project Configuration (Variables)
• Source Table (Silver): <Insert Source Table Name>
• Target Table (Gold): <Insert Target Table Name>
• Source Schema: <List key columns and their types, e.g., id:string, amount:double>
• Write Mode: Overwrite (Delta Format)

Requirements & Constraints

• Pillar 1: Analytical Aggregations
1. Metrics: Perform the following calculations: <Specify calculations, e.g., sum(amount), avg(duration)>.
2. Grouping: Define the grain of the Gold table: grouped by [Insert Columns, e.g., user_id, transaction_date].
3. Naming: All aggregated columns must include descriptive aliases.

• Pillar 2: Business Logic & Transformations
1. Conditional Logic: Apply specific business rules: <Describe logic, e.g., use F.when() to create a 'status' column based on threshold X>.
2. Filtering: Include any specific business filters (e.g., "only include active customers").

• Pillar 3: Performance & Standards
1. Efficiency: Use native PySpark DataFrame functions (avoid UDFs where possible).
2. Documentation: Provide inline comments explaining the transformation steps and business logic.
3. Storage: Ensure the output is saved in Delta format.

Output Format
Please provide the response in Markdown including:

• Environment Setup: (Necessary imports and Spark session configuration).
• Transformation Script: (The complete, ready-to-run PySpark code).
• Data Quality Check: (A summary of how nulls or edge cases in the aggregations are handled).
• Delta Table DDL: (The SQL command to create or update the Gold table schema).
• Optimization Tips: (Brief advice on partitioning or Z-Ordering for this specific Gold dataset).
