# Terraform Compliance Guard Agent

**Artifact Name**: `terraform-compliance-guard`  
**Artifact Type**: `agent`  
**Version**: `1.0.0`  
**Category**: `DevOps & Security`  
**Author**: `Engineering Commons`  
**License**: `MIT`  
**Foundation**: [Checkov & tfsec Open Source IaC Rules](https://github.com/bridgecrewio/checkov)

---

## Overview

**Terraform Compliance Guard** is an automated Infrastructure as Code (IaC) governance agent. It audits Terraform HCL definitions and JSON execution plans (`tfplan.json`) against industry CIS Benchmarks before cloud resources are provisioned.

It acts as an automated security gate in developer workspaces and CI/CD pull request pipelines, preventing expensive security regressions and configuration drift.

---

## Supported Cloud Providers & Rules

| Category | AWS Provider Rules | Azure Provider Rules | Google Cloud (GCP) |
| :--- | :--- | :--- | :--- |
| **Network Security** | No `0.0.0.0/0` on Security Groups (SSH, RDP, DB ports) | NSG inbound rules restricted; no unrestricted management ports | No open VPC firewall rules for 0.0.0.0/0 |
| **Data Encryption** | S3 bucket SSE-KMS; EBS default encryption enabled | Storage Account HTTPS only, TLS 1.2+ minimum | Cloud Storage uniform bucket-level access |
| **Identity & Access** | Flag `AdministratorAccess` and wildcard IAM policies | Prevent `Owner` role assignments at subscription scope | Restrict Service Account User roles |
| **Resource Tagging** | Enforce `Environment`, `CostCenter`, `Owner` tags | Enforce resource group & resource tag propagation | Enforce resource labels across GCE and GCS |

---

## Usage in APM

```bash
company-apm install terraform-compliance-guard
```

Run security check on your workspace:
```bash
/agent terraform-compliance-guard --scan . --strict
```
