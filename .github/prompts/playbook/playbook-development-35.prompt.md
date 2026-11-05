---
name: playbook-development-35
description: "It will provide a PySpark/Delta Lake code block for writing the curated dataframe to the Gold layer with the specified write mode (Overwrite/Append/Merge), part"
---

Act as a **Data Engineer** tasked with publishing the curated dataframe to the **Data Publishing (Gold) layer** for analytics consumption. Reference the active dataframe in my code that holds the final transformed data.

**Context to Provide** (Please fill in these details):
• **Storage Destination**: {e.g., ADLS Gen2 / OneLake}
• **Target Storage Path**: {Insert Target ABFSS Path}
• **Write Mode**: {e.g., Overwrite / Append / Merge}
• **Partition Columns**: {Insert Partition Columns, or state 'None'}
• **Table Name**: {Insert Catalog.Schema.TableName}
• **Primary Key Column**: {Insert Primary Key Column - needed if Write Mode is Merge}

**Requirements**:
Please scaffold the code block that handles the following:

• **Implementation Style**: 
  1. Use PySpark and Delta Lake format.
• **Logic**:
  1. Write the dataframe to the target storage path using the specified write mode.
  2. If partitioning is needed, partition the data by the specified columns.
• **Action**:
  1. Save the data to the specified storage path and register it as a managed/external table named in the Metastore/Catalog.
  2. If the write mode is 'Merge', use the Primary Key Column as the merge condition.
  3. Include standard Delta maintenance commands (OPTIMIZE and VACUUM) immediately after the write operation.

**Output**:
• Insert the code block at the end of the script/notebook, directly after the final transformation logic.
