# leaderboard-updater agent memory

## Last run: 2026-05-14

### Verified model states
- **claude**: Claude Opus 4.7 — pricing $5/$25, context 1M, LMArena names current. No drift detected. Claude Mythos remains invite-only (Project Glasswing). No Claude 5 announcement.
- **gemini**: Gemini 3.1 Pro — pricing $2/$12 (<=200K) unchanged. Context 1M. Arena identifier still gemini-3.1-pro-preview — no changelog rename found after GA on Mar 9 2026. Existing _NAME_MAP is correct. Verify manually against live arena.ai leaderboard HTML before next scrape.
- **grok**: Grok 4.3 — pricing $1.25/$2.50, context 1M confirmed. Arena name map current. No drift detected.
- **gpt**: GPT-5.5 — pricing $5/$30, context 1M. gpt-5.5-instant confirmed live on arena.ai leaderboard (added May 8 2026) and present in _NAME_MAP. GPT-5.6 in internal testing, not yet public as of May 14.

### Staleness streaks
- None active.

### Applied patches (confirmed this run)
- arena.py _LEADERBOARD_URL: https://arena.ai/leaderboard — confirmed applied (line 35).
- arena.py gpt _NAME_MAP: gpt-5.5-instant present (line 83) — confirmed applied.

### Rejected candidates (do not re-propose within 30 days)
- **claude-mythos-preview**: rejected 2026-05-03, re-confirmed 2026-05-11 and 2026-05-14 — fails public API hard requirement (invite-only, Project Glasswing). Re-evaluate after 2026-06-02.
- **DeepSeek V4**: rejected 2026-05-05 — fails Elo hard requirement; estimated Elo 1300-1400 range, more than 25 pts below lowest tracked model. Re-evaluate if Elo climbs into range.
- **GPT-5.6**: rejected 2026-05-14 — not yet public (internal testing). Re-evaluate next weekly run (2026-05-21).

### Pending manual verifications for next run
- Verify arena.ai leaderboard HTML for Gemini 3.1 Pro name string — does it appear as gemini-3.1-pro or still gemini-3.1-pro-preview? Third consecutive check; if still unresolved, de-escalate to monthly monitoring.
- Monitor GPT-5.6 for public release (high probability before June 30; check weekly).
- Monitor Claude Mythos / Claude 5 for public API GA. Re-evaluate after 2026-06-02.
- Watch for Gemini 3.2 Flash announcement at Google I/O 2026 — pre-announcement buzz detected. Run admission decision tree if released.

### Notes
- Gemini 3.2 Flash pre-announcement buzz detected (buildfastwithai.com); no confirmed release. If released at Google I/O 2026, run admission decision tree. Flash-tier models have historically not met the 200K context hard requirement — verify before admitting.
- GPT-5.5 Instant is confirmed the chat-latest alias and default ChatGPT model as of May 5 2026. It appears on arena.ai leaderboard under gpt-5.5-instant. Not tracked separately (same provider as GPT-5.5; no unique positioning gap).
- Gemini 3.1 Pro long-context surcharge ($4/$18 for prompts >200K) remains material. Flag if models.json schema ever gains a long_context_cost field.
