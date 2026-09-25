# Plan: a drift guard for hand-written claims (review track 6)

**Author:** Sonnet 5 (helloai-7e), review room `helloai-review`, 2026-09-25
**Executor:** Sonnet from a cold session. **Status:** PLAN, nothing implemented.
**Scope split with `docs/review/purpose.md`:** that plan fixes today's wrong copy (the "GPT" and "real benchmarks" text in `app/layout.tsx`). This plan only adds the guard that stops the same class of error coming back. Do not edit the copy here.

## Problem

Elo is the only number the site ingests (scripts/arena.py). Everything else that reads like a fact is hand-written prose that no script or test checks. Found on 2026-09-25:

- `data/models.json` line 59, Gemini desc: "Scored 77% on ARC-AGI-2 — double its predecessor". No source, no date, no check. CLAUDE.md already lists this as an open question (ARC-AGI). `data/categories.json` line 19 also names "GPQA and ARC-AGI subsets".
- `app/layout.tsx` lines 22, 24, 39, 45 name **GPT** in the description, keywords, OpenGraph and Twitter copy, and say "real benchmarks". `models.json` tracks no GPT model. (Fixing this copy belongs to `purpose.md`.)
- `data/articles.json` discusses GPT-6 Astra, which the site says it cannot list until it has two weeks of text Elo ("helloai still waits on two weeks of text Elo before it can take a slot", article dated 2026-09-03..13). So the rule "a model enters the table only after two weeks of Elo" exists only inside prose. It is not written in code, docs, or any page a reader can see. [C, text in articles.json]
- `data/articles.json` quotes vendor benchmark figures (Terminal-Bench, Artificial Analysis index). Those appear in articles, which is fine editorially, but nothing ties a quoted number to a source URL or a date.

`data/test` currently enforces structure and that every model appears in some article (`__tests__/data.test.ts`). It cannot notice a stale or unsourced claim.

## Decision needed from cmc

> **Decision status:** on 2026-09-25 the recommended option for each decision below was reported as adopted by cmc ("Let's go with the recommendations already shown in the table"). This was relayed by Fable from cmc's message in its own session; the Sonnet session has not received it from cmc directly. Treat as adopted, pending cmc's confirmation. See `README.md`, "Decisions taken". D4/D5-style texts that cmc must write are not drafted here.


1. Which claims are allowed in `desc`/`insight` at all? Recommended: **no benchmark numbers in `models.json` desc or `categories.json` insight.** Numbers live in one registry (below) and are rendered from it. Alternative: keep prose numbers but require each to be registered.
2. Write the **listing rule** ("a model is listed after N days of Elo, with at least M votes") in one place and link it from the future methodology page. Someone must decide N and M (the articles imply 14 days). Recommended: put it in `data/site.json` as `listing_policy` so code, tests and the page read the same value.
3. Is a vendor-reported number ever acceptable as a headline claim? Recommended: only if labelled "vendor-reported" and dated.

## Design

### 1. `data/claims.json` (new registry)

```json
[
  {
    "id": "gemini-arc-agi-2",
    "text": "77% on ARC-AGI-2",
    "subject": "Gemini 3.1 Pro",
    "kind": "vendor-reported | independent | first-party",
    "source_url": "https://…",
    "as_of": "2026-09-01",
    "checked_at": "2026-09-23"
  }
]
```

`kind: first-party` is reserved for numbers with a `bench_source` in `open_weight_models.json` (already guarded by `scripts/check_cluster_bench.py`). Do not duplicate those here.

### 2. Jest guard — `__tests__/claims.test.ts`

Deterministic, no network:

- **Registered numbers:** scan `models.json` `desc`, `categories.json` `insight` for the regex `\b\d+(\.\d+)?\s?%` and for benchmark names in an allow-list (`ARC-AGI`, `GPQA`, `SWE-bench`, `Terminal-Bench`, `MMLU`, `HLE`, `AIME`). Each hit must match a `claims.json` entry's `text` (substring) for the same subject. Unregistered hit → failure with the file, model and matched text.
- **Freshness:** `checked_at` older than 60 days → failure (configurable constant; 30 days for `vendor-reported`).
- **Source present:** every claim has `source_url` (https) and `as_of`.
- **Tracked-name check:** scan `app/layout.tsx` string literals and `public/.well-known/ai-plugin.json` for model-family words from a list (`GPT`, `Claude`, `Gemini`, `Grok`, `Llama`, `Qwen`, `Muse`, `Mistral`, `DeepSeek`). Each named family must correspond to at least one model in `models.json` whose `name` or `provider` contains it, or be listed in an explicit `EXTERNAL_MENTIONS` allow-list inside the test with a comment saying why. Currently fails on GPT: **that failure is the point**; the test should ship after `purpose.md` step 1 fixes the copy, or ship with GPT temporarily in `EXTERNAL_MENTIONS` and a TODO pointing at that step.
- **Listing policy visible:** `site.json` has `listing_policy` with numeric `min_days` and `min_votes`.

### 3. Python drift reporter — `scripts/check_claims.py`

Same convention as `check_cluster_bench.py`: `--ok` always exits 0; exits 1 on drift by default; missing files never crash the weekly run. It prints claims past their freshness limit and claim-like text found in the data files but absent from the registry. Wire it into the weekly-update skill next to the cluster-bench guard (`.claude/skills/weekly-update/SKILL.md`, not a pipeline agent file, so `./verify-all-agents.sh` hashes stay valid; check that first).

### 4. Rendering (optional, after decision 1)

If numbers move out of prose, render them in `ModelCard` from `claims.json` with a small "vendor-reported, as of <date>" tag, so a reader sees the provenance. Coordinate wording with `docs/review/purpose.md` (methodology page) and Fable's design plan; do not invent new colors.

### 5. Listing policy in code

Add `listing_policy` to `data/site.json` and `data/types.ts`. `scripts/arena.py` or `leaderboard-updater` already applies the rule in practice; add the constants there so the article-generating pipeline and the site quote the same number. Update the agent spec text only if the agent file must cite it, and then recompute the integrity hash per CLAUDE.md.

## Tests and acceptance

1. New tests fail on today's data (Gemini's 77% is unregistered; GPT appears in metadata), then pass after entries are added and the copy is fixed.
2. `npx jest`, `npx tsc --noEmit`, `npm run build`, `./verify-all-agents.sh`.
3. `python scripts/check_claims.py` prints a clean report on the final data; `python -m pytest scripts/test_check_claims.py` covers the freshness and unregistered-text paths with fixture files.
4. Manually confirm the Gemini claim's source before registering it. **This plan did not verify the 77% figure.** The entry's `checked_at` must be the date someone actually opened the source.

## Files touched

New: `data/claims.json`, `__tests__/claims.test.ts`, `scripts/check_claims.py`, `scripts/test_check_claims.py`. Edited: `data/site.json`, `data/types.ts`, `data/index.ts` (loader), optionally `app/components/ModelCard.tsx`, `.claude/skills/weekly-update/SKILL.md`, `CLAUDE.md` (replace the ARC-AGI open-question paragraph with a pointer here once decided).

## Risks and unknowns

- Regex scanning finds only what it is told to look for. A claim phrased without a percent or a listed benchmark name passes. The guard reduces drift; it does not prove truth.
- The 60/30-day limits are guesses. Adjust after the first month of weekly runs.
- Editing `.claude/` files triggers the integrity-hash rule in CLAUDE.md. Prefer the skill file; only change agent frontmatter when unavoidable.
- The listing policy numbers (`min_days`, `min_votes`) are a product decision, not mine; the article text suggests 14 days but does not state a vote minimum.
