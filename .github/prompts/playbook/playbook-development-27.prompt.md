---
name: playbook-development-27
description: "AuditLogger"
---

You are a senior data engineer
Create a notebook that implements control tables and also generates schemas for each table.

Control Tables to Implement with Schema:
Pipeline Configuration Table: stores pipeline id, name, source/target locations, schedule, is_active
Watermark Table: pipeline id, entity name, last_processed_ts, last_record_id
Audit Table: stores run metadata including pipeline name, start time, end time, records processed, errors, etc., with correct types.
Status Table: stores pipeline name, current status (running, success, failed), last updated timestamp

Generate the template code for the above
