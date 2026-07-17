# leaderboard-updater agent memory

## Last run: 2026-07-17 afternoon re-check (Grok weekly update r2)

### Catalog + cluster guards
- `check_provider_catalog.py`: exit 0 — no drift (xAI news + OpenAI pricing 403; Anthropic/Google/Meta clean).
- `check_cluster_bench.py`: exit 0 — no drift. Bench table latest integrated dates: qwen30ba3b/mistral 2026-07-15; qwen14b 2026-07-06; qwen8b 2026-07-05.
- New bench candidates (not admitted): Qwen3-30B-A3B-Instruct-2507 (unconfirmed provenance), gpt-oss-20b (needs human review), Gemma-4-12b-it, Phi-4-mini, Gemma-3-4B, Gemma-4-E4B, Llama-3.1-8B.

### Elo scraper status
- `update_leaderboard.py`: no changes. nakasyou snapshot still 20250522 (421 days old); CSV fallback 2025.09.02 (318 days). Curated Elos kept for all 6 frontier + 6 open-weight.
- **Live arena.ai (Jul 16, 2026) — not applied** (scraper not wired to arena.ai HTML; agent does not own Elo patches):
  - claude-fable-5: 1507 (curated 1508)
  - muse-spark-1.1: 1493 prelim (curated 1487)
  - gemini-3.1-pro-preview: 1485 (curated 1493)
  - gpt-5.6-sol-xhigh: 1486 (curated Sol 1484)
  - claude-opus-4-8-thinking: 1483 (curated 1503)
  - grok-4.5: 1465 (curated 1490)
- Structural follow-up: wire arena.ai (or a fresh JSON source) into `scripts/arena.py` so weekly Elo refresh can move again.

### Verified model states (no applied patches)
- **fable**: Claude Fable 5 — $10/$50, 1M ctx. Current on Anthropic models overview.
- **claude**: Claude Opus 4.8 — $5/$25, 1M ctx. Current; Opus 5 rumor-only.
- **gemini**: Gemini 3.1 Pro Preview — $2/$12 (≤200k). **Gemini 3.5 Pro not GA** (pricing page still Flash + 3.1 Pro only).
- **grok**: Grok 4.5 — $2/$6, 500K ctx. xAI docs still recommend for chat/code.
- **muse**: Muse Spark 1.1 — $1.25/$4.25, 1M ctx. Unchanged since July 9 admit.
- **gpt**: GPT-5.6 Sol — $5/$30. Unchanged since July 9 GA.

### Rejected candidates (do not re-propose within 30 days unless new evidence)
- **gemini-3.5-pro**: not GA as of July 17 afternoon (pricing page).
- **Claude Opus 5 / Honeycomb**: rumor-only; no official release.
- **DeepSeek V4**: live arena 1458 fails 25-pt threshold vs floor 1484.
- **qwen3.7-max** (Alibaba frontier): dropped July 9 for Muse Spark.
- **Open-weight**: Qwen3-30B-A3B-Instruct-2507 (unconfirmed provenance), Gemma-4-12b-it, Phi-4-mini-instruct, Llama-3.1-8B, Gemma-3-4B, Gemma-4-E4B.

### Needs human review
- **kimi-k3** (Moonshot): live arena #9 at 1486 Elo, $3/$15, 1M ctx. Hard reqs pass + new provider. Set at 6 — expand or replace?
- **gpt-oss-20b** (OpenAI, Apache 2.0): live arena 1317 Elo now (passes OW signal), fits ≤16GB, cluster 53.73 tok/s, provider diversity. Set at 6 — replace whom?

### Pending manual verifications for next run
- Monitor Gemini 3.5 Pro GA (delayed from June → July 17 target; still not on pricing page).
- Fix Elo pipeline (nakasyou dead; wire arena.ai or equivalent).
- Monitor Grok 4.5 EU API availability.
- Human decision on kimi-k3 frontier admission (replace whom?).
- Human decision on gpt-oss-20b open-weight admission (replace whom?).
- Run `check_provider_catalog.py` every weekly — do not skip even when memory says "no drift".

### Notes from Grok 2026-07-17 r2
- Second pass same day after morning weekly commit `c3b8233`.
- Quiet model week after July 8–9 triple launch; article already written (agentic seat war).
- No models.json / arena.py patches applied.
- Open-weight first-party benches already current; no tokens_per_sec patches.

## Previous run: 2026-07-17 morning (Grok weekly update)

### Catalog + cluster guards
- `check_provider_catalog.py`: exit 0 — no drift.
- `check_cluster_bench.py`: exit 0 — no drift.
- Article written: chatgpt-work-vs-claude-cowork-agentic-seat-war.

## Previous run: 2026-07-09 (Grok 4.5 catch-up + structural fix)

### Root cause: Grok 4.5 miss (2026-07-09 weekly)
- Agent anchored on memory item "Grok-4.4 not released" instead of fetching `docs.x.ai/docs/models` and `x.ai/news`.
- Grok 4.5 shipped July 8; weekly run July 9 still tracked 4.3.
- **Structural fix:** `scripts/check_provider_catalog.py` + `scripts/provider_catalog.json` now run at start of every weekly update (Step 1b in agent spec). Exit 1 forces investigation.

### Applied patches (confirmed that run)
- **grok**: version, pricing, context, desc/tag, strengths, arena _NAME_MAP, categories Honest Daily Use leader/insight.
- **gpt**: name GPT-5.5 → GPT-5.6 Sol, desc, arena map.
- **muse**: admitted replacing qwen.
