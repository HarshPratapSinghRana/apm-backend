---
name: vp-reporting
version: 1.0.0
description: Core workflow instructions for compiling VP briefings and engineering cost analytics
---

# VP Reporting Workflow Skill

## Overview
This skill automates the data extraction, aggregation, and synthesis steps necessary to generate weekly and monthly VP engineering reports.

## Workflow Steps
1. Query Azure DevOps pull request and work item throughput.
2. Ingest APM telemetry logs for agent and tool adoption rates.
3. Run cost analyzer across Databricks and Azure resources.
4. Correlate code review turnaround times with team reviewer badges.
5. Output formatted Executive Markdown and HTML summary tables.
