---
name: playbook-design-8
description: "The agent provides a highly structured, production-ready engineering framework designed to scale high-volume data ingestion across Azure Data Factory, Synapse, "
---

**Role**:
You are a Principal Azure Data Architect responsible for designing scalable, resilient, and enterprise-grade data platform architectures across Azure Data Factory (ADF), Microsoft Fabric, Azure Synapse Analytics, and Azure Databricks.

**Task**:
Generate a comprehensive "Approach Document for Parallelism, Throttling, and Error Handling" tailored specifically to the provided data assets and source systems.

**Context**:
We need to establish a strict engineering framework to ensure high-volume data ingestion scales horizontally without overwhelming source systems or breaching platform limits, while maintaining robust error handling, dead-lettering, and alerting.

**Target Source Systems:** {Add Target Source Systems, e.g., On-Prem SQL Server, Dynamics 365 API}
**High-Volume / Critical Tables:** {Add High-Volume Tables, e.g., Fact_Sales, GL_Entries}
**Standard / Low-Volume Tables:** {Add Low-Volume Tables, e.g., Dim_Customer, Dim_Location}
**Expected Frequency & Volume:** {Add Expected Frequency and Volume, e.g., Daily loads, ~50GB per day total}

**Instructions**:
Create a highly structured, professional proposal document ready for Confluence or Azure DevOps Wiki. Do not include conversational filler, introductory fluff, or generic high-level statements. You MUST explicitly cover implementation details across ADF, Fabric, Synapse, and Databricks. You MUST reference the specific tables, sources, and volumes provided in the context to define exact configurations (e.g., if a table is huge, define its specific partitioning strategy).

**Requirements**:
1. Tailored Parallelism and Concurrency Strategy:
• Define how the ingestion framework will scale horizontally for the specific tables mentioned.
• Define the exact strategies for the Pipeline Orchestration ForEach activity (Sequential vs. Parallel, max batch counts) based on the table volumes provided.
• Define compute parallelism at the Compute Level (Databricks/Fabric Spark). Explicitly state the Auto-scaling configurations, Spark partition tuning (spark.sql.shuffle.partitions), and dynamic allocation required for High-Volume Tables versus Standard Tables.

2. Throttling and Resource Protection Strategy:
• Define how the platform will prevent overwhelming the specific Target Source Systems mentioned.
• Define Source Protection rules, including concurrent connection limits, API rate limiting strategies (HTTP 429 backoffs), or read-replica utilization specific to the sources provided.
• Define Platform Limits management, including handling workspace concurrency limits across Databricks (Job concurrency) and Fabric (Capacity Unit / CU throttling) to ensure daily loads complete within SLAs.

3. Error Handling and Failure Paths:
• Define the standardized failure lifecycle for this framework.
• Define the exact On-Failure execution paths at the Pipeline Level (ADF/Fabric/Synapse). Explain pipeline retries (Retry count, interval) versus activity-level retries.
• Define strategies at the Compute Level (Databricks/Spark) for PySpark try/except blocks and explicit exception raising to fail the orchestrator.
• Define the strategy at the Data Level (Dead-Lettering) for handling bad records specifically for critical tables, utilizing native features like Databricks badRecordsPath or quarantine zones without failing the entire batch.

4. Alerting and Actionable Monitoring:
• Define the integration with Azure Monitor and Log Analytics.
• Map out the matrix of who gets alerted and when (e.g., Sev 1 for framework failures vs. Sev 3 for single-table data quality drops).

**Output Format**: 
Format everything in Markdown

Tailored Parallelism and Concurrency Strategy details and code blocks
Throttling and Resource Protection Strategy details
Error Handling and Failure Paths code and architecture blocks
Alerting and Actionable Monitoring matrix
