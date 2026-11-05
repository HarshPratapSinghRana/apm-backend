---
name: playbook-analysis-8
description: "It will provide recommendation for physical and logical partitioning, file format and z-ordering strategy along with the detailed structured view of the data st"
---

** Provide System Context here:**
**For example:**
Technology used for example pyspark, sql.
Frequent Query pattern - filtered by date and region.
Occasional Query pattern - Customer Level data.
Ingestion volume - Billion
Frequency - Daily
Ingestion Type - Batch Incremental.
Years of data - 5

Act as a senior data engineer designing the system as mentioned in system context. Queries are primarily filtered frequent query pattern available in context, with occasional queries on occasional query pattern. Design an optimal partitioning strategy that minimizes data scanning and improves query performance. Consider partition pruning, data skew, high vs low cardinality columns, small file issues, and optimal file sizes. Provide recommendations, trade-offs, and example implementation.
