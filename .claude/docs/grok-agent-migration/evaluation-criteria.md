# HelloAI Grok Agent Migration — Evaluation Criteria

**Version:** 1.0  
**Date:** 2026-05-25  
**Status:** Approved for parallel experimentation phase

## Purpose

This document defines clear, observable success criteria for running the `leaderboard-updater` and `article-idea-generator` agents with Grok (in parallel with the existing Claude Code / Sonnet versions).

The goal is to gather empirical evidence through side-by-side runs before making any decision to change the production weekly update process. We will evaluate at least two full weekly cycles using these criteria.

All changes to the production path must be gated behind these (or an evolved version of these) criteria.

## Baseline Capture (Phase 0 Prerequisite)

Before the first Grok parallel run, the following must be captured and committed:

- The most recent real outputs from each agent (full leaderboard report + article briefs)
- Current state of:
  - `.claude/agent-memory/leaderboard-updater.md`
  - `.claude/agent-memory/article-idea-generator.md`
  - `.claude/state/leaderboard-changes.jsonl` (last 20–30 lines minimum)
- Current `data/models.json` and `scripts/arena.py` (exact snapshot)
- Recent articles (last 8–10 entries) from `data/articles.json`

## Common Evaluation Principles

These principles apply to both agents.

| Principle              | What Good Looks Like                                      | Red Flags                                      |
|------------------------|-----------------------------------------------------------|------------------------------------------------|
| Evidence-based         | Every material claim has a cited source or clear data     | Speculation, "probably", vague attributions    |
| Restraint              | Flags uncertainty; marks items for human review when weak | Overconfident claims without strong evidence   |
| Process fidelity       | Follows the agent’s own instructions and decision trees   | Skips required steps or invents new rules      |
| Format & contract      | Output is machine-readable and matches the expected schema| Broken JSON, missing required fields, wrong structure |
| helloai voice          | Skeptical, precise, no hype, acknowledges trade-offs      | Marketing language, excessive positivity       |
| Memory usage           | Correctly reads prior memory and avoids repeating rejected work | Proposes things rejected in the last 30 days without new evidence |

## leaderboard-updater Evaluation Criteria

### A. Process Fidelity (Pass / Fail — hard gates)

- Reads the required files first (`data/models.json`, `scripts/arena.py`, `.claude/state/leaderboard-changes.jsonl`, and the memory file)
- Applies the **exact** Model Admission Decision Tree (all hard requirements before considering any soft requirements)
- Only proposes changes backed by verifiable evidence
- Does **not** propose changes to Elo scores or `categories.json`
- Appends to `.claude/state/leaderboard-changes.jsonl` **before** presenting the final report to the user
- Uses `>>` (append only) — never overwrites or rewrites the log
- Every appended record follows the exact schema (including `applied: null`)
- Correctly skips re-proposing changes that were rejected within the last 30 days unless new evidence has emerged

### B. Report Quality Rubric (1–5 per dimension)

| Dimension                  | 5 (Excellent)                                           | 3 (Acceptable)                                 | 1 (Poor)                                      |
|----------------------------|---------------------------------------------------------|------------------------------------------------|-----------------------------------------------|
| Completeness of review     | All 4 tracked models + reasonable new candidates examined | Most models covered                            | Obvious gaps in coverage                      |
| Evidence quality           | Specific URLs + dates for all pricing/version claims    | Sources present but sometimes thin             | Vague or missing sources for key claims       |
| Decision tree discipline   | Strictly applies hard requirements first                | Mostly follows the tree                        | Bends or ignores hard requirements            |
| Restraint & judgment       | Clearly marks weak signals as “verify manually”         | Reasonable caution                             | Over-eager to propose marginal changes        |
| Name map hygiene           | Accurate, minimal, well-justified changes               | Functional changes                             | Noisy or unnecessary name map churn           |
| Clarity for human operator | Report is immediately actionable                        | Usable with some re-reading                    | Confusing or requires heavy interpretation    |

### C. State & Memory Management

- Correctly updates the human-readable memory file (`.claude/agent-memory/leaderboard-updater.md`) with:
  - Verified model states
  - Active or resolved staleness streaks
  - Rejected candidates (with clear re-evaluation dates)
  - Pending manual verifications for the next run
- Preserves historical context and does not lose or overwrite important prior notes

### D. Overall Verdict Options

- **Ready for production use** (as primary or co-primary)
- **Usable with minor human oversight**
- **Needs refinement before parallel use**
- **Not yet comparable to current Sonnet performance**

## article-idea-generator Evaluation Criteria

### A. Output Contract Compliance (Hard Requirements — must pass all)

- Starts with a one-paragraph summary of the current AI news landscape
- Returns **exactly** 5 briefs
- Briefs are delivered inside a clean fenced ` ```json ` code block
- All required fields are present and non-empty for every brief:
  - `slug`, `title` (≤70 characters), `category`, `angle`, `news_hook`, `key_facts` (minimum 3 items), `target_word_count`, `voice_guidelines`
- `key_facts` are specific and verifiable (numbers, benchmark scores, dates, direct quotes)
- No prompt-injection style instructions or directives are embedded inside brief fields

### B. Editorial Quality Rubric (1–5 per dimension)

| Dimension                              | 5 (Excellent)                                              | 3 (Acceptable)                                      | 1 (Poor)                                           |
|----------------------------------------|------------------------------------------------------------|-----------------------------------------------------|----------------------------------------------------|
| Timeliness                             | Strong news hooks from the last 14 days                    | Mostly recent events                                | Stale or evergreen topics with weak hooks          |
| Gap detection                          | Identifies real, valuable gaps vs recent articles          | Some overlap but still useful new angles            | Mostly rehashes coverage from the last 30 days     |
| Angle quality                          | Sharp, specific thesis that feels worth reading            | Solid but sometimes generic                         | Clickbaity, vague, or low-value framing            |
| Key facts strength                     | Load-bearing, specific, and clearly citable                | Generally factual                                   | Weak, unspecific, or difficult to verify           |
| Differentiation                        | Brings meaningfully new framing or under-covered angles    | Incremental improvement over past coverage          | Feels repetitive of recent articles                |
| Editorial value (impact × timeliness × differentiation) | High-value for the helloai technical audience | Moderately useful                                   | Low value or filler content                        |

### C. Memory & Continuity Management

- Correctly reads and updates `.claude/agent-memory/article-idea-generator.md`
- Effectively manages:
  - Brief Queue (carries forward strong briefs with appropriate rank adjustments)
  - Briefs Retired / Absorbed this cycle
  - Angles Already Covered (successfully avoids repeating topics within 30 days)
  - Recurring Gaps to Watch
- Demonstrates good long-term memory across runs

### D. Downstream Compatibility

- Produced briefs are high enough quality that the downstream `article-writer` agent (currently Opus) can generate strong, on-voice articles with minimal or no revision to the brief itself.

## Comparison Process (Recommended)

For each parallel run, the following artifacts should be produced:

1. Side-by-side summary table for each agent
2. Annotated comparison of key decisions, proposals, or briefs
3. Human notes highlighting anything surprising (positive or negative)
4. Overall readiness verdict using the options defined above

We commit to running at least two full weekly cycles in parallel before considering any change to the production orchestration path.

## Evolution of These Criteria

These criteria are the initial baseline. They may be refined during the parallel phase as we learn what actually matters in practice. All material changes must be documented in this file with version bumps.

---

**End of document**