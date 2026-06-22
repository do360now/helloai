# leaderboard-updater agent memory

## Last run: 2026-06-22 v2 (Grok weekly update — second pass)

### Verified model states
- **claude**: Claude Opus 4.8 — pricing $5/$25, context 1M, LMArena name map current. Fable 5/Mythos 5 suspended June 12 per US directive; not tracked (correct). No drift.
- **gemini**: Gemini 3.1 Pro — version current. Pricing $2/$12 (≤200k) / $4/$18 (>200k) per official docs; flat rate in models.json remains known gap. Gemini 3.5 Pro not released. Context 1M. Arena id gemini-3.1-pro-preview. No drift.
- **grok**: Grok 4.3 — pricing $1.25/$2.50 confirmed on docs.x.ai and Bedrock GA announcement, context 1M, map current. Grok 4.4 not released. No drift.
- **gpt**: GPT-5.5 — pricing $5/$30, context 1M. GPT-5.6 still not public per OpenAI release notes. No drift.
- **qwen**: Qwen3.7-Max — pricing $2.50/$7.50, context 1M, Elo 1475. Admitted June 4; stable. No drift.

### Staleness streaks
- None active.

### Applied patches (confirmed this run)
- None. All tracked models current; Elo scraper kept curated values (nakasyou snapshot stale at 20250522; name-map matches intact).

### Rejected candidates (do not re-propose within 30 days)
- **claude-mythos-preview / Fable 5**: suspended + invite-only Mythos. Re-eval only if Fable 5 restored with public API.
- **DeepSeek V4**: Elo still below threshold. Re-eval if climbs.
- **GPT-5.6**: not public. Re-eval on announcement.
- **gemini-3.5-pro**: not released (3.5 Flash exists but Flash-tier historically fails 200K context bar). Re-eval on GA.
- **muse-spark** (Meta): still no public API.

### Pending manual verifications for next run
- Monitor Fable 5 restoration timeline post-June 12 suspension.
- Monitor GPT-5.6 public release (still expected before June 30 per markets).
- Monitor Gemini 3.5 Pro GA — may replace 3.1 Pro when shipped.
- Monitor Grok 4.4 release.
- Re-check nakasyou lmarena-history snapshot freshness (currently stuck at 20250522).

### Notes from Grok 2026-06-22 v2 run
- No models.json or arena.py patches required.
- Elo refresh ran; all five models kept curated Elos.
- Article written: grok-4-3-now-on-amazon-bedrock (Bedrock GA June 17, enterprise distribution milestone).

## Previous run: 2026-06-22 (Grok weekly update — first pass)

### Verified model states
- **claude**: Claude Opus 4.8 — pricing $5/$25, context 1M, LMArena name map current. Fable 5/Mythos 5 suspended June 12 per US directive; not tracked (correct). No drift.
- **gemini**: Gemini 3.1 Pro — version current. Pricing $2/$12 (≤200k) / $4/$18 (>200k) per official docs; flat rate in models.json remains known gap. Gemini 3.5 Pro not released. Context 1M. Arena id gemini-3.1-pro-preview. No drift.
- **grok**: Grok 4.3 — pricing $1.25/$2.50 confirmed on docs.x.ai, context 1M, map current. Grok 4.4 not released. No drift.
- **gpt**: GPT-5.5 — pricing $5/$30, context 1M. GPT-5.6 still not public per OpenAI release notes. No drift.
- **qwen**: Qwen3.7-Max — pricing $2.50/$7.50, context 1M, Elo 1475. Admitted June 4; stable. No drift.

### Staleness streaks
- None active.

### Applied patches (confirmed this run)
- None. All tracked models current; Elo scraper kept curated values (nakasyou snapshot stale at 20250522; name-map matches intact for when source refreshes).

### Rejected candidates (do not re-propose within 30 days)
- **claude-mythos-preview / Fable 5**: suspended + invite-only Mythos. Re-eval only if Fable 5 restored with public API.
- **DeepSeek V4**: Elo still below threshold. Re-eval if climbs.
- **GPT-5.6**: not public. Re-eval on announcement.
- **gemini-3.5-pro**: not released (3.5 Flash exists but Flash-tier historically fails 200K context bar). Re-eval on GA.
- **muse-spark** (Meta): still no public API.

