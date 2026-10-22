---
name: token-optimizer
description: Use when restructuring Claude Code setup for cost efficiency — deep 5-minute audit of CLAUDE.md, settings, MCP servers, skills, hooks, and cache patterns. Use when user says "optimize my setup", "reduce costs", "token optimizer", "why is Claude expensive", or "audit my config". Not for quick context checks (use token-hygiene instead).
license: Apache-2.0
compatibility: Designed for Claude Code
metadata:
  author: leogallego
  version: "1.1"
---

# Token Optimizer

Deep audit of your Claude Code setup for token and cost efficiency. Produces a report with specific, actionable recommendations and estimated savings.

**This skill vs token-hygiene:** token-hygiene is a 30-second snapshot ("how's my context right now?"). This skill is a 5-minute deep analysis ("how should I restructure my entire setup?").

## Workflow

Run the audit script first, then dispatch subagents for each phase. Synthesize findings into the final report.

### Step 0: Gather Metrics

Run the audit script to collect raw data for all phases:

```bash
bash skills/token-optimizer/scripts/audit-context.sh
```

If the script is not available, gather manually:
```bash
# CLAUDE.md sizes
wc -l -w ~/.claude/CLAUDE.md 2>/dev/null
find . -maxdepth 3 -name "CLAUDE.md" -exec wc -l -w {} +

# Skills inventory
find ~/.claude/skills/ -name "SKILL.md" -exec wc -l {} + 2>/dev/null | sort -rn | head -15

# Settings
cat ~/.claude/settings.json 2>/dev/null
cat .claude/settings.json 2>/dev/null
cat .claude/settings.local.json 2>/dev/null

# MCP config
cat .mcp.json 2>/dev/null
cat ~/.claude/.mcp.json 2>/dev/null

# .claudeignore
cat .claudeignore 2>/dev/null || echo "MISSING"

# Hooks
grep -A5 '"hooks"' ~/.claude/settings.json .claude/settings.json 2>/dev/null

# Recent cache patterns from transcripts (cache_read_input_tokens: 0=miss, >0=hit)
project_dir=$(echo "$(pwd)" | sed 's/\//-/g')
find ~/.claude/projects/$project_dir -name "*.jsonl" -mtime -1 \
  -exec grep -c '"cache_read_input_tokens":0' {} + 2>/dev/null | head -5
```

### Step 1: Dispatch Audit Subagents

Launch these in parallel using Haiku subagents. Pass each agent the raw metrics from Step 0.

**Agent 1 — CLAUDE.md Audit:**
> Analyze these CLAUDE.md files for token waste. For each file report: line count, estimated token count (~0.75 tokens/word), what can be cut (generic advice, inferrable conventions, framework basics), what should move to skills or path-scoped rules, and what should stay. Reference `references/checklist.md` for thresholds. Target: global <200 lines/<500 tokens, project <50 lines.

**Agent 2 — Settings & Cache Audit:**
> Analyze these settings.json files against the recommended values in `references/settings-guide.md`. Flag: missing/wrong autocompact threshold (should be 60-70%), missing cache TTL extension, subagent model not set to Haiku, default effort level, missing session/daily limits. Check for VS Code autosave (`claudeCode.autosave: true`) which causes cache invalidation.

**Agent 3 — MCP & Tools Audit:**
> Analyze these MCP configs. For each server report two overhead estimates: (1) raw schema tokens if all tools are loaded (~1,300 tokens per 21 tools), and (2) effective overhead with Tool Search enabled (85-95% lower — Tool Search is on by default since v2.1.x and loads only relevant schemas per turn). Label both clearly so users know which applies if Tool Search is disabled. Check if each server has a zero-overhead CLI equivalent (gh, aws, gcloud, kubectl). Flag servers with >30 tools. Recommend consolidation.

**Agent 4 — Skills & Hooks Audit:**
> Analyze the skills inventory. Flag: skills over 200 lines, skills missing `disable-model-invocation: true` in frontmatter, total skill metadata overhead (~100 tokens each). Check hooks for verbose output filtering opportunities. Check .claudeignore existence and coverage.

**Agent 5 — Cache Pattern Analysis (optional, if transcripts exist):**
> Analyze cache hit/miss data from JSONL transcripts. The key field is `cache_read_input_tokens` — a value of 0 means cache miss, >0 means cache hit. Calculate hit rate per session. If hit rate is below 80%, flag it and suggest causes: model/effort switching mid-session, MCP server connect/disconnect, or VS Code autosave. Also check `cache_creation_input_tokens` for unusually large cache writes.

**Agent 6 — Model Selection Audit:**
> Analyze session JSONL transcripts for main-thread model usage (the `model` field per turn). For each session, report which model(s) were used, session length, and whether an escalation pattern is visible (started cheap, moved up) versus flat single-tier usage throughout. Reference `references/model-selection.md` for the task→model ladder. Flag sessions that ran entirely on the most expensive available tier (Opus/Fable) without any visible escalation from a cheaper model — note this only as a pattern to review, don't guess at task intent beyond what's in the transcript. Also check for `/fast` mode usage, which runs at frontier-model cost for speed; flag if it appears to be left on for routine work.

### Step 2: Synthesize Report

