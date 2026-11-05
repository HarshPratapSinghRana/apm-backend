---
name: playbook-development-36
title: "Publish Delta tables to Databricks Unity Catalog (catalog/schema/table)"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "databricks", "lakehouse"]
description: "It will generate a production-ready script that validates whether the specified catalog and schema exist in Unity Catalog and creates them if they do not exist, and publishes Delta tables to Unity Catalog according to the given mapping"
---

# Publish Delta tables to Databricks Unity Catalog (catalog/schema/table)

Create a production-ready module for Databricks that publishes Delta tables to Databricks Unity Catalog.
System Context:
**Provide system context here**
catalog_name, schema_name, Table, source, publish mode.

Requirements:
Create script to publish the data in databricks unity catalog as per the above system context provided.

Validate that:
Catalog exists (create if not exists optional flag)
Schema exists (create if not exists optional flag)
Handle schema evolution if merge_schema=True
Return success/failure status
