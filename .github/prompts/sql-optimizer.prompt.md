---
name: sql-optimizer
type: prompt
version: 1.0.0
description: Optimized prompt template for analyzing slow SQL queries, missing indexes, and execution plans
---

Analyze the following SQL query for execution performance:

```sql
{{input_query}}
```

Provide:
1. Identified performance bottlenecks (e.g. Table Scan, Missing SARGability, N+1 queries).
2. Recommended index creation statements (`CREATE NONCLUSTERED INDEX`).
3. Refactored high-performance SQL query with estimated cost reduction.
