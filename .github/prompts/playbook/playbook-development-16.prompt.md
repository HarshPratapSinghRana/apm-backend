---
name: playbook-development-16
description: "The script is generated for Databricks to create the catalog, schema, and tables, and to assign the required access permissions based on the provided system inp"
---

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
