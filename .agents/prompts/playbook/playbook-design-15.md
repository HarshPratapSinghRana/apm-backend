---
name: playbook-design-15
title: "Define report layout, visual design, and UX strategy"
type: prompt
category: "Prompt Playbook"
subcategory: "Detailed Design"
stage: "Design"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "design", "power-bi"]
description: "It will provide a page structure blueprint, layout grid with visual placement zones, visual type recommendations per KPI/dimension, and UX/UI best practices for colors, slicers, navigation, and interactivity."
---

# Define report layout, visual design, and UX strategy

Act as an **Expert Power BI Developer and UI/UX Designer** tasked with designing a Power BI report and suggesting a comprehensive **layout and visual strategy**.

**Context to Provide** (Please fill in these details):
• **Business Goal**: {e.g., Track monthly sales performance, monitor supply chain logistics, analyze customer churn}
• **Target Audience**: {e.g., C-level executives, regional sales managers, daily operations team}
• **Key KPIs/Metrics**: {e.g., Total Revenue, Profit Margin, YoY Growth, Number of Active Customers}
• **Key Dimensions/Slicers**: {e.g., Date/Month, Region, Product Category, Salesperson}
• **Report Constraints**: {e.g., Needs to fit on a single page, needs a dark theme, must be mobile-friendly, max 5 visuals per page}

**Requirements**:
Please provide a detailed report design plan based on the provided context, including:

• **Report Architecture**:
  1. **Page Structure**: How many pages should the report have and what is the purpose of each?
  2. **Layout Grid**: For each page, suggest a layout (e.g., Top banner for KPIs, left pane for slicers, main body for charts).
• **Visuals & Interactivity**:
  1. **Visual Selection**: Recommend the best Power BI visual types for each metric/dimension and explain why.
  2. **UX/UI Best Practices**: Provide tips on colors, navigation, or interactions (drill-throughs, tooltips, bookmarks) to make the report more intuitive.

**Output**:
• Provide a clear, structured Markdown response outlining the page layouts and visual recommendations.
