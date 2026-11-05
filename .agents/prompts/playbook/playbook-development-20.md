---
name: playbook-development-20
title: "Implement Delta Lake optimization logic (OPTIMIZE, Z-Order, VACUUM)"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "databricks", "pyspark", "sql-server", "lakehouse"]
description: "The script is generated to perform optimization tasks based on the provided system input and may also recommend additional optimization opportunities where applicable. For example  System Context: Perform OPTIMIZE, Z-ORDER,  VACUUM wherever applicable  Catalog   Catalog :  Data_POC Schema : Bronze table and z-order columns: FactBR and column - date Vacuum: Table DateTime with retention for 4 years. Apply any other optimization feasible  Based on this system context, the generated script will execute the specified optimizations  and will also include additional optimization steps wherever feasible."
---

# Implement Delta Lake optimization logic (OPTIMIZE, Z-Order, VACUUM)

You are a senior Data Engineer.
Write a Databricks Delta Lake optimization SQL/PySpark script that performs optimization based on the system context provided.

**Provide System Context:**
Optimization to be performed, catalog , schema, table details 

The script should:

• Take the following user inputs:
1. catalog_name: name of the catalog
2. schema_name: name of the schema
3. table_name: name of the Delta table to optimize
4. zorder_columns: list of columns for Z-Ordering (optional)
5. retention_hours: number of hours to retain old files for VACUUM (default 168)

• Generate SQL/PySpark commands to:
1. Optimize the table
2. Apply Z-Ordering if zorder_columns are provided
3. Vacuum the table with the specified retention period

• Include comments explaining each step.

• Ensure the script can be run directly in a Databricks notebook.

• Don't add to the complexity of the code
