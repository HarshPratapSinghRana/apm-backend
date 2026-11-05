---
name: playbook-development-22
title: "Implement watermark and CDC logic inside notebooks"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development"]
description: "The script generates the starter code for implementing incremental data load patterns based on the provided system context. For example: Source ADLS Path - abfss://salesdata@contosodata.dfs.core.windows.net/2026/source/Invoice/ date wise column Target ADLS Path - abfss://salesdata@contosodata.dfs.core.windows.net/2026/taget/Invoice/ date wise column Key column(s) for CDC (primary key or unique identifier) - Date column Timestamp column for watermark logic: Date column Mode of CDC (e.g., append-only, upsert): Append Watermark table location - abfss://salesdata@contosodata.dfs.core.windows.net/2026/watermarks/  Based on this system context, the generated script provides the initial implementation for the incremental load pattern, processes the data from the source to the target, and updates the watermark table to track the last processed timestamp for subsequent runs."
---

# Implement watermark and CDC logic inside notebooks

You are a senior data engineer
Create a notebook that implements watermarking and CDC (Change Data Capture) logic. Please generate step-by-step notebook that includes below requirements 

**Provide system context:**
**User Inputs Required:**
Source data location (e.g., S3 path, database table)
Target data location (e.g., S3 path, database table)
Key column(s) for CDC (primary key or unique identifier)
Timestamp column for watermark logic
Mode of CDC (e.g., append-only, upsert)
Watermark table location

**Watermark Logic:**
Automatically identify the latest timestamp in the target
Filter the source data to only process new or updated records since the last watermark
Update the watermark after each successful run

**CDC Logic:**
Detect inserts and updates based on key and timestamp columns
Merge changes into the target dataset

**Notebook Requirements:**
Include code cells for each step with clear comments
Include functions that can be reused for multiple tables
