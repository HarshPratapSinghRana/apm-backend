---
name: git-smart-commit
type: command
version: 1.0.0
domain: Developer Productivity & Tooling
category: Developer Tools
description: Conventional Commits enforcement and semantic changelog generator command. Enforces standardized commit formats with zero external dependencies.
author: Developer Experience Guild <dx@maqsoftware.com>
tags:
  - git
  - conventional-commits
  - commitlint
  - developer-tools
  - cli
useCases:
  - Enforcing Conventional Commits specification locally and in CI/CD pull request gates
  - Automating semantic version bumping (SemVer) and release changelog generation
  - Standardizing git commit message headers and body syntax across engineering teams
argument-hint: 'Ask @copilot or engineering-commons-advisor for Conventional Commits enforcement, commit message linting, or Git hook setup'
---

# Git Smart Commit CLI Command

**Artifact Name**: `git-smart-commit`  
**Artifact Type**: `command`  
**Version**: `1.0.0`  
**Category**: `Developer Tools`  
**License**: `MIT`  
**Source**: [Conventional Changelog / Commitlint GitHub Repository](https://github.com/conventional-changelog/commitlint)

---

## Overview

`git-smart-commit` is a developer workflow CLI command that enforces the [Conventional Commits specification](https://www.conventionalcommits.org/) across local developer workstations and CI/CD pull request pipelines.

It ensures that commit messages follow semantic versioning standards, enabling automated release notes, semver version bumping, and clean git log histories.

---

## Rules & Syntax

Messages must match the following format:
```text
<type>(<optional scope>): <subject>

[optional body]

[optional footer(s)]
```

### Supported Types
- `feat`: A new user-facing feature.
- `fix`: A bug fix.
- `docs`: Documentation changes.
- `style`: Changes that do not affect the meaning of the code (white-space, formatting).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves performance.
- `test`: Adding missing tests or correcting existing tests.
- `build`: Changes that affect the build system or external dependencies.
- `ci`: Changes to CI configuration files and scripts.
- `chore`: Other changes that don't modify `src` or test files.
- `revert`: Reverts a previous commit.

---

## Command Usage

```bash
# Validate commit message before committing
npx git-smart-commit "feat(auth): add OAuth2 PKCE login support"

# Exit code 0 if valid, exit code 1 with actionable errors if non-conforming
```
