# leaderboard-updater agent memory

## Last run: 2026-10-04 weekly (Grok) — Oct 2 text board; cap stays six

### Applied
- **Text board moved** from Sep 30 to **Oct 2** (8,626,731 votes, 413 models). Scrapers still skipped (stale). Numbers are hand-set from the arena.ai text page with full `elo_source`. `checked_date` is 2026-10-04. `snapshot_date` is 2026-10-02.
- **claude**: Elo stays **1504**. Interval ±10 → **±9**, votes 3932 → **4552** (`claude-opus-5.5-high`).
- **fable**: Elo stays **1501**. Interval ±7 → **±6**, votes 11241 → **11800** (`claude-fable-5.1-max`).
- **muse**: 1495±6 / 11698 → **1494±6 / 12343** (`muse-spark-1.3-max`).
- **gemini**: Elo stays **1487±3**. Votes 121225 → **121806**.
- **qwen**: 1481±5 / 22809 → **1482±5 / 23353** (`qwen3.8-max`).
- **grok**: Elo stays **1442±8**. Votes 5675 → **6405**. Desc vote count updated. WebDev 1636 / 3062 was not re-checked.
- **Open-weight**: qwen27b 1439 → **1438** (`qwen3.8-27b` 1438±5 / 18462). qwen30ba3b 1327 → **1326** (`qwen3-30b-a3b` 1326±5 / 26037). gemma 1453, mistral 1356, gptoss20b 1318 unchanged. qwen14b (`qwen3-14b`) still absent.
- **Catalog** exit 0. **Cluster** exit 0, no drift vs the **2026-07-15** table. **Claims** exit 0 before the prose vote-count edit; claim text for Grok's vote count was updated in the same change and left unverified. Did not set `checked_at`.
- **Overall insight** date September 30 → October 2. Leader unchanged (Opus 5.5, 1504). Coding insight WebDev numbers were not refreshed.

### Verified model states
**Frontier (Elo desc, text overall Oct 2, all own scores):**
- **claude**: Claude Opus 5.5 — $4/$20, 1M, **1504** (claude-opus-5.5-high 1504±9 / 4552).
- **fable**: Claude Fable 5.1 — $10/$50, 1M, **1501** (claude-fable-5.1-max 1501±6 / 11800).
- **muse**: Muse Spark 1.3 — $1.25/$4.25, 1M, **1494** (muse-spark-1.3-max 1494±6 / 12343).
- **gemini**: Gemini 3.1 Pro — $2/$12 ≤200k, 1M, **1487** (gemini-3.1-pro-preview 1487±3 / 121806).
- **qwen**: Qwen3.8-Max — $2/$6, 1M, **1482** (qwen3.8-max 1482±5 / 23353).
- **grok**: Grok 4.7 — $2/$6, 500K, **1442** (grok-4.7-xhigh 1442±8 / 6405). Predecessor on the same board: grok-4.6-high **1454±5 / 23680**.

**Open-weight:** gemma 1453, qwen27b 1438, mistral 1356, qwen30ba3b 1326, gptoss20b 1318, qwen14b 1300 (unmatched).

### Not admitted
- **gpt-6-astra**: Oct 2 text **1477±7 / 9156** (rank 29). Prior points this site recorded: Sep 30 **1476±7 / 8565**, Sep 13 **1480±12 / 2693**. Still clears the text gate. **Not admitted.** Owner on 2026-10-01 kept the cap at six and said not to admit Astra or GLM-5.3-max.
- **glm-5.3-max**: Oct 2 text **1478±6 / 17857**. Same hold.
- **gemini-4-argon**: Oct 2 text rank 1 **1525±9 Preliminary / 4932**. Second snapshot after Sep 30, still Preliminary. Catalog guard still tracks Gemini 3.1 Pro. **REJECT** (no public API as the recommended model).
- **gpt-6.1-sol**: now on the text board as gpt-6.1-sol-max **1483±11 / 3071**. First snapshot, thin sample. **REJECT** (two-snapshot bar). API was already $2/$10.
- Cluster leftovers unchanged. Last-integrated bench date remains **2026-07-15**.

