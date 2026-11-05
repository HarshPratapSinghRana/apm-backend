---
name: playbook-analysis-8
title: "Determine optimal file partitioning keys to minimize data scanning and improve query performance in the data lake."
type: prompt
category: "Prompt Playbook"
subcategory: "Analysis & Planning"
stage: "Analysis"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "analysis", "pyspark", "sql-server"]
description: "It will provide recommendation for physical and logical partitioning, file format and z-ordering strategy along with the detailed structured view of the data storage and some starter implementation code."
---

# Determine optimal file partitioning keys to minimize data scanning and improve query performance in the data lake.

** Provide System Context here:**
**For example:**
Technology used for example pyspark, sql.
Frequent Query pattern - filtered by date and region.
Occasional Query pattern - Customer Level data.
Ingestion volume - Billion
Frequency - Daily
Ingestion Type - Batch Incremental.
Years of data - 5

Act as a senior data engineer designing the system as mentioned in system context. Queries are primarily filtered frequent query pattern available in context, with occasional queries on occasional query pattern. Design an optimal partitioning strategy that minimizes data scanning and improves query performance. Consider partition pruning, data skew, high vs low cardinality columns, small file issues, and optimal file sizes. Provide recommendations, trade-offs, and example implementation.
