---
name: token-hygiene
description: Audit current session for token waste. Use when context feels slow, costs seem high, or before starting expensive work. Shows CLAUDE.md size, active MCP servers, skill count, and recommends cuts. Use when user says "check tokens", "audit context", "why is this expensive", or "token hygiene".
license: Apache-2.0
compatibility: Designed for Claude Code
metadata:
  author: leogallego
  version: "1.1"
---

# Token Hygiene Audit

Run these checks in order. Report findings as a table, then recommend top 3 actions.

## 1. CLAUDE.md Overhead

```bash
wc -l ~/.claude/CLAUDE.md 2>/dev/null
# Also check project-level
find . -maxdepth 2 -name "CLAUDE.md" -exec wc -l {} +
```

- Target: under 200 lines global, under 50 lines project
- Flag any over target with estimated per-message token cost (~5 tokens/line)

## 2. Active MCP Servers

Count servers contributing tool schemas to this session. Check:
- Project `.mcp.json` server count
- Which servers have `defer_loading: true`
- Estimate: ~1,300 tokens per server (21 tools), ~46,000 for GitHub MCP alone

Report: `N servers active, ~X estimated schema tokens`

## 3. Skill Inventory

```bash
ls ~/.claude/skills/ | wc -l
find ~/.claude/skills/ -name "SKILL.md" -exec wc -l {} + | sort -rn | head -10
```

- Flag skills over 200 lines
- Flag skills missing `disable-model-invocation` that are tool-driven (not conversational)
- Count enabled plugins in settings.json

## 4. Context Utilization

Advise user to run `/context` to see breakdown. Interpret the output:
- Over 50% = quality degradation starting, recommend `/compact`
- Over 70% = recommend `/compact [focus]` with specific preservation instructions
- Over 83% = auto-compaction imminent, `/compact` now or `/clear` if switching tasks

## 5. Cache Health

Check for recent cache-breaking actions:
- Was `/model` or `/effort` changed this session?
- Were MCP servers connected/disconnected?
- Was `/compact` run recently?

If yes, note that cache is rebuilding and next few turns will be more expensive.

## 6. Model Tier Check

- What model is the session currently on?
- Is `/fast` mode enabled? It runs at frontier-model cost for faster output — flag if left on for routine, non-urgent work.
- If the current model is the most expensive available tier, sanity-check it against the task: boilerplate/routine work should default cheaper and escalate only on demonstrated need (see token-optimizer's `references/model-selection.md` for the full ladder).

## 7. Session Pattern Check

- How many turns so far? (Over 30 = recommend `/clear` + progress.md)
- Any large unfiltered bash output in history? (Recommend PostToolUse hooks)
- Are there unused files loaded into context? (Recommend line-range reads)

## Report Format

```
## Token Hygiene Report

| Check | Status | Value | Action |
|-------|--------|-------|--------|
| CLAUDE.md | OK/WARN | N lines | Trim to X |
| MCP Servers | OK/WARN | N active | Defer X |
| Skills | OK/WARN | N loaded | Override X |
| Context | OK/WARN | N% used | /compact |
| Cache | OK/WARN | warm/cold | Avoid switching |
| Model tier | OK/WARN | model (+fast?) | Downgrade for routine work |
| Session age | OK/WARN | N turns | /clear if >30 |

### Top 3 Recommendations
1. ...
2. ...
3. ...
```