### Needs human review / pending
- **gpt-6-astra** and **glm-5.3-max**: both still clear the text gate. The 2026-10-01 decision stands: do not drop Grok 4.7 for either unless the owner asks again.
- **gemini-4-argon**: revisit when the Preliminary flag is gone and a public API is the catalog model.
- **gpt-6.1-sol**: revisit on a second text snapshot with a thicker sample.
- Arena price column still disagrees with catalogs (Gemini 3.1 Pro shown as $1/$6). Card prices were not taken from that column.
- Code Arena WebDev figures in desc and the Coding insight are still the Sep 30 numbers.

### Notes
- No frontier model is on a borrowed score. Cap stays at six.
- Opus 5.5 and Fable 5.1 are 3 points apart (1504 vs 1501). Intervals overlap (±9 and ±6).
- Article this cycle is the 2026-10-04 worktree cup, not an admission piece.

## Previous run: 2026-09-30 weekly (Grok) — Sep 30 text board; Opus 5.5 and Grok 4.7 get their own Elo

### Applied
- **Text board moved** from Sep 13 to **Sep 30** (8,602,501 votes, 410 models). Scrapers still skipped (`--skip-fetch`); numbers are hand-set from the arena.ai page with full `elo_source`.
- **claude**: card Elo 1493 (borrowed `claude-opus-5-high`) → **1504** (`claude-opus-5.5-high` 1504±10 / 3932). `matches_listed_model` true. Now the tracked Elo lead and the Coding / Overall leader.
- **fable**: 1498±8 / 5783 → **1501±7 / 11241** (`claude-fable-5.1-max`). WebDev 1755 → **1751**, behind Astra **1789** and Opus 5.5-max **1818**.
- **muse**: 1493±9 / 4723 → **1495±6 / 11698**.
- **gemini**: Elo stays **1487±3**. Votes 106951 → **121225**. Snapshot date refreshed.
- **qwen**: Elo stays **1481**. Interval ±6 → **±5**, votes 16670 → **22809**. `qwen3.8-max-0902` is not on this text board.
- **grok**: card Elo 1456 (borrowed `grok-4.6-high`) → **1442** (`grok-4.7-xhigh` 1442±8 / 5675, rank 88). Predecessor on the same board is **1453±5 / 23012**. WebDev 1632/1425 → **1636/3062**.
- **Open-weight** (`--set-ow`): gemma 1451→**1453**, qwen27b 1437→**1439**, mistral 1357→**1356**, gptoss20b 1317→**1318**. qwen30ba3b 1327 and qwen14b 1300 unchanged (qwen3-14b still absent).
- **Catalog** exit 0. **Cluster** exit 0, no drift vs the **2026-07-15** table. **Claims** exit 0; still 15 unverified (ratchet). Did not set `checked_at`.

### Verified model states
**Frontier (Elo desc, text overall Sep 30, all own scores):**
- **claude**: Claude Opus 5.5 — $4/$20, 1M, **1504** (claude-opus-5.5-high 1504±10 / 3932). WebDev Sep 30: claude-opus-5.5-max **1818** / 1976, rank 1.
- **fable**: Claude Fable 5.1 — $10/$50, 1M, **1501** (claude-fable-5.1-max 1501±7 / 11241). WebDev **1751** / 6137, rank 4.
- **muse**: Muse Spark 1.3 — $1.25/$4.25, 1M, **1495** (muse-spark-1.3-max 1495±6 / 11698).
- **gemini**: Gemini 3.1 Pro — $2/$12 ≤200k, 1M, **1487** (gemini-3.1-pro-preview 1487±3 / 121225).
- **qwen**: Qwen3.8-Max — $2/$6, 1M, **1481** (qwen3.8-max 1481±5 / 22809).
- **grok**: Grok 4.7 — $2/$6, 500K, **1442** (grok-4.7-xhigh 1442±8 / 5675). WebDev **1636** / 3062, rank 15.

**Open-weight:** gemma 1453, qwen27b 1439, mistral 1356, qwen30ba3b 1327, gptoss20b 1318, qwen14b 1300 (unmatched).

