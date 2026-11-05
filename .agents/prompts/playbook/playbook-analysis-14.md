---
name: playbook-analysis-14
title: "Identify M:M relationships and decide bridge table strategy (grain, keys, handling duplicates)"
type: prompt
category: "Prompt Playbook"
subcategory: "Analysis & Planning"
stage: "Analysis"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "analysis", "data-modeling"]
description: "It will generate strategies for creating the bridge table and how can we fit in current modelling along with some started code."
---

# Identify M:M relationships and decide bridge table strategy (grain, keys, handling duplicates)

**Provide System Context here:**

Schema type: Star Schema
Business domain: sales
Fact table(s): Sales, Orders, Claims
Dimension tables: Product, Customer, Promotion, Category

Known or suspected M:M relationships:

Product ↔ Category
Orders ↔ Promotion
Customer ↔ Account
Act as a senior data architect working on the system described above.

Based on the schema type and relationships provided, identify all many-to-many (M:M) relationships between fact and dimension tables or between dimensions.

Design an appropriate bridge table strategy that includes:

Clearly defining the grain of each bridge table
Identifying primary keys and foreign keys
Deciding whether surrogate keys are required
Handling duplicate relationships and ensuring data integrity
