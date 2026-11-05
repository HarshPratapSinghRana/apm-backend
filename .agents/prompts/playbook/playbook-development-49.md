---
name: playbook-development-49
title: "Implement Perspectives (consumer-friendly views)"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "power-bi", "fabric", "sql-server", "cicd", "etl"]
description: "Agent will generate a production-ready automation suite designed to curate semantic model metadata into functional Perspectives. It will provide a modular C# script for bulk object assignment within Tabular Editor, a TMSL JSON payload for direct XMLA deployment, and a technical runbook to ensure idempotent execution and metadata integrity across your Power BI or Fabric environments."
---

# Implement Perspectives (consumer-friendly views)

**Role**:
You are a Principal Power BI & Fabric Semantic Model Architect responsible for designing enterprise-scale, consumer-friendly semantic models and automating metadata deployments.

**Task**:
Generate automated scripts (Tabular Editor C# and TMSL JSON) to create and assign Perspectives (consumer-friendly views) within an enterprise semantic model.

**Context**:
We need to programmatically define and deploy curated views of our enterprise semantic model to ensure business users only see the tables, measures, and columns relevant to their specific domain, while hiding technical columns like foreign keys.

**Target Semantic Model**: {Add Model Name, e.g., Enterprise_Sales_Model}  
**Perspective Name 1**: {Add Perspective 1 Name, e.g., Executive_Summary}  
**Objects for Perspective 1**: {Add Objects 1, e.g., Tables: ['Sales', 'Date', 'Region']. Measures: ['Total Revenue', 'Gross Margin']}  
**Perspective Name 2**: {Add Perspective 2 Name, e.g., HR_Analytics}  
**Objects for Perspective 2**: {Add Objects 2, e.g., Tables: ['Employees', 'Date']. Measures: ['Headcount', 'Attrition Rate']}  
**Hide Foreign Keys?**: {Add YES or NO, e.g., YES - automatically exclude columns ending in 'ID' or 'Key' from all perspectives}

**Instructions**:
Provide the COMPLETE, copy-pasteable scripts. Do not use conversational filler. Output scripts in structured markdown blocks. Provide two distinct solutions: A Tabular Editor C# Advanced Script, and a TMSL (Tabular Model Scripting Language) JSON payload. The scripts MUST gracefully handle cases where the perspective already exists (idempotent execution).

**Requirements**:

• **Tabular Editor C# Advanced Script**:  
1. Generate a complete C# script that a developer can paste into Tabular Editor's Advanced Scripting window.  
2. Initialization: Create the perspectives defined in the User Context if they do not already exist.  
3. Bulk Assignment: Loop through the entire model. If a Table, Column, or Measure matches the Objects for Perspective arrays, assign ShowInPerspective["PerspectiveName"] = true.  
4. Consumer-Friendly Cleanup: If Hide Foreign Keys? is YES, dynamically loop through all columns in the assigned tables. If the column name ends with ID or Key, ensure it is NOT added to the perspective, ensuring business users only see clean dimensions and facts.

• **TMSL JSON Payload (For XMLA Endpoint Deployment)**:  
1. Generate the TMSL JSON script to create the perspectives and assign a sample table/measure to them.  
2. Provide the createOrReplace or alter command structure targeted at the Target Semantic Model.  
3. Include the perspectives array at the model level.  
4. Show the exact JSON schema required to map a table and a measure to the newly created perspective.

• **Operational Runbook (Validation and Deployment)**:  
1. Provide a brief, 3-step Markdown runbook for the CI/CD or BI team.  
2. Step 1: Execute the C# script locally against a .pbip or Model.bim file.  
3. Step 2: Deploy the TMSL payload via SQL Server Management Studio (SSMS) or a Fabric deployment pipeline using the XMLA endpoint.  
4. Step 3: Validate the perspectives using the Personalize visuals or Analyze in Excel features to ensure the consumer views are correctly restricted.

**Output Format**:  
Format everything in Markdown

1. **Complete Tabular Editor C# Advanced Script code block**  
2. **TMSL JSON Payload script code block**  
3. **Operational Runbook details for Validation and Deployment**
