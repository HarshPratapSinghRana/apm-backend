---
name: playbook-architecture-12
title: "Define where business logic resides across ETL, curated layers, and cubes"
type: prompt
category: "Prompt Playbook"
subcategory: "Architecture & Design"
stage: "Architecture"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "architecture", "power-bi", "fabric", "synapse", "databricks", "pyspark", "sql-server", "lakehouse", "data-modeling", "security", "etl"]
description: "Executing this prompt will generate a Business Logic Blueprint that eliminates architectural ambiguity. The AI will produce a Layered Transformation Matrix, clear rules for SQL vs. Spark usage, and a governance plan for Semantic Layer measures. The final outcome is a structured guide that ensures your transformations are modular, scalable, and \"DRY\" (Don't Repeat Yourself), preventing the common pitfall of having inconsistent business logic scattered across multiple ETL pipelines and reports."
---

# Define where business logic resides across ETL, curated layers, and cubes

Act as a Principal Data Architect and ETL Framework Designer. Your task is to design a Transformation and Business Logic Layering Architecture that clearly separates technical processing from business-driven calculations across the Medallion (Bronze/Silver/Gold) architecture.

Context to Provide:
• Primary Tooling: {e.g., Databricks (Spark), Fabric (SQL/Notebooks), Synapse}
• Data Architecture: {e.g., Medallion (Bronze/Silver/Gold) / Star Schema}
• Downstream Consumer: {e.g., Power BI Semantic Models / Data Science Notebooks}
• Logic Complexity: {e.g., Simple Aggregations / Complex Financial Reconciliations / Regulatory Reporting}

Requirements:
Please provide a comprehensive logic distribution guide including:

• Layered Logic Definition:
1. Define the role of the Bronze/Raw Layer (Schema enforcement and technical metadata only).
2. Define the Silver/Curated Layer logic: Standardizing formats, deduplication, and cross-reference joining.
3. Define the Gold/Business Layer logic: Where complex business KPIs, period-over-period calculations, and domain-specific filters reside.
• Compute Engine Selection:
1. Recommend when to use Spark (Python/Scala) for heavy-lift technical transformations vs. SQL for business-friendly logic in the Gold layer.
2. Explain the role of the Semantic Layer (Power BI/Cubes) in handling "Last-Mile" logic (e.g., dynamic currency conversion or measures).
• Governance & Reusability:
1. Propose a strategy for a Centralized Logic Repository (e.g., dbt models or Spark functions) to prevent "Dark Logic" (calculations hidden in individual reports).
2. Explain how to handle Reference Data (Master Data) so it is injected consistently across all layers.
• Logic Traceability Matrix:
1. Create a table mapping common tasks (e.g., Data Type Casting, Null Handling, Revenue Calculation, User Personalization) to the specific architectural layer where they should be executed.

Output Format:
• Use standard Markdown.
• Include a structured Logic Distribution Table.
• Provide a "Logic Layering Audit Checklist" for code reviewers at the end.
