# Homepage Design Evolution — Plan Index

> **For agentic workers:** Implement **one plan file at a time**, in order. Each plan is a separate SDD/executing-plans run. Do not start plan N+1 until plan N is committed and the verification block in that file is green.
>
> REQUIRED SUB-SKILL per plan: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Evolve the helloai.com homepage from a full-viewport splash into an editorial directory, as specified in `docs/superpowers/specs/2026-09-03-homepage-design-evolution-design.md`.

**Spec:** `docs/superpowers/specs/2026-09-03-homepage-design-evolution-design.md`

## Order

| # | Plan file | What ships | Depends on |
|---|---|---|---|
| 01 | `2026-09-03-homepage-01-compact-hero.md` | Masthead hero, no particles, first-paint visible, CTAs | — |
| 02 | `2026-09-03-homepage-02-comparable-cards.md` | Cost/context chips on frontier cards; 3/2/1 grid | — (can run after 01) |
| 03 | `2026-09-03-homepage-03-leaderboard-table.md` | Leaderboard rows show Elo + price + context; bars gone | **02** (formatters) |
| 04 | `2026-09-03-homepage-04-clickable-insights.md` | Insight cards drive the model filter | — (after 01; before 05) |
| 05 | `2026-09-03-homepage-05-articles-and-nav.md` | 3 homepage articles; Nav on article routes | — (after 04) |
| 06 | `2026-09-03-homepage-06-craft-polish.md` | scroll-margin, Geist-only type, focus, contrast, spy, search icon | **01–05** (last) |

## How to run one plan

From `/home/cmc/git/grok/helloai`:

1. Open the plan file.
2. Follow its tasks in order. Checkboxes (`- [ ]`) are the source of truth.
3. Commit after every task, as the plan says. Do not push or deploy.
4. Stop and report when that plan's final verification task is green.

## Global constraints (copied onto every plan)

- Repo root: `/home/cmc/git/grok/helloai`.
- Do not change scoring weights, JSON model fields, or API routes.
- Do not add Playwright, testing-library, or new font packages.
- Do not introduce `/models/[id]` pages.
- Keep the curated-six visual language (dark `#080A12`, mint `#00E5A0`).
- `npx jest` foreground only (no background).
- Browser-verify any UI plan before calling it done (`npm run dev`, desktop 1440 and mobile 390).
