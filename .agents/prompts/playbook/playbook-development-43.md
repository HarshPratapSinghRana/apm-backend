---
name: playbook-development-43
title: "Create the semantic model dataset in Power BI / Fabric"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "power-bi", "fabric", "data-modeling"]
description: "Azure BI Playbook prompt for Create the semantic model dataset in Power BI / Fabric"
---

# Create the semantic model dataset in Power BI / Fabric

Act as a **Senior Data Engineer / Power BI Developer** tasked with creating a **Semantic Model dataset** in Power BI from scratch. 

**Context to Provide** (Please fill in these details):
• **Data Source**: ADLS Gen2 Container
• **ADLS Endpoint/URL**: {Insert your ADLS workspace URL or connection details}
• **Authentication Method**: {e.g., Organizational Account / Entra ID / Account Key}
• **Tables to Import**: {
  1. `FactBR`
  2. `DimProduct` (Key: ProductID)
  3. `DimDistributor` (Key: DistributorID) }

**Requirements**:
Please provide step-by-step instructions on how to build this model from scratch, including:

• **Data Ingestion**:
  1. How to connect Power BI Desktop to the specific ADLS container.
  2. How to navigate the file system to locate and import the required tables (Parquet/CSV).
• **Power Query / Transformation**:
  1. Any required steps to promote headers or change data types before loading the data into the model.
• **Data Modeling & Relationships**:
  1. How to establish the relationships between `FactBR` and the dimension tables (`DimProduct` and `DimDistributor`).
  2. Specify the expected Cardinality (e.g., 1 to Many) and Cross-filter direction for each relationship.

**Output**:
• Provide a clear, numbered step-by-step guide starting from opening a blank Power BI file to finalizing the relationship view.
• Include any best practices for naming conventions or hiding foreign keys in the report view.
