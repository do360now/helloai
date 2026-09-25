# Plan: make the recommendation score stable and explainable (review track 5, item b)

**Author:** Sonnet 5 (helloai-7e), review room `helloai-review`, 2026-09-25
**Executor:** Sonnet from a cold session. **Status:** PLAN, nothing implemented.
**Depends on:** nothing. Pairs with Opus's methodology page (`docs/review/purpose.md`): this plan changes the code, that page tells the reader.

## Problem

Three properties of `data/recommend.ts` make `/api/recommend` and the homepage filter hard to trust. All reproduced on 2026-09-25 by running the shipped TypeScript on the current `data/models.json` and `data/categories.json` (not a port).

### P1. Scores are relative to whoever passes the filters

Elo, cost and context are min-max normalized over the *filtered candidates*, so a model's score changes when other models are filtered out. Two models that both pass a filter can swap places.

No task, Opus 5.5 (input $4/M) vs Gemini 3.1 Pro ($2/M):

| filter | Opus 5.5 | Gemini 3.1 Pro | order |
|---|---|---|---|
| none | 0.86 | 0.83 | Opus first |
| `max_cost=4` (both pass) | 0.75 | 0.84 | Gemini first |

Also at `max_cost=2` the lowest-Elo survivor (Grok 4.7) scores 0.0 and the top survivor 1.0. `score` reads like a quality number, but it is a rank within the survivors. An agent that compares `score` across two calls draws a wrong conclusion.

### P2. One hand-set label decides the most label-sensitive query

`task=coding`:

| | order (score) |
|---|---|
| shipped | Fable 5.1 0.85, Muse Spark 0.76, Opus 5.5 0.71, Qwen 0.65, Gemini 0.50, Grok 0.34 |
| leader and strength labels removed | Muse Spark 0.56, Opus 0.51, Gemini 0.50, Fable 0.45, Qwen 0.45, Grok 0.14 |

The `leader` in `data/categories.json` (task weight 0.40) moves Fable from 4th (tied) to 1st. Five of six models list "Coding & Engineering" as a strength, so the 0.5 strength score does not separate anyone. The label may be right, but the response gives the reader no way to see that the top pick comes from curation and not from Elo. (Finding by Opus 2a, reproduced here.)

### P3. `reasons` explain nothing about weight

The response lists reasons ("Category leader for X", "Elo 1498") but not how much each part contributed, so nobody can audit a ranking without reading the source.

## Decision needed from cmc

> **Decision status:** on 2026-09-25 the recommended option for each decision below was reported as adopted by cmc ("Let's go with the recommendations already shown in the table"). This was relayed by Fable from cmc's message in its own session; the Sonnet session has not received it from cmc directly. Treat as adopted, pending cmc's confirmation. See `README.md`, "Decisions taken". D4/D5-style texts that cmc must write are not drafted here.


1. **Normalization basis.** Recommended: normalize against the **full tracked set** (all models in `models.json`), so a model's component scores never depend on the filters. Filters then only remove rows. Alternative: keep relative scoring and rename the field `relative_score`. Recommendation reasoning: the full-set basis makes `score` comparable across calls and makes the homepage and API agree by construction. Cost: existing test expectations change once.
2. **Keep the 0.40 task weight?** With hand-set labels this is the single largest lever. Options: keep 0.40 and show the label effect (this plan), or lower it. This plan does not change the weights. Weights are a product decision; the plan only makes their effect visible.
3. **Output price.** Cost is scored on input price only (deliberate, per code comment). Decide whether to add an optional `output_weight`/`workload` param later. Out of scope here.

## Design

### 1. Stable normalization (if decision 1 = full set)

In `scoreAndRank`, compute `minElo/maxElo/minCost/maxCost/minCtx/maxCtx` from `models` (all), not from `candidates`. Hard filters still build `candidates`. Keep the divide-by-zero guard for the degenerate single-model case. Rename the local `maxCost2` (it shadows the option `maxCost`) to `maxCostAll`.

**Interaction with `elo-provenance.md` step 4:** the Elo extrema (`minElo`/`maxElo`) are taken over the **rated** models only (own, non-missing, non-stale score). A borrowed score must not set the floor or ceiling. Cost and context extrema use all tracked models. Do this plan after the source-identity repair, and implement `isRated` there; here just call it.

### 2. Per-component breakdown

Extend `Recommendation` with:

```ts
breakdown: { task: number; elo: number; cost: number; context: number }  // weighted contributions, sum = score before rounding
label_effect: number  // weights.task * taskScore, i.e. how much of the score came from curated labels
```

Add the same two fields to the `/api/recommend` response items and to `data/api-types.ts`, and to `app/api/openapi.json/route.ts` (`__tests__/openapi-consistency.test.ts` fails if they drift). Keep the existing fields unchanged so current callers keep working (additive change).

### 3. Say what `score` means

