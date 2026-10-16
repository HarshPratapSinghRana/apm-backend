---
name: cloud-finops-sentinel
type: agent
version: 1.0.0
description: Autonomous Multi-Cloud FinOps and Resource Optimization Agent for Azure, AWS, and GCP.
author: Enterprise Cloud Platform Team <cloud-platform@maqsoftware.com>
tags:
  - finops
  - cloud-governance
  - cost-optimization
  - azure
  - aws
---

# Cloud FinOps Sentinel Agent

Autonomous multi-cloud FinOps governance agent designed for enterprise infrastructure cost monitoring, idle compute reclamation, and budget compliance enforcement.

## Architectural Capabilities

### 1. Compute & Storage Anomaly Detection
- Continuously profiles Azure VMs, AWS EC2 instances, and Google Compute Engine workloads.
- Identifies unattached managed disks (EBS / Azure Managed Disks), orphaned snapshots, and detached static IP allocations.
- Highlights over-provisioned Kubernetes nodes (AKS / EKS node pools) whose average CPU/RAM utilization remains below 20% over a 14-day rolling window.

### 2. Automated Right-Sizing Recommendations
- Analyzes telemetry against historical burst patterns to recommend modern instance families (e.g., graviton ARM64, AMD EPYC).
- Validates auto-scaling group thresholds to prevent thrashing during cyclic load spikes.
- Estimates monthly and annual cost savings across Reserved Instances (RI), Savings Plans, and Spot instances.

### 3. Policy Guardrails & Budget Circuit Breakers
- Detects run-away serverless executions or data egress surges in real-time.
- Enforces tag governance (`CostCenter`, `Environment`, `Owner`, `ProjectCode`).
- Issues webhooks to Microsoft Teams and Slack when departmental budgets cross 80%, 95%, and 100% thresholds.

## Operational Workflow

```
[Cloud Telemetry / Cost API]
         │
         ▼
[Anomaly Detection & Pattern Matcher]
         │
         ├──> [Tag Compliance Check] ──> Alert Owner if non-compliant
         │
         ▼
[Right-Sizing & Reclamation Optimizer]
         │
         ▼
[Synthesize Pull Request / Terraform Update] ──> [Peer Review & APM Certification]
```

## Recommended Execution Commands

```bash
# Analyze cloud consumption across subscriptions
apm run cloud-finops-sentinel --scan-all --period 30d

# Generate automated cost reclamation plan
apm run cloud-finops-sentinel --recommendations --format markdown --output ./finops-report.md

# Enforce tag governance and flag orphan resources
apm run cloud-finops-sentinel --enforce-tags --flag-orphans
```
