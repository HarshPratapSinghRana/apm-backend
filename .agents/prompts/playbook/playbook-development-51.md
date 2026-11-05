---
name: playbook-development-51
title: "Optimize model size (remove unused columns/tables)"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "power-bi", "fabric", "security"]
description: "Agent provides a highly specialized diagnostic framework designed to maximize the VertiPaq memory efficiency of your enterprise semantic models. It delivers a comprehensive C# \"Scanner Engine\" that utilizes native Tabular Editor dependency tracking to identify objects with zero model-level references while strictly protecting your vital technical keys and system columns. By automating the segregation of these candidates into a \"_TO_BE_DELETED\" folder, the agent facilitates a safe, metadata-driven cleanup process that bridges the gap between model development and report-level visual dependencies."
---

# Optimize model size (remove unused columns/tables)

**Role**:
You are a Principal Power BI & Fabric Semantic Model Architect responsible for model optimization, VertiPaq memory efficiency, and metadata governance across enterprise-scale datasets.

**Task**:
Generate a robust diagnostic suite and Tabular Editor C# Advanced Script to safely identify, flag, and optimize unused columns and tables to reduce the VertiPaq memory footprint.

**Context**:
We need a safe, metadata-driven approach to identify columns that have no dependencies within the semantic model (Measures, RLS, Relationships, etc.) while respecting vital system exclusions. Because Tabular Editor cannot see report-level visual usage, we will flag and segregate these columns for final human validation.

**Target Model:** {Add Model Name, e.g., Enterprise_Retail_Dataset}  
**Exclusion List:** {Add Exclusions, e.g., Columns ending in 'Key' or 'ID', or system columns like 'RowTimestamp'}  
**Segregation Strategy:** {Move all model-unused columns into a Display Folder called "_TO_BE_DELETED" and set IsHidden = true}  
**Output Format Required:** {Print a TSV/CSV list to the screen containing TableName, ColumnName, DataType, and DataCategory}

**Instructions**:
Provide the COMPLETE, copy-pasteable Tabular Editor C# Advanced Script. Do not use conversational filler. Output code in structured markdown blocks. The C# script MUST utilize Tabular Editor's native dependency tracking to determine if a column is actively used. DO NOT generate a script that automatically deletes columns.

**Requirements**:

• **Tabular Editor C# Script: The Unused Column Scanner**  
1. **Dependency Checking**: Loop through Model.AllColumns. Check if the column is referenced by Measures, Calculated Columns, Calculation Items, Relationships, Hierarchies, RLS, or SortBy columns.  
2. **Exclusion Logic**: Apply the Exclusion List rules to skip vital columns even if they appear unused in metadata.  
3. **Action and Segregation**: If a column has zero model dependencies and is not excluded, apply the Segregation Strategy (e.g., hide and move to a specific folder).  
4. **Audit Logging**: Output the flagged columns using the Output Format Required (TSV/CSV).

• **Best Practice Analyzer (BPA) JSON Rules**  
1. **Rule 1**: Flag columns with the DateTime data type to suggest splitting into Date and Time for better compression.  
2. **Rule 2**: Flag non-key String columns in Fact tables to highlight potential compression bottlenecks.

• **Operational Runbook: The Report Visuals Warning**  
1. Step 1: Run the C# Scanner Script.  
2. Step 2: Use third-party tools or Fabric Scanner APIs to cross-reference the list against report visual dependencies.  
3. Step 3: Delete the folder only after business confirmation regarding ad-hoc usage.

**Output Format**:  
Format everything in Markdown

### 1. Tabular Editor C# Script: The Unused Column Scanner

```csharp
/* Unused Column Scanner & Segregation Utility
   Principal Power BI & Fabric Semantic Model Architect
*/

using System.Text;
using System.Text.RegularExpressions;

var sb = new StringBuilder();
sb.AppendLine("TableName\tColumnName\tDataType\tDataCategory");

int count = 0;

foreach (var col in Model.AllColumns)
{
    // 1. Dependency Check
    bool isUsed =
        col.ReferencedBy.Any() ||
        col.UsedInRelationships.Any() ||
        col.UsedInHierarchies.Any() ||
        col.IsUsedInSortBy;

    // 2. Exclusion Logic
    bool isExcluded = Regex.IsMatch(col.Name, @"(Key|ID|RowTimestamp)$", RegexOptions.IgnoreCase);

    if (!isUsed && !isExcluded)
    {
        // 3. Action & Segregation Strategy
        col.DisplayFolder = "_TO_BE_DELETED";
        col.IsHidden = true;

        // 4. Audit Logging (TSV)
        sb.AppendLine(string.Format("{0}\t{1}\t{2}\t{3}",
            col.Table.Name,
            col.Name,
            col.DataType,
            col.DataCategory));

        count++;
    }
}

// Final Output
sb.Insert(0, "TOTAL UNUSED COLUMNS FLAGGED: " + count + "\n\n");
sb.ToString().Output();

Info("Scan Complete. Unused columns have been hidden and moved to '_TO_BE_DELETED'. Review the output list before final deletion.");
