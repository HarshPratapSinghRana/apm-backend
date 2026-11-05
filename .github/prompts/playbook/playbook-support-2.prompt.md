---
name: playbook-support-2
description: "It will generate the script for framework handling: Standardized dataset governance Enforceable schema stability Transparent SLAs Embedded data quality Automate"
---

Create a standardized Data Contract framework for all published datasets in our data platform.
**Provide system Context**
The solution should include:
1. Data Contract Structure
Define a reusable template (YAML or JSON) that includes:
• Dataset metadata (name, domain, owner, steward, description)
• Versioning (semantic versioning support)
• Schema definition:
        o	Field name
        o	Data type
        o	Nullable flag
        o	Default value
        o	Description
        o	Example value
        o	PII classification
        o	Allowed values 
• Primary keys
• Foreign keys
• Partitioning strategy
• Data freshness expectations
• Retention policy
• Access classification (public/internal/confidential/restricted)

2. SLAs / SLOs Section
Include:
• Refresh frequency
• Data availability SLA (e.g., 99.9%)
• Freshness threshold (e.g., data < 2 hours old)
• Incident response time
• Escalation contacts
• Backfill policy

3. Data Quality Rules
Support:
• Not null constraints
• Uniqueness constraints
• Referential integrity checks
• Accepted values
• Range checks
• Regex validation
• Volume anomaly detection
• Freshness validation
• Custom SQL checks
Provide example DQ rules in Great Expectations or SQL format.

4. Lineage Definition
Include:
• Upstream source systems
• Source tables
• Transformation layer (e.g., Bronze → Silver → Gold)
• Transformation logic reference (dbt model, Spark job, etc.)
• Downstream consumers
• BI dashboards using the dataset

5. Validation & Automation
Generate:
• CI/CD validation strategy
• Schema drift detection logic
• Backward compatibility rules
• Contract enforcement example in Python
• Example integration with dbt

6. Output Requirements
• It should be automated and reusable and should be able to do it for all the tables under the provided unity catalog and schema.
• Use YAML format
• Include inline documentation comments
• Ensure it is production-ready and enterprise-grade
