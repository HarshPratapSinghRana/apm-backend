---
name: playbook-analysis-5
title: "Create consolidated summary document of all analysis findings"
type: prompt
category: "Prompt Playbook"
subcategory: "Analysis & Planning"
stage: "Analysis"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "analysis", "security", "data-profiling"]
description: "It will provide a consolidated Executive Summary document featuring a high-level overview of the discovery phase scope (systems and core entities), a categorized breakdown of key findings such as data volume and quality issues, and a structured table of architectural risks with proposed mitigations, along with clear next steps ready to be presented to business stakeholders and technical leadership."
---

# Create consolidated summary document of all analysis findings

Act as a Lead Data Architect. We have just completed the Data Analysis and Discovery phase for our upcoming data project. 

I have provided/attached several documents and notes from this phase (such as data profiling results, source-to-raw mappings, ER diagrams, and raw meeting notes). Please review the provided context and generate a consolidated Executive Summary document to present our findings to business stakeholders and technical leadership.

Please structure the document in Markdown format with the following sections:
• **Executive Summary:** A high-level overview of the discovery phase and its outcome based on the provided context.
• **Scope of Discovery:** The systems, core entities, and data volumes analyzed.
• **Key Findings:** A categorized list of the most important discoveries extracted from the documents (e.g., Data Volume, Data Quality issues, Security/PII identified).
• **Risks & Mitigations:** A table outlining any risks, blockers, or technical debt mentioned in the context, along with proposed mitigations.
• **Next Steps:** Recommended actions to move into the Architecture & Design phase.

Ensure the tone is professional, concise, and focused on business value and architectural readiness.
