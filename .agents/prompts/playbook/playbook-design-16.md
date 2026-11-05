---
name: playbook-design-16
title: "Create documentation (pages, visuals, KPIs, RLS, data sources)"
type: prompt
category: "Prompt Playbook"
subcategory: "Detailed Design"
stage: "Design"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "design", "power-bi", "dax", "data-modeling", "security"]
description: "It will provide structured, audit-ready technical documentation extracted directly from the connected model, including table/measure inventory, relationship mappings, DAX definitions with complexity flags, RLS roles, data source details, and advanced feature usage — all in Markdown tables with no assumptions or inferences."
---

# Create documentation (pages, visuals, KPIs, RLS, data sources)

Act as a **Senior Power BI Solution Architect / Documentation Specialist** tasked with producing audit-ready technical documentation for the currently connected Power BI Desktop model.

**Requirements**:
Please generate documentation using ONLY the extracted metadata from your available Power BI MCP tools. Make no assumptions or inferences. If data is missing or inaccessible, mark it as "Not Available". Since the MCP server cannot read report-level UI elements (Pages, Visuals, Workspaces), focus strictly on the Semantic Model architecture.

Include the following sections:

• **Semantic Model Overview**:
  1. **Model Name**: (from connection).
  2. **Total Statistics**: Total number of Tables and Measures.
  3. **Business Subject Area**: Inferred based on table names.
• **Data Sources & Partitions**:
  1. **Source Types**: Extracted from M queries.
  2. **Connection Mode**: Import, DirectQuery, or Dual.
  3. **Source Locations**: Databases or file paths.
• **Data Model Architecture**:
  1. **Tables**: Infer Fact vs. Dimension based on relationships.
  2. **Relationships**: From/To, Cardinality, and Cross-Filter Direction.
  3. **Calculated Tables**: Name and DAX definition.
• **Measures & KPIs** (Table format):
  1. **Details**: Measure Name, Home Table, and DAX Expression.
  2. **Complexity Flag**: Flag heavy iterators like SUMX or complex CALCULATE modifiers for performance review.
• **Security (Row-Level Security)**:
  1. **Details**: Role Name, Filtered Tables, and DAX Filter Expressions.
• **Advanced Features** (If present):
  1. **Features**: Document Calculation Groups, Field Parameters, and Incremental Refresh Policies.
• **Out of Scope (Report Layer)**:
  1. **Disclaimer**: Explicitly state that Report Pages, Visuals, Bookmarks, and Workspace metadata are not documented as they reside outside the semantic model accessible by the MCP server.

**Output**:
• Output in Structured Markdown using tables where applicable.