### Pending manual verifications for next run
- Monitor Fable 5 restoration timeline post-June 12 suspension.
- Monitor GPT-5.6 public release (still expected before June 30 per markets).
- Monitor Gemini 3.5 Pro GA — may replace 3.1 Pro when shipped.
- Monitor Grok 4.4 release.
- Re-check nakasyou lmarena-history snapshot freshness (currently stuck at 20250522).

### Notes from Grok 2026-06-22 run
- No models.json or arena.py patches required.
- Elo refresh ran; all five models kept curated Elos (no LMArena name matches in stale snapshot).
- Tracked set remains 5 models post-Fable 5 suspension (Fable was never admitted to tracked set; articles cover the event).
- Article written: best-model-for-coding-right-now (fills recurring "model for X" guide gap).

## Previous run: 2026-06-04 (Grok weekly update)

### Verified model states
- **claude**: Claude Opus 4.8 — pricing $5/$25, context 1M, LMArena names current (4.8* entries in map). No drift. Mythos still invite-only.
- **gemini**: Gemini 3.1 Pro — version current (3.5 Pro not yet released). Pricing tiered long-context confirmed ($2/$12 <=200k, $4/$18 >200k); flat in models.json remains. Context 1M. Arena id still gemini-3.1-pro-preview.
- **grok**: Grok 4.3 — pricing $1.25/$2.50, context 1M, map current. No drift. 4.4 not released.
- **gpt**: GPT-5.5 — pricing $5/$30, context 1M. No public 5.6. gpt-5.5-instant in map.

### Staleness streaks
- None active.

### Applied patches (confirmed this run)
- Added Qwen3.7-Max as 5th tracked model (new provider expansion): models.json entry + arena.py _NAME_MAP update.
- (Follow-up to prior name-map for claude 4.8 already applied in May 31 run.)

### Rejected candidates (do not re-propose within 30 days)
- **claude-mythos-preview**: still fails public API (invite-only Project Glasswing). Re-eval after 2026-06-02 or broader access.
- **DeepSeek V4**: Elo ~1467 still below threshold (~1484 lowest before Qwen; now with Qwen 1475). Re-eval if climbs.
- **GPT-5.6**: not public (internal only). Re-eval on announcement.
- **muse-spark** (Meta): API remains private-preview only (repeated delays per WSJ June 2026); no transparent public pricing/self-serve. Fails hard req. REJECT.

### New / Updated Candidates (Grok 2026-06-04 run)
- **Qwen3.7-Max** (Alibaba): ADMITTED. Arena ~1474 overall (3750+ votes), higher in code slices (1541). Passes hard reqs with 2+ weeks data now. New provider + agentic/coding positioning gap at lower price. Expanded tracked set 4→5. Name map + models entry added.

### Pending manual verifications for next run
- Monitor Gemini 3.5 Pro public release (expected June 2026; run admission if/when ships — may replace 3.1 Pro).
- Monitor Grok 4.4 / 4.5 release (roadmap had ~June window from early May notes).
- Monitor GPT-5.6 public (high prob before June 30).
- Monitor Claude 5 or Opus 4.9 / Mythos GA access.
- Re-check Qwen3.7-Max Elo sustainability and whether it displaces any existing on specific strengths (post Elo refresh + categories).
- Watch for other Chinese lab releases (GLM-5.1, Kimi updates) or Llama frontier if they hit public pricing + Elo.
- Decide on Gemini long-context pricing representation (add dedicated field to models schema?).

### Notes from Grok 2026-06-04 run
- Qwen3.7-Max now has sufficient vote volume and time on arena (~2 weeks post May 19 release) to clear "sustained" bar; admitted as expansion.
- No other credible new frontier candidates in top ~15-20 with public API + pricing + Elo + context.
- Tracked set now 5 models (Claude, Gemini, Grok, GPT, Qwen). Set size rule allows new-provider expansion.
- Gemini tiered pricing remains the main representation gap in models.json; no action taken (no long_context fields in schema).
- Claude 4.8 name map update from prior run is live; 4.8 still accumulating main arena votes (fallbacks cover).
- All other tracked models stable; no version/pricing/context/name-map drifts requiring patches this cycle.
- Applied 1 candidate + 1 name-map patch; appended corresponding audit records (run_id grok-20260604-weekly).