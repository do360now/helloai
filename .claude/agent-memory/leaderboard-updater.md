# leaderboard-updater agent memory

## Last run: 2026-08-07 candidate admits (Grok — human approved)

### Applied (section-3 candidates from weekly report)
- **qwen** admit: **Qwen3.8-Max** — $2/$6, 1M ctx, Elo 1497. Replaces **kimi** (Kimi K3) under six-model cap.
- **deepseek** admit: **DeepSeek V4 Pro** — $0.435/$0.87, 1M ctx, Elo 1457. Replaces **grok** (Grok 4.5, lowest Elo). Honest Daily Use leadership → DeepSeek V4 Pro.
- **gptoss20b** OW admit: **gpt-oss-20b** — Apache 2.0, MXFP4 ~16 GB, Elo 1317, first-party 53.73 tok/s. Replaces **qwen8b** (lowest OW Elo).
- Arena maps + provider_catalog + cluster `_BENCH_NAME_MAP` updated; article `qwen-deepseek-gptoss-rebalance-frontier-set` inserted.

### Verified model states (post-admit)
**Frontier (Elo desc):**
- **fable**: Claude Fable 5 — $10/$50, 1M, 1507
- **muse**: Muse Spark 1.2 — $1.25/$4.25, 1M, 1498
- **qwen**: Qwen3.8-Max — $2/$6, 1M, 1497
- **claude**: Claude Opus 5 — $5/$25, 1M, 1493
- **gemini**: Gemini 3.1 Pro — $2/$12, 1M, 1487
- **deepseek**: DeepSeek V4 Pro — $0.435/$0.87, 1M, 1457

**Open-weight:** gemma 1451, mistral 1358, qwen32b 1347, qwen30ba3b 1327, gptoss20b 1317, qwen14b 1300

### Rejected / dropped this run
- **kimi** / **grok**: dropped from frontier set for room
- **qwen8b**: dropped from OW set for room

### Needs human review / pending
- **gemini-3.5-pro**: still not GA
- Monitor Qwen3.8-Max open weights (promised post-Aug 3) for OW path if single-GPU viable
- Wire arena.ai into Elo scraper (nakasyou still dead)

### Notes
- Catalog guard exit 0 after provider_catalog rewrite for qwen/deepseek
- Cluster bench: gpt-oss-20b no longer a "new candidate"; Qwen3-8B now appears as candidate (expected)

## Previous run: 2026-08-07 weekly (Grok)

### Applied
- muse 1.1 → 1.2; claude arena high/max aliases; manual Elo refresh from arena.ai Aug 6
- Article: muse-spark-1-2-muse-code-agentic-upgrade
