# leaderboard-updater agent memory

## Last run: 2026-08-13 weekly (Grok) — Grok 4.6 re-check

### Applied
- None. Catalog/cluster guards exit 0. Elo scraper still blind (nakasyou 448d stale). Live arena.ai snapshot still labeled Aug 12; 1-point moves on fable/muse/claude sit inside CI — left curated Elos in place.

### Verified model states (unchanged)
**Frontier (Elo desc):**
- **fable**: Claude Fable 5 — $10/$50, 1M, 1507
- **muse**: Muse Spark 1.2 — $1.25/$4.25, 1M, 1499
- **claude**: Claude Opus 5 — $5/$25, 1M, 1494
- **qwen**: Qwen3.8-Max — $2/$6, 1M, 1491
- **gemini**: Gemini 3.1 Pro — $2/$12, 1M, 1486
- **deepseek**: DeepSeek V4 Pro — $0.435/$0.87, 1M, 1458

**Open-weight:** gemma 1451, mistral 1357, qwen32b 1347, qwen30ba3b 1327, gptoss20b 1318, qwen14b 1300 (still unmatched on live arena)

### Catalog / cluster
- Catalog guard exit 0 (no version-ahead)
- Cluster bench: no drift vs open_weight_models.json. Latest leaderboard table date **2026-07-17**. Newest raw-bench row still Ministral-3-14B (2026-08-10). Same untracked bench candidates as Aug 12; no new evidence.

### Rejected this run
- **grok-4.6** (user-requested re-check): official docs confirm $2/$6, 500K ctx, public API. Arena grok-4.6-high still **1464 Preliminary / 3396 votes** (was 2448 yesterday). Elo did not rise. Fails 2-week Elo hard req. Soft positioning also weak: same $2/$6 as Qwen3.8-Max, half the context, no category leadership. Set at 6 — dropping DeepSeek would lose Honest Daily Use / price-leader niche. Code Arena #5 (1630) and AA Index 61 are not the text-overall Elo signal.
- **deepseek-v4-pro-max-20260813**: new AutoEval-only arena row at 1465. Official pricing still DeepSeek-V4-Pro-0813 at $0.435/$0.87. Not a distinct public GA.

### Needs human review / pending
- **glm-5.2-max**: 1471 Elo, $1.40/$4.40, 1M ctx, Jun 16 GA. Passes hard + new-provider soft. Set at 6 — do not auto-replace (rebalanced Aug 7). No new evidence today.
- **gemini-3.5-pro**: still absent from official pricing page
- Monitor Qwen3.8-27B / Qwen3.8-Max open weights (HF still 404; "week of Aug 10" runs through Aug 16)
- Re-check Grok 4.6 after 2 weeks of arena votes (~Aug 26) **or** if Preliminary flag drops and Elo holds above the tracked floor
- Wire arena.ai into Elo scraper (nakasyou still dead)

### Notes
- DeepSeek pricing page still shows MODEL VERSION DeepSeek-V4-Pro-0813; changelog still says official Pro GA "soon." AutoEval slug is not a name change.
- User asked 2026-08-13 whether to put Grok 4.6 back on the board. Verdict: **no, not yet.** Recommendation logged; no models.json mutation.

## Previous run: 2026-08-12 weekly (Grok)

### Applied
- Arena Elo refresh from arena.ai Aug 12 (nakasyou still 447d stale):
  - muse 1498→1499, qwen 1497→1491, claude 1493→1494, gemini 1487→1486, deepseek 1457→1458
  - OW: mistral 1358→1357, gptoss20b 1317→1318; others unchanged
- Desc Elo mentions updated for muse, qwen, deepseek, gptoss20b
- `_OPEN_WEIGHT_NAME_MAP` gemma: prepend `gemma-4-31b` (live arena slug)

### Rejected that run
- **grok-4.6**: GA Aug 12, $2/$6, 500K ctx. Arena grok-4.6-high 1464 prelim / 2448 votes — fails 2-week Elo hard req.
- **gemini-3.5-pro**, **gpt-5.6-sol**, Qwen3.8 open weights (HF 404), cluster OW candidates

## Previous run: 2026-08-07 candidate admits (Grok — human approved)

### Applied (section-3 candidates from weekly report)
- **qwen** admit: **Qwen3.8-Max** — $2/$6, 1M ctx, Elo 1497. Replaces **kimi** (Kimi K3) under six-model cap.
- **deepseek** admit: **DeepSeek V4 Pro** — $0.435/$0.87, 1M ctx, Elo 1457. Replaces **grok** (Grok 4.5, lowest Elo). Honest Daily Use leadership → DeepSeek V4 Pro.
- **gptoss20b** OW admit: **gpt-oss-20b** — Apache 2.0, MXFP4 ~16 GB, Elo 1317, first-party 53.73 tok/s. Replaces **qwen8b** (lowest OW Elo).
