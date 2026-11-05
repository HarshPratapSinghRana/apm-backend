---
name: playbook-development-24
description: "It will provide a standalone deduplication code block that isolates unique records using a window function on the business keys, and raises a descriptive error "
---

Act as a **Senior Data Engineer** tasked with the implementation of **Data Deduplication Logic** for a specific DataFrame in my notebook.

**Context to Provide** (Please fill in these details):
• **Target DataFrame**: {e.g., df_sales}
• **Business Key(s)**: {e.g., "TransactionID", "StoreID"}
• **Tie-Breaker Column**: {e.g., "ModifiedDate" desc}

**Requirements**:
Please generate the code to deduplicate the Target DataFrame based on the uniqueness of the Business Keys provided above.

• **Window Function Strategy (Preferred)**:
  1. Use a Window function (`row_number()`) partitioned by the Business Keys.
  2. Order by the Tie-Breaker Column to keep the latest record.
  3. Filter the result to keep only the row where `rn == 1`.
• **Validation**:
  1. Include a quick assertion or print statement afterward to verify that `count()` matches `distinct(Business Keys).count()`.

**Output**:
• Provide a clean, copy-pasteable code block using the variable names provided.
• Include a brief comment on whether a `.repartition()` is recommended before this operation given the keys.
