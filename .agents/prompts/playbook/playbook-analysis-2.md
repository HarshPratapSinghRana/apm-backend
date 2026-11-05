---
name: playbook-analysis-2
title: "Create transformation logic inventory & SCD strategy"
type: prompt
category: "Prompt Playbook"
subcategory: "Analysis & Planning"
stage: "Analysis"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "analysis", "sql-server", "security", "data-profiling"]
description: "The output will produce a comprehensive governance-ready document that inventories all data transformation logic from source systems to target warehouse tables and defines the Slowly Changing Dimension (SCD) strategy for dimension tables."
---

# Create transformation logic inventory & SCD strategy

Act as a Senior Data Architect and Data Governance expert.

Create a comprehensive Transformation Logic Inventory and Slowly Changing Dimension (SCD) Strategy document for the given **System Context**
**Transformation Logic Inventory**
Document all transformation rules from source systems to target data warehouse tables.
For each transformation, capture:
• Source system name
• Source table and column
• Target table and column
• Transformation type (standardization, derivation, aggregation, enrichment, filter, lookup, etc.)
• Detailed transformation logic (SQL / pseudocode)
• Business rule description (business-friendly explanation)
• Data type conversion (if any)
• Default values applied
• Data quality validation rules
• Dependencies (upstream/downstream impact)
• Present the output in a structured table format suitable for governance documentation.

**SCD Strategy**

For each dimension table, define a clear Slowly Changing Dimension strategy.
Include:
• Dimension name
• Natural key(s)
• Surrogate key strategy
• Attributes list
• SCD type per attribute (Type 1, Type 2, Type 3, Hybrid)
• Change detection mechanism (hash comparison, column compare, CDC, MERGE, etc.)
• Effective start date logic
• Effective end date logic
• Current record flag logic
• Late-arriving data handling
• Soft delete handling
