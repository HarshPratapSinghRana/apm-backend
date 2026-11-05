---
name: playbook-support-5
title: "Document published dataset SLAs (availability, freshness, latency)"
type: prompt
category: "Prompt Playbook"
subcategory: "Support & Maintenance"
stage: "Support"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "support", "fabric", "security", "cicd"]
description: "Agent generates a structured SLA documentation template in Markdown format for publishing datasets in the Azure DevOps Wiki. The template defines key SLA components including availability targets, data refresh frequency, and maximum latency between ingestion and Gold layer availability.  It also includes a Standard Operating Procedure (SOP) section outlining incident response steps if an SLA breach occurs, ensuring clear operational guidance. The result is a standardized, ready-to-publish documentation framework that supports governance, reliability, and clear communication with data consumers."
---

# Document published dataset SLAs (availability, freshness, latency)

**Role**:
You are a Lead Data Architect and Documentation Specialist specializing in Data Governance, Reliability Engineering (SRE for Data), and Technical Writing. You have expertise in defining measurable performance metrics that align data engineering outputs with business expectations.

**Context & Vision**  
The goal is to create a structured SLA documentation template for a published dataset to be hosted in the Azure DevOps Wiki. This document serves as a "Social Contract" between the Data Engineering team and downstream consumers (BI, Data Science, Product). It must move beyond vague promises by defining strictly measurable targets for availability, freshness, and latency, backed by a clear Standard Operating Procedure (SOP) for breach recovery.

**Project Configuration (Variables)**  
• **Dataset Name**: <Insert Dataset Name, e.g., Global_Sales_Gold>  
• **Primary Consumer**: <e.g., Finance Leadership, Marketing Analytics>  
• **Data Layer**: Gold (Consumption Layer)  
• **Platform**: Azure DevOps Wiki / Microsoft Fabric  

**Requirements & Constraints**

• **Pillar 1: Performance Benchmarks (The SLA)**  
1. **Availability**: Define the uptime percentage for the dataset (e.g., 99.9% availability) and the maintenance windows.  
2. **Freshness**: Specify the Data Refresh Frequency (e.g., T+1, Hourly, or Real-time).  
3. **Latency**: Define the maximum allowable delay (in minutes/hours) between the initial data ingestion and its availability in the Gold layer.  

• **Pillar 2: Operational Governance (The SOP)**  
1. **Incident Response**: Provide a clear "Breach Protocol" section detailing the steps taken if an SLA is missed.  
2. **Communication Plan**: Define who is notified (Stakeholders) and the estimated time to provide an Initial Root Cause Analysis (RCA).  
3. **Escalation Matrix**: List the contact points for Tier 1, Tier 2, and Tier 3 support levels.  

• **Pillar 3: Monitoring & Validation**  
1. **Metric Tracking**: Briefly describe how these SLAs are measured (e.g., "Measured via Azure Monitor custom logs").  
2. **Review Cycle**: Define how often the SLA is reviewed and updated (e.g., Quarterly).  

• **Pillar 4: Formatting Standards**  
1. **Markdown Optimized**: The output must be formatted specifically for Azure DevOps Wiki (supporting tables, bolding, and clear hierarchies).

**Output Format**

1. **SLA Header & Metadata Table**:  
(A section containing dataset metadata including dataset owners, version, status, and review cycle)

2. **Service Level Objectives (SLOs) Section**:  
(Visual tables defining Availability, Freshness, and Latency performance targets)

3. **Standard Operating Procedure (SOP)**:  
(A structured step-by-step incident response flow explaining detection, response, escalation, and recovery)

4. **Escalation Matrix**:  
(A clear table defining Tier 1, Tier 2, and Tier 3 contacts with responsibilities)

5. **Glossary of Terms**:  
(Definitions for T+1, Latency, Downtime, Availability, and Data Freshness to ensure shared understanding)
