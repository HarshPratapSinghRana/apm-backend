---
name: playbook-development-55
description: "It will provide HEX color palettes, DAX SWITCH(TRUE(), ...) color measures, icon set configurations, and data bar recommendations mapped to the provided metrics"
---

Act as an **Expert Power BI Developer** tasked with applying **conditional formatting** to my Power BI report using threshold-based rules, color semantics, and icons.

**Context to Provide** (Please fill in these details):
• **Metric 1**: {e.g., Profit Margin}
  • **Target/Threshold**: {e.g., Target is 20%. <15% is bad, 15-20% is okay, >20% is good}
  • **Direction**: {e.g., Higher is better}
• **Metric 2**: {e.g., Customer Churn Rate}
  • **Target/Threshold**: {e.g., Target is <5%. >8% is bad, 5-8% is warning, <5% is good}
  • **Direction**: {e.g., Lower is better}
• **Visual Types Used**: {e.g., Matrix table, KPI Cards, Bar Charts}

**Requirements**:
Please generate the exact rules, HEX color codes, and DAX measures needed:

• **Color Semantics & HEX Codes**:
  1. Recommend a color palette (Red/Yellow/Green or accessible alternatives like Orange/Blue) with exact HEX codes for Good, Warning, and Bad states.
• **DAX Color Measures**:
  1. Write the DAX measures using the `SWITCH(TRUE(), ...)` pattern that I can use for "Field value" based      conditional formatting (Background Color and Font Color).
• **Icon Rules**:
  1. Suggest which native Power BI icons (e.g., arrows, traffic lights, flags) to use for each metric.
  2. Provide the exact percentage/number thresholds to configure in the conditional formatting UI.
• **Data Bars**:
  1. Provide recommendations on where to apply Data Bars and how to configure the positive/negative axis colors.

**Output**:
• Provide the DAX code blocks clearly formatted.
• Include a well-structured Markdown response mapping the HEX codes, DAX, and icon rules to the provided metrics.
