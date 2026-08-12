# leaderboard-updater agent memory

## Last run: 2026-08-12 weekly (Grok)

### Applied
- Arena Elo refresh from arena.ai Aug 12 (nakasyou still 447d stale):
  - muse 1498→1499, qwen 1497→1491, claude 1493→1494, gemini 1487→1486, deepseek 1457→1458
  - OW: mistral 1358→1357, gptoss20b 1317→1318; others unchanged
- Desc Elo mentions updated for muse, qwen, deepseek, gptoss20b
- `_OPEN_WEIGHT_NAME_MAP` gemma: prepend `gemma-4-31b` (live arena slug)

### Verified model states (post-refresh)
**Frontier (Elo desc):**
- **fable**: Claude Fable 5 — $10/$50, 1M, 1507
- **muse**: Muse Spark 1.2 — $1.25/$4.25, 1M, 1499
- **claude**: Claude Opus 5 — $5/$25, 1M, 1494
- **qwen**: Qwen3.8-Max — $2/$6, 1M, 1491
- **gemini**: Gemini 3.1 Pro — $2/$12, 1M, 1486
- **deepseek**: DeepSeek V4 Pro — $0.435/$0.87, 1M, 1458

**Open-weight:** gemma 1451, mistral 1357, qwen32b 1347, qwen30ba3b 1327, gptoss20b 1318, qwen14b 1300

### Catalog / cluster
- Catalog guard exit 0 (no version-ahead)
- Cluster bench: no drift vs open_weight_models.json. Latest leaderboard table date **2026-07-17**. Newest raw-bench row: Ministral-3-14B (2026-08-10), not a tracked-model mismatch.

### Rejected this run
- **grok-4.6**: GA Aug 12, $2/$6, 500K ctx. Arena grok-4.6-high 1464 prelim / 2448 votes — fails 2-week Elo hard req. xAI not currently in set.
- **gemini-3.5-pro**: still not on official pricing page
- **gpt-5.6-sol**: no new unique-positioning evidence
- **Qwen3.8-Max / Qwen3.8-27B weights**: HF 404; promised week of Aug 10 missed
- Cluster OW candidates (Qwen3-8B, 30B-A3B-Instruct-2507, Llama-3.1-8B, Gemma-3-4B, Gemma-4-E4B, Gemma-4-12b, Phi-4-mini): all REJECT (set full / already tracked sibling / arena fail)

### Needs human review / pending
- **glm-5.2-max**: 1471 Elo, $1.40/$4.40, 1M ctx, Jun 16 GA. Passes hard + new-provider soft. Set at 6 — do not auto-replace this week (just rebalanced Aug 7).
- **gemini-3.5-pro**: still not GA
- Monitor Qwen3.8-27B / Qwen3.8-Max open weights (missed Aug 10 week)
- Re-check Grok 4.6 after 2 weeks of arena votes
- Wire arena.ai into Elo scraper (nakasyou still dead)

### Notes
- DeepSeek pricing page shows MODEL VERSION DeepSeek-V4-Pro-0813; changelog still says official Pro GA "soon" and last dated Pro note is Jul 31 Flash-only. No name change this week — ⚠️ verify if a Pro GA post lands.
- Qwen3.8-Max preliminary cooled 6 Elo as votes rose (3k→6.9k); sort order now claude above qwen.

## Previous run: 2026-08-07 candidate admits (Grok — human approved)

### Applied (section-3 candidates from weekly report)
- **qwen** admit: **Qwen3.8-Max** — $2/$6, 1M ctx, Elo 1497. Replaces **kimi** (Kimi K3) under six-model cap.
- **deepseek** admit: **DeepSeek V4 Pro** — $0.435/$0.87, 1M ctx, Elo 1457. Replaces **grok** (Grok 4.5, lowest Elo). Honest Daily Use leadership → DeepSeek V4 Pro.
- **gptoss20b** OW admit: **gpt-oss-20b** — Apache 2.0, MXFP4 ~16 GB, Elo 1317, first-party 53.73 tok/s. Replaces **qwen8b** (lowest OW Elo).
