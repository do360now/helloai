# leaderboard-updater agent memory

## Last run: 2026-07-17 (Grok weekly update)

### Catalog + cluster guards
- `check_provider_catalog.py`: exit 0 — no drift (xAI news + OpenAI pricing returned 403; Anthropic/Google/Meta parsed clean).
- `check_cluster_bench.py`: exit 0 — no drift. Bench table latest integrated dates: qwen30ba3b/mistral 2026-07-15; qwen14b 2026-07-06; qwen8b 2026-07-05.
- New bench candidates logged (not admitted): Qwen3-30B-A3B-Instruct-2507 (unconfirmed provenance), gpt-oss-20b (needs human review), Gemma-4-12b-it, Phi-4-mini, Gemma-3-4B, Gemma-4-E4B, Llama-3.1-8B.

### Verified model states (no applied patches)
- **fable**: Claude Fable 5 — $10/$50, 1M ctx. Current on Anthropic models overview.
- **claude**: Claude Opus 4.8 — $5/$25, 1M ctx. Current; Opus 5 rumor-only.
- **gemini**: Gemini 3.1 Pro Preview — $2/$12 (≤200k), still flagship on pricing page. **Gemini 3.5 Pro not GA**.
- **grok**: Grok 4.5 — $2/$6, 500K ctx. xAI docs still recommend for chat/code.
- **muse**: Muse Spark 1.1 — $1.25/$4.25, 1M ctx. Unchanged since July 9 admit.
- **gpt**: GPT-5.6 Sol — $5/$30. Unchanged since July 9 GA.

### Rejected candidates (do not re-propose within 30 days unless new evidence)
- **gemini-3.5-pro**: not GA as of July 17 (pricing page).
- **Claude Opus 5 / Honeycomb**: rumor-only; no official release.
- **DeepSeek V4**: Elo below threshold; nakasyou still May 2025.
- **qwen3.7-max** (Alibaba frontier): dropped July 9 for Muse Spark.
- **Open-weight**: Qwen3-30B-A3B-Instruct-2507 (unconfirmed provenance), Gemma-4-12b-it, Phi-4-mini-instruct, Llama-3.1-8B, Gemma-3-4B, Gemma-4-E4B.

### Needs human review
- **gpt-oss-20b** (OpenAI, Apache 2.0): fits ≤16GB, cluster 53.73 tok/s, provider diversity. Arena Elo unknown (nakasyou stale). Set at 6 — would need a replace call.

### Pending manual verifications for next run
- Monitor Gemini 3.5 Pro GA (delayed from June → July; still not on pricing page).
- Re-check nakasyou lmarena-history snapshot freshness (still May 2025 keys).
- Monitor Grok 4.5 EU API availability.
- Human decision on gpt-oss-20b open-weight admission (replace whom?).
- Run `check_provider_catalog.py` every weekly — do not skip even when memory says "no drift".

### Notes from Grok 2026-07-17 run
- Quiet week after July 8–9 triple launch (Grok 4.5, GPT-5.6 Sol, Muse Spark 1.1).
- No models.json / arena.py patches applied.
- Open-weight first-party benches already current; no tokens_per_sec patches.

## Previous run: 2026-07-09 (Grok 4.5 catch-up + structural fix)

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

### Applied patches (confirmed that run)
- **grok**: version, pricing, context, desc/tag, strengths, arena _NAME_MAP, categories Honest Daily Use leader/insight.
- **gpt**: name GPT-5.5 → GPT-5.6 Sol, desc, arena map.
- **muse**: admitted replacing qwen.

### Notes from Grok 2026-07-09 catch-up
- Catalog guard added to weekly pipeline.
- Articles: gpt-5-6-sol-general-availability, grok-4-5-ships-as-xai-default, muse-spark-1-1-replaces-qwen-in-helloai-set.
