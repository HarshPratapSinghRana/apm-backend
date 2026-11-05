---
name: playbook-deployment-2
title: "Implement parameterized deployments across environments"
type: prompt
category: "Prompt Playbook"
subcategory: "Deployment & CI/CD"
stage: "Deployment"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "deployment", "databricks", "pyspark", "data-factory", "sql-server", "security", "cicd", "etl"]
description: "It will provide a standard Markdown implementation guide featuring configuration management strategies with example file structures, code snippets for dynamic parameter reading, a skeleton CI/CD YAML pipeline for multi-environment deployments, instructions on securing credentials without committing them to Git, and a concluding best practices checklist."
---

# Implement parameterized deployments across environments

Act as an **Expert DevOps & Data Engineer** tasked with the design of a comprehensive **Parameterized Deployment Strategy** for a specific data ingestion pipeline. The solution must support multiple environments (DEV, QA, PROD) using a "Build Once, Deploy Many" approach.

**Context to Provide** (Please fill in these details):
• **Ingestion Pattern**: {e.g., Batch ETL / Real-time Streaming / CDC / File-Based}
• **Primary Processing Tool**: {e.g., Azure Data Factory / Databricks (PySpark) / AWS Glue / Kafka / Python Script}
• **Orchestration/CICD**: {e.g., Azure DevOps (YAML) / GitHub Actions / Jenkins / Airflow}
• **Configuration Storage**: {e.g., JSON files / Environment Variables / Azure App Config / HashiCorp Vault}

**Requirements**:
Please provide a step-by-step implementation guide including:

• **Configuration Management Strategy**:
  1. How to separate code from configuration for this specific stack.
  2. Example structure for config files (e.g., config.dev.json vs config.prod.json) or variable groups.
• **Code/Script Modifications**:
  1. Show a code snippet of the Ingestion Logic (in the language of the Primary Processing Tool) demonstrating how to read these parameters dynamically at runtime, preventing hard-coded values.
• **CI/CD Pipeline Template**:
  1. Provide a skeleton YAML/Script for the deployment pipeline.
  2. Show specifically how to inject environment-specific variables (Storage Accounts, Connections Strings, Compute Sizing) during the Build and Release phases.
• **Security & Secrets**:
  1. Explain how to handle sensitive credentials (passwords, API keys) for this stack without committing them to Git.

**Output Format**:
• Use standard Markdown.
• Include distinct blocks for code (Python/SQL/YAML).
• Provide a "Best Practices" checklist at the end.
