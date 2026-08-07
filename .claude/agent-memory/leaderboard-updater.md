# leaderboard-updater agent memory

## Last run: 2026-08-07 weekly (Grok)

### Applied
- **muse** version-drift: Meta shipped **Muse Spark 1.2** with Muse Code (Aug 5–6). Same-provider replace under existing `muse` id.
  - name: "Muse Spark 1.1" → "Muse Spark 1.2"
  - desc: agentic coding upgrade co-trained with Muse Code; #2 at 1498 Elo; still $1.25/$4.25, 1M ctx
  - `arena._NAME_MAP["muse"]`: prepended `muse-spark-1.2` (1.1 + muse-spark kept as fallback)
  - elo: 1495 → 1498 (arena muse-spark-1.2 xHigh)
- **claude** name-map-drift: arena now lists effort variants
  - prepended `claude-opus-5-high`, `claude-opus-5-max` ahead of thinking/base aliases
  - elo: 1484 → 1493 (claude-opus-5-high; model was 1 day old last week with no votes)
- **Elo refresh (manual)** from arena.ai Aug 6 — nakasyou still 442d stale / CSV 339d stale:
  - fable 1507, muse 1498, claude 1493, gemini 1487, kimi 1485, grok 1468
  - OW: gemma 1451, mistral 1358, qwen32b 1347, qwen30ba3b 1327, qwen14b 1300, qwen8b 1275 (unchanged)
- Catalog guard: exit 0 (xAI news 403 only; no version drift). Cluster bench: exit 0, no throughput drift; same 7 candidates as prior runs.

### Verified model states (post-refresh)
- **fable**: Claude Fable 5 — $10/$50, 1M ctx, Elo 1507
- **muse**: Muse Spark 1.2 — $1.25/$4.25, 1M ctx, Elo 1498 (#2)
- **claude**: Claude Opus 5 — $5/$25, 1M ctx, Elo 1493 (arena `claude-opus-5-high`)
- **gemini**: Gemini 3.1 Pro Preview — $2/$12, 1M ctx, Elo 1487. **Gemini 3.5 Pro still not GA**
- **kimi**: Kimi K3 — $3/$15 (cache-hit $0.30), 1M ctx, Elo 1485
- **grok**: Grok 4.5 — $2/$6, 500K ctx, Elo 1468

### Rejected candidates (do not re-propose within 30 days unless new evidence)
- **gemini-3.5-pro**: still absent from official pricing page as of Aug 7.
- **gpt-5.6-sol**: within threshold but dropped Jul 17 for Kimi; no re-admit evidence.
- **Kimi K3 open weights**: shipped Jul 27; 2.8T MoE fails single-GPU ≤24GB OW hard req.
- **Qwen3-30B-A3B-Instruct-2507**: unconfirmed provenance; already track qwen30ba3b.
- Cluster mid-size rejects: Gemma-4-12b-it, Phi-4-mini, Llama-3.1-8B, Gemma-3-4B, Gemma-4-E4B (set full / no unique tier).

### Needs human review
- **qwen3.8-max** (Alibaba): GA Aug 3, arena ~1497, $2/$6, 1M ctx. Passes hard + new-provider soft. Set at 6 — replace whom? (lowest unique-positioning candidate: grok)
- **DeepSeek V4** (deepseek-v4-pro): arena 1457 now within 25 of floor 1468 (prior rejects used higher floor). MIT API $0.43/$0.87, 1M. Set at 6 — human call.
- **gpt-oss-20b** (OpenAI open-weight): arena ~1317–1352 band, Apache 2.0, cluster 53.73 tok/s. OW set at 6 — replace whom?

### Pending for next run
- Monitor Gemini 3.5 Pro GA → same-provider replace for `gemini`.
- Wire arena.ai into Elo scraper (nakasyou dead streak continues — 442d).
- Qwen3.8-Max open weights promised "next week" after Aug 3 — evaluate OW track if single-GPU friendly (2.4T likely fails).
- Human decision on qwen3.8-max / DeepSeek V4 frontier admit under six-model cap.
- Run catalog guard every weekly.

### Notes
- Live arena Aug 6: claude-fable-5 1507, muse-spark-1.2 1498, claude-opus-5-high 1493, gemini-3.1-pro-preview 1487, kimi-k3-max 1485, grok-4.5 1468.
- Cluster bench last integrated: 2026-07-15 (qwen30ba3b, mistral first-party); qwen14b 2026-07-06; qwen8b 2026-07-05. Guard 2026-08-07: no drift.
- Official Kimi pricing: https://platform.kimi.ai/docs/pricing/chat-k3
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing (3.1 Pro Preview still listed; no 3.5 Pro)
- Muse Spark 1.2 / Muse Code: https://www.cnbc.com/2026/08/05/meta-debuts-muse-code-to-take-on-anthropic-and-openai-.html
- Anthropic API: Fable 5 $10/$50, Opus 5 $5/$25 (claude.com/pricing)

## Previous run: 2026-07-25 weekly (Claude Code fallback)

### Applied
- **claude** version-drift: Claude Opus 4.8 → Claude Opus 5 (Jul 24 GA). Same $5/$25, 1M ctx. Arena aliases prepended; elo left 1484 pending votes.

### Note on execution path
That run had no Grok tool available; Claude Code executed the role as documented fallback.
