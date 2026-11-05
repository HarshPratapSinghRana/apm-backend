---
name: playbook-development-16
title: "Set up Unity Catalog with catalog → schema → table governance model"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "databricks", "security"]
description: "The script is generated for Databricks to create the catalog, schema, and tables, and to assign the required access permissions based on the provided system input. For example  System Context: Catalog :  Data_POC Schema : Bronze table and columns: Product with columns id(int), product_name (string), product_family (string) table and columns: DimTime with columns dateid(int), fiscalmonth (string), fiscalyear (string) Access : - Catalog-level: Grant `USAGE` to role `data_analyst`. - Schema-level: Grant `CREATE` and `USAGE` to role `data_engineer`. - Table-level: Grant `SELECT` to role `data_scientist` and `INSERT` to role `data_engineer`.  Based on this input, the generated script will create the Bronze schema within the Data_POC catalog, create the Product and DimTime tables with the specified columns, and apply the defined access permissions."
---

# Set up Unity Catalog with catalog → schema → table governance model

You are a senior Data Engineer.
Generate a Databricks Unity Catalog setup script that creates a hierarchical governance model with catalog → schema → table. 
**Provide system context here:**
Catalog, Schema, table and columns

The script should:
1. Create a catalog with the name provided in system context.
2. Create a schema with the name provided in system context inside the catalog.
3. Create a table with the name provided in system context inside the schema with columns provided in the system context
4. Assign access privileges as provided in system context:
Output the full  script ready to run in a Databricks notebook.
