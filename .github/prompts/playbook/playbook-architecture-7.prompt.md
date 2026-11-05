---
name: playbook-architecture-7
description: "It will provide a structured Markdown document outlining a comprehensive governance strategy tailored to your chosen toolset. It will include a recommended work"
---

Act as an Enterprise Data Architect and BI Platform Owner. We are scaling our analytics platform and need to design robust **Cross-Workspace Sharing and Collaboration Patterns** to prevent data silos, reduce duplication, and govern access across different business units.

Here is the context for our organizational structure and toolset:
• **Core Platform/Technology:** [e.g., Power BI Service / Databricks Unity Catalog / AWS Data Mesh]
• **Key Teams/Domains involved:** [e.g., Central Data Engineering, Finance, Global Sales, Regional Marketing]
• **Current Pain Points:** [e.g., Every team creates their own siloed datasets, business logic is duplicated, and we lack a single source of truth]
• **Data Sensitivity & Governance:** [e.g., High security required; Finance data must be isolated, but aggregated sales data must be shared globally]
• **Desired Target State:** [e.g., A Hub-and-Spoke model where the central team provides certified datasets and domain teams build their own reports]

Based on this context, please generate a comprehensive **Cross-Workspace Sharing and Collaboration Architecture** document.

Please structure the document in Markdown format with the following sections:

• **Executive Summary:** A high-level overview of the proposed collaboration architecture and how it resolves the stated pain points (e.g., moving to a Hub-and-Spoke or Data Mesh model).
• **Workspace Topology:** A recommended structure for the workspaces/domains (e.g., separating Data/Engineering workspaces from Report/Consumption workspaces).
• **Publishing & Endorsement Workflow:** The lifecycle of a dataset from development to a "certified/promoted" shared asset ready for cross-team consumption.
• **Security & Access Controls:** Best practices for managing access (RBAC), implementing Row-Level Security (RLS) across boundaries, and data cataloging strategies.
• **Collaboration Architecture (Mermaid.js):** A Mermaid.js flowchart code block visualizing the flow of data from central data workspaces out to domain-specific consumption workspaces.

Ensure the tone is professional, governance-focused, and actionable for administrative setup.
