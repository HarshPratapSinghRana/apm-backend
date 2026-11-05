---
name: playbook-design-11
description: "It will provide fact/dimension table identification, relationship mapping tables (cardinality, cross-filter, active/inactive), role-playing dimension and bridge"
---

Act as a **Semantic Model Architect** tasked with designing a **Star Schema** for Power BI / Microsoft Fabric using the fact and dimension tables in the attached Excel file.

**Context to Provide** (Please attach your Excel file and fill in these details if applicable):
• **Business Domain**: {e.g., Retail Sales, Financial Reporting, HR Analytics}
• **Primary BI Tool**: {e.g., Power BI Premium, Microsoft Fabric}

**Requirements**:
Please analyze the attached data and extract the specific design components for the Semantic Model:

• **Data Modeling Core**:
  1. **Fact Tables**: Identify fact table(s), their grain, foreign keys, and measures.
  2. **Dimension Tables**: Identify dimension tables with primary keys and attributes.
• **Relationships Definition**:
  1. Define From Table → To Table (Join Columns).
  2. Define Cardinality (1:M / M:1 / M:M).
  3. Define Cross-filter Direction (Single / Both).
  4. Specify Active vs Inactive (especially for role-playing dimensions).
• **Advanced Modeling**:
  1. Flag role-playing dimensions and suggest `USERELATIONSHIP()` patterns.
  2. Flag bridge tables and outline many-to-many handling.
• **Optimization & Storage**:
  1. Recommend the optimal storage mode per table (Import / DirectQuery / Dual).
  2. Identify high-cardinality columns that should be excluded from the model.
• **Calculations & Security**:
  1. Suggest 5-10 base DAX measures derived from the metric columns.
  2. Identify sensitive/PII columns that require RLS (Row-Level Security) or CLS (Column-Level Security).

**Output**:
• Provide Markdown tables detailing all table relationships.
• Include a text-based star schema diagram.
• Output the DAX measures, optimization, and security recommendations in well-structured format.
