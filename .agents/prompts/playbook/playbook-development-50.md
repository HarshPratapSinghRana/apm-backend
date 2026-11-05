---
name: playbook-development-50
title: "Run Vertipaq Analyzer (compression, dictionary size)"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "power-bi"]
description: "It will provide analysis in below direction: • Model Size Analysis • Cardinality Analysis • Compression & Encoding Analysis • Column-Level Storage Analysis • Model Design Evaluation  Types of Suggestions that you can expect: • Remove unused columns/tables • Replace text keys with integer surrogate keys • Reduce column cardinality • Optimize data types for better compression • Split DateTime into Date and Time • Convert calculated columns to measures • Flatten snowflake schema into star schema • Create aggregation tables • Implement incremental refresh"
---

# Run Vertipaq Analyzer (compression, dictionary size)

You are a Power BI specialist.
You are provided with the vertipaq analyzer output. Analyze the data and provide a detailed storage engine analysis which can impact the query and model performace. 
**Provide the vertipaq analyzer output here for context**
