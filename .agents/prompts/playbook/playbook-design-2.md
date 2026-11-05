---
name: playbook-design-2
title: "Document standardization rules (date format, currency normalization, etc.)"
type: prompt
category: "Prompt Playbook"
subcategory: "Detailed Design"
stage: "Design"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "design", "power-bi", "security"]
description: "It will generate a detailed standardization document based on the report provided."
---

# Document standardization rules (date format, currency normalization, etc.)

You are a data governance and document standardization expert.
Connect to Power BI Desktop with name **Provide name here**.

Create a comprehensive "Document Standardization Rules" specification. Consider the connected report for reference
The document should define clear, enforceable formatting and normalization rules for:
Date and time formats
Currency formatting and normalization
Number formatting (decimals, thousands separators)
Time zones
Text casing standards
Special characters and encoding
Country and region codes
Units of measurement
Boolean values
Null / missing values handling
File naming conventions
Versioning format

For each rule, provide:
Standard format
Examples of valid values
Examples of invalid values
Normalization logic (how non-standard values should be converted)
Rationale for the rule

Output format:
Use clear section headings
Use tables where helpful
Keep language precise and implementation-ready
Avoid vague recommendations
