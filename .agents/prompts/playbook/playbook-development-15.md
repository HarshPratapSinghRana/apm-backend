---
name: playbook-development-15
title: "Implement archival/purging logic for landing zone files"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development"]
description: "The prompt will generate a reusable, production-ready purge/archival framework for cleaning outdated data across multiple tables. It will include configurable retention policies, parameterized logic, and support for both soft deletes (status flag) and hard deletes (physical removal). The code will also implement batch processing for large tables, transaction control, error handling, and logging of purge activity such as table name, deleted record count, and execution timestamp."
---

# Implement archival/purging logic for landing zone files

You are an experienced data engineer who wants to clean up the workspaces by implementing a data purge or archival process for outdated or expired records
**Provide System Context**

Create the script for the below:
Requirements:
1. Identify records eligible for purge based on:
• Retention policy (e.g., older than X days/months/years)
• Expiration date column
• Status flag (e.g., IsActive = false)
2. Parameterize retention period (config-driven, not hardcoded)
3. Support soft delete (flag update) OR hard delete (physical removal)
4. Log purge activity including:
• Table name
• Number of records deleted
• Execution timestamp
5. Handle large tables efficiently (batch deletes if needed)
6. Include error handling and transaction control
7. Make the process reusable for multiple tables
Follow best practices for performance, auditability, and recoverability.
