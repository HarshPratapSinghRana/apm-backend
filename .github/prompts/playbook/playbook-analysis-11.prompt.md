---
name: playbook-analysis-11
description: "Azure BI Playbook prompt for Perform a query-level cost analysis to identify inefficient SQL or Spark operations that may cause unpredicted spikes in cloud cons"
---

Act as a Lead Data Engineer and Cloud Cost Optimization Specialist. I am providing the repository context / codebase for our data solution, which includes our data pipelines, transformation notebooks, SQL scripts, Delta MERGE operations, and schema definitions.
 
Please review this supplied context to perform a query-level cost analysis identifying inefficient SQL or Spark operations that may cause unpredicted spikes in cloud consumption.
 
Please structure the document in Markdown format with the following sections:
 
Executive Summary: A high-level overview of the cost-risk posture across the codebase and a required note stating: "This automated cost analysis was compiled from repository artifacts (notebooks, SQL scripts, Spark jobs, and pipeline definitions); final validation must be completed by platform engineers and domain data owners."

Layer-by-Layer Cost Analysis: A breakdown of the operations and code identifying cost risks at each stage:

Source/Ingestion (Bronze): Identify extraction queries using full-reload patterns, unbounded SELECT * without partition filters, or redundant data pulls from source systems.

Raw → Curated (Silver): Flag expensive JOIN operations, wide shuffles, CROSS JOINs, repeated full-table scans, transformations lacking predicate pushdown, and any MERGE INTO statements missing merge-key selectivity.

Curated → Semantic (Gold): Detect heavy aggregations, non-optimized GROUP BY operations, redundant re-computations of intermediate results, and missing caching or materialization of frequently reused DataFrames.

Pipeline Orchestration & Scheduling: Review pipeline scheduling cadence for overlapping concurrent runs, unnecessary sequential dependencies, idle compute windows, and jobs running at peak-cost time slots.

Flagged Operations Detail: For each flagged query or operation, provide:

Notebook / Script path and cell or step reference

Operation type (SQL query, Spark transformation, Delta MERGE, DataFrame action, etc.)

Cost concern category (full scan, shuffle-heavy, unbounded join, redundant recompute, missing partition pruning, schema evolution overhead, over-provisioned schedule)

Severity (High / Medium / Low) based on potential consumption impact

Recommended optimization (add filters, convert to incremental load, repartition, cache intermediate results, narrow column selection, adjust schedule, etc.)

Consolidated Risk Summary Table: A table listing all flagged operations ranked by estimated cost impact, with columns: Notebook/Script Path, Operation, Concern Category, Severity, and Recommendation.

Processing Cadence Review: A schedule-level analysis identifying notebooks or pipelines that run more frequently than data freshness requires, or that execute during peak-cost windows, with suggested cadence adjustments.

Cost Hotspot Visualization (Mermaid.js): A Mermaid.js horizontal flowchart (graph LR) code block visually mapping the data flow and annotating the high-severity cost hotspots you identified — highlighting which notebooks, queries, and tables contribute most to consumption spikes.
