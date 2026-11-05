---
name: playbook-architecture-11
description: "Prompt will generate a comprehensive Security Traceability Matrix and architectural guide. The AI will produce a step-by-step breakdown of how Identity Delegati"
---

Act as a Senior Data Security Architect specializing in the Microsoft Data Stack (Azure, Fabric, Power BI). Your task is to design an End-to-End Security Propagation Architecture that ensures a "Single Source of Truth" for security as data moves from the storage layer through the semantic model to the end-user report.

Context to Provide:
• Data Storage Layer: {e.g., ADLS Gen2, Fabric Lakehouse, Synapse SQL}
• Semantic Layer: {e.g., Power BI Semantic Model (Import/DirectLake), Analysis Services}
• Authentication Mechanism: {e.g., Service Principal, Managed Identity, User Delegation/SSO}
• Compliance Needs: {e.g., GDPR, HIPAA, Internal PII masking}

Requirements:
Please provide a detailed security propagation blueprint including:

• Storage Layer Security (Data):
1. Define the implementation of Row-Level Security (RLS) and Object-Level Security (OLS) at the SQL or Delta Lake level.
2. Explain the use of Microsoft Entra ID (Azure AD) passthrough to ensure the identity of the person viewing the report is the same identity hitting the database.
• Semantic Layer Security (Cube):
1. Define how DAX-based RLS roles in Power BI map to the underlying security filters in the data source.
2. Explain the strategy for External Contributor access—how to restrict specific tables or measures within the "cube" for different business units.
• Presentation Layer Security (Report):
1. Outline the Workspace-level permissions (Viewer, Contributor, Member) and how they interact with underlying data permissions.
2. Describe the propagation of Sensitivity Labels (Microsoft Purview) from the database to the Power BI dashboard to prevent unauthorized exports.
• Security Propagation Matrix:
1. Create a table showing the flow of a single user request: User Identity → Power BI App → Semantic Model → Data Engine → Storage, detailing where the "Gatekeeper" sits at each hop.

Output Format:
• Use standard Markdown.
• Include a clear Propagation Flow Diagram (text-based or Mermaid style).
• Provide an "E2E Security Audit Checklist" at the end.
