---
name: playbook-development-32
description: "It will provide Python/JSON code block to format and send webhook payloads with pipeline details and run URLs, conditional logic to trigger alerts on failures o"
---

Act as a **Data Engineering Lead / DevOps Specialist** tasked with the design and implementation of a **Processing Layer Notification System** to alert the engineering team about transformation failures, data quality breaches, or performance anomalies.

**Context to Provide** (Please fill in these details):
• **Processing Engine**: {e.g., Databricks (PySpark) / Snowflake Tasks / dbt Cloud / Azure Synapse}
• **Orchestrator**: {e.g., Azure Data Factory / Airflow / Databricks Workflows}
• **Notification Channel**: {e.g., MS Teams Webhook / Slack / PagerDuty / Email}
• **Alerting Scenarios**:
  1. **Critical Failure**: Job failed completely (Code Error).
  2. **Data Quality Breach**: Job finished, but dropped > 10% of rows due to bad data.
  3. **Performance**: Job ran 2x longer than the 7-day moving average.

**Requirements**:
Please provide the code snippets and configuration steps to implement these specific notifications:

• **Webhook Integration (Teams/Slack)**:
  1. **Payload Design**: Create a JSON payload that includes Pipeline/Notebook Name, Run URL (Link directly to the Spark UI or Snowflake Query History for debugging), Error Message/Stack Trace (Truncated to first 200 chars), and Rows Processed vs. Rows Dropped.
  2. **Implementation**: Show how to send this payload using Python (`requests.post`) or the specific Orchestrator's "Web Activity".
• **Conditional Alerting Logic**:
  1. Write the logic to only trigger an alert if specific conditions are met (e.g., if failure_count > 0 OR if duration_minutes > 120).
  2. Explain how to suppress "noise" (e.g., don't alert on retries, only on final failure).
• **Email Configuration (for Business Stakeholders)**:
  1. If using Email, draft a cleaner, non-technical template for "SLA Missed" or "Daily Processing Summary" (e.g., "The Daily Sales Report is delayed").

**Output**:
• Provide the exact Python/JSON Code Block to format and send the message.
• Include a Variable List of environment variables (like `WEBHOOK_URL`) that need to be set in the cluster/environment.
