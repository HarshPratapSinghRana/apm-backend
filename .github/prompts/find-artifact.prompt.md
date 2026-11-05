---
name: find-artifact
description: Find and recommend the best-matching Engineering Commons AI artifacts for your task or engineering challenge
argument-hint: 'Describe your requirement or technical problem (e.g., "automated API tests with xUnit", "database migration safety", "FinOps")'
---

Read the Engineering Commons catalog at `.github/skills/engineering-commons-advisor/references/catalog.json` and recommend the top 1-3 best-matching artifacts for the following developer need:

**User Requirement**: {{input}}

Follow the guidelines in the `engineering-commons-advisor` skill:
1. Explain why each artifact is the best match.
2. Outline key capabilities and use cases.
3. Provide the exact installation command (`engineering-commons install <name>`).
4. Detail how to invoke and execute the artifact with GitHub Copilot once installed.