Collect all subagent findings. For each recommendation, estimate savings using `references/pricing.md`. Produce the report in the format below.

## Report Format

```markdown
# Token Optimization Report

Generated: [date] | Project: [directory name]
Estimated monthly savings: $X-Y (or N% reduction)

## Executive Summary

[2-3 sentences: biggest finding, estimated impact, effort level]

## Findings

### 1. CLAUDE.md Overhead
| File | Lines | Est. Tokens | Target | Status |
|------|-------|-------------|--------|--------|
| ~/.claude/CLAUDE.md | N | N | <500 | OK/WARN/CRIT |
| ./CLAUDE.md | N | N | <250 | OK/WARN/CRIT |

**Recommendations:**
- [specific items to cut, move to skills, or scope]
- Estimated savings: N tokens/message × ~$X/month

### 2. Settings Optimization
| Setting | Current | Recommended | Impact |
|---------|---------|-------------|--------|
| autocompact threshold | 83.5% | 65% | Fewer expensive late compactions |
| subagent model | (default) | haiku | 3-5x cheaper research tasks |
| cache TTL | 5m | 1h | 82% input cost reduction |
| ... | ... | ... | ... |

**Suggested settings.json diff:**
```json
// Add to .claude/settings.json or env
{
  "env": {
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "65",
    "CLAUDE_CODE_SUBAGENT_MODEL": "claude-haiku-4-5-20251001"
  }
}
```

### 3. MCP Server Overhead
| Server | Est. Tokens | defer_loading | CLI Alt | Action |
|--------|-------------|---------------|---------|--------|
| github | ~46,000 | no | gh CLI | Switch to CLI |
| ... | ... | ... | ... | ... |

### 4. Skills Inventory
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Total skills | N | - | INFO |
| Over 200 lines | N | 0 | WARN |
| Missing disable-model-invocation | N | 0 | WARN |
| Total metadata overhead | ~N tokens | - | INFO |

### 5. File Exclusions (.claudeignore)
| Status | Detail |
|--------|--------|
| Exists | yes/NO |
| Covers node_modules | yes/NO |
| Covers build artifacts | yes/NO |
| Covers .git | yes/NO |

### 6. Hooks & Output Filtering
| Check | Status | Action |
|-------|--------|--------|
| PostToolUse Bash filter | yes/NO | Add output truncation hook |
| PreToolUse guards | yes/NO | Block expensive commands |

### 7. Cache Health Patterns
| Session | Hits | Misses | Hit Rate | Status |
|---------|------|--------|----------|--------|
| [session-id] | N | N | N% | OK if >80%, WARN if <80% |

If hit rate <80%: check for model/effort switching, MCP churn, VS Code autosave.

### 8. Model Selection (Main Thread)
| Session | Models Used | Turns | Escalation Pattern | Fast Mode | Flag |
|---------|-------------|-------|---------------------|-----------|------|
| [session-id] | Sonnet→Opus / Opus only / ... | N | yes/no | on/off | OK/WARN/CRIT |

Flag sessions running entirely on the most expensive available tier for what looks like routine work, and any session with `/fast` left on without apparent need. See `references/model-selection.md` for the task→model ladder to cite in recommendations.

## Priority Actions

| # | Action | Effort | Savings | How |
|---|--------|--------|---------|-----|
| 1 | [highest impact] | [min/hr] | [$/tokens] | [specific steps] |
| 2 | ... | ... | ... | ... |
| 3 | ... | ... | ... | ... |

## Savings Estimate

| Category | Current Cost | Optimized Cost | Savings |
|----------|-------------|----------------|---------|
| CLAUDE.md overhead | ~N tokens/msg | ~N tokens/msg | N% |
| MCP schemas | ~N tokens/msg | ~N tokens/msg | N% |
| Cache misses | ~N/session | ~N/session | N% |
| Model tier (routine tasks) | ~N tokens/msg @ Opus/Fable rate | ~N tokens/msg @ Sonnet rate | N% |
| **Total estimated** | | | **N% / ~$X/month** |
```

## Savings Estimation Method

Use `references/pricing.md` for per-token costs. Key formulas:

- **CLAUDE.md savings:** (current_tokens - target_tokens) × messages_per_session × sessions_per_day × input_cost
- **MCP savings:** removed_server_tokens × messages_per_session × input_cost (or ×0.1 if cache hits)
- **Cache hit improvement:** avoided_misses × full_context_tokens × (input_cost - cache_read_cost)
- **Subagent model switch:** delegated_tokens × (current_model_cost - haiku_cost)

Assume defaults: ~50 messages/session, ~5 sessions/day, unless user provides actuals.

## Common Mistakes

- Loading all research reports into one context (use subagents to read them)
- Recommending settings without checking if user is on subscription vs API (cache TTL only helps API users)
- Suggesting `.claudeignore` patterns that would exclude needed source files
- Forgetting that path-scoped rules trigger on read, not write
- Overestimating subagent cache savings — subagent caching is hardcoded off (`enablePromptCaching: false`), so 1h cache TTL is irrelevant for multi-agent workflows. Factor this into savings estimates.
- Ignoring community tools — projects like ecotokens, token-optimizer-mcp, and foveance offer 75-95% savings via hook-based filtering and response caching. Mention these as "further optimization" options in the report.
