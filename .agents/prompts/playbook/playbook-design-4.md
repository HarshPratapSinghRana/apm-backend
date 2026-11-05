---
name: playbook-design-4
title: "Capture scalability, partitioning & data growth expectations"
type: prompt
category: "Prompt Playbook"
subcategory: "Detailed Design"
stage: "Design"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "design", "fabric", "synapse", "databricks", "etl"]
description: "Agent generates a Markdown-based architecture guide for planning performance, scalability, and data growth for the specified data platform (e.g., Databricks, Synapse, Fabric, Snowflake).  The output includes a Scalability Matrix for compute scaling strategies, a Partitioning Strategy Guide for optimal data partitioning and file sizing, and a Performance Monitoring Framework with key KPIs such as query latency, partition skew, and storage growth.  It also provides a Growth Projection Worksheet for estimating future data volumes and costs, along with a Technical Best Practices Checklist to optimize performance, handle schema evolution, and support high concurrency as the platform scales."
---

# Capture scalability, partitioning & data growth expectations

You are a Senior Data Architect responsible for designing high-performance, scalable, and future-proof data solutions.

Context
The goal is to document performance, scalability, and data growth expectations for our data platform using [INSERT YOUR TECHNOLOGIES, e.g., Azure Databricks, Microsoft Fabric, Snowflake, etc.]. We need to define clear strategies for data partitioning, distribution, and storage scaling to ensure our architecture remains robust as our data volume, velocity, and user concurrency increase.

Project Configuration
Technologies: [List your stack, e.g., Databricks, Synapse, Fabric]
Key Workloads: [e.g., Real-time streaming, Batch ETL, BI Reporting]
Growth Horizon: [e.g., 1-year, 3-year projections]

Requirements & Constraints
Pillar 1: Performance & Scalability
Define strategies for horizontal and vertical scaling for the compute resources identified in my technology stack.
Document concurrency handling strategies for end-users and reporting tools.
Pillar 2: Data Partitioning & Storage
Define best practices for data partitioning (e.g., by time, geography) to optimize query pruning.
Address storage growth expectations and cold/hot storage tiering for my chosen technologies.
Pillar 3: Growth & Maintenance
Include strategies for handling data drift and schema evolution.
Outline specific performance monitoring metrics relevant to my stack (e.g., partition skew, spill to disk, query latency).

Output Format 
Please provide the response in Markdown including:
Scalability Matrix: A comparison table for scaling approaches across the technologies I listed.
Partitioning Strategy Guide: Best practices for data partitioning and file sizing to avoid performance bottlenecks.
Performance Monitoring Framework: Key performance indicators (KPIs) to track growth and system health.
Growth Projection Worksheet: A template for documenting expected data volume, row counts, and storage costs.
Technical Best Practices Checklist: Guidelines for optimizing performance under high concurrency.
