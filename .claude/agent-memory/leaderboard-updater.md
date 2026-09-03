# leaderboard-updater agent memory

## Last run: 2026-09-03 weekly (Grok) — Fable 5.1 + Muse Spark 1.3 same-provider replace

### Applied
- **fable**: Claude Fable 5 → **Claude Fable 5.1**. Same $10/$50, 1M. Cache reads $1 → $0.25. API id `claude-fable-5-1`. Arena aliases: `claude-fable-5.1-max`, `claude-fable-5.1`, `claude-fable-5`.
- **muse**: Muse Spark 1.2 → **Muse Spark 1.3**. Same $1.25/$4.25, 1M. Arena aliases prepend `muse-spark-1.3` / `muse-spark-1.3 (xHigh)`; fallback still 1.2 (xHigh).
- **categories**: Overall + Coding leaders → Claude Fable 5.1. Daily Use → Muse Spark 1.3. Coding insight now cites Code Arena WebDev 1765 (not Fable 5 SWE-bench).
- **grok desc**: WebDev 1629 no longer “above Fable 5” — Fable 5.1-max is 1765.
- **provider_catalog.json**: Fable pattern `Claude Fable ([0-9]+)` → `([0-9.]+)` (the integer regex swallowed 5.1 as 5). Muse catalog/news URLs now `developer.meta.com/ai/models/muse-spark/` + `research.meta.ai/blog/introducing-muse-spark-1-3`.
- **Elo** (arena.ai Sep 2, manual `--set`/`--set-ow`; nakasyou 469d stale, CSV 366d stale): fable 1507→**1504**, muse 1498→**1499**, claude 1492→**1493**, qwen 1479→**1480**, qwen27b 1440→**1436**. gemini 1487, grok 1461, gemma 1451, mistral 1357, qwen30ba3b 1327, gptoss20b 1317, qwen14b 1300 unmatched.

### Catalog / cluster
- Catalog guard initially exit 0 **because of the Fable `[0-9]+` bug and a stale Meta blog URL** — official sources still showed Fable 5.1 (Sep 1) and Muse Spark 1.3 (Sep 2). Patched patterns/URLs; re-run after apply: exit 0.
- Cluster bench: no drift vs `open_weight_models.json`. Leaderboard table date still **2026-07-17**. Same untracked bench candidates as Aug 30. qwen27b still has no first-party `bench_source`.

### Verified model states
**Frontier (Elo desc):**
- **fable**: Claude Fable 5.1 — $10/$50, 1M, **1504** (claude-fable-5.1-max 1504±11 / 2906 votes, day 2; not Preliminary)
- **muse**: Muse Spark 1.3 — $1.25/$4.25, 1M, **1499** (1.3 not on arena yet; fallback muse-spark-1.2 (xHigh) 1499±10 / 3240)
- **claude**: Claude Opus 5 — $5/$25, 1M, **1493**
- **gemini**: Gemini 3.1 Pro — $2/$12, 1M, **1487**
- **qwen**: Qwen3.8-Max — $2/$6, 1M, **1480**
- **grok**: Grok 4.6 — $2/$6, 500K, **1461** (still Preliminary / 3453 votes)

**Open-weight:** gemma 1451, qwen27b **1436**, mistral 1357, qwen30ba3b 1327, gptoss20b 1317, qwen14b 1300 (unmatched)

