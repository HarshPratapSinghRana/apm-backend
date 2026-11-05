---
name: playbook-development-57
title: "Apply corporate themes & branding (color palettes, fonts, styles)"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "power-bi"]
description: "It will provide a complete, valid Power BI Theme JSON file with corporate dataColors, sentiment color mappings, global font styling across all text classes, and visual-level formatting for borders, backgrounds, and tooltips — ready to be imported directly into Power BI Desktop."
---

# Apply corporate themes & branding (color palettes, fonts, styles)

Act as an **Expert Power BI Developer and UI/UX Designer** tasked with creating a custom **Power BI Theme JSON file** to automatically apply corporate branding (colors, fonts, and visual styles) to my reports.

**Context to Provide** (Please fill in these details):
• **Theme Name**: {e.g., Corporate Standard Theme 2024}
• **Primary Data Colors (Hex codes)**: {e.g., #004B87, #00A3E0, #F2A900, #7A99AC, #E1E8EC, #333333}
• **Semantic/Status Colors**: {e.g., Good: #28A745, Neutral: #FFC107, Bad: #DC3545}
• **Background & Foreground**: {e.g., Page background: #F3F4F6, Visual background: #FFFFFF, Text color: #252423}
• **Typography / Font Family**: {e.g., Segoe UI, Arial, or Tahoma}
• **Visual Styling Preferences**: {e.g., Turn on visual borders with a 5px radius and light gray color, set visual titles to 14pt bold, set data labels to 10pt}

**Requirements**:
Please generate a complete, valid Power BI Theme JSON code block based on the provided guidelines:

• **JSON Configuration**:
  1. Include the `name` and `dataColors` arrays.
  2. Map the `good`, `neutral`, and `bad` sentiment colors.
  3. Create a `visualStyles` section that applies the font family globally (`*`) to all text classes (label, title, callout, header).
  4. Apply global visual formatting for borders, backgrounds, and tooltips based on the visual styling preferences.

**Output**:
• Provide the complete, valid JSON code block ready to be imported into Power BI Desktop.
