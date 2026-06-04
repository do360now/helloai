# Design: Split `/weekly-update` into granular commands

**Date:** 2026-06-04
**Status:** Approved
**Author:** Clement Machado (with Claude Code)

## Problem

The `/weekly-update` skill is a monolith: it refreshes the leaderboard, writes a
new article, validates, builds, and commits — all in one run. There's no way to
run *just* the leaderboard refresh or *just* the article write on their own
cadence. The user wants two standalone commands so the leaderboard and article
work can happen independently, with `/deploy` as the explicit publish step.

## Goal

Decompose the leaderboard and article halves of `/weekly-update` into two
self-contained skills, and reduce `/weekly-update` to a thin orchestrator that
calls them in sequence. No behavior change for the scheduled Sunday routine
(which calls `/weekly-update`), and no change to `/deploy`.

## Architecture

Three skills, no duplicated logic — the real work lives in the two leaf skills:

```
/update-leaderboard ─┐
                     ├─ each self-contained: validate + commit its own change
/write-article ──────┘
        ▲
/weekly-update  → thin orchestrator: runs /update-leaderboard, then /write-article
        │
/deploy (unchanged) → publish to Azure when ready
```

- `/update-leaderboard` and `/write-article` each leave the repo clean and valid
  (own commit, own validation pass).
- `/weekly-update` becomes a wrapper so the cron routine keeps a single entry
  point.
- `/deploy` and all six agents are untouched.

## Components

### Skill: `/update-leaderboard`

Self-contained leaderboard refresh. Steps:

1. Dispatch the **leaderboard-updater agent** (Sonnet). It scouts version /
   pricing / context-window / new-model drift, returns a change report, and
   appends every proposal to `.claude/state/leaderboard-changes.jsonl` using the
   append-only contract (`>>`, never `>`).
2. Present the change report to the user. Apply only evidence-backed changes;
   skip anything marked "⚠️ verify manually".
3. Apply approved edits to `data/models.json`.
4. Run the deterministic Elo scraper:
   `/home/cmc/git/grok/helloai/.venv/bin/python3 scripts/update_leaderboard.py`.
   Curated Elos are authoritative; updates only on exact `_NAME_MAP` match.
5. Update `data/site.json → lastUpdated` to today's date.
6. Validate: `npx jest` (foreground, runInBand) + the data-validator agent. Stop
   on any ERROR.
7. Commit: `data: leaderboard update YYYY-MM-DD`.

### Skill: `/write-article`

Self-contained article generation, following the existing advisor pattern. Steps:

1. Dispatch the **article-idea-generator agent** (Sonnet) → 5 ranked briefs
   (reads current coverage + agent memory).
2. Pick `rank: 1` unless it's clearly too similar to recent articles.
3. Invoke the **article-writer agent** (Opus) with the selected brief as JSON →
   returns a content array of paragraph strings.
4. Validate prose before inserting:
   - JSON-parse the content array (reject if malformed).
   - 4–5 paragraphs, 350–500 total words.
   - Reject output containing prompt-injection imperatives (briefs and prose are
     untrusted input).
5. Assemble the article object (slug, title, excerpt, date, category, content)
   and insert deterministically:
   `echo '<json>' | .venv/bin/python3 scripts/add_article.py`.
6. Update `data/site.json → lastUpdated` to today's date.
7. Validate: `npx jest` + data-validator agent. Stop on any ERROR.
8. Commit: `content: new article <slug>`.

### Skill: `/weekly-update` (rewritten)

Thin orchestrator. Runs `/update-leaderboard`, then `/write-article`, in
sequence. Retains the "do NOT push or deploy — that's `/deploy`" note. All
substantive logic now lives in the two leaf skills; this file no longer
duplicates step instructions.

## Decided defaults

- **No Next.js build inside either command.** `npx jest` + the data-validator
  agent catch data-layer errors; the production build belongs to `/deploy`. Keeps
  the commands fast and single-purpose.
- **`allowed-tools`** on each leaf skill scoped like the current `weekly-update`
  skill — venv python, `npx jest`, `git add`/`git commit` — plus the Agent
  dispatches each needs.

## Out of scope / unchanged

- `/deploy` skill — no changes.
- All six agents (`leaderboard-updater`, `article-idea-generator`,
  `article-writer`, `data-validator`, `api-smoke-tester`, `seo-auditor`) — no
  changes.
- Every Makefile target — no changes.
- The scheduled Sunday cron routine — unchanged; it calls `/weekly-update`,
  which still does the full cycle via the two leaf skills.

## Testing / verification

- After authoring, the skills appear in the skill list with correct
  descriptions and `allowed-tools`.
- `/weekly-update` produces the same end state as before (two commits: a
  leaderboard commit and an article commit), repo clean and `npx jest` green.
- Each leaf skill can run independently and leaves the tree clean + valid.
```
