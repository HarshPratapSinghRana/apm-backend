---
name: playbook-development-52
title: "Build report navigation and information architecture (home page, sections, drill paths)"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "power-bi"]
description: "It will provide an optimal navigation model, landing page strategy, page breakdown, drill-through/drill-down paths, and Power BI native UI element recommendations (Navigators, Bookmarks, filter panes, back buttons) for an app-like experience."
---

# Build report navigation and information architecture (home page, sections, drill paths)

Act as an **Expert Power BI Architect and UX Designer** tasked with designing the **Information Architecture and Navigation Flow** for a new Power BI report.

**Context to Provide** (Please fill in these details):
• **Report Purpose**: {e.g., Enterprise Financial Performance, Global Supply Chain Tracking, HR Employee Retention}
• **User Personas**: {e.g., Executives who need quick summaries, Analysts who need row-level detail, Regional Managers who only look at their territory}
• **Key Subject Areas/Modules**: {e.g., Overview, Revenue Analysis, Cost Breakdown, Regional Performance, Transaction Details}
• **Data Granularity**: {e.g., High-level aggregated KPIs down to individual invoice/employee level}

**Requirements**:
Please provide a comprehensive architecture plan based on the provided context, including:

• **Navigation & Structure**:
  1. **Overall Navigation Pattern**: Suggest the best structural model (e.g., Hub & Spoke, Left-hand Navigation Menu, Top-tabbed Navigation, App-style) and explain why.
  2. **Home Page / Landing Page Strategy**: What should the user see first? How should it guide them to other sections?
  3. **Page/Section Breakdown**: Provide a logical mapping of the report pages, including the primary focus of each page.
• **Interactivity & UI**:
  1. **Drill Paths**: Give specific recommendations for Drill-through pages (e.g., moving from a regional summary to a specific store's details), Drill-downs within visuals (hierarchies), and the use of custom Report Page Tooltips to save space.
  2. **UI/Navigation Elements**: Provide recommendations on using Power BI native features (Page Navigators, Bookmark buttons, hidden filter panes, back buttons) to create a seamless app-like experience.

**Output**:
• Provide a well-structured Markdown response.
• Include clear layout recommendations and navigational blueprints.
