# leaderboard-updater agent memory

## Last run: 2026-07-01 (Grok weekly update)

### Verified model states
- **claude**: Claude Opus 4.8 — pricing $5/$25, context 1M, LMArena name map current. Fable 5 export controls lifted June 30; global redeploy July 1 per anthropic.com/news/redeploying-fable-5. Fable 5 is premium tier ($10/$50), not tracked — Opus 4.8 remains Anthropic entry. No models.json drift.
- **gemini**: Gemini 3.1 Pro — version current. Pricing $2/$12 (≤200k) / $4/$18 (>200k) per official docs; flat rate in models.json remains known gap. Gemini 3.5 Pro still not GA on pricing page or API changelog as of July 1 (delayed past June). Context 1M. Arena id gemini-3.1-pro-preview. No drift.
- **grok**: Grok 4.3 — pricing $1.25/$2.50 confirmed on docs.x.ai, context 1M, map current. Grok 4.4 not released. No drift.
- **gpt**: GPT-5.5 — pricing $5/$30, context 1M. GPT-5.6 Sol/Terra/Luna preview June 26 but limited to vetted partners at US government request — not general public API. GPT-5.5 remains tracked OpenAI entry. No drift.
- **qwen**: Qwen3.7-Max — pricing $2.50/$7.50, context 1M, Elo 1475. Stable. No drift.

### Staleness streaks
- nakasyou lmarena-history snapshot: still 20250522 (streak continues). All five models kept curated Elos; name-map matches intact for when source refreshes.

### Applied patches (confirmed this run)
- None. All tracked models current; no models.json or arena.py changes required.

### Rejected candidates (do not re-propose within 30 days)
- **GPT-5.6**: preview limited to vetted partners June 26; fails public API hard requirement. Re-eval on general API GA.
- **claude-fable-5**: restored July 1 but premium Mythos-tier; Opus 4.8 remains tracked Anthropic entry.
- **claude-mythos-preview / Mythos 5**: Glasswing invite-only for Mythos 5; limited US org access restored June 26. Not general public API.
- **gemini-3.5-pro**: not GA as of July 1. Re-eval on API/pricing page listing.
- **Grok-4.4**: not released.
- **DeepSeek V4**: Elo below threshold in available data.
- **muse-spark** (Meta): still no public API.

### Pending manual verifications for next run
- Monitor GPT-5.6 general API availability (partner-only preview as of June 26).
- Monitor Gemini 3.5 Pro GA (delayed from June to July per press reports).
- Monitor Grok 4.4 release.
- Monitor Fable 5 post-restore stability and whether it warrants separate tracking.
- Re-check nakasyou lmarena-history snapshot freshness.
- Watch government pre-release review framework outcomes (June 2 EO, jailbreak severity framework).

### Notes from Grok 2026-07-01 run
- Major news: Fable 5 export controls lifted; redeploys July 1. GPT-5.6 government-gated partner preview June 26.
- Elo refresh ran; all five models kept curated Elos (stale nakasyou snapshot).
- Article written: government-gated-frontier-releases (Opinion on export-control pattern).

## Previous run: 2026-06-22 v2 (Grok weekly update — second pass)

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