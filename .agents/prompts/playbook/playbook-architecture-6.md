---
name: playbook-architecture-6
title: "Design compute vs storage separation strategy"
type: prompt
category: "Prompt Playbook"
subcategory: "Architecture & Design"
stage: "Architecture"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "architecture", "databricks", "lakehouse", "etl"]
description: "It will provide a structured Markdown document featuring a high-level executive summary of the decoupled architecture, specific technology recommendations for an independent storage tier (like object storage/data lakes) and an elastic compute tier (like serverless or auto-scaling clusters) tailored to your cloud provider, a step-by-step decoupling migration plan, and a Mermaid.js flowchart visualizing the new separated layers that is ready to be pasted into your architectural documentation."
---

# Design compute vs storage separation strategy

Act as an expert Cloud Data Architect. We are in the architectural redesign phase and need to define a **Compute vs. Storage Separation Strategy** to improve scalability, reduce costs, and modernize our data platform/system.

Here is the context for our current infrastructure and workloads:
• **Current Architecture:** [e.g., On-premises Hadoop cluster / A large monolithic PostgreSQL database on a single massive VM / Tightly coupled EC2 instances with local EBS volumes]
• **Workload Characteristics:** [e.g., Heavy nightly batch ETL jobs / High-volume real-time streaming ingestion / Intermittent heavy analytical queries at month-end]
• **Current Pain Points:** [e.g., Paying for max compute 24/7 even during idle times / Running out of disk space requires upgrading the entire CPU tier / Difficult to scale compute for sudden reporting spikes]
• **Target Environment/Cloud:** [e.g., AWS (S3, Athena, EMR) / Azure (ADLS, Databricks) / Snowflake / GCP (GCS, BigQuery)]

Based on this context, please generate a comprehensive **Compute vs. Storage Separation Strategy** document.

Please structure the document in Markdown format with the following sections:

• **Executive Summary:** A high-level overview of the proposed decoupled architecture and how it directly resolves the stated pain points around cost and elasticity.
• **Storage Architecture:** Recommendations for the centralized, persistent storage layer (e.g., Object storage like S3/ADLS, open table formats like Delta/Iceberg) ensuring high durability and low cost.
• **Compute Architecture:** Recommendations for the processing layer (e.g., ephemeral clusters, serverless query engines, auto-scaling data warehouses) to handle the specific workloads dynamically.
• **Migration & Decoupling Strategy:** A phased execution plan detailing how to migrate from the current tightly coupled state to the target separated state securely and efficiently.
• **Target Architecture Diagram (Mermaid.js):** A Mermaid.js flowchart code block visualizing the decoupled flow of data between the shared storage layer and the independent, scalable compute engines.

Ensure the tone is professional, concise, and focused on cost-efficiency, elasticity, and modern cloud-native principles.
