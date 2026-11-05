---
name: playbook-support-3
title: "Create lineage documentation for each published dataset"
type: prompt
category: "Prompt Playbook"
subcategory: "Support & Maintenance"
stage: "Support"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "support", "power-bi", "fabric", "databricks"]
description: "Agent provides a high-performance Python framework designed to bridge the gap between live platform metadata and static documentation. It delivers a specialized LineageAPIClient to interface with your target platform's REST APIs (handling complex authentication and rate-limiting) and a LineageDocWriter that translates raw API payloads into syntactically perfect Mermaid.js diagrams and Markdown tables. By automating the extraction of upstream and downstream dependencies, this framework ensures your data lineage documentation remains synchronized with your actual production environment, reducing manual overhead and increasing metadata transparency."
---

# Create lineage documentation for each published dataset

**Role**:
You are a **Principal Data Architect** and **Python Developer** responsible for designing automated metadata management, documentation, and **data lineage extraction frameworks**.

**Task**:
Generate a **complete, automated Python framework** that extracts **data lineage** from the specified data platform and dynamically generates a **Markdown documentation file** containing a **Mermaid.js lineage diagram**.

**Context**:
We need a **robust utility** to automatically trace **data lineage (upstream sources and downstream consumers)** for specific **data assets** and generate **visual documentation** that is **syntactically valid for Mermaid.js and Markdown**.

**Target Platform:** {Add Target Platform, e.g., **Databricks Unity Catalog** OR **Microsoft Fabric**}  
**Authentication Method:** {Add Auth Method, e.g., **Databricks PAT Token via env vars**, OR **Azure Service Principal (Client ID/Secret)**}  
**Target Asset ID/Name:** {Add Target Asset, e.g., **catalog_name.schema_name.table_name** OR **Fabric_Workspace_ID**}  
**Extract Column-Level Lineage?:** {Add YES or NO, e.g., **YES - map source columns to target columns**}  
**Output File Path:** {Add Output Path, e.g., **./docs/data_dictionary_and_lineage.md**}

**Instructions**:
Provide the **COMPLETE, copy-pasteable Python script**. Do **not use conversational filler**. Output code in **structured markdown blocks**. The Python code **MUST handle API pagination and rate limiting (HTTP 429)** gracefully. The **Mermaid.js output MUST be syntactically valid** (e.g., stripping out spaces or special characters from table names that break **Mermaid rendering**).

**Requirements**:

1. **The Lineage Extraction Client (LineageAPIClient)**

• Generate a **robust Python class** tailored strictly to the **Target Platform** and **Authentication Method**.  
• If **Databricks**: Use the **databricks-sdk** (w.system_schemas or **/api/2.0/lineage-tracking**).  
• If **Fabric**: Use **requests** and the **MSAL library** to hit the **Power BI Scanner/Admin REST APIs**.  
• The class must traverse **upstream (sources)** and **downstream (consumers/dashboards)** based on the **Target Asset ID/Name**.  
• Return a **standardized Python dictionary**: {"nodes": [{"id": "...", "type": "...", "name": "..."}], "edges": [{"source": "...", "target": "..."}]}.

2. **The Markdown and Mermaid Generator (LineageDocWriter)**

• Generate a **Python class** that parses the **standardized dictionary** into **documentation**.  
• Implement **clean_mermaid_id(name)** as a helper function to replace spaces, dots, and dashes with underscores so **Mermaid does not crash**.  
• Implement **build_mermaid_graph(lineage_dict)** to loop through nodes and edges to construct a valid **graph LR (Left-to-Right)** Mermaid block. Differentiate **node shapes** (e.g., **[(Database)] for tables**, **([Dashboard]) for Power BI reports**).  
• Implement **build_markdown_page(lineage_dict, mermaid_string)** to construct the final **.md layout** containing: an **H1 Header with the Target Asset Name** and a **Last Updated timestamp**, the **embedded Mermaid.js block**, a **Markdown table listing all Upstream Sources**, and a **Markdown table listing all Downstream Consumers**.

3. **Execution and Error Handling**

• Provide the **if __name__ == "__main__":** block.  
• It must **instantiate the client**, **fetch the data**, **pass it to the writer**, and **save it to the Output File Path**.  
• Include a **try/except block** to catch **Asset Not Found** or **API Unauthorized errors** and **log them clearly instead of throwing a massive stack trace**.

**Output Format**:

Format everything in **Markdown**

**The LineageAPIClient Python class code block**  
**The LineageDocWriter Python class code block**  
**The main execution script code block**
