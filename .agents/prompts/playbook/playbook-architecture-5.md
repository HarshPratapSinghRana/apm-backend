---
name: playbook-architecture-5
title: "Define disaster recovery and business continuity architecture"
type: prompt
category: "Prompt Playbook"
subcategory: "Architecture & Design"
stage: "Architecture"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "architecture", "power-bi", "fabric", "synapse", "databricks", "data-factory", "sql-server", "cicd"]
description: "This prompt will generate a comprehensive Disaster Recovery and Business Continuity Manual tailored to your specific Azure stack. The AI will produce regional failover procedures, metastore replication strategies, and Power BI report re-binding logic. The final outcome is a structured architectural blueprint that ensures your data platform remains resilient against regional outages, providing clear technical steps to meet your business-defined RTO and RPO targets."
---

# Define disaster recovery and business continuity architecture

Act as a **Principal Infrastructure Architect and Disaster Recovery Specialist**. Your task is to design a robust **Disaster Recovery (DR) and Business Continuity (BC) Architecture** for a mission-critical Azure Data Platform. The objective is to ensure minimal data loss and rapid service restoration across multiple Azure regions.

**Context to Provide**:
• **Primary Region**: {e.g., East US}
• **Secondary/DR Region**: {e.g., West US}
• **Critical Services**: {e.g., Databricks, Fabric, Synapse, ADF, Power BI}
• **Required RPO (Recovery Point Objective)**: {e.g., 15 Minutes / 1 Hour}
• **Required RTO (Recovery Time Objective)**: {e.g., 2 Hours / 4 Hours}

**Requirements**:
Please provide a high-level architectural failover and recovery guide including:

• **Regional Failover Architecture**:
    1. Define the strategy for **Storage Redundancy** (e.g., GRS vs. ZRS) to ensure Data Lake availability in the secondary region.
    2. Outline the failover mechanism for **ADF Integration Runtimes** and how to redirect pipelines to the secondary workspace.
• **Stateful Service Recovery (Databricks/Synapse)**:
    1. Explain the process for replicating **Databricks Metastore** and workspace configurations (notebooks/clusters) to the DR region.
    2. Propose a recovery path for **Synapse Dedicated SQL Pools** including geo-backup restoration steps.
• **Business Continuity for Analytics (Power BI/Fabric)**:
    1. Define how **Microsoft Fabric** capacities are managed during a regional outage and the steps to re-bind reports to a secondary capacity.
    2. Suggest a strategy for maintaining **Gateway connectivity** if on-premises sources are part of the architecture.
• **Recovery Orchestration & Automation**:
    1. Design a "Disaster Recovery Workflow" using **Azure Site Recovery** or custom DevOps scripts to automate the spin-up of compute resources in the DR site.
    2. Provide a **Post-DR Data Integrity Check** script (SQL or Python) to verify that the RPO has been met after failover.

**Output Format**:
• Use standard Markdown.
• Include a visual-style process flow for Regional Failover.
• Provide a "Business Continuity Checklist" for stakeholders at the end.