In the OpenAPI description and `/api/recommend` docs: "score is 0 to 1. Scores are comparable only between calls that share the same scoring version, data snapshot and resolved task (which selects the weights). It is an ordering aid, not a quality measure." (Astra's challenge, accepted: full-set normalization buys **filter stability**, not unrestricted comparability. `task=coding` versus no task uses different weights and labels, and a weekly data change moves the extrema, so scores shift even when the formula version is unchanged.)

Add to the response `meta`:

```ts
scoring: {
  version: 1,
  weights: { task, elo, cost, context },       // the set actually used for this call
  normalization: 'all_tracked_models',
  snapshot: 'sha256:<first 12 hex>',           // hash of models.json + categories.json contents (+ site.json lastUpdated)
  data_last_updated: '2026-09-23',
  matched_category: 'Coding & Engineering' | null   // what `task` resolved to
}
```

Compute `snapshot` once at module load from the JSON files (`data/index.ts`), so it changes exactly when the data does. Bump `version` if weights or normalization change. Add a test: changing one Elo value in a fixture changes `snapshot`; reordering keys does not (hash a canonical JSON).

### 4. Homepage

`app/components/ModelFilter.tsx` uses the same `scoreAndRank`. Show a small "why this rank" line built from `breakdown` (e.g. "Curator's pick +0.40, Elo +0.35, cost +0.00, context +0.10"). Wording is fixed by `docs/review/purpose.md`: the leader component is called **"Curator's pick"** (and the `reasons[]` string "Category leader for X" is renamed to match), the strength component **"Curator-rated strength"**. Do not use "curated label". Do not add new colors: reuse hex values already used for secondary text in `app/globals.css`. (`globals.css` defines only two CSS variables, both fonts, so there are no color tokens to reuse. Do not wait for `graphics-and-look.md` step 5, the tokens refactor; that plan will sweep this line later.)

### 5. Task matching guard (minor)

`findMatchingCategory` clause 1 is `name.includes(task)`, so `task=a` or `task=re` matches the first category containing that fragment and returns a confident task match. Require `t.length >= 3` for clause 1. Return `matchedCategory: null` otherwise (behaves as "no task"). Add the input to `__tests__/api-params.test.ts`.

## Tests (write first; they should fail on current code)

Add to `__tests__/recommend.test.ts`, using the real `data/models.json` and `data/categories.json` so data changes surface here:

1. **Filter stability:** for every pair (A, B) that both pass `maxCost = 4`, the relative order under `maxCost = 4` equals the order with no filter. Loop over all pairs; fail with the pair names. This test fails on the current code (Opus/Gemini swap).
2. **Score comparability:** the score of Gemini 3.1 Pro is identical for `{}` and `{ maxCost: 4 }`.
3. **Label effect:** for `task = 'coding'`, `label_effect` for the category leader equals `0.40` and is `0` for a model with no label. Build a fixture with labels removed and assert the order equals the "labels removed" ranking above only if the data still matches; otherwise assert the *property* "removing labels changes the top pick" as an informational `test.skip` note, not a hard failure (data will change).
4. **Breakdown sums:** `sum(breakdown) ≈ score` within rounding for every model in a few option combinations.
5. **Short task:** `task = 'a'` returns `matchedCategory: null`.
6. Update the existing weights-lock test (it pins the exact numbers): only the numeric expectations that depended on filtered normalization should change. Review each changed number in the diff by hand, do not blanket-update snapshots.

## Acceptance checks

1. `npx jest` green (with the new tests failing first, then passing), `npx tsc --noEmit`, `npm run build`.
2. `curl 'localhost:3000/api/recommend?max_cost=4'` and `curl 'localhost:3000/api/recommend'` return the same `score` for Gemini 3.1 Pro.
3. Response items contain `breakdown` and `label_effect`; `meta.scoring.version` is `1`.
4. Homepage filter and API return the same order for the same inputs (spot check 5 combinations).
5. `./verify-all-agents.sh` unchanged.

## Files touched

`data/recommend.ts`, `data/api-types.ts`, `app/api/recommend/route.ts`, `app/api/openapi.json/route.ts`, `app/components/ModelFilter.tsx`, `app/globals.css` (small), `__tests__/recommend.test.ts`, `__tests__/api-params.test.ts`, `__tests__/openapi-consistency.test.ts` (if the spec check needs new fields). Also `app/api/pro/recommend/route.ts` if it calls `scoreAndRank` (check with `grep -rn scoreAndRank`), because a normalization change alters its results too.

## Risks and unknowns

- Callers that stored old `score` values will see them change once. The site is public and small; still, bump `meta.scoring.version` and note it in `CHANGELOG.md`.
- `/api/pro/recommend` is a paid-endpoint mock. Confirm it shares `scoreAndRank` and update its tests together.
- The plan makes the label effect visible but does not judge whether the `leader` labels are right. Auditing them is a separate task (Opus suggested an independent non-Anthropic reviewer, see `docs/review/purpose.md` when written).
- With only 6 models, full-set normalization is dominated by the extremes (Grok's Elo 1456 sets the floor). If the set grows or an outlier joins, revisit; a fixed reference range would then be safer.
