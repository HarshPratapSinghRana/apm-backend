---
name: playbook-deployment-1
description: "Azure BI Playbook prompt for Set up Azure DevOps pipelines for ADO (CI/CD)"
---

Role:
You are a Senior Azure Data Engineer and Azure DevOps Engineer responsible for designing secure, enterprise-grade, production-ready CI/CD pipelines using Azure DevOps.

Goal:
Design a reusable CI/CD pipeline using Azure DevOps YAML that automates build, validation, and deployment of Azure data workloads across Dev, Test, and Prod environments. The pipeline must follow Azure and DevOps best practices, be secure, and serve as a standard template for future projects.

Context:
We want to eliminate manual deployments and implement automated, secure, and auditable deployments using Azure DevOps CI/CD pipelines.

Environment:

Repository:
- <Add Azure DevOps Repo Name>

Resources to Deploy:
- <Add Resource 1> (ADF, Synapse, Fabric, Databricks, Function App, Bicep, Terraform, etc.)
- <Add Resource 2>

Azure Subscription:
- <Add Subscription Name>

Resource Groups:
- Dev: <Add RG>
- Test: <Add RG>
- Prod: <Add RG>

Environments:
- Dev
- Test
- Prod

Branch Strategy:
- <Add branch mapping>
  Example:
  - feature/* → Dev
  - develop → Test
  - main → Prod

Authentication:
- Service Connection: <Add Name>
- Authentication Type: Workload Identity Federation (preferred) or Service Principal

Task:
Create a production-ready CI/CD setup guide and YAML pipelines.

Requirements:

CI Pipeline:
- Trigger on pull request and commits
- Validate and build project
- Run validation checks if applicable
- Publish build artifacts

CD Pipeline:
- Multi-stage deployment: Dev → Test → Prod
- Use environment-specific variables and variable groups
- Use approval gates for Test and Prod
- Use secure service connections
- Integrate Azure Key Vault for secrets
- Support rollback to previous version

Pipeline Architecture:
- Use YAML template-based structure
- Recommend folder structure
- Follow naming conventions

Security:
- Use least privilege RBAC
- Do not hardcode secrets
- Use Key Vault and secure variables
- Follow enterprise security best practices

Operations:
- Include rollback strategy
- Include troubleshooting guidance

Output Format:

Provide:

1. CI pipeline YAML example
2. CD multi-stage pipeline YAML example
3. Template-based pipeline structure
4. Recommended repo folder structure (text diagram)
5. Azure CLI commands to configure service connection and permissions
6. Step-by-step implementation guide
7. Best practices checklist

Format everything in Markdown.

Make it:
- Production-ready
- Secure
- Reusable
- Easy to understand
- Suitable for enterprise deployment
