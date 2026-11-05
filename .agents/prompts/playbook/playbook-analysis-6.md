---
name: playbook-analysis-6
title: "Assess data migration complexity and risks"
type: prompt
category: "Prompt Playbook"
subcategory: "Analysis & Planning"
stage: "Analysis"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "analysis"]
description: "It will provide a structured Markdown document featuring a high-level executive summary of the migration landscape, a mapped scope of the source-to-target environments, a categorized breakdown of architectural findings, a targeted table of technical risks with proposed mitigations, and a phased execution strategy including validation steps and a rollback plan based on your provided conte"
---

# Assess data migration complexity and risks

Act as an expert System Architect. We are in the planning phase for an upcoming system/platform migration and need to assess the technical complexity and implementation risks based on our current architecture. 

Here is the context for our current system and the planned migration:
- **Source Environment/Technology:** [e.g., On-Premises Monolithic Java Application / legacy REST API]
- **Target Environment/Technology:** [e.g., AWS EKS Microservices / GraphQL API]
- **Key Components/Integrations:** [e.g., 5 distinct modules, hardcoded Active Directory auth, cron-job batch processing, direct DB access]
- **Known Pain Points/Legacy Patterns:** [e.g., Tightly coupled database connections, lack of test coverage, heavy reliance on local file storage]
- **Migration Goals:** [e.g., Improve scalability, decouple components, zero downtime during switchover]

Based on this context, please generate a comprehensive **Technical Migration Complexity & Risk Assessment** document.

Please structure the document in Markdown format with the following sections:

• **Executive Summary:** A high-level overview of the migration landscape and the overall technical complexity based on the provided inputs.
• **Scope of Migration:** The source and target environments, core components, key integrations, and dependencies to be addressed.
• **Key Findings:** A categorized list of structural discoveries derived from the context (e.g., architectural tight-coupling, deprecated dependencies, or legacy patterns).
• **Risks & Mitigations:** A table outlining identified operational and technical risks (e.g., integration failures, untested code paths, or compatibility mismatches) along with proposed mitigations.
• **Migration Strategy:** A recommended phased execution plan based on component dependencies, suggested validation steps for post-migration checks, and a safe rollback strategy.

Ensure the tone is professional, concise, and focused on technical readiness.
