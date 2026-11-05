---
name: playbook-development-38
title: "Apply row-level security (RLS)"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "fabric", "databricks", "sql-server", "security"]
description: "It will provide a row filter function or security predicate that restricts data visibility by region/department, ensuring admins see all rows while standard users see only their assigned data based on current_user() or a mapping table."
---

# Apply row-level security (RLS)

Act as a **Data Security Engineer** tasked with applying **Row-Level Security (RLS)** to the published table in the data publishing (Gold) layer so users only see data relevant to their region/department. Reference the active SQL script or table definition in my code.

**Context to Provide** (Please fill in these details):
• **Implementation Style**: {e.g., Databricks Unity Catalog Row Filters / Microsoft Fabric RLS / Secure Views}
• **Target Table**: {Insert Catalog.Schema.TableName}
• **Filter Column**: {e.g., Region, TenantID}
• **Admin Role**: {Insert Admin Role}

**Requirements**:
Please provide the SQL commands that handle the following:

• **Security Logic**:
  1. Filter the rows based on the Filter Column.
• **Action**:
  1. Create a row filter function or security predicate that checks the current user's identity or group membership (e.g., using `current_user()` or a mapping table). 
  2. Apply this filter to the target table so that users in the Admin Role see all rows, but standard users only see their assigned rows.

**Output**:
• Provide the SQL code block containing the function/predicate definition and the command to apply it to the table.
