---
name: playbook-design-3
description: "It will provide a conceptual data model breakdown featuring core business entities with concise definitions and key attributes, explicit relationships with card"
---

Act as an expert Data Modeler and Enterprise Architect. I am in the data discovery and design phase and need to create a Conceptual Data Model to understand the core business entities and their relationships.

Here is the context for our project:
**Business Domain / Use Case:** {Insert Domain, e.g., E-commerce Sales / Healthcare Patient Records / SaaS Billing}
**Key Entities or Raw Tables identified so far:** {Insert 3-7 main entities, e.g., Customers, Orders, Products, Invoices, Payments}

Based on this context, please generate the initial Entity-Relationship (ER) structure:
• **Core Entities:** Provide a list of the main business entities with a brief, 1-sentence business definition for each. Include 2-3 key attributes (like primary keys or major descriptive fields) just for context.
• **Relationships & Cardinality:** Define how these entities relate to each other. Specify the cardinality (1:1, 1:N, M:N) and state the business rule clearly (e.g., "1-to-Many: A Customer can place zero or many Orders, but an Order belongs to exactly one Customer").
• **Visual Diagram (Mermaid.js):** Generate a Mermaid.js ER diagram code block representing this conceptual model so I can copy/paste it into a Markdown viewer or Confluence to visualize the architecture.
