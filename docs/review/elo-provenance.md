# Plan: record where each Elo comes from, with its interval (review track 6, Elo provenance)

**Author:** Sonnet 5 (helloai-7e), review room `helloai-review`, 2026-09-25
**Executor:** Sonnet from a cold session. **Status:** PLAN, nothing implemented.
**Origin:** Astra's challenge 3 (intervals) plus Fable's finding that `arena.py` ingests `score` only. Following that up turned up something bigger: the automated Elo sources are dead, and two of the six displayed Elos belong to predecessor models.

## Problem

Elo is the only quantitative ranking signal. The site's documentation says it comes from LMArena "via `scripts/arena.py`" (`CLAUDE.md`, "Benchmark sources"). In practice, as of 2026-09-25:

1. **[C] Both automated sources are stale and refused by the freshness guard.**
   - Primary (nakasyou `scores.json`): fetched 2026-09-25; the newest snapshot key is `20250522`, and each entry is a bare float (`"gemini-2.5-pro-preview-05-06": 1446.0`). No interval, no votes.
   - Fallback (fboulnois `lmarena_text.csv`): latest release tag `2025.09.02`. The CSV **does** have `95_pct_ci` (`+5/-5`) and `votes` columns, but the data is a year old (models like Gemini 2.5 Pro).
   - `scripts/arena.py` rejects anything older than `MAX_SNAPSHOT_AGE_DAYS = 30` (lines 41, 187, 246). The leaderboard-updater memory confirms: "Scrapers still refuse stale snapshots (nakasyou 489d, CSV 385d)."
   - So the scripted Elo path currently produces nothing. The values in `data/models.json` are **hand-curated from arena.ai pages by the leaderboard-updater agent** (Grok), not scripted.
