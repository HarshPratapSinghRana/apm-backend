---
name: playbook-requirementgathering-3
description: "It will provide a detailed Source-to-Raw data mapping template formatted as a Markdown table, populated with realistic mock data for your specified sample table"
---

Act as an expert Data Architect. I am in the data discovery phase and need to create a comprehensive "Source-to-Raw" (Source-to-Target) data mapping document. 
Please generate a detailed mapping template in a Markdown table format based on the context provided below. 

**Context:**
• **Source System / Database:** {Insert Source, e.g., Salesforce / SQL Server / SAP}
• **Target System / Data Lake:** {Insert Target, e.g., Databricks Bronze Layer / Snowflake Raw / S3}
• **Sample Source Tables/Entities:** {Insert 1-3 table names, e.g., Customers, Orders}
• **Standard Audit Columns Required:** {Insert any audit columns you need, e.g., load_timestamp, source_file_name, batch_id, or type "Standard"}

**Requirements for the Template:**
Please generate a table with the following columns:
• Source Schema / Table
• Source Column Name
• Source Data Type
• Target Schema / Table
• Target Column Name
• Target Data Type
• Is Primary Key / Business Key? (Yes/No)
• Is PII? (Yes/No)
• Transformation / Logic (Since this is to the "Raw" layer, default to 1:1 mapping or basic type casting, plus the audit columns).

Populate the template with realistic mock data based on the tables I provided in the context so I can see how it should be filled out.
