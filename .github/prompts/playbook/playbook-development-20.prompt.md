---
name: playbook-development-20
description: "The script is generated to perform optimization tasks based on the provided system input and may also recommend additional optimization opportunities where appl"
---

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
