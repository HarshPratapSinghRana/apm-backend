---
name: playbook-development-37
title: "Apply column-level security"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "fabric", "synapse", "databricks", "sql-server", "security"]
description: "It will provide SQL commands to restrict sensitive column access to authorized roles, or a secure view that masks columns with NULL for unauthorized users using is_member()."
---

# Apply column-level security

Act as a **Data Security Engineer** tasked with applying **Column-Level Security (CLS)** to the published table in the data publishing (Gold) layer. Reference the active SQL script or table definition in my code.

**Context to Provide** (Please fill in these details):
• **Implementation Style**: {e.g., Databricks Unity Catalog / Microsoft Fabric SQL / Synapse SQL}
• **Target Table**: {Insert Catalog.Schema.TableName}
• **Sensitive Columns**: {e.g., SSN, Salary}
• **Authorized Role/Group**: {Insert Authorized Role/Group}

**Requirements**:
Please provide the SQL commands that handle the following:

• **Security Logic**:
  1. Restrict access to the Sensitive Columns.
• **Action**:
  1. Generate the SQL commands to either grant column-level SELECT permissions only to the Authorized Role/Group.
  2. Alternatively, create a secure view that replaces the sensitive columns with NULL for unauthorized users using functions like `is_member()`.

**Output**:
• Provide the SQL code block to enforce this security rule.
