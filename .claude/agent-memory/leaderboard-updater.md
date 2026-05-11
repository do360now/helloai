# leaderboard-updater agent memory

## Last run: 2026-05-05

### Verified model states
- **claude**: Claude Opus 4.7 — pricing $5/$25, context 1M, LMArena names current. No drift detected. Claude 5 / Mythos not publicly released (invite-only, 12 launch partners); re-evaluate each run.
- **gemini**: Gemini 3.1 Pro — pricing $2/$12 (standard, under 200K), context 1M, LMArena names current. No drift detected. Note: long-context prompts >200K are billed at $4/$18 — not tracked in models.json (single-tier pricing used).
- **grok**: Grok 4.3 — pricing $1.25/$2.50, context 1M. grok-4.3 confirmed as live LMArena identifier as of May 1 2026. Arena name map is correct. No drift detected.
- **gpt**: GPT-5.5 — pricing $5/$30, context 1M, LMArena names current. Benchmark figures in desc (Terminal-Bench 2.0 82.7%, Expert-SWE 73.1%) CONFIRMED via interestingengineering.com / VentureBeat. Desc is accurate.

### Staleness streaks
- (none active)

### Rejected candidates (do not re-propose within 30 days)
- **claude-mythos-preview**: rejected 2026-05-03 — fails public API hard requirement (invite-only, Project Glasswing). Re-evaluate after 2026-06-02.
- **DeepSeek V4**: rejected 2026-05-05 — fails Elo hard requirement; estimated Elo 1300-1400 range, more than 25 pts below lowest tracked model (GPT-5.5 at 1484). Re-evaluate if Elo climbs into range.

### Pending manual verifications for next run
- Monitor Claude Mythos / Claude 5 for public API release (currently invite-only, 12 partners). If GA announced, treat as version-drift for claude and run admission decision tree.
- Confirm Gemini 3.1 Pro is GA (currently in preview rollout as of May 2026); if still preview, consider whether name/tag should reflect that.
- Watch for GPT-5.5 Pro as a separate trackable model (priced at $30/$180 — significantly different tier from standard GPT-5.5 at $5/$30).

### Notes
- grok-4.3 LMArena identifier confirmed via leaderboard changelog (added to Text, Search, Code, Vision leaderboards May 1 2026). The fallback to grok-4.20 in arena.py is no longer needed for Elo resolution but kept for resilience.
- lmarena.ai has rebranded to arena.ai; the Python script's _LEADERBOARD_URL still points to lmarena.ai/leaderboard. This should be verified/updated — the site may redirect but canonical URL has changed.
- Gemini 3.1 Pro long-context surcharge ($4/$18 for prompts >200K) is material for users doing large-context work but models.json stores a single input/output cost. Flag if models.json schema ever gains a long_context_cost field.
