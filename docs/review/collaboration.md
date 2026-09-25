# Review: Fit with model collaboration (track 3)

Owner: Opus 5.5 (hub session helloai-2a). Review room: `helloai-review`, 2026-09-25.
Related: `purpose.md` (D1), `app-fit.md` (model ids as the shared key), `scoring-transparency.md`, `monetisation.md`.

Tags: **[C]** confirmed by reading code or files, **[U]** unverified, **[O]** opinion.

---

**Scope (2026-09-25, cmc via Fable, relayed; pending cmc's direct confirmation):** this repo plans helloai.com changes only.
app.helloai.com is a *reference* for decisions. Any work in `~/git/helloai-marketplace` is listed under "Handoff" and isn't a step here.

## 1. Problem

helloai.com ranks models **one at a time**. The operator's work now centres on models **working together**: the LAN hub,
shared rooms and cross-vendor trials on app.helloai.com, and panel reviews like this one. The hero already says "Find the
right AI. Introduce it to another." But the site has no collaboration content, and no data to rank collaboration by.

The risk is doing this badly: a "best pairings" table built on a handful of anecdotes would repeat the precision
problem `purpose.md` found in the Elo table, only worse.

## 2. Evidence

### 2.1 The measured-eval pipeline stalled [C]
- The agenteval ↔ helloai contract (locked 2026-05-31) plans a separate "Measured Benchmarks" section, built from
  `eval-summary.json` committed at the agenteval repo root.
- `~/git/agenteval/eval-summary.json` **does not exist**. The last agenteval commit is 2026-06-05. The contract's own rule:
  "Display is pointless until the suite separates models. Don't build the consumer against an unfrozen schema." So for about 16 weeks
  the directory has had no measured signal beyond LMArena Elo for frontier models.
- The contract covers single models (Claude-family ladder first, cross-vendor deferred). Nothing in it measures pairs.

### 2.2 Real collaboration evidence exists, in the app repo [C]
`~/git/helloai-marketplace/docs/implementation/evidence/` holds dated, credential-free room transcripts, including:
- `cross-vendor-mcp-trial-2026-09-21.md`: Fable 5.1, Codex, Sonnet, Haiku and Opus in one room over MCP.
  It includes an **identity failure**: message #2 is posted under "Claude (Fable 5.1)" but says "I'm Claude Haiku 4.5 (Codex)",
  because several sessions shared one guest token.
- `lan-workroom-claude-codex-2026-09-21.md`: Claude delegates a review to Codex. The first attempt failed (headless Codex refuses MCP
  calls under approval policy `never`). On the second, a **stale open request crossed the two sessions**.
- `lan-workroom-credits-review-2026-09-22.md`: Claude (Fable 5.1), Astra and Grok independently reviewed a design note and
  produced a **joint signed recommendation**. The headline finding (sat-funded job posts escrow nothing) wasn't in the note's own list.

These are honest, specific, dated and include failures, which is the kind of content no leaderboard has. **[O]**

### 2.3 The app already records a per-model outcome signal [C schema, U data]
- `db/migrations/0001_baseline.sql` (app): deliveries carry `model_identity text`, and verifications carry
  `verdict verification_verdict not null`. So "which model delivered, and did independent verification pass?" can in principle be
  computed per model.
- **[U]** How many verified production jobs exist. Not checked; the app has had mock payments since 2026-09-14.
- **[C]** `model_identity` is free text reported by the worker (`DeliverSchema`, max 200). It's self-reported, not proven.

### 2.4 This review is itself an example [C]
Four sessions (Opus, Sonnet, Fable, Astra pending) with claimed tracks, challenges, corrections and plans written from each other's
findings. Examples: Sonnet reproduced Opus's port on the shipped TS; Fable found the OG 502 root cause; Opus corrected its own
"Astra is neutral" suggestion. The room transcript is a ready-made field report, once cmc agrees to publish it.

## 3. Decisions needed (cmc)

**Status: adopted 2026-09-25.** Relayed by Fable (hub session b9) in `helloai-review` as cmc's words: "Let's go with the recommendations already shown in the table." **cmc: please confirm directly; this was not given in the Opus session.**
- C1 → show collaboration as evidence, not as a ranking; field reports first.
- C2 → (a) marketplace verified-job outcomes first; n and a Wilson interval are always shown, and they're never used to rank models.
- C3 → cmc approves each transcript before it's published.

The options and reasoning are kept below for the record.


**C1. Should the directory show collaboration at all?** Recommended: **yes, as evidence, not as a ranking.** Publish field
reports now. Add a measured signal only when there's a repeatable measure with a stated sample size.

**C2. Which measured signal comes first?** Options:
- (a) **Marketplace verified-job outcomes per model** (recommended). The data model exists (§2.3), it measures real work, and
  it ties the two sites together (`app-fit.md` step 3 makes directory ids the shared key). Weakness: `model_identity` is self-reported,
  and sample sizes will be tiny at first.
- (b) Revive agenteval and add multi-agent tasks. Controlled and repeatable, but the pipeline has been stalled for 16 weeks and costs a funded run.
- (c) Both, (a) first.

**C3. Publishing transcripts.** Room transcripts can include operator paths, machine names and model self-talk. Each one
needs cmc's approval before it appears on helloai.com, even when the source file says "no credentials".

## 4. Implementation plan

### Phase A: Field reports (now; no new data model)
1. Add a `kind` field to articles in `data/types.ts` (`'dispatch' | 'field-report'`, default `'dispatch'`) and to existing entries only
   if the jest schema test requires it. Otherwise treat a missing `kind` as `'dispatch'` in `data/index.ts`.
2. Write the first field report through the normal pipeline (`article-idea-generator` brief → `article-writer` → `scripts/add_article.py`).
   Source: `lan-workroom-credits-review-2026-09-22.md` (three-vendor design review). The brief must include:
   - participants **with vendor and model version**, date, what each did, what they agreed and where they disagreed;
   - **at least one failure** (from §2.2), so a report never reads as a success story;
   - a disclosure line: the operator runs the hub, and the models were not paid or selected by their vendors.
3. `app/articles/page.tsx`: add a filter or label for field reports. The visual treatment belongs to Fable's track 4.
4. The data test "every model appears in ≥1 article" (`__tests__/data.test.ts`) doesn't change. Field reports may name models that
   aren't in `models.json` (for example Codex). Make sure the test only checks models.json → articles, not the other way. **[U]** Read the test first.

Acceptance: one field report is live, labelled, contains a failure and a disclosure, and cmc has approved it (C3). Jest passes.

### Phase B: Model → job-outcome signal (after `app-fit.md` step 3, handoff H-C1 below, and C2 = a)
1. **Prerequisite, handoff H-C1 (app repo, not planned here):** a **public, aggregate-only** endpoint, e.g.
   `GET https://app.helloai.com/api/v1/stats/models` → `[{ directory_model_id, jobs_delivered, jobs_verified_pass, jobs_verified_fail,
   window_start, window_end }]`. Only rows whose `model_identity` maps to a directory id. No job content, no agent ids.
2. Directory side: `scripts/fetch_app_outcomes.py` (stdlib, same style as `scripts/arena.py`) writes `data/job_outcomes.json`,
   which is committed like the other data. Add a type in `data/types.ts` and a loader in `data/index.ts`.
3. Display rule, which must be a test: **don't show a pass rate for any model with fewer than N verified jobs** (propose N = 20).
   Below N, show "n = 7 jobs, not enough to rate". Always show n and the window.
   **N is a display threshold only; it doesn't establish that one model is better than another** (Astra). Job mix, self-reported identity,
   choice of verifier and repeated jobs from one operator are confounders at any n. Show descriptive counts with an interval
   (for example, a Wilson 95% interval on the pass rate), and never rank models by this number.
   Worked example (Astra; Opus re-computed it): 18 passes / 20 jobs = 90%, Wilson 95% interval **69.9%–97.2%**
   (NIST formula, https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm). That assumes independent jobs. Repeat jobs from one
   operator are clustered, which makes the true interval wider. At n = 20 the display says little more than "most jobs passed".
   Any pairwise or "pairing" claim (Phase C) needs matched tasks, a single-model baseline, comparable cost/time budgets, failures
   included, and uncertainty. See the worked interval example in `competitive-landscape.md`.
4. **Don't feed it into `scoreAndRank`** until cmc decides otherwise. It's a separate axis, just as the agenteval contract kept measured evals
   out of the Elo table.
5. Label it on the page and in `/api/models`: "self-reported model identity; verified by [verifier type]".

Acceptance: `data/job_outcomes.json` exists, n is shown everywhere, a jest test asserts the N threshold, and nothing in `scoreAndRank` reads it.

### Phase C: Pairings (later, only with data)
Only when the app records **which models collaborated on one job or room outcome** (for example the outcomes board in the app's
`plan-room-outcomes.md`) and at least N outcomes exist per pairing. Until then, don't publish a "best pairs" table.
The hero line "Introduce it to another" should point to field reports, not to a ranking.

## 4b. Handoff to `~/git/helloai-marketplace` (out of scope for this repo)
- **H-C1.** The aggregate-only per-model outcomes endpoint described in Phase B step 1 (depends on `app-fit.md` H-A1 for the id mapping).
  helloai.com's Phase B steps 2–5 start only once it's live.
- Phase C's "record which models collaborated on one outcome" is also app-side (the app's `plan-room-outcomes.md`).

## 5. Files touched
Phase A: `data/types.ts`, `data/index.ts`, `data/articles.json` (via `scripts/add_article.py`), `app/articles/page.tsx`,
possibly `__tests__/data.test.ts`.
Phase B: `scripts/fetch_app_outcomes.py` (new), `data/job_outcomes.json` (new), `data/types.ts`, `data/index.ts`,
a new homepage section or `/methodology` link, `app/api/models/route.ts` (optional field), OpenAPI, tests.

## 6. Not checked
- Row counts of verified jobs in the app's production database.
- Whether the agenteval work is paused on purpose or abandoned (ask cmc).
- Whether cmc wants hub or room transcripts to be public at all.
