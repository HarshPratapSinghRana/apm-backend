---
name: playbook-development-9
description: "It will provide the code block or JSON configuration required to deploy scheduled time-based and event-driven storage triggers, detailing concurrency rules and "
---

Act as a **Senior Data Engineer / DevOps Specialist** tasked with the design and implementation of **Pipeline Triggers (Scheduled & Event-Based)** for our data ingestion workflows.

**Context to Provide** (Please fill in these details):
• **Orchestration Platform**: {e.g., Azure Data Factory (ADF) / Synapse / Databricks Jobs}
• **Target Pipeline/Notebook Name**: {e.g., PL_Master_Ingest / Ingest_Daily_Raw}
• **Output Format Needed**: {e.g., ARM Template (JSON) / Python (DAG) / PowerShell Script}

**Requirements**:
Please generate the configuration or code to create the following two types of triggers based on the Orchestration Platform listed above.

**Scheduled Trigger (Time-Based)**
• **Name**: Trigger_Daily_Batch
• **Frequency**: {e.g., Daily / Weekly}
• **Time**: {e.g., 06:00 UTC}
• **Concurrency**: Ensure that if the previous run is still running, the new run {e.g., Queues / Does not start / Runs in parallel}.

**Event-Based Trigger (Storage Events)**
• **Name**: Trigger_On_File_Arrival
• **Event Source**: {e.g., Azure Blob Storage}
• **Event Type**: {e.g., BlobCreated / ObjectCreated}
• **Path Filter**:
  1. **Container/Bucket**: {e.g., raw-data}
  2. **Folder/Prefix**: {e.g., landing/sales/}
  3. **File Extension**: {e.g., .csv / .parquet}
• **Logic**: The trigger should pass the `@triggerBody().fileName` (or equivalent) as a parameter to the pipeline.

**Output**:
• Provide the exact code block or JSON definition required to deploy these triggers.
• If using a UI-based tool (like ADF), provide a bulleted list of the standard settings to configure.
• Include a comment on how to start/activate the trigger after deployment.
