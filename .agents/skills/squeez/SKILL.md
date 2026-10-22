---
name: squeez
description: Hook-based token compressor for AI CLI hosts (Claude Code, GitHub Copilot CLI, Cursor, Antigravity, OpenCode). Compresses bash output up to 95%, collapses redundant calls, preserves exact identifiers through every summary, and enforces terse persona output. Use when user says "squeez", "compress tool output", "token compressor", or runs verbose commands.
license: Apache-2.0
metadata:
  author: claudioemmanuel
  version: "1.46.0"
---

# Squeez — Hook-Based Token Compressor

Squeez intercepts CLI operations, compresses bash and file outputs up to 95%, eliminates redundant calls across turns, and preserves exact identifiers (file paths, error trace lines, symbols) across summaries.

## Core Directives

1. **Output Compression**:
   - `git status`: Intercept and run as `git status --porcelain=v1 -b`, rendering a concise working-tree summary without collapsing exact paths into bare counts.
   - Package managers (`npm`, `pip`, `cargo`, `dotnet`): Strip intermediate progress tickers, retaining only final exit codes, installed versions, warnings, and errors.
   - Linters and type checkers (`mypy`, `eslint`, `tsc`, `dotnet build`): Surface failing rule IDs and exact source lines while discarding success noise.

2. **AST Signature-Mode Code Reads**:
   - When inspecting large codebases or dependencies, read symbols, function signatures, interfaces, and docstrings rather than full method implementations unless targeted edits are requested.

3. **Exact Identifier Preservation**:
   - Compressions must never omit or obscure variable names, module paths, line numbers, or error strings required for debugging.

4. **Net-Loss Guard**:
   - If an output cannot be reduced by at least 25% or compression causes ambiguity, bypass compression and return the original output.

5. **Terse Persona Injection**:
   - Drop conversational filler and pleasantries in favor of concise technical updates: `[file] [operation] [result]`.
