---
name: playbook-architecture-8
title: "Define what belongs in Lakehouse vs Warehouse vs Eventhouse and separation rules per domain"
type: prompt
category: "Prompt Playbook"
subcategory: "Architecture & Design"
stage: "Architecture"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "architecture", "fabric", "pyspark", "sql-server", "lakehouse", "security"]
description: "Executing this prompt will generate a strategic decision framework for your Fabric implementation. The AI will produce a workload selection matrix, a workspace separation plan, and clear decision rules that define when to use Spark-based Lakehouses versus SQL-based Warehouses. The final outcome is a structured architectural guide that helps the team avoid \"architecture sprawl\" by ensuring every dataset is stored and processed in the engine most optimized for its specific use case and user persona."
---

# Define what belongs in Lakehouse vs Warehouse vs Eventhouse and separation rules per domain

Gemini said
Act as a Principal Data Architect specializing in Microsoft Fabric. Your task is to design a Multi-Workload Separation Strategy to define exactly how data should be routed between Lakehouse, Data Warehouse, and Eventhouse based on specific domain use cases and technical requirements.

Context to Provide:
• Data Sources: {e.g., IoT Streaming, ERP (SQL), Unstructured Logs, Excel/Files}
• Primary Use Cases: {e.g., Machine Learning, Financial Reporting, Real-time Dashboarding}
• Technical Persona: {e.g., Data Scientists (Python/Spark), SQL Analysts (T-SQL), Citizen Developers}
• Performance Requirement: {e.g., Sub-second latency for streaming vs. high-volume batch processing}

Requirements:
Please provide a comprehensive decision-making framework and separation guide including:

• Workload Selection Logic:
1. Define the technical criteria for choosing Lakehouse (Spark/Delta) vs. Data Warehouse (SQL) for transformation and gold-layer storage.
2. Identify the specific triggers for using Eventhouse (KQL) for high-velocity, real-time telemetry data.
• Cross-Domain Separation Rules:
1. Design a Workspace Architecture that separates domains (e.g., Finance, Sales, IoT) while maintaining a shared "OneLake" foundation.
2. Explain how to manage Data Shortcuts between workloads to minimize data duplication across different engines.
• Access & Governance Model:
1. Recommend the optimal Compute Engine for different user personas (e.g., Spark for Data Science, SQL Endpoint for Analytics).
2. Define how to handle Schema Governance and evolution differently across the Lakehouse and the Warehouse.
• Implementation Matrix:
1. Create a "Use Case vs. Workload" matrix mapping typical scenarios (e.g., Time-Series Analysis, ACID transactions, AI/ML Training) to the recommended Fabric service.

Output Format:
• Use standard Markdown.
• Include a clear Decision Tree or comparison table for the three workloads.
• Provide a "Workload Placement Checklist" for architects at the end.
