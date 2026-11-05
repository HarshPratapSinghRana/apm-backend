---
name: playbook-design-9
description: "Azure BI Playbook prompt for Create an approach document for managed identity usage, Key Vault integration, credential storage and RBAC for storage & pipelines"
---

Role:
You are a Senior Azure Data Engineer responsible for designing secure, enterprise-grade data access architecture.

Context:
We need to implement secure, passwordless access from Azure services to data sources using Managed Identity, Azure Key Vault, RBAC, and secure networking. The goal is to eliminate hardcoded credentials, enforce least-privilege access, and follow Azure security best practices.

Environment:

Data Sources:
- <Add Data Source 1> (e.g., ADLS Gen2)
- <Add Data Source 2> (e.g., Azure SQL Database)
- <Add Data Source 3> (e.g., Cosmos DB, Blob Storage, REST API, etc.)

Services Accessing Data:
- <Add Service 1> (e.g., Fabric, Synapse, Databricks, Data Factory, Function App, etc.)
- <Add Service 2>

Task:
Create a practical Secure Data Access approach guide explaining how to securely authenticate and access the data sources using Managed Identity, Key Vault, and RBAC.

Requirements:

- Explain authentication using Azure AD and Managed Identity (System vs User Assigned)
- Define RBAC roles using least privilege (include access matrix table)
- Explain when and how to use Azure Key Vault for secrets
- Describe credential management strategy (prioritize passwordless access)
- Show secure access flow including authentication and authorization
- Define network security setup (Private Endpoints, firewall, disable public access)
- Provide step-by-step implementation using Azure CLI or PowerShell
- Include working code examples for connecting using Managed Identity
- Include troubleshooting guidance for common access issues
- Provide risks and mitigation table

Output Format:

- Markdown with clear headings and structured sections
- Include RBAC tables and Mermaid flow diagrams
- Include Azure CLI commands and code examples
- Keep content practical, developer-focused, and security-review ready
