---
name: playbook-requirementgathering-4
title: "Define acceptance criteria for completing analysis phase"
type: prompt
category: "Prompt Playbook"
subcategory: "Requirement Gathering"
stage: "RequirementGathering"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "requirementgathering", "security", "cicd", "data-profiling"]
description: "Agent generates a Markdown-based framework for defining the Definition of Done (DoD) and Acceptance Criteria for the Analysis/Discovery phase of enterprise cloud projects managed in Azure DevOps.  The output includes a Master Acceptance Criteria template covering technical requirements (data mapping, architecture diagrams, source-to-target specifications) and business validation (stakeholder sign-offs, refined user stories). It also defines Analysis Quality Gates that must be completed before moving to the development phase.  Additionally, the framework explains how to map these criteria to Azure DevOps work items (Epics, Features, User Stories), provides an analysis sign-off checklist for project managers, outlines non-functional requirement discovery criteria (security, scalability, compliance), and includes guidance on using Copilot to refine acceptance criteria for individual user stories."
---

# Define acceptance criteria for completing analysis phase

You are a Senior Solution Architect and Business Analyst responsible for defining the Definition of Done (DoD) and Acceptance Criteria for the analysis and discovery phases of enterprise-grade cloud projects.

Context 
The goal is to define the acceptance criteria for completing the Analysis Phase within Azure DevOps. We need to ensure that before we move into the Development/Build phase, all technical requirements, risks, and stakeholder expectations have been validated, documented, and formally signed off to prevent scope creep and rework.

Project Configuration
Project Type: [e.g., Data Migration, Custom App Dev, AI Implementation]
Target Management Tool: Azure DevOps Work Items (Acceptance Criteria field)
Phase: Analysis / Discovery
Current Status: Partial (Copilot to generate templates)

Requirements & Constraints
Technical Acceptance Criteria
Define the requirements for data mapping, architectural diagrams, and source-to-target specifications.
Establish validation rules for technical feasibility assessments.
Business & Stakeholder Acceptance Criteria
Document requirements for functional sign-offs and user story refinement.
Define criteria for non-functional requirements (security, performance, compliance).
Analysis Quality Gates
Outline the "Definition of Done" for the Analysis phase (e.g., all high-priority user stories estimated, risk log updated).
Ensure criteria are written in a way that can be easily validated in Azure DevOps Work Items.

Output Format 
Please provide the response in Markdown including:
Master Acceptance Criteria Template: A categorized list of generic criteria for the Analysis phase.
Azure DevOps Work Item Mapping: How to structure these criteria within User Stories, Features, and Epics.
Analysis Sign-off Checklist: A final "Quality Gate" checklist for project managers.
Non-Functional Requirements (NFR) Criteria: Specific criteria for security and scalability discovery.
AI-Enhanced Refinement Guide: Tips on using Copilot to tailor these criteria for specific user stories.
