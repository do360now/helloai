---
name: weekly-update
description: >
  Run the weekly helloai.com maintenance pipeline: check leaderboard drift,
  refresh Elo, write a new article if warranted, validate data, and commit.
  Use when the user runs /weekly-update, asks to "run the weekly helloai update",
  "check leaderboard and update", or equivalent scheduled maintenance.
---

# Weekly Update (Grok)

Run the full weekly maintenance cycle for helloai.com.

**Canonical spec:** `.claude/skills/weekly-update/SKILL.md` (read it first).

**Agent specs (Grok executes these roles by default):**
- `.claude/agents/leaderboard-updater.md`
- `.claude/agents/article-idea-generator.md`

Article prose may be written in-session by Grok following `.claude/agents/article-writer.md` rules, or handed to the Claude `article-writer` agent (Opus) if available.

## Steps

### 1. Leaderboard drift (judgment)

Read `data/models.json`, `scripts/arena.py`, `.claude/agent-memory/leaderboard-updater.md`, and `.claude/state/leaderboard-changes.jsonl`.

Search for version, pricing, and context-window changes. Evaluate new candidates via the admission decision tree. Apply only evidence-backed patches. Append every proposal to `.claude/state/leaderboard-changes.jsonl` with `>>` (never overwrite). Update `.claude/agent-memory/leaderboard-updater.md`.

### 2. Elo refresh (deterministic)

```bash
/home/cmc/git/grok/helloai/.venv/bin/python3 scripts/update_leaderboard.py
```

### 3. New article (if warranted)

Scout gaps per `article-idea-generator.md`. Pick the top brief unless it duplicates a recent article (30-day rule). Write 4–5 paragraphs (350–500 words). Insert:

```bash
/home/cmc/git/grok/helloai/.venv/bin/python3 scripts/add_article.py --file /path/to/article.json
```

Update `data/site.json → lastUpdated` to today.

### 4. Validate

```bash
npx jest
npx tsc --noEmit
```

### 5. Commit (no deploy)

```bash
git add data/ .claude/agent-memory/ .claude/state/
git commit -m "data: weekly update $(date +%Y-%m-%d)"
```

Deploy is separate: `make bump_version` then `make build_helloai_image` etc. (see README).