# Baseline Snapshot — 2026-05-26

**Captured:** 2026-05-26T17:31:06Z (UTC)  
**Git Commit:** `99f9316a909fb27fa3765241b26d644862eff95b`  
**Captured by:** Grok 4.3 (via CLI session)  
**Purpose:** Reference point for the Grok agent migration parallel evaluation of `leaderboard-updater` and `article-idea-generator`.

This snapshot represents the exact state of the system immediately after approving the evaluation criteria and before any Grok-led parallel runs.

## Last Known Agent Activity (from memory files at capture time)

- **leaderboard-updater**: Last run 2026-05-14 (Sonnet). Memory reflects activity through 2026-05-22 in the JSONL.
- **article-idea-generator**: Last run 2026-05-14 (Sonnet).
- **leaderboard-changes.jsonl**: Contains 20 historical records (oldest 2026-05-03, newest 2026-05-22).

## Files Captured

```
baselines/2026-05-26/
├── README.md
├── data/
│   ├── articles.json          # Full current articles (including latest)
│   ├── categories.json
│   ├── models.json            # 4 frontier models (claude, gemini, grok, gpt)
│   └── site.json
├── scripts/
│   └── arena.py               # Contains _NAME_MAP and fetch logic
├── agent-memory/
│   ├── leaderboard-updater.md
│   └── article-idea-generator.md
└── state/
    └── leaderboard-changes.jsonl   # Complete append-only audit log (20 entries)
```

## Key Observations at Time of Capture

- 4 models currently tracked (Claude Opus 4.7, Gemini 3.1 Pro, Grok 4.3, GPT-5.5).
- `leaderboard-changes.jsonl` has 20 records. Recent activity focused on:
  - Grok 4.3 pricing/context/name map updates (applied)
  - GPT-5.5-instant name map additions
  - Multiple rejections of Claude Mythos Preview and GPT-5.6 (not public)
  - DeepSeek V4 rejections (Elo threshold)
- Memory files contain detailed staleness tracking and "pending manual verifications".
- The system is in a relatively stable state with no major unapplied drifts noted in the latest memory entries.

## How to Use This Baseline

When running Grok versions of the agents in parallel:

1. Compare Grok-generated reports / briefs against the state captured here.
2. Verify that Grok respects the same historical rejections stored in `leaderboard-changes.jsonl`.
3. Use the captured `agent-memory/` files as the "starting memory" for the first Grok runs.
4. After each parallel run, document differences in a new dated directory under `baselines/`.

Do not modify files inside this baseline directory after initial capture.

## Next Actions After This Baseline

- Execute first parallel run of `leaderboard-updater` with Grok
- Score the output using the criteria in `../evaluation-criteria.md`
- Capture a new dated directory after the Grok run for comparison
- Repeat for `article-idea-generator`

---

**Baseline integrity:** All files above are byte-for-byte copies of the live files at the moment of capture.