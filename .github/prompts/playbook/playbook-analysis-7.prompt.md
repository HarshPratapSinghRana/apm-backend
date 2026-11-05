---
name: playbook-analysis-7
description: "It will provide a structured lineage document that categorizes your data flow into upstream ingestion, core transformations (notebooks), and downstream reportin"
---

Act as a Lead Data Engineer and Analytics Architect. We need to perform a comprehensive **Dependency Analysis and Data Lineage Mapping** across our existing data pipelines, notebooks, and BI reports to safely plan deployments and understand downstream impacts.

Here is the context for our current data ecosystem:
• **Orchestration / Pipelines:** [e.g., Apache Airflow / Azure Data Factory / dbt]
• **Processing / Notebooks:** [e.g., Databricks (PySpark) / Snowflake Worksheets / Jupyter]
• **Downstream Reporting:** [e.g., Power BI / Tableau / Looker]
• **Key Core Models/Tables in focus:** [e.g., fact_sales, dim_customers, fact_daily_active_users]
• **Goal of this Analysis:** [e.g., Impact analysis for changing the Customer ID format / Deprecating an old upstream ERP database / Documenting currently undocumented legacy pipelines]

Based on this context, please generate a structured **Data Dependency and Lineage Assessment** document.

Please structure the document in Markdown format with the following sections:

• **Executive Summary:** A high-level overview of the dependency landscape, highlighting the critical nodes and potential bottlenecks.
• **Upstream Dependencies (Ingestion & Pipelines):** Mapping of source systems, extraction pipelines, and raw data landings feeding the core models.
• **Core Transformations (Notebooks & Logic):** A breakdown of the intermediate processing workflows, including scripts/notebooks that clean, join, and aggregate the data.
• **Downstream Impacts (BI & Consumers):** A mapped list of dashboards, reports, ML models, and external APIs that rely on the final data products.
• **Data Lineage Diagram (Mermaid.js):** A Mermaid.js flowchart code block visualizing the end-to-end data lineage, from upstream origin through intermediate transformations down to final consumption.

Ensure the tone is highly analytical, focuses on impact mitigation, and clearly identifies single points of failure or highly coupled assets.
