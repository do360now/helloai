# Review: Purpose (track 1) + Trust & Neutrality (track 7d)

Owner: Opus 5.5 (hub session helloai-2a). Review room: `helloai-review`, 2026-09-25.
Related plans: `observability.md` (Sonnet, track 7g, goes first), `scoring-transparency.md` (Sonnet, how the score works),
`seo-and-discoverability.md` (Fable, track 7b).

Tags: **[C]** confirmed by reading code or data in this repo, **[U]** unverified, **[O]** opinion.

---

## 1. Problem

helloai.com calls itself "Your unbiased guide to the world's smartest AIs"
(`data/site.json` tagline, `app/layout.tsx` title/OG/Twitter, `app/opengraph-image.tsx`).
Nothing on the site lets a reader check that claim. The ranking a reader sees is:

- LMArena Elo, with curated overrides (`scripts/arena.py`; curated values stay authoritative) **[C, per CLAUDE.md]**
- plus a hand-set "leader" label per category (`data/categories.json` → `leader`) worth 40% of the score whenever a task matches **[C]** (`data/recommend.ts` `SCORING_WEIGHTS`)
- plus hand-written `desc` prose, including benchmark percentages that no script checks **[C, per CLAUDE.md]**

This review agreed early that "unbiased" is a statement of **intent**, not something a reader can **verify**
(Opus, Fable and Sonnet reached this independently). The fix is not to prove neutrality. It is to
**disclose the method**, so a reader can see exactly where judgment comes in.

## 2. Evidence

### 2.1 A hand-set label decides the top coding pick [C]
`scoreAndRank` was run on `data/models.json` + `data/categories.json` as of 2026-09-25 (six models): first as a
Python port (Opus), then as the shipped `data/recommend.ts` itself (Sonnet, `node --experimental-strip-types`).
The numbers match exactly. Sonnet's scoring plan (b) turns this into a jest regression case.

| Rank | `task=coding` (as shipped) | `task=coding`, labels zeroed | no task |
|---|---|---|---|
| 1 | Claude Fable 5.1 (0.85) | Muse Spark 1.3 (0.56) | Muse Spark 1.3 |
| 2 | Muse Spark 1.3 (0.76) | Claude Opus 5.5 (0.51) | Claude Opus 5.5 |
| 3 | Claude Opus 5.5 (0.71) | Gemini 3.1 Pro (0.50) | Gemini 3.1 Pro |
| 4 | Qwen3.8-Max (0.65) | Claude Fable 5.1 (0.45) | Qwen3.8-Max |
| 5 | Gemini 3.1 Pro (0.50) | Qwen3.8-Max (0.45) | Claude Fable 5.1 |
| 6 | Grok 4.7 (0.34) | Grok 4.7 (0.14) | Grok 4.7 |

- 5 of 6 models list "Coding & Engineering" in `strengths`, so the 0.5 strength score barely separates them. The 1.0 **leader** bonus is what decides. **[C]**
- Fable 5.1 has the highest Elo (1498) but the highest input price ($10/M), so it scores 0 on cost. The leader label more than offsets that. **[C]**
- The label may be correct. What's wrong is that the reader can't see it's a curator's call. **[O]**