### Not admitted
- **gpt-6-astra**: Sep 30 text **1476±7 / 8565** (rank 30). Prior published snapshot this site recorded: Sep 13 **1480±12 / 2693**. Two consecutive board dates, both inside 25 of the floor. Public API $10/$50, 1.05M. WebDev rank 2 at **1789** / 5918. **NEEDS HUMAN REVIEW.** Cap-6 drop would be grok (lowest own Elo, 1442).
- **glm-5.3-max**: Sep 30 text **1479±6 / 17268**. Also above the floor. Aug 30 human hold has aged out. Same drop. Do not choose between Astra and GLM.
- **gemini-4-argon**: announced Sep 30. Text rank 1 **1525±9 Preliminary / 4942**. Fairwind testers only; no public developer API. Introductory price named as $2/$10, then $4/$20. **REJECT** (one snapshot + no public API). Top watch for a same-provider replace of 3.1 Pro.
- **gpt-6.1-sol**: API today, `gpt-6.1-sol`, $2/$10, cache $0.10. WebDev rank 3 **1759±19 / 1264**. **Not on the text board. REJECT.**
- Cluster leftovers (Qwen3-8B, Gemma-3-4B, Phi-4-mini, Gemma-4-E4B, Gemma-4-12b) not on the text fetch. llama-3.1-8b-instruct is **1211**, outside 40 of qwen14b 1300. Rejected again. Aug 30 window had closed.

### Needs human review / pending
- **gpt-6-astra** and **glm-5.3-max**: both clear the text gate. Owner decides whether to drop Grok 4.7, and for which one. Do not auto-drop.
- **gemini-4-argon**: revisit when a second text snapshot exists AND a public API with a price is live.
- **gpt-6.1-sol**: revisit when a text slug exists across two snapshots.
- **qwen3-30b-a3b-instruct-2507** scores **1383** vs the mapped `qwen3-30b-a3b` at **1327**. Not retargeted; identity of the card vs the July 2025 instruct slug is unverified.
- Arena price column still disagrees with catalogs in places (Gemini 3.1 Pro shown as $1/$6). Catalog guard exit 0; card prices were not taken from that column.
- Cluster guard still bound to 2026-07-15. Last-integrated bench date remains **2026-07-15**.

### Notes
- No frontier model is on a borrowed score after this run. The "do not choose among unrated models" clause did not trigger. The cap-6 drop still requires human confirmation because Grok is the lowest own Elo.
- Opus 5.5 and Fable 5.1 are 3 points apart (1504 vs 1501). Intervals overlap (±10 and ±7).
- Grok 4.7 long-context surcharge is still $4/$12 at ≥200k. Card uses standard $2/$6.
- Dated Qwen 0902 snapshot still does not rename the card.

## Previous run: 2026-09-23 weekly (Grok) — Opus 5.5 price cut; Grok 4.7 same-rate replace

### Applied
- **claude**: Claude Opus 5 → **Claude Opus 5.5**. $5/$25 → **$4/$20**. Cache reads $0.50 → $0.20. 1M unchanged. API id `claude-opus-5-5`. Tag Coding King → **40% Cheaper**. Arena aliases prepend `claude-opus-5.5-*` and `claude-opus-5-5-*`; Opus 5 slugs stay as fallback. Card Elo stays **1493** (claude-opus-5-high). Text board has no 5.5 slug.
- **grok**: Grok 4.6 → **Grok 4.7**. Same $2/$6 (<200k) / $4/$12 (≥200k), 500K. Docs recommend 4.7 for chat and code. Arena aliases prepend `grok-4.7-xhigh`, `grok-4.7-high`, `grok-4.7`. Card Elo stays **1456** (grok-4.6-high).
- **fable desc + Coding insight**: Code Arena WebDev 1758→**1755**; Astra 1800→**1793**.
- **provider_catalog.json**: claude news URL → Opus 5.5 announcement; grok news URL → https://x.ai/news/grok-4-7.
- **Elo**: no `--set`. Scrapers still refuse stale snapshots (nakasyou 489d, CSV 385d). Text overall still **Sep 13**.

### Catalog / cluster
- Catalog guard initially exit 1: Opus 5.5 ahead of Opus 5; Grok 4.7 ahead of 4.6. Patched. Re-run after apply: exit 0.
- Cluster bench: no drift vs the **2026-07-15** cluster-only table. Same untracked bench candidates as Sep 18; skipped (rejected Aug 30, still inside 30 days). qwen27b still has no first-party `bench_source`. Last-integrated bench date remains **2026-07-15**.

