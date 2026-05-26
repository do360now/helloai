# leaderboard-updater agent memory

## Last run: 2026-05-26 (Grok 4.3 parallel run)

### Verified model states
- **claude**: Claude Opus 4.7 — pricing $5/$25, context 1M, LMArena names current. No drift detected. Claude Mythos remains invite-only (Project Glasswing). No Claude 5 announcement as of May 26 2026.
- **gemini**: Gemini 3.1 Pro — version current. Pricing has long-context tiers ($2/$12 for ≤200K, $4/$18 for >200K) per official Google Cloud docs. This is a material difference not reflected in the flat $2/$12 in models.json. Context 1M. Arena identifier still gemini-3.1-pro-preview. Existing _NAME_MAP is correct.
- **grok**: Grok 4.3 — pricing $1.25/$2.50, context 1M confirmed on official xAI docs. Arena name map current. No drift detected.
- **gpt**: GPT-5.5 — pricing $5/$30, context 1M. gpt-5.5-instant confirmed. No GPT-5.6 public release as of May 26 2026 (still internal).

### Staleness streaks
- None active.

### Applied patches (confirmed this run)
- (No new applied patches from this run)

### Rejected candidates (do not re-propose within 30 days)
- **claude-mythos-preview**: rejected 2026-05-03, re-confirmed 2026-05-11, 2026-05-14, and 2026-05-26 — fails public API hard requirement (invite-only, Project Glasswing). Re-evaluate after 2026-06-02.
- **DeepSeek V4**: rejected 2026-05-05, re-confirmed 2026-05-22 and 2026-05-26 — fails Elo hard requirement (Arena ~1459–1467, more than 25 pts below lowest tracked model at 1484). Re-evaluate if Elo climbs into range.
- **GPT-5.6**: rejected 2026-05-14, re-confirmed 2026-05-26 — not yet public (internal testing only). Re-evaluate when OpenAI announces.

### New / Updated Candidates (Grok 2026-05-26 run)
- **Qwen3.7-Max** (Alibaba): Needs human review. Strong agentic and coding results (80.4% SWE-Verified, leading Terminal-Bench scores). Public API with published pricing (~$2.50/$7.50). 1M context. Arena Elo ~1475–1486. Passes all hard requirements. Has new-provider + positioning gap advantages. Recommended for full admission decision tree by human.

### Pending manual verifications for next run
- Review Qwen3.7-Max for admission (strong candidate from Grok 2026-05-26 run). Check latest Arena Elo sustainability and confirm public API stability.
- Verify Gemini 3.1 Pro long-context pricing impact and decide whether to add long_context_cost field or update models.json representation.
- Verify arena.ai leaderboard HTML for Gemini 3.1 Pro name string (third+ consecutive check).
- Monitor GPT-5.6 for public release (high probability before June 30; check weekly).
- Monitor Claude Mythos / Claude 5 for public API GA. Re-evaluate after 2026-06-02.
- Watch for Gemini 3.2 Flash or 3.5 Pro announcement. Run admission decision tree if released.

### Notes from Grok 2026-05-26 run
- Gemini 3.1 Pro long-context surcharge ($4/$18 for prompts >200K) confirmed in official pricing. This should be tracked more explicitly going forward.
- Qwen3.7-Max is the most credible new frontier candidate seen in recent weeks. Strong in agentic workflows and coding — potential positioning gap vs current tracked set.
- No name map updates needed at this time.
- DeepSeek V4 remains well below the Elo admission threshold.
- Overall tracked set remains stable (Claude, Gemini, Grok, GPT).

### Previous Notes (preserved for context)
- Gemini 3.2 Flash pre-announcement buzz detected (buildfastwithai.com); no confirmed release. If released at Google I/O 2026, run admission decision tree. Flash-tier models have historically not met the 200K context hard requirement — verify before admitting.
- GPT-5.5 Instant is confirmed the chat-latest alias and default ChatGPT model as of May 5 2026. It appears on arena.ai leaderboard under gpt-5.5-instant. Not tracked separately (same provider as GPT-5.5; no unique positioning gap).
- Gemini 3.1 Pro long-context surcharge ($4/$18 for prompts >200K) remains material. Flag if models.json schema ever gains a long_context_cost field.