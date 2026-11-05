---
name: playbook-architecture-4
title: "Define trade-offs between performance, cost, and complexity"
type: prompt
category: "Prompt Playbook"
subcategory: "Architecture & Design"
stage: "Architecture"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "architecture", "power-bi", "fabric", "synapse", "databricks", "data-factory", "lakehouse", "security"]
description: "Prompt will generate a strategic financial and technical roadmap for your cloud infrastructure. The AI will produce compute sizing recommendations, a tiered storage lifecycle policy, and a cost-complexity trade-off matrix. The final outcome is a data-driven capacity plan that allows the engineering team to make informed \"Business Judgement\" decisions on where to invest in performance and where to optimize for budget, preventing unexpected cloud-spend spikes."
---

# Define trade-offs between performance, cost, and complexity

Act as a **Cloud Cost Architect and Data Engineer** specialized in Azure Data Platforms. Your task is to design a **Capacity Planning and Cost Optimization Strategy** for a high-performance data ecosystem. The goal is to maximize query performance while maintaining strict budget governance through a tiered complexity model.

**Context to Provide**:
• **Estimated Data Volume**: {e.g., 5TB Monthly Growth / 500 Million Rows}
• **Workload Profile**: {e.g., Heavy Batch Ingestion (Nightly) / Ad-hoc Analytical Queries / Real-time Power BI DirectQuery}
• **Primary Compute**: {e.g., Databricks Serverless / Fabric F-SKU Capacities / Synapse Dedicated Pools}
• **Budget Constraints**: {e.g., Target $<X,000$ per month / Reduce cost by 20%}

**Requirements**:
Please provide a comprehensive cost-performance trade-off analysis including:

• **Compute Sizing & Scaling Strategy**:
    1. Define the trade-offs between **Small, Medium, and Large clusters** for Databricks and Synapse based on execution speed vs. cost.
    2. Propose a **Scaling Policy** (Autoscaling vs. Fixed Capacity) for Fabric and ADF Integration Runtimes to handle peak vs. off-peak loads.
• **Storage & Data Lifecycle Optimization**:
    1. Recommend a strategy for **Data Compaction and Vacuuming** in Delta Lake to reduce storage costs and metadata overhead.
    2. Explain the use of **Cold/Archive tiers** for historical data and how to automate the transition using ADF or Fabric policies.
• **Power BI & Resource Governance**:
    1. Analyze the cost impact of **Import Mode vs. DirectQuery** in Power BI and suggest a hybrid approach (Aggregations) to optimize capacity usage.
    2. Suggest **Resource Tags and Spending Alerts** to monitor costs at a per-project or per-environment level.
• **Complexity vs. Cost Matrix**:
    1. Create a table comparing a **"Performance-First"** architecture vs. a **"Cost-Optimized"** architecture, highlighting where complexity increases to save money (e.g., manual caching, pre-aggregated tables).

**Output Format**:
• Use standard Markdown.
• Include a comparison table for Performance vs. Cost trade-offs.
• Provide a "Cost Optimization Checklist" for monthly reviews at the end.
