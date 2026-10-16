---
name: cloud-finops-sentinel
description: Workflow skill instructions for Cloud FinOps Sentinel Agent
version: 1.0.0
---

# Cloud FinOps Sentinel Skill

This skill guides engineering teams on auditing, analyzing, and reducing infrastructure expenses across cloud tenants.

## Inspection Checklist

1. **Unattached Disks & IPs**:
   - Query Azure Resource Graph or AWS Cost Explorer for unattached volume IDs.
   - Verify volumes with zero I/O for > 7 days.

2. **Database Over-Provisioning**:
   - Inspect DTU/vCore utilization on Azure SQL and Amazon RDS.
   - Recommend Serverless or auto-pause for development and staging environments.

3. **Storage Tiering**:
   - Identify blob containers / S3 buckets without lifecycle rules.
   - Enforce transition to Cool or Archive storage tiers after 90 days.

4. **Tagging Validation**:
   - Verify presence of required tags: `CostCenter`, `Environment`, `Owner`.
