---
name: playbook-design-10
title: "Document ingestion runbook (how-to-run, restart logic, troubleshooting steps)"
type: prompt
category: "Prompt Playbook"
subcategory: "Detailed Design"
stage: "Design"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "design", "data-factory", "sql-server", "etl"]
description: "It will provide a comprehensive Markdown runbook outlining the system architecture and prerequisites, step-by-step execution commands using code blocks for both local and production environments, and targeted restart and recovery procedures featuring bold warnings for distinct destructive actions. Additionally, it will include a troubleshooting table mapping common symptoms to fixes with specific log search queries, and validation steps to verify system recovery and health."
---

# Document ingestion runbook (how-to-run, restart logic, troubleshooting steps)

Act as a **Senior Site Reliability Engineer (SRE) / Technical Writer** tasked with creating a detailed **Document Ingestion Runbook** for our data pipeline.

**Context to Provide** (Please fill in these details):
• **Ingestion Tool/Language**: {e.g., Python Script / Azure Data Factory / Java application / Shell Script}
• **Source System**: {e.g., SFTP Folder / REST API / SharePoint / Kafka Trend}
• **Target/Destination**: {e.g., Azure Blob Storage / AWS S3 / SQL Database}
• **Trigger Mechanism**: {e.g., Cron Job / Event Grid Trigger / Manual execution via CLI}
• **Logging Location**: {e.g., Azure Monitor / Local .log files / Splunk}
• **Restart Strategy**: {e.g., Delete partial files and re-run / Resume from last Checkpoint ID}

**Requirements**:
Please create a runbook that serves as a "First Responder" guide for the document ingestion process. The document must be structured as follows:

• **System Overview**:
  1. Briefly explain the architecture (Source -> Processing -> Target).
  2. List critical prerequisites (e.g., VPN connection, specific User Identity).
• **Standard Operating Procedures (How-to-Run)**:
  1. Provide the exact step-by-step commands to start the ingestion service locally and in production.
  2. Include the required environment variables or configuration flags.
  3. Structure: Use separate code blocks for different environments (e.g., DEV vs PROD).
• **Restart & Recovery Logic**:
  1. **Graceful Shutdown**: How to stop the process without corrupting data.
  2. **Recovery**: If the job fails halfway, do we need to clean up partial files? Or does the system automatically handle duplicates?
  3. **Force Restart**: How to clear the "watermark" or "offset" to re-process old documents if needed.
• **Troubleshooting Guide**:
  1. Create a "Symptom -> Potential Cause -> Fix" table.
  2. Include common errors specific to the tools listed above (e.g., API Rate Limits, File Lock issues, Auth Token expiration).
  3. Provide 2-3 specific log search queries or grep commands to find errors quickly.
• **Validation**:
  1. How does the engineer know the system is healthy after a restart? (e.g., Check row counts, verify file timestamps).

**Output Format**:
• Use standard Markdown.
• Use bold warnings for destructive actions (like deleting data).
• Use code blocks for all terminal commands.
