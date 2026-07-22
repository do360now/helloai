# leaderboard-updater agent memory

## Last run: 2026-07-22 weekly (Grok)

### Applied
- **Elo refresh (manual)** from arena.ai Jul 21 — nakasyou still 426d stale:
  - fable 1508→1507, claude 1503→1484, gemini 1493→1486, grok 1490→1468, muse 1487→1495, kimi 1486
  - OW: gemma 1452→1451, mistral 1303→1358, qwen30ba3b 1325→1327
- **muse** desc: #2 in tracked set at 1495 Elo (was #6 / 1487)
- **fable** desc + categories Overall Preference insight: 1507 Elo
- **mistral** `_OPEN_WEIGHT_NAME_MAP`: added `mistral-small-2506` alias
- Catalog guard exit 0; cluster bench exit 0 (no drift; new candidates listed, none admitted)

### Verified model states (post-refresh)
- **fable**: Claude Fable 5 — $10/$50, 1M ctx, Elo 1507
- **muse**: Muse Spark 1.1 — $1.25/$4.25, 1M ctx, Elo 1495 (#2)
- **gemini**: Gemini 3.1 Pro Preview — $2/$12, 1M ctx, Elo 1486. **Gemini 3.5 Pro still not GA** (partner testing; 3.6 Flash + 3.5 Flash-Lite GA Jul 21)
- **kimi**: Kimi K3 — $3/$15 (cache-hit $0.30), 1M ctx, Elo 1486
- **claude**: Claude Opus 4.8 — $5/$25, 1M ctx, Elo 1484 (arena `claude-opus-4-8-thinking`)
- **grok**: Grok 4.5 — $2/$6, 500K ctx, Elo 1468

### Rejected candidates (do not re-propose within 30 days unless new evidence)
- **gemini-3.5-pro**: still partner-only as of July 22 (blog + pricing page).
- **gemini-3.6-flash**: Flash tier; same provider as Pro; would lose Hard Reasoning niche.
- **Claude Opus 5 / Honeycomb**: rumor-only.
- **DeepSeek V4**: arena 1457 fails 25-pt threshold vs floor ~1468 after Grok refresh.
- **gpt-5.6-sol**: dropped July 17 for Kimi; no re-admit evidence.
- **qwen3.7-max**: dropped July 9 for Muse Spark.
- **Qwen3-30B-A3B-Instruct-2507**: unconfirmed provenance; already track qwen30ba3b.
- Cluster mid-size rejects: Gemma-4-12b-it, Phi-4-mini, Llama-3.1-8B, Gemma-3-4B, Gemma-4-E4B (set full / no unique tier).

### Needs human review
- **gpt-oss-20b** (OpenAI open-weight): arena 1317, Apache 2.0, cluster 53.73 tok/s. OW set at 6 — replace whom?

### Pending for next run
- Monitor Gemini 3.5 Pro GA → same-provider replace for `gemini`.
- Wire arena.ai into Elo scraper (nakasyou dead streak continues).
- Full Kimi K3 open weights promised ~July 27 — evaluate open-weight track (VRAM/single-GPU may fail).
- Monitor OpenAI re-admit pressure after Sol drop.
- Run catalog guard every weekly.

### Notes
- Live arena Jul 21: claude-fable-5 1507, muse-spark-1.1 1495, gemini-3.1-pro-preview 1486, kimi-k3 1486, claude-opus-4-8-thinking 1484, grok-4.5 1468, gemini-3.6-flash 1485.
- Cluster bench last integrated: 2026-07-15 (qwen30ba3b, mistral first-party); qwen14b 2026-07-06; qwen8b 2026-07-05.
- Official Kimi pricing: https://platform.kimi.ai/docs/pricing/chat-k3
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing (3.1 Pro Preview still listed; no 3.5 Pro)
- Gemini 3.6 Flash blog: https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-6-flash-3-5-flash-lite-3-5-flash-cyber/

## Previous: 2026-07-17 Kimi K3 admit (Grok)
- kimi admitted; gpt dropped; article kimi-k3-replaces-gpt-in-helloai-set.
