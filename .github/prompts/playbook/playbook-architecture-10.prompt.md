---
name: playbook-architecture-10
description: "It will provide a structured consumption strategy document that maps your specific user personas to their optimal query methods (e.g., Extract vs. Live Connecti"
---

Act as a Lead Data Architect and BI Strategist. We are finalizing the presentation layer of our data platform and need to comprehensively **Define Data Consumption Patterns** for reports, dashboards, and ad-hoc queries.

Here is the context for our data consumers and platform capabilities:
• **Core Data Storage / Warehousing:** [e.g., Snowflake / Google BigQuery / AWS Redshift]
• **Primary BI / Reporting Tools:** [e.g., Tableau / Power BI / Looker / Metabase]
• **Primary Consumer Personas:** [e.g., C-Suite Execs (mobile dashboards), Financial Analysts (heavy ad-hoc Excel users), Data Scientists (Jupyter notebooks)]
• **Performance Requirements:** [e.g., Sub-second response for dashboards, tolerance for minutes on large analytic queries]
• **Current Bottlenecks:** [e.g., Too many direct queries to the Data Warehouse slowing it down / Reports timing out / Uncontrolled ad-hoc queries causing cost spikes]

Based on this context, please draft a comprehensive **Data Consumption Architecture & Strategy** document.

Please structure the document in Markdown format with the following sections:

• **Executive Summary:** A high-level overview of the tailored consumption strategy designed to balance performance, cost, and user experience.
• **Dashboard & Reporting Patterns:** Define the architectural approach for standard reporting (e.g., using imported/extracted extracts, materializing views, or leveraging BI caching layers).
• **Ad-Hoc Querying & Exploration:** Establish the boundaries, tools, and guardrails for power users performing ad-hoc analysis (e.g., DirectQuery/Live Connection usage, dedicated query clusters, or sandbox workspaces).
• **Data Export & External Tooling:** Governance around the use of 'Analyze in Excel', API endpoints for custom apps, and data extraction limits.
• **Consumption Flow Diagram (Mermaid.js):** A Mermaid.js flowchart visualizing how different user personas route through various BI tools, caching layers, and ultimately hit the underlying database.

Ensure the tone is practical, performance-oriented, and governs cost while maximizing self-service capability.
