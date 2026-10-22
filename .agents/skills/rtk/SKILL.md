---
name: rtk
description: Rust Token Killer (RTK) CLI proxy and output compressor. Filters and condenses verbose shell command outputs (git status, test runs, build logs, file listings) by up to 90% before context injection. Use when user says "rtk", "filter terminal output", "compress bash", or runs heavy CLI commands.
license: Apache-2.0
metadata:
  author: rtk-ai
  version: "1.0.0"
---

# RTK — Rust Token Killer

Prefix every shell command with `rtk`: `rtk git status`, `rtk cargo test`,
`rtk npm run build`, `rtk ls src/`. Keep the prefix inside chains:
`rtk git add . && rtk git commit -m "msg"`. Commands RTK has no filter for
run as-is, so the prefix is always safe.

# Command output

Command output here is condensed to save tokens, keeping every signal and
dropping costly noise. Treat it as the complete result: run commands
normally, and batch related commands into one call to avoid extra turns.
Truncated results state their recovery path in their own output. Re-run a
command as `rtk bypass <cmd>` only when its result is unusable: empty when
output was clearly expected, contradicting its exit code, or garbled.

## About RTK

RTK (Rust Token Killer) is a CLI proxy that filters command output to save
tokens; behavior and exit code are unchanged.

- `rtk gain` / `rtk gain --history` - token savings, overall and per command.
- `rtk bypass <cmd>` - run a command unfiltered, still tracked.
- `RTK_DISABLED=1 <cmd>` - skip RTK for one command.
- `rtk discover` - find past commands RTK could have condensed.

## What RTK Does

RTK intercepts shell commands and compresses their output before your agent reads it:

| Operation | What RTK does to the output |
|-----------|-----------------------------|
| `git status` | Condensed porcelain format, collapsing unchanged paths |
| `git log` / `git diff` | Extracts hunk summaries, removes repetitive metadata |
| `ls` / `tree` | Tree format with depth limit, collapsed noisy directories |
| `cargo test` / `dotnet test` / `pytest` / `npm test` | Suppresses passing assertions, isolates failing traces and line numbers |
| `npm run build` / `cargo build` | Strips intermediate progress, surfaces warnings and errors |
