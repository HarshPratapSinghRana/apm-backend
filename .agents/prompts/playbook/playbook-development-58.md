---
name: playbook-development-58
title: "Optimize report performance (DAX optimization, visual reduction, query folding)"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "power-bi", "dax", "data-modeling"]
description: "It will provide a comprehensive Power BI performance tuning report that diagnoses Formula engine and storage engine bottlenecks and provides actionable DAX, data model, and query folding optimizations with some suggested examples."
---

# Optimize report performance (DAX optimization, visual reduction, query folding)

Prompt - 1 Using Power BI MCP 
Connect to Power BI Desktop with name '**Provide report name here**'.
Analyze and provide suggestion to optimize the report performance with respect to Measure optimizations, number of visuals per page, query folding.
**Provide context with respect to data size**

Prompt - 2 Using Github copilot
Analyze the query plan and provide the performance bottlenecks with respect to formula engine and storage engine with the suggestions of possible optimizations .
Consider below suggestion in addition to your inputs.
1) DAX Optimization
• Identify inefficient measures (SUMX, FILTER, ADDCOLUMNS, nested CALCULATE, excessive context transition).
• Replace iterators with aggregations where possible.
• Convert row-by-row logic into storage-engine friendly calculations.
• Introduce VAR to prevent repeated evaluation.
• Suggest moving calculated columns to measures when appropriate.
• Rewrite slow measures and provide before/after comparison.
• Reduce formula engine usage.

2) Data Model Optimization
• Detect non-star schema design.
• Identify bi-directional relationships.
• Highlight many-to-many relationships.
• Detect unused columns.
• Recommend surrogate integer keys instead of text joins.
• Suggest disabling auto date/time if applicable.

3) Query Folding (Power Query M)
• Identify steps that break query folding.
• Suggest pushing transformations to source system.
• Recommend filtering early.
• Rewrite M queries to preserve folding.
• Highlight row-by-row operations.
**Provide the query plan obtained from DAX studio for context**