2. **[C, from `.claude/agent-memory/leaderboard-updater.md`, the agent's own notes] Two of the six displayed Elos are a predecessor model's score.**
   - Claude Opus 5.5: the card's 1493 "is still claude-opus-5-high. Not on Sep 13 text or Sep 22 WebDev." That is Opus 5's number, shown for Opus 5.5.
   - Grok 4.7: the card's 1456 "is still grok-4.6-high (15521 votes, Sep 13)". That is Grok 4.6's number, shown for Grok 4.7.
   - The site reads as "the current Elo of each listed model" and the ranking, the "top three within 5 points" tie and `scoreAndRank` all use these numbers.
3. **[C] The agent sees intervals and votes and the site drops them.** Its notes carry "claude-fable-5.1-max 1498±8 / 5783" votes; the schema (`data/types.ts`) has only `elo: number`.
4. **[C] The text-overall snapshot date is Sep 13.** The board is 12 days old on the 25th, and different models come from different boards (text overall, Code Arena WebDev). The reader can't tell which.
5. **[C, Astra found it, I re-read the code] `arena.py` can substitute an older model version without saying so.** `_NAME_MAP['claude']` (scripts/arena.py:71+) lists Opus 5.5 and then every older generation down to `claude-opus-4-5`; `gemini` falls back from Pro to `gemini-3-flash`; `muse` down to `muse-spark-1.1`. `_resolve_model_id` (line 309) returns the first candidate found, and `fetch_scores` drops the matched name, so `update_models` writes that score under today's model id. The comment "exact name-map match only, curated Elos are authoritative" describes a name match, not a version match. [U] Whether this ever produced a value now in `models.json`: today both sources are refused as stale, so the path is dormant, but it would fire on the first fresh snapshot lacking the newest slug.
6. **[C] "Curated Elos are authoritative" is not what the code does.** `update_models` (scripts/update_leaderboard.py:27) applies, per model: an explicit `--set` override from that invocation, else any fetched score, else keeps the stored value. A stored curated value is **not** protected from a fetched one. The methodology page must describe this precedence, not the slogan in `CLAUDE.md`.

Impact: a reader is told "Opus 5.5 scores 1493". It is Opus 5's score on a snapshot before Opus 5.5 was ranked. Nothing on the page says so.

## Decision needed from cmc

> **Decision status:** on 2026-09-25 the recommended option for each decision below was reported as adopted by cmc ("Let's go with the recommendations already shown in the table"). This was relayed by Fable from cmc's message in its own session; the Sonnet session has not received it from cmc directly. Treat as adopted, pending cmc's confirmation. See `README.md`, "Decisions taken". D4/D5-style texts that cmc must write are not drafted here.


1. **Policy for a model whose own score isn't on the board yet.** Options: (a) show the predecessor's score **labelled** ("Opus 5's score, Opus 5.5 not yet rated") and exclude it from any ranking comparison, (b) show "not yet rated" and place the model last or unranked, (c) keep as-is. Recommended: (a) at minimum, because (c) is a misstatement. If (a) is chosen, the exclusion must be implemented in `scoreAndRank` itself (step 4), not only shown as a badge. This is a rule, so it belongs in `listing_policy` / the methodology page (`claims-guard.md`, `purpose.md` D5).
2. **Which board is "the" Elo?** Recommended: text-overall only for the headline number; record other boards (WebDev) separately, as the agent already does in `desc` text.
3. **Retire or repair the scripted path?** Options: (a) repair: point `arena.py` at a maintained source, (b) retire it and document that Elo is agent-curated from arena.ai with a recorded snapshot, (c) both. Recommended: (b) now, (a) only if a maintained machine-readable source exists. This plan does not fetch or scrape arena.ai itself.

## Design

### 1. Schema: per-model provenance (additive)

In `data/types.ts` and `data/models.json`:

```ts
elo_source?: {
  board: 'text_overall' | 'webdev' | 'other';
  arena_model: string;        // exact Arena slug the number belongs to, e.g. 'claude-opus-5-high'
  matches_listed_model: boolean; // false when the slug is a predecessor of the listed model
  ci_low?: number; ci_high?: number;   // e.g. 1490, 1506; omit when unknown
  votes?: number;
  snapshot_date: string;      // 'YYYY-MM-DD' of the Arena snapshot
  source_url: string;
}
```

`elo` stays the number everything reads today, so nothing else breaks.

### 1b. Stop cross-version substitution in `scripts/arena.py`

- Make `_resolve_model_id` return the matched Arena name with the entry, and thread it through `fetch_scores` so `update_models` can record it in `elo_source.arena_model`.
- Split each `_NAME_MAP` list into `exact` (same model version **and** a declared measured configuration) and, if kept at all, `predecessor`. Astra's refinement, accepted: a reasoning-effort variant is part of the measured configuration, so `claude-opus-5.5-max` and `claude-opus-5.5-high` must **not** silently become interchangeable. Record the exact Arena slug (already `elo_source.arena_model`), add `elo_source.config` (for example `max`), and pick one documented variant policy per model in the map (for example "prefer the `-max` slug; never fall back to another effort level", or list the accepted variants explicitly with a note). Show the config on the card next to the score; "exact" means the measured identity is traceable. The `predecessor` list (older versions). Only `exact` may overwrite `elo`. A `predecessor` hit may set `elo_source` with `matches_listed_model: false` **only when an operator passes `--allow-predecessor`**, and it must never cross product tiers (Gemini Pro must not resolve to Flash).
- Preserve missing and stale explicitly: when no `exact` match exists, keep the old value and write a log line plus an `elo_source.status` of `missing` or `stale`, instead of silently leaving the value.
- Record override provenance: `elo_source.set_by: 'override' | 'fetched' | 'agent_curated'`.
- Tests (`scripts/test_arena.py`): with only `claude-opus-4-5` (1400) present, `claude` resolves to nothing; with `claude-opus-5.5-high` present it resolves and reports that name; `gemini` never resolves to a Flash entry; `update_models` keeps the old value and reports `missing` when no exact match exists.
- Reproduction (Astra): `_resolve_model_id('claude', {'claude-opus-4-5': _ArenaEntry(..., 1400)})` returns the old entry on current code. Make this the first failing test.

### 2. Tests (`__tests__/data.test.ts` or new `__tests__/elo-provenance.test.ts`)

- Every model has `elo_source` with `arena_model`, `snapshot_date`, `board`, `source_url`.
- `snapshot_date` not older than 21 days (constant; fail with the model name). This turns silent staleness into a visible failure at update time.
- If `matches_listed_model` is false, the model's `desc` must contain the phrase `not yet rated` (or the decided wording), so the UI can't present it as its own score. (Wording follows decision 1.)
- If `ci_low`/`ci_high` are present, `ci_low <= elo <= ci_high`.
- `ci_low`/`ci_high`/`votes` are only allowed when `matches_listed_model` is true. A predecessor's interval must never be attached to the listed model (Astra).

### 3. Display (coordinate with `graphics-and-look.md` G2, step 3)

- When an interval exists: show `1498 ± 8`, not a tilde, not a rounded number. When it doesn't: exact score and a single note "interval not available from source" (Fable's revised G2).
- When `matches_listed_model` is false: a small "score is Opus 5's" label next to the number. Reuse the existing muted-text style.
- Fable's display rule (`graphics-and-look.md` step 3, item 2b): one function `formatElo(model)` handles three states (interval present, interval absent, score borrowed). Borrowed-score cards keep their position but never get the "Best match" gradient unless the borrowed score is excluded from ranking comparisons (decision 1). Use the same string constant as `/methodology`.
- The homepage subtitle in `app/page.tsx` (LeaderboardSection: "LMArena text-overall Elo ... Updated weekly") is wrong today on two counts: the text board is dated Sep 13, and two of six numbers belong to predecessors. Its copy fix belongs to `purpose.md` step 1; the board/date line below replaces it.
- Put board and snapshot date in the section subtitle, once ("LMArena text overall, snapshot 2026-09-13").

