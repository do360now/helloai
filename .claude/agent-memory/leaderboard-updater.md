# leaderboard-updater agent memory

## Last run: 2026-07-09 (Grok 4.5 catch-up + structural fix)

### Root cause: Grok 4.5 miss (2026-07-09 weekly)
- Agent anchored on memory item "Grok-4.4 not released" instead of fetching `docs.x.ai/docs/models` and `x.ai/news`.
- Grok 4.5 shipped July 8; weekly run July 9 still tracked 4.3.
- **Structural fix:** `scripts/check_provider_catalog.py` + `scripts/provider_catalog.json` now run at start of every weekly update (Step 1b in agent spec). Exit 1 forces investigation.

### Verified model states
- **fable**: Claude Fable 5 — pricing $10/$50, context 1M. No drift.
- **claude**: Claude Opus 4.8 — pricing $5/$25, context 1M. No drift.
- **gemini**: Gemini 3.1 Pro — Gemini 3.5 Pro still not GA on pricing page July 9. No drift.
- **grok**: **UPDATED** Grok 4.3 → **Grok 4.5** — $2/$6, 500K context, xAI recommended chat/code model July 8. Arena map: grok-4.5 primary.
- **gpt**: GPT-5.6 Sol — GA July 9. No further drift.
- **muse**: Muse Spark 1.1 — admitted July 9 replacing Qwen3.7-Max. $1.25/$4.25, 1M ctx, arena muse-spark 1487 Elo. Meta Model API US preview.

### Applied patches (confirmed this run)
- **grok**: version, pricing, context, desc/tag, strengths, arena _NAME_MAP, categories Honest Daily Use leader/insight.

### Rejected candidates (do not re-propose within 30 days)
- **gemini-3.5-pro**: not GA as of July 9.
- **DeepSeek V4**: Elo below threshold (nakasyou stale 20250522).
- **claude-mythos-preview / Mythos 5**: limited availability.
- **qwen3.7-max** (Alibaba): dropped July 9 — Muse Spark 1.1 supersedes budget agentic slot. Open-weight Qwen3 32B still tracked separately.

### Pending manual verifications for next run
- Monitor Gemini 3.5 Pro GA.
- Re-check nakasyou lmarena-history snapshot freshness.
- Monitor Grok 4.5 EU API availability (mid-July per xAI).
- Run `check_provider_catalog.py` every weekly — do not skip even when memory says "no drift".

### Notes from Grok 2026-07-09 catch-up
- Catalog guard added to weekly pipeline.
- Article written: grok-4-5-ships-as-xai-default (Discovery; documents miss + fix).

## Previous run: 2026-07-09 (Grok weekly update)

### Applied patches (confirmed this run)
- **gpt**: version drift — name GPT-5.5 → GPT-5.6 Sol, desc updated, arena _NAME_MAP adds gpt-5.6-sol and gpt-5.6.

### Notes from Grok 2026-07-09 run
- Major news: GPT-5.6 Sol/Terra/Luna public release July 9.
- **Missed Grok 4.5** (shipped July 8) — fixed in catch-up pass same day.
- Article written: gpt-5-6-sol-general-availability.