### Verified model states
**Frontier (Elo desc, text overall still Sep 13 — predecessor slugs):**
- **fable**: Claude Fable 5.1 — $10/$50, 1M, **1498** (claude-fable-5.1-max 1498±8 / 5783). WebDev Sep 22: **1755** / 4887, rank 2.
- **muse**: Muse Spark 1.3 — $1.25/$4.25, 1M, **1493** (muse-spark-1.3-max). WebDev Sep 22: 1657 / 5239.
- **claude**: Claude Opus 5.5 — $4/$20, cache $0.20, 1M, card **1493** is still claude-opus-5-high. Not on Sep 13 text or Sep 22 WebDev.
- **gemini**: Gemini 3.1 Pro — $2/$12 ≤200k, 1M, **1487**. 3.5 Pro still absent. 3.8 Flash still not a Pro replace.
- **qwen**: Qwen3.8-Max — $2/$6, 1M, **1481**. WebDev Sep 22: qwen3.8-max 1671 Preliminary / 3221; 0902 1662 Preliminary / 5350.
- **grok**: Grok 4.7 — $2/$6, 500K, card **1456** is still grok-4.6-high (15521 votes, Sep 13). WebDev Sep 22: grok-4.7-xhigh **1632** +17/-17 / 1425, rank 10; grok-4.6-high 1616 / 6447.

**Open-weight:** gemma 1451, qwen27b 1437, mistral 1357, qwen30ba3b 1327, gptoss20b 1317, qwen14b 1300 (unmatched). No open-weight patches.

