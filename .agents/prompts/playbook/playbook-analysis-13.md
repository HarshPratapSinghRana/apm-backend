---
name: playbook-analysis-13
title: "Build end‑to‑end lineage map across source → raw → curated → semantic (tables, pipelines, notebooks, reports)"
type: prompt
category: "Prompt Playbook"
subcategory: "Analysis & Planning"
stage: "Analysis"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "analysis"]
description: "It will scan the codebase context you provide and automatically generate a structured documentation page. This document will trace the flow of data through your medallion architecture, explicitly numbering the SQL scripts, Python notebooks, and source tables functioning at the Ingestion, Raw, Curated, and Semantic layers. Finally, it will output a visual Mermaid.js flow diagram illustrating the exact dependencies—from raw data landing to final BI consumption—ready to be pasted into your engineering wiki, while responsibly noting that engineers must validate the auto-generated lineage derived lineage requires human validation is still required."
---

# Build end‑to‑end lineage map across source → raw → curated → semantic (tables, pipelines, notebooks, reports)

Act as a Lead Data Engineer and Metadata Architect. I am providing the repository context / codebase for our data solution, which includes our data pipelines, transformation scripts, and schema definitions. 

Please review this supplied context to generate an end-to-end lineage map for this solution and list the dependencies per layer (across Source → Raw → Curated → Semantic).

Please structure the document in Markdown format with the following sections:

• **Executive Summary:** A high-level overview of the data flow and a required note stating: *"This automated lineage map was compiled from repository artifacts; final validation must be completed by domain data owners and engineers."*
• **Layer-by-Layer Dependencies:** A breakdown of the assets and code identifying what happens at each stage:
   1. **Source/Ingestion:** Identified source systems and extraction jobs.
   2. **Raw/Bronze:** Landing tables, storage paths, or raw schemas.
   3. **Curated/Silver:** The specific notebooks, scripts, or pipelines performing data cleaning and joins.
   4. **Semantic/Gold:** The final aggregated tables or views intended for reporting.
• **Downstream Consumption:** Any identified BI reports, dashboards, or external systems relying on the final semantic layer.
• **End-to-End Lineage Flow (Mermaid.js):** A Mermaid.js horizontal flowchart (`graph LR`) code block visually mapping the exact tables, scripts, and views you identified in the codebase from origin to destination.

Ensure the tone is technical, trace-oriented, and accurately reflects only the files and code provided in the context.
