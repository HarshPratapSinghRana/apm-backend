---
name: playbook-development-1
description: "The prompt will generate a comprehensive data profiling framework for the specified data source, designed to evaluate structure, quality, and statistical charac"
---

Perform comprehensive data profiling on below sources
Source:
**Provide System Context here**

**Profiling Requirements:**

• Total row count and column count
• Data types for each column
• Null count and null percentage per column
• Duplicate row count (full row duplicates)
• Unique value count per column
• Summary statistics for numeric columns (min, max, mean, median, std dev)
• Top 10 value distribution for categorical columns (count + %)
• Identify data quality issues:
• Columns with >30% nulls
• Constant columns
• High cardinality columns
• Skewed numeric distributions

**Generate:**
• Optimized SQL queries for SQL Server profiling
• Or PySpark/Pandas code as per the feasibility for other sources.
• Output results in a structured summary report format
• Ensure scalability for large datasets