### 2.2 Precision the site doesn't show [C gap, U intervals]
The top three Elos are 1498 / 1493 / 1493, within 5 points of each other **[C]**. The site shows a strict order with **no interval** **[C]**.
Whether the 5-point gap lies inside the intervals is **[U]**. Sonnet withdrew an earlier unsourced "intervals are usually wider" claim.
The only interval in the repo is the site's own article quoting GPT-6 Astra at 1480 ±12 on 2,693 votes: one new model, not the six
tracked ones. The site holds no interval data for any model: `scripts/arena.py` ingests `score` only, and `_ArenaEntry.votes` is unused
**[C, Fable]**. Arena publishes model-specific intervals (Astra, citing https://arena.ai/blog/ranking-method). Fetch them, or say "interval unavailable".
**Update (Sonnet, `elo-provenance.md`):** the leaderboard-updater agent's own notes (`.claude/agent-memory/leaderboard-updater.md`) record
intervals the schema throws away: Fable 5.1 **1498 ±8** (5,783 votes), Muse Spark 1.3 **1493 ±9** (4,723), and **1493 ±4**, which is
`claude-opus-5-high`, i.e. **Opus 5's score, not Opus 5.5's** (lines 6, 20). The limited, correct statement (Astra): **the top two intervals overlap
([1490, 1506] and [1484, 1502]), and #3 has no score of its own.** Overlapping marginal intervals call for caution, but they aren't a formal
pairwise test and don't prove the models are equivalent. Opus 5's ±4 must not be attached to Opus 5.5.
**[C from the agent's notes; not re-fetched from arena.ai.]** Grok 4.7's 1456 is likewise `grok-4.6-high` (line 23).

### 2.3 Scores are relative to the filters [C, Sonnet]
Every signal is min-max normalized over the models that **survive the filters**. Adding `max_cost` can therefore reorder
two models that both pass. A reader can't reproduce a score from one model card alone.
Proven on the shipped code (Sonnet): with no task, Opus 5.5 (0.86) ranks above Gemini 3.1 Pro (0.83). With `max_cost=4`,
which both pass, Gemini (0.84) ranks above Opus (0.75). At `max_cost=2`, Grok 4.7 scores 0.0. So `score` is **not comparable
across calls**, and an agent that treats it as an absolute quality number will be wrong.

### 2.4 Cost means input price only [C]
`cost_per_million_tokens_output` is intentionally ignored for scoring (code comment in `data/recommend.ts`).
For output-heavy workloads, "Most cost-efficient" can be wrong.

### 2.5 Copy makes claims the data doesn't back [C]
- `app/layout.tsx` description/OG/Twitter: "Compare Claude, Gemini, **GPT**, and Grok … No hype, just **real benchmarks**."
  - `data/models.json` has **no OpenAI/GPT model** (tracked: Fable 5.1, Muse Spark 1.3, Opus 5.5, Gemini 3.1 Pro, Qwen3.8-Max, Grok 4.7).
  - The only ranking signal is Elo. No benchmarks are ingested (CLAUDE.md, "Benchmark sources").
- Footer (`app/page.tsx` `Footer`): "No ads, no affiliate links" is the **only** disclosure on the site.
- There is no methodology or about page. `app/sitemap.ts` lists `/`, `/articles` and article pages only.

### 2.6 Affiliation facts a reader would want to know [C]
- 2 of 6 tracked models are Anthropic's. Claude Fable 5.1 is the hand-set leader in 2 of 4 categories
  (Overall Preference, Coding & Engineering).
- The operator's own agent fleet runs on Claude (weekly pipeline, article-writer on Opus) and Grok
  (leaderboard-updater, article-idea-generator). Articles are written by an Anthropic model.
- The review that produced this doc was run by Claude models (Opus, Sonnet, Fable), with Astra possibly joining later.
  **Every reviewer is an interested party**: three are Anthropic models (Anthropic holds 2 of 6 slots and 2 of 4 leader labels),
  and if Astra is GPT-6 Astra, it is the candidate the listing rule currently excludes (§2.6b). No reviewer here is neutral.
  Recommendation: the leader labels and the listing rule are **cmc's signed decisions**, published with a date on
  `/methodology`. Reviewer opinions (any model) are input, each labelled with its vendor.
- Whether the operator has any commercial relationship with any provider: **[U]**. Only cmc can answer, and the methodology page must.

### 2.6b The listing rule is unwritten [C, from `data/articles.json` text + `data/models.json`]
- The site's own articles say GPT-6 Astra is not listed because "helloai still waits on two weeks of text Elo before it can
  take a slot". That rule appears **only in article prose**: not in code, docs or on any page (Sonnet, `claims-guard.md`).
- The same articles quote LMArena's 2026-09-13 snapshot: `gpt-6-astra-max` at **1480 ±12, rank 24**. So at least 23 models sit
  above 1480 on LMArena, but helloai.com lists only 5 models above 1480, plus Grok 4.7 at 1456. **The "frontier" table isn't
  LMArena's top N. It's a curated selection** (it looks like roughly one flagship per provider **[O]**). That's a legitimate
  editorial choice, but it isn't disclosed anywhere, and a reader would assume the table is the top of the leaderboard.
- Meanwhile the metadata copy names GPT, which is the one flagship the rule currently excludes.
- **The unwritten rule is applied unevenly [C from agent notes + data].** GPT-6 Astra is held out for lacking two weeks of *its own*
  text Elo. Claude Opus 5.5 is listed with **no Elo of its own at all** ("Text board has no 5.5 slug"; card shows Opus 5's 1493), and
  Grok 4.7 shows Grok 4.6's score. So a new Anthropic model and a new xAI model inherit a predecessor's score, while a new OpenAI model waits.
  There may be a principled distinction (a point release inherits, a new family waits), but it's written nowhere, and on its face it favours
  the vendors whose models run the operator's pipeline. This is the most important neutrality finding in this doc. **[O on the interpretation.]**

### 2.7 The hero carries two value propositions [C code, O interpretation]
`app/components/Hero.tsx`: tagline "Your unbiased guide…" (directory), then "Great ideas start with a conversation.
Find the right AI. Introduce it to another." (collaboration / app.helloai.com). Primary CTA → `#models` (directory),
secondary CTA → `https://app.helloai.com`. See Decision D1.

### 2.8 The one verifiable differentiator is below the fold [C]
"⚡ Independently measured" (`app/components/OpenWeightCard.tsx:54-59`, gated on `bench_source`) applies to 4 of 6
**open-weight** models only. It's the 4th homepage section (`app/page.tsx` render order). Frontier models have no measured data.

## 3. Decisions needed (cmc)

**Status: adopted 2026-09-25.** Relayed by Fable (hub session b9) in `helloai-review` as cmc's words: "Let's go with the recommendations already shown in the table." **cmc: please confirm directly; this was not given in the Opus session.**
- D1 → (a) directory first (test it with the `competitive-landscape.md` H1/H3 pilot).
- D2 → "transparent" (hygiene, not a differentiator).
- D3 → keep the 0.40 weight and disclose it as "Curator's pick".
- D4 → **shape adopted; the text is still cmc's to write.** `/methodology` doesn't ship without it.
- D5 → one listing + borrowed-score policy, the same for every vendor; borrowed scores labelled **and excluded** (`elo-provenance.md`
  `isRated`/`unrated`). So Claude Opus 5.5 and Grok 4.7 show as unranked until they have their own score. **The `listing_policy` sentence is still cmc's to write.**

The options and reasoning are kept below for the record.


**D1. What is helloai.com, in one sentence?** Pick one; the rest of the plan adapts.
- **(a) Directory first** (recommended). "A transparent, curated guide to picking a frontier model, for people and agents."
  The app link stays as a secondary CTA. Collaboration content (track 3) shows up as *evidence* (measured pairings),
  not as the headline.
- **(b) Front door to app.helloai.com.** The hero leads with collaboration and the directory becomes a supporting section.
  This needs track 2's funnel data first, and today there is none (no analytics, per Sonnet 7g).
- (c) Keep both. Not recommended: that's the current state, and it reads as unresolved.
- How to test D1 (a): `competitive-landscape.md` H1/H3. Pick one real developer workflow, publish three evidenced decision briefs,
  and run a four-week pilot with a continue/revise/stop criterion agreed in advance. That's a better test of "a short, evidenced choice
  for your workload" than any change to the homepage.
- Evidence note (Astra): D1 must **not** be settled by raw request counts from `observability.md` alone. Generic HTTP clients
  (node-fetch, undici, axios) aren't proof of autonomous agents, `/go/` hits can be bots or link previews, and a click isn't an
  activated app user. Use them together with app-side activation (a room created or a job posted, carrying the `from` value defined in `observability.md`; app-side, handoff).

**D2. Replace "unbiased".** Options: "transparent", "curated, with the method shown", "independent" (only if D4 is clean).
Recommended: **"Your transparent guide to the world's smartest AIs"**, backed by the methodology page.
Caveat (Astra, 7h): "transparent" fixes honesty but **isn't a differentiator**. Artificial Analysis and OpenRouter already publish
model-data APIs with pricing, evals and filters (URLs in `competitive-landscape.md`). The positioning should be "a short, evidenced
choice for your specific workload, including saying when the evidence isn't enough". Treat D2 as hygiene, not strategy.

**D3. Keep the hand-set leader label at 40%?** Options: keep it and disclose it (cheapest); lower it to about 0.20; or
replace it with an Elo-derived category signal once one exists. This plan only requires **disclosure**. Weight changes belong to Sonnet's plan (b).

**D4. Affiliation statement.** cmc must write, in their own words, any relationship with Anthropic, xAI, Google, Meta, Alibaba
(API credits, partnerships, employment, investments), or state that there is none. Claude must not draft a "none" statement on cmc's behalf.

**D5. Write the listing rule, together with the borrowed-score rule, as one policy.** Which models get a slot, what gets them in or out
(provider cap, Elo wait, availability), **and** whether a successor may show a predecessor's Elo (and if so, labelled how, and for how long).
The same rule must apply to every vendor (§2.6b). Sonnet's `elo-provenance.md` recommends that borrowed scores are labelled
("score is Opus 5's") and excluded from ranking comparisons. This plan agrees, and the rule must also say what happens to a
*new family* with no score yet, so Astra-type and Opus-5.5-type cases get the same treatment.
Know the consequence before choosing. If borrowed scores are excluded **operationally** (in `scoreAndRank` and in its normalization
population, as Astra asks of `elo-provenance.md`, not just flagged with a badge), then **today Claude Opus 5.5 and Grok 4.7 leave the ranked
recommendations**, with no Elo of their own, and appear as "unranked" until they get their own score. That's the even-handed result, and it's
the same treatment a new OpenAI model gets today. The alternative is to allow labelled inheritance for every vendor, including a new family's
predecessor where one exists.
It's in article prose today (§2.6b). Recommended: one sentence in `site.json → listing_policy`, rendered on `/methodology`.

## 4. Implementation plan

Order matters: step 1 is independent. Steps 2–4 need D2/D4 answered. Step 5 needs D1.

### Step 1: Fix copy that's plainly wrong (no decision needed)
(The *guard* that stops this drifting again belongs to Sonnet's hand-written-claims plan (c). This step only fixes today's copy.)
- `app/layout.tsx`: in `description`, `openGraph.description` and `twitter.description`, replace the "GPT" list and "real benchmarks"
  with wording that matches the data, e.g. "Compare Claude, Gemini, Grok, Qwen and Muse Spark with LMArena Elo, cost and context data…".
  Better still, generate the provider list from `getModels()` so it can't drift again.
- `public/.well-known/ai-plugin.json` → `description_for_model` [C]: lists "Claude, Gemini, Grok, **GPT**, Meta Muse Spark",
  names an untracked GPT and leaves out tracked Qwen. Fix the list to match models.json. (Whether to keep the file at all is
  Fable's call in `seo-and-discoverability.md`.)
- The "GPT" pill in `app/opengraph-image.tsx` is removed by `graphics-and-look.md` step 1 (the OG 502 fix edits the same file
  this week). Don't touch that file here.
- `app/page.tsx` `ModelsSection` subtitle "Six APIs, ranked by capability" reads as "the top six". Change it to match the listing rule
  (D5), e.g. "Six flagship models we track, one per lab. How we pick them: /methodology". Fable flagged this.
- `app/page.tsx:78` `LeaderboardSection` subtitle "LMArena text-overall Elo with list price and context. Updated weekly." is wrong
  on two counts **[C, Fable + agent notes]**: the text board snapshot is 2026-09-13, and two of six scores belong to a predecessor
  (Opus 5.5 → Opus 5, Grok 4.7 → Grok 4.6). Interim copy: "LMArena text Elo (snapshot {date from site.json or elo_source}); some scores are a
  predecessor's, marked on the row." Final copy follows `elo-provenance.md` once `elo_source` exists.
- Add a jest test in `__tests__/data.test.ts`: every provider/model family named in `layout.tsx` metadata exists in
  `models.json` (or assert that the metadata is built from data).

### Step 2: `/methodology` page
Create `app/methodology/page.tsx` (server component, static). It must state, in plain language:
1. **Where Elo comes from**: the board, the **exact Arena model id the score belongs to**, and the snapshot date, per model
   (`elo-provenance.md` `elo_source`). Describe the **actual** precedence, not the CLAUDE.md shorthand "curated Elos override".
   `scripts/update_leaderboard.py` `update_models` applies (1) explicit `--set` overrides in that run, then (2) any fetched score,
   then (3) keeps the old value. Stored curated values are **not** persistently authoritative **[C, Astra; Sonnet confirmed `update_leaderboard.py:27`]**.
   Also disclose, until it's fixed: `scripts/arena.py` `_NAME_MAP` falls back **across model versions and tiers**. `claude` lists
   Opus 5.5 slugs, then Opus 5, 4.8, 4.7, 4.6 down to `claude-opus-4-5`, and `gemini` falls back from 3.1 Pro to `gemini-3-flash`.
   `fetch_scores` returns only the score, discarding **which** slug matched **[C, Opus verified lines 77–100, 309–376]**. So the scripted
   path can write an older or cheaper model's score under today's name. It's **dormant today** (both sources are refused as stale), so
   today's two borrowed scores came through the manual agent path (§2.6b). The code would do the same on the first fresh snapshot.
   Fix (Astra + Sonnet): keep the source id, board, date and override provenance, and forbid cross-version or cross-tier fallback. Link to the weekly article that records each override, or list overrides from
   `.claude/state/leaderboard-changes.jsonl` (append-only) at build time.
2. **How a recommendation is scored**: import `SCORING_WEIGHTS` from `data/recommend.ts` and render the numbers, so the page can't drift from the code.
   Explain task match = leader 1.0 / strength 0.5 / else 0.
2b. **Which models are listed, and why**: the listing rule (for example "one flagship per provider, after N weeks of
   LMArena text Elo"), read from `site.json → listing_policy` (the field Sonnet proposes in `claims-guard.md`, so code, tests
   and page read one value). Say plainly that the table is a curated selection, **not** LMArena's top N, and link to LMArena's
   full board. cmc must write the rule (decision D5).
3. **Who sets the leader labels and strengths**: the curator (cmc), with the pipeline agents proposing.
   Show the current leader per category (render from `categories.json`).
4. **Limits, said plainly**: rankings are relative to your filters; cost = input price only; Elo uncertainty is shown
   per model from the source snapshot's own confidence interval, or stated as "interval unavailable in this snapshot" (**no blanket
   "N points is noise" rule**: Arena publishes model-specific intervals, per Astra citing https://arena.ai/blog/ranking-method); `desc` benchmark figures are editorial and not machine-verified (until track 6 adds a guard).
5. **What "Independently measured" means**: hardware, harness, date (from `bench_source`); open-weight section only.
6. **Who writes the articles**: an AI pipeline (Grok for ideas, Claude Opus for prose), edited and published by cmc.
7. **Affiliations**: D4 text, verbatim from cmc.
8. **How to report an error**: GitHub issue link (`site.json → githubUrl`) or email.

Also:
- Add a single `METHODOLOGY_URL` constant to `data/index.ts`. The footer, nav, `/api/status`, OpenAPI `info`, `app/sitemap.ts` and
  Fable's `llms.txt` all import it, so the string exists once.
- Add `/methodology` to `app/sitemap.ts` (priority 0.6).
- Link it from the footer (`Footer` in `app/page.tsx`, next to "No ads, no affiliate links") and from `Nav`.
- API: add `"methodology": "https://helloai.com/methodology"` to the `/api/status` response and the
  `/api/recommend` response metadata, and describe it in `app/api/openapi.json/route.ts` (`info.description`).
  Agents are a claimed audience, so they should get the disclosure too. Coordinate with Fable (7b) on `llms.txt`.
- In the OpenAPI schema for the `score` field, describe what it means. The wording depends on the normalization decision in
  `scoring-transparency.md`. If normalization stays relative: "Relative to the filtered candidate set; not comparable across
  requests with different filters." If it moves to the full tracked set: "Comparable only between requests with the same scoring version, data snapshot and
  resolved task; filters only remove rows." (Astra: full-set normalization buys filter stability, not general comparability, since a
  task changes weights and labels, and a weekly data change moves the extremes.)
  The methodology page must use the same sentence.

### Step 3: Show where judgment comes in on the UI
- **The implementation is owned by `scoring-transparency.md`** (the `breakdown` / `label_effect` fields and the "why this rank" line
  in `ModelFilter.tsx`). This plan only sets the reader-facing wording:
  - Call the leader-label component **"Curator's pick"**, not "curated label" or "Category leader". Rename the `reasons[]`
    string in `data/recommend.ts` from "Category leader for …" to "Curator's pick for …".
  - Call the strength component "Curator-rated strength".
  - Use the same words on `/methodology`, in the "why this rank" line and in the OpenAPI field descriptions.
- Leaderboard section: show Elo as tiers or with ± intervals once Sonnet's data plan decides which (track 6).
  Until then, show nothing rather than a made-up threshold. Per-model intervals come from Sonnet's track 6 (`claims-guard.md`)
  once the source provides them. Otherwise the label reads "interval unavailable".

### Step 4: Tagline (after D2)
**Order:** apply `graphics-and-look.md` step 1 (OG display:flex fix) first. It edits the same two OG files, and copy shipped into a
route that still returns 502 is invisible.
- `data/site.json → tagline`, `app/layout.tsx` (title default, OG, Twitter, JSON-LD `description`),
  `app/opengraph-image.tsx` (alt + rendered text), `app/articles/[slug]/opengraph-image.tsx` (fallback excerpt).
  grep for "nbiased" afterwards. The count must be 0 or deliberate.

### Step 5: Hero (after D1)
- If D1 = (a): **keep the AgentSocial scene as the hero visual and change only the words** (Fable's counter-proposal, adopted:
  the scene is labelled "Illustrative scene", so putting it under an "evidence" heading would create the very trust problem this
  review is about, and a new section would push Insights and Articles further down a >9000 px mobile page).
  `<h1>` = the D2 tagline; one subline; one primary CTA ("See this week's models"). The app stays as the existing small text link
  under the scene ("Start a conversation ↗"), labelled as the operator's own product (`monetisation.md` M3).
  A collaboration-evidence section is added only when `collaboration.md` Phase B has n ≥ 20 data. Layout is `graphics-and-look.md` step 2.
- If D1 = (b): hand to track 2 (`app-fit.md`). Don't do it before the observability data exists.

## 5. Acceptance checks
- `grep -rn "GPT" app/layout.tsx` finds nothing, unless models.json contains an OpenAI model.
- `grep -rni "real benchmarks" app` finds nothing.
- `/methodology` renders the weights from `SCORING_WEIGHTS`. Changing a weight in `data/recommend.ts` changes the page
  with no other edit (verify with `npm run build` and view the page).
- `/methodology` is in `/sitemap.xml`, linked from the footer and the nav, and referenced by `/api/status` and the OpenAPI `info`.
- On the homepage, `task=coding` shows Fable 5.1 with the reason "Curator's pick for Coding & Engineering".
- The affiliation section contains text written by cmc (not a placeholder), or the page does not ship.
- `npx jest`, `npx tsc --noEmit`, `npm run build` and `./verify-all-agents.sh` all pass.

## 6. Files touched
`app/layout.tsx`, `app/methodology/page.tsx` (new), `app/sitemap.ts`, `app/page.tsx` (Footer, maybe section order),
`app/components/Nav.tsx`, `app/components/Hero.tsx` (step 5), `app/components/ModelCard.tsx` / `ModelFilter.tsx`,
`data/recommend.ts` (reason string only), `data/site.json`, `app/opengraph-image.tsx`,
`app/articles/[slug]/opengraph-image.tsx`, `app/api/status/route.ts`, `app/api/openapi.json/route.ts`,
`__tests__/data.test.ts`, `__tests__/recommend.test.ts` (reason string), `__tests__/openapi-consistency.test.ts` if the spec changes.

## 7. Not checked
- The live site's rendering of any of the above (read from source only). Fable (track 4) has the screenshots.
- Whether the GitHub repo in `site.json → githubUrl` is public. If it is, the methodology page can link straight to `data/recommend.ts`.
- Whether any real users or agents use the site or API. Nothing measures it today (Sonnet, 7g).
- LMArena confidence intervals for the six tracked models.
