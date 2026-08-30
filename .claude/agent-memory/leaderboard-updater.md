# leaderboard-updater agent memory

## Human decision: 2026-08-30 — Qwen3.8-27B admitted, glm-5.3-max & muse-glimmer held

Following the 2026-08-30 Grok weekly run (Elo-only drift, no set changes; 3 candidates flagged needs-review), the owner reviewed all three pending candidates directly:

- **glm-5.3-max** (frontier, 1484±8/5820 votes, would drop Grok 4.6): **HELD** — dropping Grok 4 days after admitting it is editorial whiplash. Revisit if Grok's Elo gap widens further or GLM's votes keep climbing.
- **muse-glimmer** (open-weight, 1426±10/3718 votes, new provider, would drop qwen14b): **HELD** — qwen14b's smallest-footprint/"Two-GPU Pick" niche is a real positioning gap muse-glimmer doesn't fill. Revisit with more votes or a clearer case to drop qwen14b.
- **Qwen3.8-27B** (open-weight, same-provider replace of qwen32b): **ADMITTED**. New id `qwen27b`. +93 Elo (1440 vs 1347) at 15.3 GiB Q4 vs qwen32b's 20 GB — a real efficiency gain even without a first-party cluster bench yet (community-reported 65 tok/s on RTX 4090, no `bench_source` field since it's not our own measurement). `open_weight_models.json` re-sorted (1440 slots in right after gemma). `arena.py._OPEN_WEIGHT_NAME_MAP` swapped `qwen32b: [qwen3-32b]` → `qwen27b: [qwen3.8-27b]`. Open-weight Qwen count drops from 3 cards to 2.
- Audit log: 4 new records appended under `run_id: human-20260830-review` in `leaderboard-changes.jsonl`.
- **Watch next cycle**: cluster bench for qwen27b (no first-party number yet — first-party measurement should supersede the vendor/community 65 tok/s figure once available).

## Last run: 2026-08-26 weekly (Grok) — Grok 4.6 re-admit, drop DeepSeek

### Applied
- **Admit grok**: Grok 4.6, xAI, $2/$6, 500K, elo 1461, tag Agentic Code, color #EF4444, url https://grok.com. Strengths: Coding & Engineering.
- **Drop deepseek**: DeepSeek V4 Pro was lowest Elo (1458) at the six-model cap. Owner confirmed drop-weakest if Grok qualifies.
- **Daily Use → Muse Spark 1.2**: cheapest remaining tracked API at $1.25/$4.25. Muse strengths now include Honest Daily Use; insight updated.
- **Muse desc**: "cheapest agentic option" → "cheapest tracked API".
- **arena.py**: `_NAME_MAP.grok = ["grok-4.6-high","grok-4.6","grok-4.5"]`; removed deepseek aliases.
- **provider_catalog.json**: swapped DeepSeek entry for xAI Grok 4.6 (docs.x.ai/developers/models + x.ai/news/grok-4-6).
- Catalog/cluster guards exit 0. Cluster leaderboard table date still **2026-07-17**. Newest named-model check: Qwen3.8-27B skipped 2026-08-20 (Q4 ~15.3 GiB vs 16GB pool). Newest raw-bench row still Ministral-3-14B (2026-08-10).

### Verified model states
**Frontier (Elo desc):**
- **fable**: Claude Fable 5 — $10/$50, 1M, 1508
- **muse**: Muse Spark 1.2 — $1.25/$4.25, 1M, 1498 (now Daily Use leader)
- **claude**: Claude Opus 5 — $5/$25, 1M, 1493
- **gemini**: Gemini 3.1 Pro — $2/$12, 1M, 1486
- **qwen**: Qwen3.8-Max — $2/$6, 1M, 1481
- **grok**: Grok 4.6 — $2/$6, 500K, **1461** (text grok-4.6-high Preliminary / 3473 votes on Aug 21 snapshot; WebDev 1629 / 1523 votes, above Fable 1626)

**Open-weight:** gemma 1451, mistral 1357, qwen32b 1347, qwen30ba3b 1327, gptoss20b 1318, qwen14b 1300 (still unmatched on live arena)

### Catalog / cluster
- Catalog guard exit 0 (no version-ahead) before the admit. Official pages confirm Fable $10/$50, Opus 5 $5/$25, Gemini 3.1 Pro $2/$12 ≤200k, Muse 1.2 $1.25/$4.25, Qwen3.8-Max $2/$6. xAI docs list grok-4.6 as the recommended flagship at $2/$6 (<200k) / $4/$12 (≥200k), 500K context.
- Cluster bench: no drift vs open_weight_models.json. Latest leaderboard table date **2026-07-17**. Same untracked bench candidates as Aug 22; Qwen3.8-27B named-model skip 2026-08-20.

