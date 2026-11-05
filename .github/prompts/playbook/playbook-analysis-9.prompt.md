---
name: playbook-analysis-9
description: "Executing this prompt will generate a production-ready Security Specification that bridges user identity with technical access enforcement across the stack. The"
---

Act as a **Senior Security Architect**. Design a comprehensive **Authentication (AuthN) and Role-Based Access Control (RBAC) flow** for a full-stack application and data platform. The goal is to ensure secure identity management and granular resource access across the entire stack.

**Context to Provide**:
• **Authentication Provider**: {e.g., Azure Entra ID, Auth0, AWS Cognito}
• **Application Stack**: {e.g., React Frontend, Node.js Backend, Snowflake/Synapse Data Warehouse}
• **User Personas**: {e.g., Admin, Data Engineer, Business Analyst, Operational User}
• **Security Standard**: {e.g., OAuth 2.0 / OpenID Connect}

**Requirements**:
Please provide a step-by-step security implementation guide including:

• **Authentication & Identity Flow**:
1. Define the **Identity Provider (IdP)** integration flow for the frontend and backend using JWT (JSON Web Tokens).
2. Explain the **Token Validation** logic (signature, issuer, and expiration checks) at the API Gateway or Backend layer.
• **RBAC Matrix & Persona Mapping**:
1. Create a **Permissions Matrix** mapping your User Personas to specific actions (Create, Read, Update, Delete) across UI elements and API endpoints.
2. Show an example of how **Scopes/Claims** within the JWT are used to enforce these permissions.
• **Data-Level Security (Row-Level/Column-Level)**:
1. Provide a **SQL or PySpark snippet** demonstrating how to implement Row-Level Security (RLS) based on the user's authenticated identity.
2. Explain how to mask sensitive columns for restricted personas.
• **Backend & Frontend Enforcement**:
1. Show a **Middleware code snippet** (e.g., in Node.js/Python) that intercepts requests to verify if a user has the required "Role" before executing the logic.
2. Explain the strategy for **Conditional Rendering** in the frontend to hide UI elements based on the user's role.

**Output Format**:
• Use standard Markdown.
• Include distinct blocks for Auth logic (Middleware) and SQL/RLS policies.
• Provide a "Security Audit Checklist" at the end.
