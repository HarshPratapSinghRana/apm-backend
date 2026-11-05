---
name: playbook-design-7
title: "Create an approach document for partitioning strategy, dependency & trigger strategy, retry & timeout policies"
type: prompt
category: "Prompt Playbook"
subcategory: "Detailed Design"
stage: "Design"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "design"]
description: "Technologies: ADB and ADF for batch processing  The prompt will deliver a practical, implementation-focused guide for designing distributed data pipelines, covering partitioning, dependency management, and retry/timeout strategies. It explains how to choose partitioning columns and techniques for scalability and query performance, details trigger types and provides retry and timeout policies to ensure reliability and prevent cascading failures. The document includes examples and best practices for each strategy and concludes with a concise summary table of recommendations."
---

# Create an approach document for partitioning strategy, dependency & trigger strategy, retry & timeout policies

You are a senior data engineer specialized in optimizations / orchestration / reliability
Create a technical approach document that outlines best strategies for the below
The document should include the following sections:
**Partitioning Strategy**
• Explain the purpose of partitioning
• Describe common partitioning techniques (e.g., by time, by key, by hash).
• Include considerations for scalability, performance, and data skew.
• Provide examples of when to use each partitioning approach.
• How to decide the partitioning column

**Dependency & Trigger Strategy**
• Define dependency management between tasks or services.
• Describe types of triggers (e.g., time-based, event-based, completion-based).
• Explain strategies for handling complex dependency graphs.
• Include examples of how triggers interact with dependencies to start tasks efficiently.

**Retry & Timeout Policies**
• Describe common retry strategies (e.g., fixed interval, exponential backoff, max attempts).
• Provide guidelines for setting timeout values per task type.
• Include examples of policies for handling failures and preventing cascading errors.

**Technologies: Provide context here**