### Grok 4.6 admission (day 14)
**Verdict: ADMIT** (owner confirmed drop-weakest at cap)
- Hard: ✅ Elo 1461 is within 25 of prior floor 1458 (3 pts above). Calendar 2 weeks from Aug 12 GA. Still Preliminary / 3473 votes on an Aug 21 arena snapshot — documented, not treated as a hard fail at day 14.
- Hard: ✅ Public API $2/$6 (docs.x.ai/developers/models/grok-4.6)
- Hard: ✅ Proven provider (xAI)
- Hard: ✅ Context 500K ≥ 200K
- Soft: ✅ New provider (xAI was not in the Aug 22 set). Positioning: Code Arena WebDev grok-4.6-high **1629** ranks #5, above claude-fable-5 1626, at $2/$6 vs $10/$50.
- Set size: drop deepseek (lowest Elo). Unique price-leader niche is lost; Muse inherits Daily Use as cheapest remaining.
- Not admitted: grok-4.5 (superseded flagship, 1470 / 22k votes), grok-4.20-* (older, not recommended), grok-4.7 (not shipped; Musk said 3–4 weeks from Aug 12).

### Rejected this run
- **gemini-3.5-pro**: still absent from official pricing page
- **gemini-3.7-flash**: gemini-3.7-flash-high 1490 Preliminary / 5718 votes. Same-provider Flash; replacing 3.1 Pro would lose Hard Reasoning niche.
- **gpt-5.6-sol**: 1482, dropped Jul 17, no new unique positioning
- **Qwen3.8-2.4T-A95B**: custom license + not single-GPU
- **Hy3**: Apache 2.0 295B-A21B, arena 1457, official 8-GPU serve — fails single-GPU
- Cluster OW leftovers (Qwen3-8B, 2507 unconfirmed, Llama-3.1-8B, Gemma-3-4B, Gemma-4-E4B/12B, Phi-4-mini): no new evidence

### Needs human review / pending
- **glm-5.3-max**: API $1.40/$4.40, 1M ctx, Aug 14/18 GA. Arena glm-5.3-max **1487±10 / 3751 votes**. Passes hard + new-provider soft. 12 days from Aug 14 — 2-week bar still thin. Cap used by Grok admit; do not auto-replace.
- **Qwen3.8-27B**: HF live Apache 2.0, 27B dense VLM, Q4 weights ~15.3 GiB. Arena **qwen3.8-27b 1440±10 / 3205 votes**. Same-provider replace of qwen32b (1347). **Do not auto-replace:** already 3 Qwen OW cards; no first-party 4090 tok/s; cluster skipped it for the 16GB pool.
- **muse-glimmer**: Apache 2.0 30B, official 17GB Q4 for 24GB, arena **1426±10 / 3718 votes**. New OW provider. Set at 6 — human call to drop qwen14b.
- Watch whether grok-4.6-high **Preliminary flag drops** and whether text Elo holds as votes grow past 3473. WebDev 1629 / 1523 votes is also Preliminary.
- Wire arena.ai into Elo scraper (nakasyou still dead; ~461d)

### Notes
- Arena.ai snapshot still labeled **Aug 21, 2026** (same as last week). Tracked Elos other than the new grok row are unchanged.
- Grok 4.6 long-context surcharge: $4/$12 when prompt ≥200k. Card uses the standard $2/$6 rate, same convention as Gemini ≤200k.
- Claude Sonnet 5 $2/$10 intro price remains permanent. We do not track Sonnet.
- DeepSeek V4 Pro still exists at $0.66/$1.98 off-peak — it left the curated six, not the market.

## Previous run: 2026-08-22 weekly (Grok) — Qwen3.8-Max arena cool

### Applied
- Arena Elo refresh from arena.ai Aug 21: fable 1507→1508, muse 1499→1498, claude 1494→1493, qwen 1491→1481; gemini 1486 and deepseek 1458 unchanged.
- Desc Elo mentions updated for fable, muse, qwen; Overall Preference insight 1507→1508
- **grok-4.6 rejected** on day 10: 1461 Preliminary / 3473 votes. Re-check scheduled ~Aug 26.

### Rejected that run
- grok-4.6 (day 10, Preliminary), gemini-3.5-pro, gemini-3.7-flash, gpt-5.6-sol, deepseek-v4-pro-high-20260813, Qwen3.8-2.4T-A95B, Hy3, cluster OW leftovers

## Previous run: 2026-08-16 weekly (Grok) — DeepSeek price hike

### Applied
- **deepseek pricing**: $0.435/$0.87 → **$0.66/$1.98** (off-peak card). Peak $1.32/$3.96.

## Previous run: 2026-08-12 weekly (Grok)
- **grok-4.6 GA** rejected: 1464 prelim / 2448 votes, day 0. Dropped from set Aug 7 with Grok 4.5.
