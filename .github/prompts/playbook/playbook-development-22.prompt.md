---
name: playbook-development-22
description: "The script generates the starter code for implementing incremental data load patterns based on the provided system context. For example: Source ADLS Path - abfs"
---

You are a senior data engineer
Create a notebook that implements watermarking and CDC (Change Data Capture) logic. Please generate step-by-step notebook that includes below requirements 

**Provide system context:**
**User Inputs Required:**
Source data location (e.g., S3 path, database table)
Target data location (e.g., S3 path, database table)
Key column(s) for CDC (primary key or unique identifier)
Timestamp column for watermark logic
Mode of CDC (e.g., append-only, upsert)
Watermark table location

**Watermark Logic:**
Automatically identify the latest timestamp in the target
Filter the source data to only process new or updated records since the last watermark
Update the watermark after each successful run

**CDC Logic:**
Detect inserts and updates based on key and timestamp columns
Merge changes into the target dataset

**Notebook Requirements:**
Include code cells for each step with clear comments
Include functions that can be reused for multiple tables