### 4. Scoring: make the exclusion operational (`scoring-transparency.md`)

Astra's check, accepted: a warning badge alone leaves the recommendation affected, because a borrowed Elo would still move `eloScore` and the min/max used to normalize everyone else. If decision 1 = "labelled and excluded from ranking comparisons" (recommended), implement it in `scoreAndRank` (`data/recommend.ts`):

- **Rated set.** `rated = models.filter(m => m.elo_source?.matches_listed_model === true && m.elo_source.status !== 'missing' && m.elo_source.status !== 'stale')`. Only rated models enter the ranking **and** the normalization population (`minElo/maxElo`, and, under `scoring-transparency.md` step 1, the full-set extrema are taken over `rated` only). Cost and context extrema can still use all tracked models, since those fields are the model's own.
- **Unrated models** (borrowed, missing or stale score) do not appear in `recommendations`. Return them in a separate `unrated: { model, reason: 'borrowed_score' | 'missing_score' | 'stale_score', arena_model?: string }[]` array, so the caller and the UI can still show them, labelled, outside the ranked list. `excluded` (hard-filter count) keeps its current meaning.
- **`elo` field stays on the model** for display, but is never read by the scoring code for an unrated model.
- **Degenerate cases.** If `rated` has one model, its `eloScore` is 1 (existing equal-extrema guard). If `rated` is empty, `recommendations` is `[]` and every candidate is in `unrated`. `task` matching still resolves the category from all categories; a category **leader** that is unrated gets no leader bonus in the ranking, and the response says why (`matched_category` plus a note in `meta`). The leader label is a curator's pick, so do not silently move it; flag it.
- **API and OpenAPI.** Add `unrated` to the `/api/recommend` response, `data/api-types.ts` and `app/api/openapi.json/route.ts`. `elo_matches_model` on ranked results is always `true` under this policy; keep it only if a future policy lets borrowed scores rank.
- **Homepage.** `ModelFilter` shows unrated models in a separate "not yet rated" row group with the borrowed-score label (Fable's `formatElo`, three states), never in the ranked order and never with the "Best match" gradient.
- **Changing the policy** (decision 1 = b or c) changes only the `rated` predicate, so keep it in one exported function `isRated(model)` next to `SCORING_WEIGHTS`, covered by its own test.

**Tests (fail on current code, add to `__tests__/recommend.test.ts`):**

1. **Predecessor can't move anyone.** Take the real data; change the Elo of a model with `matches_listed_model: false` to 1000, then to 2000. The order **and** scores of every rated model are identical in all three runs.
2. **Normalization population.** With the borrowed model as the highest-Elo model in a fixture, the top rated model still gets `eloScore` 1.
3. **Missing score.** A model with `elo_source.status = 'missing'` (or no `elo_source`) lands in `unrated` with `reason: 'missing_score'` and is absent from `recommendations`; `excluded` is unchanged.
4. **Empty rated set.** All models unrated: `recommendations` is `[]`, `unrated.length === models.length`, no NaN anywhere.
5. **Unrated category leader.** `task` resolves to a category whose leader is unrated: no model receives the 1.0 leader bonus, and `meta` explains it.
6. **Same-model consistency.** Homepage and API return the same rated order and the same `unrated` set for five option combinations.
7. **`isRated` policy switch.** Flipping the policy constant to "include borrowed scores" changes outputs, proving the exclusion is what protects the order (guards against a no-op implementation).

### 5. Update pipeline

- `leaderboard-updater` (Grok) writes `elo_source` when it patches an Elo. Update `.claude/agents/leaderboard-updater.md` (and the Grok spec under `.claude/docs/grok-agent-migration/`) to require the fields, **then recompute the integrity hash** per `CLAUDE.md` (`./verify-all-agents.sh`). Do not edit the frontmatter, only the body, if possible; a body change may not need a hash change (check the hash covers frontmatter only, as `CLAUDE.md` says).
- `scripts/arena.py`: per decision 3. If retiring, remove the dead fetch paths in a separate commit and keep the name-map tests.
- Update the "Benchmark sources" paragraph of `CLAUDE.md` so it says what actually happens (curated from arena.ai by the agent, recorded in `elo_source`).

### 6. Data changes needed now (one time, by whoever runs the next weekly update)

Fill `elo_source` for all six frontier models from the agent's notes (`.claude/agent-memory/leaderboard-updater.md`) and re-check each against arena.ai. **This plan did not verify any Arena number.** The agent notes are the source for the predecessor finding, and a person should open the live board before writing dates and intervals.

## Acceptance checks

1. `npx jest`, `npx tsc --noEmit`, `npm run build`, `./verify-all-agents.sh`.
2. `models.json` validates with the new field for all six models, and the two predecessor cases carry `matches_listed_model: false`.
3. Homepage shows the board and date once, an interval or the "not available" note per card, and the predecessor label on Opus 5.5 and Grok 4.7 (until they get their own scores).
4. `CLAUDE.md` no longer claims the scripted path is the Elo source.
5. The weekly update (`/weekly-update`) fails loudly, not silently, when a snapshot is older than the limit.

## Files touched

`data/types.ts`, `data/models.json`, `data/index.ts` (if it exposes fields), `__tests__/elo-provenance.test.ts` (new) or `data.test.ts`, `app/components/ModelCard.tsx`, `app/page.tsx` (subtitle), `app/api/recommend/route.ts` + `data/api-types.ts` + `app/api/openapi.json/route.ts` (new fields), `scripts/arena.py`, `.claude/agents/leaderboard-updater.md` (+ hash), `CLAUDE.md`.

**Same commit, two strings:** the `data/site.json → listing_policy` sentence "Two models currently show a predecessor's score, as noted on the leaderboard" and the Leaderboard subtitle in `app/page.tsx` ("Opus 5.5 and Grok 4.7 show their predecessors' scores") both go stale when the not-yet-rated display ships. Edit them in the same commit that adds it, so the site never contradicts itself. Also add `listing_policy` (and `affiliations`) to the list of text that `/methodology` renders, so they ship together.

## Risks and unknowns

- The predecessor finding is from the agent's own notes, not from a fresh look at Arena. It may already be outdated if the boards changed since 2026-09-23. Verify before acting.
- [U] Whether arena.ai publishes intervals for every one of these slugs, and whether they can be collected without scraping against its terms. Check the terms before automating anything.
- The agent-curated path is only as reliable as the agent's reading. The tests above check shape and freshness, not truth.
- Decision 1 (borrowed scores) changes how the homepage ranks Opus 5.5 and Grok 4.7. Coordinate with `purpose.md` D5 so the listing rule and this rule read as one policy.
