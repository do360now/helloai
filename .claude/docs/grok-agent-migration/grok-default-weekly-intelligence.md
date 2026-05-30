# Grok as Default for Weekly Intelligence Steps

**Effective date**: Late May 2026  
**Status**: Default path for production weekly updates

## Overview

As of the successful parallel runs in May 2026, **Grok** is now the default executor for the two judgment-heavy agents in the weekly update:

- `leaderboard-updater`
- `article-idea-generator`

The original Claude Code agent definitions are preserved as fallback.

Article prose writing (`article-writer` / Opus) and all deterministic steps remain unchanged.

## How to Invoke (Practical Workflow)

### 1. Leaderboard Drift (`leaderboard-updater`)

**Command to user (in this session):**

> "Run the leaderboard-updater for this week's update. Follow the specification in `.claude/agents/leaderboard-updater.md`, using the latest memory and state files. Append proposals correctly to the audit log before showing the report."

Grok will:
- Read current state (`models.json`, `arena.py`, memory, `leaderboard-changes.jsonl`)
- Perform research
- Produce the structured report
- Append records to `.claude/state/leaderboard-changes.jsonl` (append-only)

### 2. Article Briefs (`article-idea-generator`)

**Command to user (in this session):**

> "Run the article-idea-generator for this week's update. Follow the specification in `.claude/agents/article-idea-generator.md`, using current coverage and memory. Return exactly 5 ranked briefs in the required schema."

Grok will deliver:
- One-paragraph landscape summary
- 5 briefs in the exact JSON schema expected by `article-writer`

After Grok returns the briefs:
- You select the top one (usually `rank: 1`)
- Hand it off to the `article-writer` agent (Opus) using the advisor pattern
- Validate and insert with `scripts/add_article.py`

## Supporting Files

- Scoring from first Grok runs:
  - `runs/2026-05-26-leaderboard-updater/scoring.md`
  - `runs/2026-05-26-article-idea-generator/scoring.md`

- Updated cross-session memory (Grok runs):
  - `.claude/agent-memory/leaderboard-updater.md`
  - `.claude/agent-memory/article-idea-generator.md`

- Handoff examples:
  - `briefs/handoffs/`

## Fallback

If you ever want to use the original Claude Code agents:

- Use the normal `/agent leaderboard-updater` and `/agent article-idea-generator` commands in Claude Code.

## Benefits of the New Default

- Reduces operational dependency on Anthropic for the two most intelligence-intensive weekly tasks.
- Maintains the same output contracts and quality bar (validated through parallel runs and real article publication).
- Preserves full auditability (append-only logs, memory, scoring).

## Future Evolution

- We can create dedicated Grok-optimized versions of the agent prompts in `.claude/grok-agents/` if we want to diverge further from the Claude Code format.
- Additional agents can be evaluated for Grok migration using the same parallel + scoring methodology.

---

This document should be the primary reference when running the weekly update going forward.