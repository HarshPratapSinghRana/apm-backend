---
name: playbook-requirementgathering-5
description: "Executing this prompt will generate a comprehensive technical playbook that transforms disaster recovery theory into deployable engineering logic. The AI will p"
---

Act as a **Principal Cloud Architect and Data Engineer** tasked with designing a robust **Disaster Recovery (DR) and Rollback Strategy** for a multi-service Azure Data Platform. The goal is to ensure 100% data consistency and rapid service restoration following deployment failures or regional outages.

**Context to Provide**:

* **Services in Scope**: Azure Data Factory (ADF), Databricks (Delta Lake), Azure Synapse, and Microsoft Fabric.
* **Primary Source/Sink**: {e.g., ADLS Gen2, SQL Server, Fabric OneLake}
* **RPO (Recovery Point Objective)**: {e.g., 15 Minutes / 1 Hour / Zero Data Loss}
* **RTO (Recovery Time Objective)**: {e.g., 30 Minutes / 4 Hours}

**Requirements**:
Please provide a comprehensive technical specification including:

* **Code & Orchestration Rollback**:
1. Define the **Azure DevOps** Git branching and "Revert" strategy for ADF and Synapse artifacts.
2. Explain how to manage **ADF Global Parameters** and **Triggers** during a rollback to a "Last Known Good" version.


* **Data State Recovery (Delta Time Travel)**:
1. Provide a **PySpark/SQL code snippet** demonstrating how to use `DESCRIBE HISTORY` and `RESTORE TABLE` to roll back Delta tables to a specific version or timestamp after a failed batch.
2. Explain the strategy for handling **partial writes** and "orphan" files in the Data Lake during a failure.


* **Regional Failover Strategy (DR)**:
1. Outline the steps to fail over **Microsoft Fabric** and **Synapse** workspaces to a paired Azure region.
2. Define the replication strategy for **Storage Accounts** (RA-GRS) and the redirection of ADF Integration Runtimes.


* **Post-Rollback Integrity Verification**:
1. Provide a **Smoke Test** checklist to verify data lineage and connectivity (e.g., checking Linked Services, Key Vault access, and Row Counts) immediately following a recovery.



**Output Format**:

* Use standard Markdown.
* Include distinct blocks for PySpark/SQL logic and DevOps process flows.
* Provide a "Rollback Readiness" checklist for the Engineering team at the end.
