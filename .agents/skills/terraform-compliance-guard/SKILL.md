---
name: terraform-compliance-guard
description: Workflow skill instructions for Terraform Compliance Guard Agent
version: 1.0.0
---

# Terraform Compliance Guard Skill Instructions

## Workflow Steps

### Step 1: Discover & Parse Terraform Workspaces
1. Scan workspace for `*.tf`, `*.tfvars`, or `tfplan.json` files.
2. Parse resource blocks: `resource "aws_*"`, `resource "azurerm_*"`, `resource "google_*"`.

### Step 2: Evaluate Against Policy Engine
- For each resource, run AST inspection:
  - Check `tags` map for mandatory fields (`Environment`, `CostCenter`, `Owner`).
  - Check security group ingress CIDRs (`0.0.0.0/0` detection).
  - Check `server_side_encryption_configuration` or `enable_https_traffic_only`.

### Step 3: Synthesize Remediation Diff
Provide ready-to-apply HCL diff snippets fixing each detected violation:
```hcl
+ resource "azurerm_storage_account" "secure_sa" {
+   min_tls_version          = "TLS1_2"
+   enable_https_traffic_only = true
+ }
```
