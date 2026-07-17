# leaderboard-updater agent memory

## Last run: 2026-07-17 Kimi K3 admit (Grok)

### Applied
- **kimi** admitted: Kimi K3 (Moonshot AI) — $3/$15, 1M ctx, Elo 1486 (live arena), color #0EA5E9.
- **gpt** dropped: GPT-5.6 Sol — lowest Elo under six-model cap (human-approved admit implies replace).
- arena.py `_NAME_MAP`: removed `gpt`; added `kimi` → kimi-k3, kimi-k3-max, kimi-k3-thinking.
- provider_catalog.json: removed OpenAI gpt entry; added Moonshot kimi catalog.
- Article: `kimi-k3-replaces-gpt-in-helloai-set`.

### Verified model states (post-admit)
- **fable**: Claude Fable 5 — $10/$50, 1M ctx.
- **claude**: Claude Opus 4.8 — $5/$25, 1M ctx.
- **gemini**: Gemini 3.1 Pro Preview — $2/$12. **Gemini 3.5 Pro not GA**.
- **grok**: Grok 4.5 — $2/$6, 500K ctx.
- **muse**: Muse Spark 1.1 — $1.25/$4.25, 1M ctx.
- **kimi**: Kimi K3 — $3/$15 (cache-hit input $0.30), 1M ctx, 2.8T MoE API.

### Rejected candidates (do not re-propose within 30 days unless new evidence)
- **gemini-3.5-pro**: not GA as of July 17 (pricing page).
- **Claude Opus 5 / Honeycomb**: rumor-only.
- **DeepSeek V4**: arena 1458 fails 25-pt threshold vs floor ~1486.
- **qwen3.7-max**: dropped July 9 for Muse Spark.
- **gpt / GPT-5.6 Sol**: dropped July 17 for Kimi K3 (set-size replace). Re-admit only with new evidence that Sol is required for unique positioning or Elo lead.

### Needs human review
- **gpt-oss-20b** (OpenAI open-weight): arena 1317, Apache 2.0, cluster 53.73 tok/s. OW set at 6 — replace whom?

### Pending for next run
- Monitor Gemini 3.5 Pro GA.
- Fix Elo pipeline (nakasyou dead); wire arena.ai.
- Full Kimi K3 open weights promised ~July 27 — evaluate open-weight track separately (VRAM/single-GPU may fail hard req).
- Monitor whether dropping OpenAI causes product feedback (re-admit Sol if needed).
- Run catalog guard every weekly.

### Notes
- K3 is API-first today; open weights not yet the helloai open-weight card.
- Official pricing: https://platform.kimi.ai/docs/pricing/chat-k3
- Official quickstart: https://platform.kimi.ai/docs/guide/kimi-k3-quickstart

## Previous: 2026-07-17 afternoon re-check
- Guards exit 0; no model patches; Elo scraper still blocked.
- Flagged kimi-k3 + gpt-oss-20b for human review.

## Previous: 2026-07-09
- Grok 4.5, GPT-5.6 Sol GA, Muse Spark admit (replaced qwen).
