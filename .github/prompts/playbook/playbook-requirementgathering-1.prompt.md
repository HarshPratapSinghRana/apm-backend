---
name: playbook-requirementgathering-1
description: "It will provide separate, optimized SQL scripts tailored to your specified database type that query system catalog views to extract metadata, including an objec"
---

Act as an expert Data Engineer. I am currently in the data analysis and discovery phase of a new project and need to create a comprehensive inventory of all source objects in our database. 

The target database is {Insert Database Type, e.g., SQL Server / Snowflake / PostgreSQL}.

Please generate optimized SQL scripts using system catalog views/tables to extract the following metadata:

•Object Inventory & Volume: A script to list all tables and views in a specific schema, including the object name, object type, and the approximate row count (prefer system metadata tables for row counts rather than running a slow COUNT(*) on every table).
•Keys & Constraints: A script to extract all Primary Keys (PK) and Foreign Keys (FK) for the tables, including the schema name, table name, column name, constraint name, and for FKs, the referenced target table and column.
•Object Dependencies: A script to map dependencies between objects (e.g., which tables are used by which views, stored procedures, or functions).

Please provide the scripts separately with brief comments explaining how they work and any permissions required to run them.
