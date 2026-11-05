---
name: playbook-development-40
description: "It will provide a scalable, auditable, and configurable script for purging."
---

You are an experienced data engineer who wants to clean up the workspaces by implementing a data purge process for outdated or expired records.
Create a script for the below: 
Requirements:
1. Identify records eligible for purge based on:
• Retention policy (e.g., older than X days/months/years)
• Expiration date column
• Status flag (e.g., IsActive = false)
2. Parameterize retention period (config-driven, not hardcoded)
3. Support soft delete (flag update) OR hard delete (physical removal)
4. Log purge activity including:
• Table name
• Number of records deleted
• Execution timestamp
5. Handle large tables efficiently (batch deletes if needed)
6. Include error handling and transaction control
7. Make the process reusable for multiple tables
Follow best practices for performance, auditability, and recoverability.
