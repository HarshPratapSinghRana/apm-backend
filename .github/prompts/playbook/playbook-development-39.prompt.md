---
name: playbook-development-39
description: "It will provide a masking function definition and ALTER TABLE command to obfuscate PII columns for unauthorized users, while allowing authorized roles to bypass"
---

Act as a **Data Security Engineer** tasked with implementing **Dynamic Data Masking** on sensitive columns in the data publishing (Gold) layer to obfuscate PII for unauthorized users. Reference the active SQL script or table definition in my code.

**Context to Provide** (Please fill in these details):
• **Implementation Style**: {e.g., Databricks Unity Catalog Data Masks / Microsoft Fabric Dynamic Data Masking}
• **Target Table**: {Insert Catalog.Schema.TableName}
• **Column Name**: {e.g., Email, PhoneNumber}
• **Masking Logic**: {e.g., '***@***.com', partial redaction, or default mask}
• **Authorized Role/Group**: {Insert Authorized Role/Group}

**Requirements**:
Please provide the SQL commands that handle the following:

• **Security Logic**:
  1. Mask the data in the specified Column Name.
• **Action**:
  1. Create a masking function/rule. The mask should format the data according to the Masking Logic.
  2. Apply the mask to the Target Table.
  3. Ensure that members of the Authorized Role/Group bypass the mask and see the plaintext data.

**Output**:
• Provide the SQL code block containing the masking function definition and the ALTER TABLE command to apply the mask.