### Official pricing still current
- Fable 5.1 $10/$50, cache reads $0.25 (https://platform.claude.com/docs/en/about-claude/pricing)
- Opus 5.5 $4/$20, cache reads $0.20, fast mode $8/$40 (https://www.anthropic.com/news/claude-opus-5-5)
- Gemini 3.1 Pro Preview $2/$12 ≤200k (https://ai.google.dev/gemini-api/docs/pricing)
- Muse Spark 1.3 $1.25/$4.25 (contributor $0.10/$0.20)
- Qwen3.8-Max $2/$6, 1M — https://www.qwencloud.com/models/qwen3.8-max
- Grok 4.7 $2/$6 (<200k) / $4/$12 (≥200k), 500K — https://docs.x.ai/developers/models/grok-4.7
- GPT-6 Astra (untracked) $10/$50, cache $1, 1,050,000 ctx

### Rejected this run
- **gpt-6-astra**: text still the Sep 13 point, **1480±12 / 2693**. Launch Sep 3 is now day 20, but the board has not published a second measurement. **Fails 2-week sustainment.** WebDev Sep 22: **1793** / 4230, still rank 1. Cap-6 drop would be grok. Top watch.
- **gemini-3.5-pro**, **gemini-3.8-flash**, **Mistral Small 4**, cluster leftovers, muse-glimmer: skipped (rejected or held within 30 days, no material new text-board evidence).

### Needs human review / pending
- **gpt-6-astra**: top watch. Revisit when a text snapshot newer than Sep 13 keeps it inside 25 points of the floor with a thicker sample. Cap-6 drop would be grok.
- **glm-5.3-max**: text unchanged at **1483±6 / 10960**. WebDev Sep 22 **1620 / 5763** (was 1609 / 2930 on Sep 7). Human held Aug 30 (whiplash vs Grok). Do not auto-drop grok. Hold window closes ~Sep 29.
- Watch for a text slug for **claude-opus-5.5** / **claude-opus-5-5** and **grok-4.7** before treating card Elo as the new model's score.
- Wire arena.ai into the Elo scraper (nakasyou 489d; CSV 385d). Text board itself is 10 days stale (Sep 13 vs today Sep 23).
- Cluster guard still bound to 2026-07-15; current-rig leaderboard in results.md is still the 2026-08-27 dual-5060 table the guard does not map.

### Notes
- Opus 5.5 and Grok 4.7 card Elos are predecessor fallbacks. Do not describe them as the new models' text Elo.
- Grok 4.7 long-context surcharge is still $4/$12 at ≥200k. Card uses standard $2/$6.
- Opus 5.5 cache reads are $0.20 vs Fable 5.1 $0.25 vs Astra $1.
- Dated Qwen 0902 snapshot still does not rename the card.

## Previous run: 2026-09-18 weekly (Grok) — Astra text Elo lands; Muse 1.3-max alias; Elo --set

### Applied
- **muse arena alias**: prepend `muse-spark-1.3-max` (Sep 13 text overall 1493±9 / 4723). Card name stays Muse Spark 1.3.
- **muse desc**: max reasoning is live (product page + 1.3-max slug).
- **fable desc + Coding insight**: Code Arena WebDev 1762→**1758**; Astra 1797→**1800**.
- **Overall insight**: 1504→**1498**.
- **grok desc**: text 1461→**1456** / 15,521 votes, Preliminary flag dropped; WebDev 1625→**1618**.
- **Elo** (arena.ai Sep 13, manual `--set`/`--set-ow`; nakasyou 484d, CSV 381d): fable 1504→**1498**, muse 1499→**1493**, qwen 1480→**1481**, grok 1461→**1456**, qwen27b 1436→**1437**. claude 1493, gemini 1487, gemma 1451, mistral 1357, qwen30ba3b 1327, gptoss20b 1317, qwen14b 1300 unmatched.

### Catalog / cluster
- Catalog guard exit 0. Tracked names still current: Fable 5.1, Opus 5, Gemini 3.1 Pro, Muse Spark 1.3, Qwen3.8-Max, Grok 4.6.
- Cluster bench: no drift vs the **2026-07-15** "Model comparison — cluster-only" table. Same untracked bench candidates as Sep 7; skipped (rejected Aug 30, within 30 days). qwen27b still has no first-party `bench_source`. Last-integrated bench date remains **2026-07-15**; current-rig leaderboard in results.md is still the 2026-08-27 dual-5060 table the guard does not map.

### Verified model states
**Frontier (Elo desc, text overall Sep 13):**
- **fable**: Claude Fable 5.1 — $10/$50, 1M, **1498** (claude-fable-5.1-max 1498±8 / 5783)
- **muse**: Muse Spark 1.3 — $1.25/$4.25, 1M, **1493** (muse-spark-1.3-max 1493±9 / 4723). Max reasoning GA.
- **claude**: Claude Opus 5 — $5/$25, 1M, **1493** (claude-opus-5-high 1493±4 / 42617)
- **gemini**: Gemini 3.1 Pro — $2/$12, 1M, **1487** (gemini-3.1-pro-preview 1487±3 / 106951)
- **qwen**: Qwen3.8-Max — $2/$6, 1M, **1481** (qwen3.8-max 1481±6 / 16670). 0902 still code-only.
- **grok**: Grok 4.6 — $2/$6, 500K, **1456** (grok-4.6-high 1456±6 / 15521, no Preliminary)

**Open-weight:** gemma 1451, qwen27b **1437**, mistral 1357, qwen30ba3b 1327, gptoss20b 1317, qwen14b 1300 (unmatched)

### Official pricing still current
- Fable 5.1 $10/$50, cache reads $0.25 (https://platform.claude.com/docs/en/about-claude/pricing)
- Opus 5 $5/$25
- Gemini 3.1 Pro Preview $2/$12 ≤200k (https://ai.google.dev/gemini-api/docs/pricing) — 3.5 Pro still absent. 3.8 Flash GA $0.75/$3.75 intro through 2026-12-31.
- Muse Spark 1.3 $1.25/$4.25 (contributor $0.10/$0.20) — https://developer.meta.com/ai/models/muse-spark/
- Qwen3.8-Max $2/$6, 1M — https://www.qwencloud.com/models/qwen3.8-max
- Grok 4.6 $2/$6 (<200k) / $4/$12 (≥200k), 500K; docs still recommend 4.6
- GPT-6 Astra (untracked) $10/$50, cache $1, 1,050,000 ctx — https://developers.openai.com/api/docs/models/gpt-6-astra

### Rejected this run
- **gpt-6-astra**: now on Sep 13 text board at **1480±12 / 2693**. Clears 25-pt floor vs grok 1456. Snapshot is 10 days after Sep 3 launch; thin sample / ±12. **Fails 2-week Elo hard req.** Cap-6 drop would be grok. Top watch for next cycle.
- **grok-4.7**: not shipped. Docs still recommend 4.6. Sep 12 ETA missed; GCP quota leaks are not a model card.
- **gemini-3.5-pro**: still absent from official pricing.
- **gemini-3.8-flash**: 1493±9 Preliminary / 5076. Same-provider Flash; replacing 3.1 Pro would lose Hard Reasoning.
- **Mistral Small 4**: Apache 2.0 119B MoE; official min infra 4x H100. Fails single-GPU. Keep Small 3.2 24B.
- Cluster leftovers, GLM OW, Hy3, gpt-5.6-sol, muse-glimmer: skipped (rejected/held within 30 days, no material new drop case). muse-glimmer still 1427±10 / 3666 (votes slightly down).

### Needs human review / pending
- **gpt-6-astra**: top watch. Text Elo landed. Revisit the moment the board is 2+ weeks post-launch with a thicker sample. Cap-6 drop would be grok (lowest Elo, now 1456 on 15k votes).
- **glm-5.3-max**: Day 35 from Aug 14. Text Sep 13: **1483±6 / 10960**. Grok gap widened 21→27 pts. Human held Aug 30 (whiplash vs Grok). Re-surface; do not auto-drop grok.
- **muse-glimmer**: human held Aug 30 (qwen14b two-GPU niche). Votes unchanged/down. No new drop case.
- Watch Fable 5.1 text sample as votes grow past 5783 (interval ±8 vs Fable 5-high's ±5 / 30057).
- Wire arena.ai into Elo scraper (nakasyou 484d; CSV 381d). Text board itself is 5 days stale (Sep 13 vs today Sep 18).
- Cluster guard still bound to 2026-07-15 table; consider mapping the 2026-08-27 dual-5060 leaderboard before treating 112.28 tok/s as the gptoss20b card number.

### Notes
- `--set` is `nargs="+"`: pass `--set fable=1498 muse=1493 qwen=1481`, not repeated `--set` flags (later flags overwrite).
- Dated snapshots (qwen3.8-max-0902) still do not change the catalog product name. 0902 remains code-arena only on Sep 13 text board.
- Grok 4.6 long-context surcharge still $4/$12 when prompt ≥200k. Card uses standard $2/$6.
- Astra cache reads are $1 vs Fable 5.1 $0.25 at the same $10/$50 list — material if/when Astra is admitted.
- Muse 1.3-max is now the live text slug; do not fall back to 1.2 xHigh Elo.
- Claude Sonnet 5 $2/$10 intro price is now the permanent standard. We do not track Sonnet.

## Previous run: 2026-09-07 weekly (Grok) — GPT-6 Astra watch; Qwen 0902 alias; WebDev numbers

### Applied
- **qwen arena alias**: prepend `qwen3.8-max-0902` (QwenCloud Sep 2 coding/cowork snapshot; same $2/$6, 1M). Card name stays Qwen3.8-Max.
- **qwen desc**: notes the 0902 snapshot.
- **fable desc + Coding insight**: Code Arena WebDev 1765→**1762**; no longer absolute #1 — gpt-6-astra-max **1797**.
- **grok desc**: WebDev 1629→**1625**, now behind Fable and Astra.
- **Elo**: scrapers still dead (nakasyou 473d, CSV 369d). Live text overall still **Sep 2** and matches curated Elos — no `--set`.

### Catalog / cluster
- Catalog guard exit 0. Tracked names still current: Fable 5.1, Opus 5, Gemini 3.1 Pro, Muse Spark 1.3, Qwen3.8-Max, Grok 4.6.
- Cluster bench: no drift vs the **2026-07-15** "Model comparison — cluster-only" table the guard parses. Current-rig leaderboard in results.md is **2026-08-27** (dual RTX 5060, b10639) — gpt-oss tg128 112.28 there vs stored 53.73 from the 07-15 table. Do **not** overwrite `bench_source` numbers until the guard maps the new table. qwen27b still has no first-party `bench_source`. Same untracked bench candidates as Sep 3; skipped (rejected within 30 days).

### Verified model states
**Frontier (Elo desc, text overall still Sep 2):**
- **fable**: Claude Fable 5.1 — $10/$50, 1M, **1504** (claude-fable-5.1-max 1504±11 / 2906)
- **muse**: Muse Spark 1.3 — $1.25/$4.25, 1M, **1499** (1.3 still absent from Sep 2 text board; fallback muse-spark-1.2 (xHigh) 1499±10 / 3240). Code Arena Sep 5 **does** list muse-spark-1.3 (xHigh) 1622 / 1274.
- **claude**: Claude Opus 5 — $5/$25, 1M, **1493**
- **gemini**: Gemini 3.1 Pro — $2/$12, 1M, **1487**
- **qwen**: Qwen3.8-Max — $2/$6, 1M, **1480** (0902 snapshot live; Code Arena qwen3.8-max-0902 1686 Preliminary / 1868)
- **grok**: Grok 4.6 — $2/$6, 500K, **1461** (still Preliminary / 3453 votes)

**Open-weight:** gemma 1451, qwen27b 1436, mistral 1357, qwen30ba3b 1327, gptoss20b 1317, qwen14b 1300 (unmatched)

### Official pricing still current
- Fable 5.1 $10/$50, cache reads $0.25 (https://platform.claude.com/docs/en/about-claude/pricing)
- Opus 5 $5/$25
- Gemini 3.1 Pro Preview $2/$12 ≤200k (https://ai.google.dev/gemini-api/docs/pricing) — 3.5 Pro still absent. 3.8 Flash GA $0.75/$3.75 intro through 2026-12-31.
- Muse Spark 1.3 $1.25/$4.25 (contributor $0.10/$0.20) — https://developer.meta.com/ai/models/muse-spark/
- Qwen3.8-Max / 0902 $2/$6, 1M — https://www.qwencloud.com/models/qwen3.8-max
- Grok 4.6 $2/$6 (<200k) / $4/$12 (≥200k), 500K; docs still recommend 4.6
- GPT-6 Astra (untracked) $10/$50, cache $1, 1,050,000 ctx, long-context >272k 2x/1.5x — https://developers.openai.com/api/docs/models/gpt-6-astra

### Rejected this run
- **gpt-6-astra**: Sep 3 GA. Public API + $10/$50 + 1.05M ctx. Code WebDev 1797 / 1199 votes (day ~2). **Fails 2-week Elo hard req** — not on Sep 2 text board. New provider at cap 6 would drop grok; do not auto-admit.
- **grok-4.7**: not shipped. New ETA: Musk Sep 2 "10 days" (~Sep 12). Docs still recommend 4.6.
- Cluster leftovers, GLM OW, Hy3, gemini-3.5-pro, gemini-3.8-flash, gpt-5.6-sol, muse-glimmer: skipped (rejected/held within 30 days, no material new evidence on the text board).

### Needs human review / pending
- **gpt-6-astra**: top watch. Revisit the moment text-overall lists it with 2+ weeks and enough votes. Cap-6 drop would be grok (lowest Elo, still Preliminary).
- **glm-5.3-max**: Day 24 from Aug 14. Text still Sep 2: **1482±7 / 7668**. New: Code WebDev **1609 / 2930**. Human held Aug 30 (whiplash vs Grok). Do not auto-drop grok.
- **muse-glimmer**: human held Aug 30 (qwen14b two-GPU niche). Text votes unchanged on Sep 2 snapshot. Code WebDev 1360 / 1511 — no new drop case.
- Watch whether grok-4.6-high **Preliminary flag drops** (votes 3453, frozen on Sep 2 snapshot).
- Watch whether **muse-spark-1.3** gets a **text** arena slug (code slug is live).
- Watch Fable 5.1 text sample as votes grow past 2906.
- Wire arena.ai into Elo scraper (nakasyou 473d; CSV 369d). Text board itself is 5 days stale (Sep 2 vs today Sep 7).
- Cluster guard still bound to 2026-07-15 table; consider mapping the 2026-08-27 dual-5060 leaderboard before treating 112.28 tok/s as the gptoss20b card number.

### Notes
- Catalog guard can miss dotted minor versions if `tracked_name_pattern` is `[0-9]+` instead of `[0-9.]+`. Fable 5.1 was the incident; keep dotted capture.
- Dated snapshots (qwen3.8-max-0902) do not change the catalog product name. Prepend the arena alias; do not rename the card unless QwenCloud's featured id moves.
- Grok 4.6 long-context surcharge still $4/$12 when prompt ≥200k. Card uses standard $2/$6.
- Astra cache reads are $1 vs Fable 5.1 $0.25 at the same $10/$50 list — material if/when Astra is admitted.
- Claude Sonnet 5 $2/$10 intro price is now the permanent standard. We do not track Sonnet.

## Previous run: 2026-09-03 weekly (Grok) — Fable 5.1 + Muse Spark 1.3 same-provider replace

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
