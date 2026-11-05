---
name: playbook-analysis-6
description: "It will provide a structured Markdown document featuring a high-level executive summary of the migration landscape, a mapped scope of the source-to-target envir"
---

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
