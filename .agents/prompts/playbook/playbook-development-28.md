---
name: playbook-development-28
title: "Implement data quality rules programmatically (Great Expectations / Custom)"
type: prompt
category: "Prompt Playbook"
subcategory: "Development & Implementation"
stage: "Development"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "development", "pyspark", "data-profiling"]
description: "It will provide a validation code block inserted before the final write step that applies rules for completeness, uniqueness, validity, and format, splits the data into a valid_df and an error_df with an appended failure_reason column, and routes the invalid records to a separate error table while allowing the valid data to continue down the pipeline."
---

# Implement data quality rules programmatically (Great Expectations / Custom)

Act as a **Data Quality Engineer** tasked with adding a **Data Quality Validation Step** to the current notebook for the processing layer. Reference the active dataframe/table in my code to implement a programmatic check before writing data to the next layer.

**Context to Provide** (Please fill in these details):
• **Implementation Style**: {e.g., Great Expectations / PySpark / Pandas}
• **Completeness Target**: {e.g., ColumnName}
• **Uniqueness Target**: {e.g., KeyColumn}
• **Validity Target & Range**: {e.g., NumericColumn, Min-Max}
• **Format Target & Regex**: {e.g., StringColumn, Pattern}

**Requirements**:
Please scaffold a function or code block that enforces the following rules:

• **Data Quality Rules**:
  1. **Completeness**: Identify rows where the {Completeness Target} is null.
  2. **Uniqueness**: Identify duplicates based on the {Uniqueness Target}.
  3. **Validity**: Ensure the {Validity Target} is within the specified {Min-Max} range.
  4. **Format**: Ensure the {Format Target} matches the required Regex {Pattern}.
• **Execution Logic**:
  1. Separate the data into `valid_df` (passed checks) and `error_df` (failed checks).
  2. Add a `failure_reason` column to `error_df` indicating which rule was broken.
• **Action on Failure**:
  1. If `error_df` is not empty, write it to a separate location/table named `_error_records` and proceed with `valid_df`.

**Output**:
• Insert the code block directly after the transformation logic but before the final write.
