---
name: playbook-architecture-3
title: "Define Semantic model architecture and data modeling strategy"
type: prompt
category: "Prompt Playbook"
subcategory: "Architecture & Design"
stage: "Architecture"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "architecture", "power-bi", "data-modeling", "security"]
description: "It will provide a structured Markdown document featuring a high-level executive summary of the semantic layer, a concrete modeling strategy recommendation tailored to your BI tool (e.g., Star Schema for Power BI), a categorized list of proposed Fact and Dimension tables based on your inputs, specific architectural solutions for your stated data complexities (like SCD types or bridge tables), and a Mermaid.js ER diagram visualizing the proposed data relationships."
---

# Define Semantic model architecture and data modeling strategy

Act as an expert Data Architect and Analytics Engineer. We are in the design phase for our analytics platform and need to define a robust **Semantic Model Architecture and Data Modeling Strategy**.

Here is the context for our business domain and data requirements:
- **Business Domain:** [e.g., E-commerce Retail / Healthcare Claims / SaaS Subscription Metrics]
- **Target BI/Analytics Platform:** [e.g., Power BI / Looker / Tableau]
- **Key Business Events (Facts):** [e.g., Orders placed, Payments processed, User logins, Subscriptions canceled]
- **Core Entities (Dimensions):** [e.g., Customers, Products, Time, Geography, Store Locations]
- **Data Complexities/Pain Points:** [e.g., Products change categories over time, complex Many-to-Many relationships between Users and Accounts, slow query performance on current flat tables]
- **Primary Consumers:** [e.g., Financial analysts needing granular data, Execs needing high-level daily dashboards]

Based on this context, please generate a comprehensive **Semantic Model Architecture & Data Modeling Strategy** document.

Please structure the document in Markdown format with the following sections:

• **Executive Summary:** A high-level overview of the proposed semantic layer architecture and how it addresses the stated business needs and pain points.
• **Modeling Strategy Recommendation:** A recommended modeling approach (e.g., Star Schema, Snowflake, Data Vault, or OBT) with the rationale for why it fits this specific BI platform and use case.
• **Core Facts & Dimensions:** A mapped breakdown of the central Fact tables (metrics, granularity) and surrounding Dimension tables (attributes, hierarchies) derived from the inputs.
• **Design Patterns for Complexities:** Specific recommendations for handling the identified pain points, such as Slowly Changing Dimensions (SCDs), role-playing dimensions, or bridge tables for many-to-many relationships.
• **Conceptual Architecture (Mermaid.js):** A Mermaid.js ER diagram code block visualizing the proposed conceptual data model so I can copy/paste it into Confluence.

Ensure the tone is professional, concise, and focused on self-service analytics readiness, governance, and query performance.
