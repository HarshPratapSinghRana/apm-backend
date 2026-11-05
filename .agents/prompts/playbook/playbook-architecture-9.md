---
name: playbook-architecture-9
title: "Define authentication, authorization, and access control model"
type: prompt
category: "Prompt Playbook"
subcategory: "Architecture & Design"
stage: "Architecture"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "architecture", "security"]
description: "It will generate a structured security document detailing the authentication protocols (like OAuth2/OIDC) and MFA strategies tailored to your IdP. It will construct a clear RBAC or ABAC permission matrix mapping your specific personas to CRUD actions, provide guidelines for row-level constraints or data masking, and output a Mermaid.js sequence diagram illustrating the secure login and token validation workflow."
---

# Define authentication, authorization, and access control model

Act as an expert Security Architect and Identity Access Management (IAM) Specialist. We are building/upgrading our platform and need to define a comprehensive **Authentication, Authorization, and Access Control Model**.

Here is the context for our application and security requirements:
• **System Overview:** [e.g., A B2B SaaS application / An internal HR reporting dashboard / A customer-facing e-commerce site]
• **Identity Provider (IdP) / Tools:** [e.g., Azure AD (Entra ID) / Okta / Auth0 / AWS Cognito]
• **Key User Roles/Personas:** [e.g., Super Admin, Tenant Admin, Standard User, Read-Only Guest, System API accounts]
• **Authorization Model Preference:** [e.g., Role-Based Access Control (RBAC) / Attribute-Based Access Control (ABAC)]
• **Data Sensitivity & Compliance:** [e.g., Contains highly sensitive PII, subject to GDPR and SOC2 / Basic public retail data]

Based on this context, please draft a comprehensive **Access Control & Identity Model** document.

Please structure the document in Markdown format with the following sections:

• **Executive Summary:** A high-level overview of the proposed security model and chosen standards (e.g., OAuth 2.0, OpenID Connect, SAML).
• **Authentication Strategy:** The method for verifying identity, including recommendations for Single Sign-On (SSO), Multi-Factor Authentication (MFA), and token lifecycles.
• **Authorization & Access Matrix:** A structured table mapping the provided User Roles to specific system permissions (Create, Read, Update, Delete) across core domains.
• **Granular Security Controls:** Recommendations for implementing data-level restrictions, such as Row-Level Security (RLS) or data masking based on the user's role.
• **Authentication Flow Diagram (Mermaid.js):** A Mermaid.js sequence diagram visualizing the user login flow, token issuance, and resource validation.

Ensure the tone is professional, secure-by-design, and ready for review by our InfoSec team.
