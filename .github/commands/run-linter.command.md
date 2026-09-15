---
name: run-linter
type: command
version: 1.0.0
description: AI Command to analyze code quality and run automated lint checks
---

# Run Linter Command

Executes linting checks against modified files in the active workspace.

## Execution Steps
1. Discover modified files in working directory
2. Run language-specific linter (`eslint`, `dotnet format`, etc.)
3. Format output diagnostics into structured markdown table
4. Suggest automated fixes for detected warnings and errors
