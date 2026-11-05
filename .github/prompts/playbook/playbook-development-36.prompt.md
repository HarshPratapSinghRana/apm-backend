---
name: playbook-development-36
description: "It will generate a production-ready script that validates whether the specified catalog and schema exist in Unity Catalog and creates them if they do not exist,"
---

Create a production-ready module for Databricks that publishes Delta tables to Databricks Unity Catalog.
System Context:
**Provide system context here**
catalog_name, schema_name, Table, source, publish mode.

Requirements:
Create script to publish the data in databricks unity catalog as per the above system context provided.

Validate that:
Catalog exists (create if not exists optional flag)
Schema exists (create if not exists optional flag)
Handle schema evolution if merge_schema=True
Return success/failure status
