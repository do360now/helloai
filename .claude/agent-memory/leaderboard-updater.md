# leaderboard-updater agent memory

## Last run: 2026-08-16 weekly (Grok) — DeepSeek price hike

### Applied
- **deepseek pricing**: $0.435/$0.87 → **$0.66/$1.98** (off-peak card). Official peak/off-peak table live at 16:00 UTC Aug 16. Peak is $1.32/$3.96 (01:00–04:00 and 06:00–10:00 UTC). Cache-hit input $0.022/$0.044.
- **deepseek desc**: dropped the "order of magnitude under Western mid-tier" claim; still cheapest tracked API.
- **categories.json Honest Daily Use insight**: $0.435/$0.87 → $0.66/$1.98 off-peak.
- Catalog/cluster guards exit 0. Elo scraper still blind (nakasyou 451d stale). Live arena.ai snapshot still labeled Aug 12; 1-point moves on fable/muse/claude sit inside CI — left curated Elos in place.

### Verified model states
**Frontier (Elo desc):**
- **fable**: Claude Fable 5 — $10/$50, 1M, 1507
- **muse**: Muse Spark 1.2 — $1.25/$4.25, 1M, 1499
- **claude**: Claude Opus 5 — $5/$25, 1M, 1494
- **qwen**: Qwen3.8-Max — $2/$6, 1M, 1491
- **gemini**: Gemini 3.1 Pro — $2/$12, 1M, 1486
- **deepseek**: DeepSeek V4 Pro — **$0.66/$1.98 off-peak** ($1.32/$3.96 peak), 1M, 1458

**Open-weight:** gemma 1451, mistral 1357, qwen32b 1347, qwen30ba3b 1327, gptoss20b 1318, qwen14b 1300 (still unmatched on live arena)

### Catalog / cluster
- Catalog guard exit 0 (no version-ahead)
- Cluster bench: no drift vs open_weight_models.json. Latest leaderboard table date **2026-07-17**. Newest raw-bench row still Ministral-3-14B (2026-08-10). Same untracked bench candidates as Aug 12/13; no new evidence.

### Rejected this run
- **grok-4.6**: official $2/$6, 500K. Arena grok-4.6-high still **1464 Preliminary / 3396 votes** (unchanged since Aug 13). Fails 2-week Elo hard req. No unique niche vs Qwen $2/$6 or DeepSeek (still cheaper after the hike).
- **gemini-3.5-pro**: still absent from official pricing page
- **gemini-3.7-flash**: GA Aug 13, intro $0.75/$3.75 through Dec 31. Arena gemini-3.7-flash-high **1490 Preliminary / 5744 votes**. Same-provider Flash; replacing 3.1 Pro would lose Hard Reasoning niche. Same reject as 3.6 Flash.
- **gpt-5.6-sol**: 1481, dropped Jul 17, no new unique positioning
- **deepseek-v4-pro-max-20260813**: still AutoEval-only 1465. Official version still DeepSeek-V4-Pro-0813.
- **Qwen3.8-2.4T-A95B**: weights live; custom qwen3.8-max license + not single-GPU
- **Hy3**: Apache 2.0 295B-A21B, arena 1457, official 8-GPU serve / ~181GB Q4 — fails single-GPU
- Cluster OW leftovers (Qwen3-8B, 2507 unconfirmed, Llama-3.1-8B, Gemma-3-4B, Gemma-4-E4B/12B, Phi-4-mini): no new evidence

### Needs human review / pending
- **glm-5.2-max**: 1471 Elo, $1.40/$4.40, 1M ctx, Jun 16 GA. Passes hard + new-provider soft. Set at 6 — do not auto-replace.
- **Qwen3.8-27B**: HF live (Apache 2.0), 27B dense, Unsloth Q4 ~17–19 GB on a 4090. **No LMArena slug yet.** Same provider as three existing OW Qwen cards — do not auto-replace qwen32b until arena signal exists.
- **muse-glimmer**: Apache 2.0 30B (Aug 10), official 17GB Q4 for 24GB, arena **1426 / 3733 votes**. New OW provider + agentic local story. Set at 6 — human call to drop qwen14b (unique two-GPU niche) or another card.
- Re-check Grok 4.6 after 2 weeks of arena votes (~Aug 26) **or** if Preliminary flag drops and Elo holds above the tracked floor
- Wire arena.ai into Elo scraper (nakasyou still dead)

### Notes
- DeepSeek pricing page no longer shows a single $0.435/$0.87 row. Use off-peak cache-miss/output as the helloai card (majority hours), same convention as Gemini's standard ≤200K rate.
- DeepSeek remains Honest Daily Use leader after the hike: $0.66/$1.98 still undercuts Muse $1.25/$4.25.
- User asked 2026-08-13 whether to put Grok 4.6 back on the board. Verdict still **no, not yet** (day 4, same 1464 Preliminary).

## Previous run: 2026-08-13 weekly (Grok) — Grok 4.6 re-check

### Applied
- None. Catalog/cluster guards exit 0. Elo scraper still blind (nakasyou 448d stale). Live arena.ai snapshot still labeled Aug 12; 1-point moves on fable/muse/claude sit inside CI — left curated Elos in place.

### Rejected that run
- **grok-4.6** (user-requested re-check): official docs confirm $2/$6, 500K ctx, public API. Arena grok-4.6-high still **1464 Preliminary / 3396 votes** (was 2448 Aug 12). Elo did not rise. Fails 2-week Elo hard req.
- **deepseek-v4-pro-max-20260813**: AutoEval-only 1465. Official pricing then still DeepSeek-V4-Pro-0813 at $0.435/$0.87.

## Previous run: 2026-08-12 weekly (Grok)

### Applied
- Arena Elo refresh from arena.ai Aug 12 (nakasyou still 447d stale):
  - muse 1498→1499, qwen 1497→1491, claude 1493→1494, gemini 1487→1486, deepseek 1457→1458
  - OW: mistral 1358→1357, gptoss20b 1317→1318; others unchanged
- Desc Elo mentions updated for muse, qwen, deepseek, gptoss20b
- `_OPEN_WEIGHT_NAME_MAP` gemma: prepend `gemma-4-31b` (live arena slug)

### Rejected that run
- **grok-4.6**: GA Aug 12, $2/$6, 500K ctx. Arena grok-4.6-high 1464 prelim / 2448 votes — fails 2-week Elo hard req.
- **gemini-3.5-pro**, **gpt-5.6-sol**, Qwen3.8 open weights (HF 404 at the time), cluster OW candidates
