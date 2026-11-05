---
name: playbook-development-25
description: "It will provide a markdown block with PySpark snippets that examine your active notebook to identify event time and numeric columns, branch the pipeline into cu"
---

Act as a **Senior Data Engineer / Streaming Architect** tasked with proposing a design pattern for **Late Data Handling and Outlier Detection** based on my current notebook.

Review the code in my active editor. I need to plan how to handle anomalies in this pipeline. Please analyze the dataframes and transformations visible and suggest a code pattern (without modifying my file yet) for the following:

**Requirements**:

• **Late-Arriving Data Strategy**:
  1. Identify which column logically serves as the Event Time.
  2. **Proposal**: Show me a code snippet for splitting the stream into two paths:
     • `df_current`: Data within a defined threshold (e.g., last 3 days).
     • `df_late`: Data older than the threshold (to be routed to a quarantine table).
  3. **Question**: Should this be a filter, a separate branch, or a specific Watermark strategy given my current code structure?
• **Outlier Detection Strategy**:
  1. Identify which Numerical Value column is the best candidate for anomaly detection.
  2. **Proposal**: Suggest a snippet to calculate a Z-Score or static threshold logic.
  3. **Action**: Show how to add an `is_outlier` flag (Boolean) to the main DataFrame rather than dropping the rows.
• **Validation**:
  1. Suggest a quick query or print statement I can add to the end of the job to monitor the count of "Late" vs. "Outlier" records per batch.

**Output**:
• Provide the suggestions in a Markdown block with comments explaining the logic.
• Do not overwrite existing code; just draft the new logic for me to review.
