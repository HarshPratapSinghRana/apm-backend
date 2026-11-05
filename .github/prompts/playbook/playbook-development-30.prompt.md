---
name: playbook-development-30
description: "It will provide a well-formatted Markdown response containing \"before and after\" PySpark code snippets that optimize partitioning with repartition or coalesce"
---

Act as a **Senior Data Engineer / Spark Optimization Expert** tasked with optimizing the currently open PySpark notebook for **performance and memory efficiency**.

Review the code in my active editor. I am experiencing performance issues with this job (e.g., slow shuffles or spills). Please analyze the code and propose specific changes for:

**Requirements**:

• **Partitioning**:
  1. Look at my read and write steps.
  2. Suggest if I should add `repartition()` or `coalesce()` based on the transformations used, or if I should change the `partitionBy` column in the final write.
• **Caching**:
  1. Identify any DataFrames that are reused multiple times in the logic.
  2. Suggest where to insert `.cache()` or `.persist()` and where to `.unpersist()` them.
• **Join Strategy**:
  1. Look at my joins. If any DataFrame appears small (like a lookup table), refactor the code to use a `broadcast()` join hint.
• **Configuration**:
  1. Based on the volume of data processed in this script, suggest 3 key Spark configurations (like `spark.sql.shuffle.partitions`) I should set at the top of the notebook.

**Output**:
• Provide the optimization suggestions in a well-formatted Markdown response.
• Include refactored code snippets where applicable, clearly explaining the "before" and "after" impact.
