# leaderboard-updater agent memory

## Last run: 2026-07-09 (Grok weekly update)

### Verified model states
- **fable**: Claude Fable 5 — pricing $10/$50, context 1M, LMArena name map current (claude-fable-5). No drift.
- **claude**: Claude Opus 4.8 — pricing $5/$25, context 1M, LMArena name map current. No drift.
- **gemini**: Gemini 3.1 Pro — version current. Pricing $2/$12 (≤200k) / $4/$18 (>200k) per official docs; flat rate in models.json remains known gap. Gemini 3.5 Pro still not GA on pricing page as of July 9 (only 3.1 Pro Preview and 3.5 Flash). Context 1M. No drift.
- **grok**: Grok 4.3 — pricing $1.25/$2.50 confirmed on docs.x.ai, context 1M, map current. Grok 4.5 listed on docs but 4.3 remains tracked entry. Grok 4.4 not released. No drift.
- **gpt**: GPT-5.6 Sol — **UPDATED** from GPT-5.5. Public GA July 9 per CNBC/OpenAI; pricing $5/$30 unchanged; 88.8% Terminal-Bench 2.1. Arena name map updated with gpt-5.6-sol/gpt-5.6.
- **qwen**: Qwen3.7-Max — pricing $2.50/$7.50, context 1M, Elo 1475. Stable. No drift.

### Staleness streaks
- nakasyou lmarena-history snapshot: still 20250522 (streak continues). All six models kept curated Elos; name-map matches intact for when source refreshes.

### Applied patches (confirmed this run)
- **gpt**: version drift — name GPT-5.5 → GPT-5.6 Sol, desc updated, arena _NAME_MAP adds gpt-5.6-sol and gpt-5.6.

### Rejected candidates (do not re-propose within 30 days)
- **gemini-3.5-pro**: not GA as of July 9. Re-eval on API/pricing page listing.
- **Grok-4.4**: not released; 4.3 remains flagship on docs.x.ai.
- **DeepSeek V4**: Elo below threshold in available data (nakasyou stale).
- **claude-mythos-preview / Mythos 5**: Glasswing limited availability; not general public API.
- **muse-spark** (Meta): still no public API.

### Pending manual verifications for next run
- Monitor Gemini 3.5 Pro GA (delayed past June).
- Monitor Grok 4.4/4.5 release and whether 4.3 should be replaced.
- Re-check nakasyou lmarena-history snapshot freshness.
- Monitor GPT-5.6 Sol arena Elo once sources refresh (GA July 9, <2 weeks).

### Notes from Grok 2026-07-09 run
- Major news: GPT-5.6 Sol/Terra/Luna public release July 9 after partner-only preview ended.
- Elo refresh ran; all six models kept curated Elos (stale nakasyou snapshot 20250522).
- Article written: gpt-5-6-sol-general-availability (Discovery on GA after government gates).

## Previous run: 2026-07-04 (Grok weekly update, second pass)

### Verified model states
- **fable**: Claude Fable 5 — pricing $10/$50, context 1M, LMArena name map current (claude-fable-5). Restored globally July 1; admitted to tracked set July 1. No drift.
- **claude**: Claude Opus 4.8 — pricing $5/$25, context 1M, LMArena name map current. No drift.
- **gemini**: Gemini 3.1 Pro — version current. Pricing $2/$12 (≤200k) / $4/$18 (>200k) per official docs; flat rate in models.json remains known gap. Gemini 3.5 Pro still not GA on pricing page as of July 4 (only 3.1 Pro Preview and 3.5 Flash). Context 1M. No drift.
- **grok**: Grok 4.3 — pricing $1.25/$2.50 confirmed on docs.x.ai, context 1M, map current. Grok 4.4 not released. No drift.
- **gpt**: GPT-5.5 — pricing $5/$30, context 1M. GPT-5.6 Sol/Terra/Luna still partner-only preview per OpenAI help article. GPT-5.5 remains tracked OpenAI entry. No drift.
- **qwen**: Qwen3.7-Max — pricing $2.50/$7.50, context 1M, Elo 1475. Stable. No drift.

### Applied patches (confirmed this run)
- None. All tracked models current; no models.json or arena.py changes required.

### Notes from Grok 2026-07-04 run (second pass)
- No models.json or arena.py patches required.
- Elo refresh ran; all six models kept curated Elos (stale nakasyou snapshot 20250522).
- Article written: how-caching-and-batching-cut-frontier-costs-90-percent (Analysis on prompt caching + batch API stacking).