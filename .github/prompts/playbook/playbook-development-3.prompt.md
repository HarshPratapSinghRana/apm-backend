---
name: playbook-development-3
description: "[Describe source system(s), target storage or database, Load Type.]  1. abfss://mycontainer@myadlsaccount.dfs.core.windows.net/folder1/folder2/date/ (contains m"
---

You are a senior data engineering architect and Azure Data Factory / Synapse / Data Pipeline expert.
Create a comprehensive design and JSON templates for pipelines that support the following system context: 
1. Full Load
2. Incremental Load (using watermark / delta logic)

System Context:
**Describe source system(s), target storage or database, Load Type .**
**Provide Context here** 

Requirements:
1. Pipeline Design
• Separate pipelines for full load and incremental load
• Modular and parameterized design
• Support multi-environment deployment (dev/test/prod)
• Idempotent and safe to rerun
• Include error handling and retry policies
• Logging and monitoring hooks

2. Activities
Include the following activities in JSON templates:
• Lookup / Get Max Watermark
• Copy Data (source → staging → target)
• Data Validation (row counts, checksums)
• Stored Procedure / SQL Script execution
• If Condition / Conditional Execution
• ForEach loops (if partitioned)
• Set Variable / Parameter handling
• Error / Failure handling (Retry / Alert / DLQ)

3. Watermark / Delta Logic
• Incremental load should include watermark column logic
• Handle late-arriving or out-of-order data
• Store watermark state in metadata table or file
• Example: last_updated_timestamp, version_number, or surrogate key

4. Pipeline JSON Output
• Provide JSON templates for both full load and incremental load pipelines
• Include all activities and dependencies
• Parameterized for source, target, schema, and environment
• Include placeholders for credentials and connection names

5. Best Practices
• Avoid hardcoding
• Include retry policies and exponential backoff
• Include logging for audit and reconciliation
• Performance optimization tips (parallel copy, partitioning)
• Safe rerun and idempotency strategy

6. Edge Cases & Recovery
• Partial failure handling
• Reprocessing logic
• Deduplication on rerun
• Handling of schema drift
• Alerting strategy for failed runs

Output Structure:

• Pipeline Name
• Type (Full / Incremental)
• JSON Template (activities, dependencies, parameters)
• Description of each activity
• Watermark / Delta logic explanation
• Error handling and recovery strategy


Constraints:

• Assume distributed system
• Assume large-scale datasets (100M+ rows)
• Assume multiple source tables
