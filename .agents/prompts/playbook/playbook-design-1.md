---
name: playbook-design-1
title: "Document authentication mechanisms (OAuth, Service Principal, Keys, MI)"
type: prompt
category: "Prompt Playbook"
subcategory: "Detailed Design"
stage: "Design"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "design", "security", "cicd"]
description: "Azure BI Playbook prompt for Document authentication mechanisms (OAuth, Service Principal, Keys, MI)"
---

# Document authentication mechanisms (OAuth, Service Principal, Keys, MI)

Task:
Create a “Document Authentication & Access Control Requirements” section based on an existing authentication analysis.

User must provide:
- System/Application Name
- Deployment Environment(s) (Dev/Test/Prod)
- Supported Authentication Mechanisms (OAuth 2.0, Service Principal, API Keys, Managed Identity)
- User Types (end users, internal services, external integrations)
- Access Model (RBAC roles, permissions, least-privilege expectations)
- Compliance or Security Standards (if any)

Instructions:
Use the provided inputs and the completed authentication analysis to define authentication requirements, access control rules, and security controls (token lifecycle, secret management, auditing). Keep the content generic, concise, and implementation-ready for enterprise documentation.
