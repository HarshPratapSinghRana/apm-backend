---
name: playbook-development-2
description: "The prompt will generate a comprehensive set of Azure Linked Service designs for multiple data sources. For each service, it will include detailed descriptions,"
---

You are an Azure ETL engineer.

Create a comprehensive set of linked service definitions for the following environments and sources:

Data lake storage (ADLS Gen2, Azure Blob Storage, OneLake)
Secrets management (Azure Key Vault)
REST APIs (with authentication)
Relational databases (SQL Server, PostgreSQL, Oracle, MySQL)
Cloud-native services (Snowflake, Databricks, Synapse, Fabric, etc.)

**For each linked service, generate:**
•Detailed description of the service
•Purpose
•Security considerations
•Connectivity requirements
•Authentication method
•Network constraints (private endpoints, firewall rules, VNET)
•Configuration Template (JSON / YAML / ARM / Terraform style)

**Include required properties**
•Parameterization for environment variables (dev/test/prod)
•Example values (mocked safely, do NOT include secrets)
•Optional properties with explanation
•Dependency & Ordering Notes

**Final Summary on** 
•Linked Service Name
•Type (ADLS / Blob / REST API / Database / Key Vault)
•Description
•Configuration Template
•Edge Cases & Recommendations