### Official pricing still current
- Fable 5.1 $10/$50, cache reads $0.25 (https://platform.claude.com/docs/en/about-claude/pricing)
- Opus 5 $5/$25
- Gemini 3.1 Pro Preview $2/$12 ≤200k (https://ai.google.dev/gemini-api/docs/pricing) — 3.5 Pro still absent
- Muse Spark 1.3 $1.25/$4.25 (contributor $0.10/$0.20) — https://developer.meta.com/ai/models/muse-spark/
- Qwen3.8-Max $2/$6, 1M — https://www.qwencloud.com/models/qwen3.8-max
- Grok 4.6 $2/$6 (<200k) / $4/$12 (≥200k), 500K; docs still recommend 4.6

### Rejected this run
- **gemini-3.5-pro**: still absent from official pricing
- **gemini-3.8-flash**: gemini-3.8-flash-high 1494±9 Preliminary / 5125 votes. Same-provider Flash; replacing 3.1 Pro would lose Hard Reasoning
- **gemini-3.7-flash**: 1491±8 Preliminary / 5682. Same reject
- **gpt-5.6-sol**: 1483±5 / 23413. Dropped Jul 17; no unique positioning under cap
- **grok-4.7**: not shipped; docs still recommend 4.6
- **GLM-5.3-Flash OW**: MIT, 320B-A18B — fails single-GPU
- **GLM-5.3 OW**: 753B — fails single-GPU
- **Qwen3.8-2.4T-A95B**, **Hy3**, cluster leftovers: no new evidence

### Needs human review / pending
- **glm-5.3-max**: API $1.40/$4.40, 1M. Day 20 from Aug 14. Arena Sep 2: **1482±7 / 7668 votes**. Human held Aug 30 (whiplash vs Grok admit). Votes up 5820→7668; Elo cooled 1484→1482. Cap at 6 — dropping grok still a human call.
- **muse-glimmer**: 1427±10 / 3693 votes. Human held Aug 30: qwen14b two-GPU niche. No new drop case.
- Watch whether grok-4.6-high **Preliminary flag drops** (votes 3453, slightly down from 3473).
- Watch whether **muse-spark-1.3** gets an arena slug (currently using 1.2 xHigh Elo).
- Watch Fable 5.1 text sample as votes grow past 2906 (interval ±11 vs Fable 5’s ±5 / 27189).
- Wire arena.ai into Elo scraper (nakasyou 469d; CSV 366d)

### Notes
- Catalog guard can miss dotted minor versions if `tracked_name_pattern` is `[0-9]+` instead of `[0-9.]+`. Fable 5.1 was the incident; keep dotted capture for every provider that ships x.y.
- Muse catalog must point at `developer.meta.com` / `research.meta.ai`, not the stale `ai.meta.com/blog` featured-post page.
- Grok 4.6 long-context surcharge still $4/$12 when prompt ≥200k. Card uses standard $2/$6.
- Claude Sonnet 5 $2/$10 intro price is now the permanent standard (Sep 1 hike cancelled). We do not track Sonnet.

## Human decision: 2026-08-30 — Qwen3.8-27B admitted, glm-5.3-max & muse-glimmer held

Following the 2026-08-30 Grok weekly run (Elo-only drift, no set changes; 3 candidates flagged needs-review), the owner reviewed all three pending candidates directly:

- **glm-5.3-max** (frontier, 1484±8/5820 votes, would drop Grok 4.6): **HELD** — dropping Grok 4 days after admitting it is editorial whiplash. Revisit if Grok's Elo gap widens further or GLM's votes keep climbing.
- **muse-glimmer** (open-weight, 1426±10/3718 votes, new provider, would drop qwen14b): **HELD** — qwen14b's smallest-footprint/"Two-GPU Pick" niche is a real positioning gap muse-glimmer doesn't fill. Revisit with more votes or a clearer case to drop qwen14b.
- **Qwen3.8-27B** (open-weight, same-provider replace of qwen32b): **ADMITTED**. New id `qwen27b`. +93 Elo (1440 vs 1347) at 15.3 GiB Q4 vs qwen32b's 20 GB — a real efficiency gain even without a first-party cluster bench yet (community-reported 65 tok/s on RTX 4090, no `bench_source` field since it's not our own measurement). `open_weight_models.json` re-sorted (1440 slots in right after gemma). `arena.py._OPEN_WEIGHT_NAME_MAP` swapped `qwen32b: [qwen3-32b]` → `qwen27b: [qwen3.8-27b]`. Open-weight Qwen count drops from 3 cards to 2.
- Audit log: 4 new records appended under `run_id: human-20260830-review` in `leaderboard-changes.jsonl`.
- **Watch next cycle**: cluster bench for qwen27b (no first-party number yet — first-party measurement should supersede the vendor/community 65 tok/s figure once available).

## Previous run: 2026-08-26 weekly (Grok) — Grok 4.6 re-admit, drop DeepSeek

### Applied
- **Admit grok**: Grok 4.6, xAI, $2/$6, 500K, elo 1461, tag Agentic Code, color #EF4444, url https://grok.com. Strengths: Coding & Engineering.
- **Drop deepseek**: DeepSeek V4 Pro was lowest Elo (1458) at the six-model cap. Owner confirmed drop-weakest if Grok qualifies.
- **Daily Use → Muse Spark 1.2**: cheapest remaining tracked API at $1.25/$4.25. Muse strengths now include Honest Daily Use; insight updated.
- **Muse desc**: "cheapest agentic option" → "cheapest tracked API".
- **arena.py**: `_NAME_MAP.grok = ["grok-4.6-high","grok-4.6","grok-4.5"]`; removed deepseek aliases.
- **provider_catalog.json**: swapped DeepSeek entry for xAI Grok 4.6 (docs.x.ai/developers/models + x.ai/news/grok-4-6).
