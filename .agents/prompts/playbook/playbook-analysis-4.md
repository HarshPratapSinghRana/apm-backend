---
name: playbook-analysis-4
title: "Document risks, assumptions & dependencies"
type: prompt
category: "Prompt Playbook"
subcategory: "Analysis & Planning"
stage: "Analysis"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "analysis", "security", "cicd", "data-profiling", "etl"]
description: "Agent generates a Markdown-based governance framework for managing Risks, Assumptions, and Dependencies (RAD) within Azure DevOps to ensure transparency and controlled project delivery.  The output includes a RAD Log Matrix to track risks, assumptions, and dependencies with impact level, mitigation plan, and ownership. It also defines an Azure DevOps tracking strategy using Boards work items and Wiki documentation for centralized governance.  Additionally, it provides a risk mitigation workflow for moving items from identified → mitigated, a reusable Acceptance Criteria template to validate dependency resolution, and a reporting framework with key metrics such as open risks, dependency aging, and mitigation progress."
---

# Document risks, assumptions & dependencies

You are a Senior Technical Project Manager and Azure DevOps Lead responsible for ensuring project governance, stakeholder transparency, and risk mitigation in enterprise-grade data and infrastructure initiatives.

Context & Vision
The goal is to document and track Risks, Assumptions, and Dependencies (RAD) to ensure project alignment and clear Acceptance Criteria. We need to proactively manage these factors within Azure DevOps to prevent roadblocks and ensure our delivery strategy is auditable and transparent.

Project Configuration
Project Type: [e.g., Data Platform Migration, Infrastructure Modernization, AI/ML Pipeline]
Target Management Tool: Azure DevOps (Boards/Wiki)
Risk/Dependency Horizon: [e.g., Duration of the project, e.g., 6 months]
Stakeholders: [e.g., Data Engineering Team, Security/Compliance, Business Owners]

Requirements & Constraints
Pillar 1: Risk Management
Identify potential technical and operational risks (e.g., data quality issues, security vulnerabilities, resource constraints).
Define mitigation strategies and contingency plans for high-impact risks.
Pillar 2: Assumptions & Dependencies
Document key assumptions (e.g., source system availability, data format stability).
Map technical and organizational dependencies (e.g., cross-team approvals, upstream pipeline readiness).
Pillar 3: Analysis Acceptance Criteria
Define measurable criteria for "Acceptance" for each risk mitigation or dependency resolution.
Ensure clear ownership and "Definition of Done" for management tasks in Azure DevOps.

Output Format 
Please provide the response in Markdown including:
RAD Log Matrix: A table tracking Risks, Assumptions, and Dependencies with impact levels and ownership.
Azure DevOps Strategy: Best practices for using Work Items (Risk/Issue types) and Wiki pages for tracking.
Mitigation/Resolution Workflow: A step-by-step process for moving a risk from "Identified" to "Mitigated."
Acceptance Criteria Template: A reusable checklist for validating that a dependency has been successfully resolved.
Reporting Framework: Key metrics to track (e.g., number of open dependencies, risk aging).
