# Review: competitive landscape and evidence quality (track 7h)

Author: Astra, OpenAI GPT-6 via Codex; hub address `trading-team@workstation`.
Date: 2026-09-25. Status: review and implementation plan, no product changes.

Disclosure: I read the earlier room discussion before forming this review. I am an OpenAI model reviewing a directory whose articles discuss excluding Astra. My views on listing and ranking are interested-party input, just as the Claude reviewers' views are. This document proposes no particular vendor's inclusion or promotion. cmc owns those decisions.

Evidence: **[C]** inspected source, primary documentation, or reproduced locally; **[U]** not verified; **[O]** recommendation or interpretation. External pages were retrieved on 2026-09-25; their observation dates can be older. Documented competitor capabilities were not exercised through paid/authenticated calls.

## 1. Competitive finding

**[O] A callable model directory and transparent methodology are useful foundations, but neither establishes a distinctive product.** The opportunity to test is a small set of practical, evidenced decisions for a defined workload, with reasons to choose an alternative and an honest statement when evidence is insufficient.

| Product | Verified offering | Implication for helloai [O] |
|---|---|---|
| Arena | Human-preference rankings; score intervals, rank spreads, votes and category views. [Ranking method](https://arena.ai/blog/ranking-method), [text board](https://arena.ai/leaderboard/text). | Link to the underlying preference evidence; explain the additional editorial judgment. Reprinting a smaller table adds little by itself. |
| Artificial Analysis | A documented model-data API exposing evaluations, pricing, speed and latency; access requires an account/key and attribution. [API reference](https://artificialanalysis.ai/api-reference). | Machine-readable discovery and measured performance already have established alternatives. Local hardware measurements can add specificity, but are not a uniquely measured approach. |
| OpenRouter | A model catalogue with context, price and use-case filters, plus benchmark-based sorting; Auto Router performs model selection through its completion API. [Catalogue](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties), [Auto Router](https://openrouter.ai/docs/guides/routing/routers/auto-router). Its [rankings](https://openrouter.ai/rankings) count tokens processed. | Discovery and selection are already available near execution. Usage is evidence of adoption, not proof of task quality. helloai needs a reason for users to consult another service. |

This is a scoped comparison of documented capabilities, not a comprehensive competitor audit. **[U]** Relative traffic, satisfaction, willingness to pay, all competitors' listing policies, and whether nobody else publishes comparable collaboration reports.

“Transparent” is defensible only with the promised disclosures. It describes a standard to meet, rather than the reason to choose this site. Suggested positioning to test: **“Choose an AI for your task, with the evidence and trade-offs shown.”** [O]

## 2. Data integrity should precede ranking polish

### 2.1 A newer model can inherit an older model's score [C]

`scripts/arena.py` maps stable directory family IDs to multiple Arena names. The `claude` list starts with Opus 5.5 variants and ends with Opus 4.5. `gemini` includes both Pro and Flash. `_resolve_model_id` takes the first available alias. `fetch_scores` returns only the directory ID and numeric score, discarding the source model name. `scripts/update_leaderboard.py:update_models` then updates the current listing's Elo.

Reproduced with the shipped resolver, without network calls or data writes:

```python
import sys
sys.path.insert(0, 'scripts')
import arena
old = 'claude-opus-4-5'
entry = arena._resolve_model_id(
    'claude', {old: arena._ArenaEntry(old, 1400)}
)
print(entry)
# _ArenaEntry(name='claude-opus-4-5', score=1400, votes=0)
```

**[U]** This fixture does not prove that the scripted updater caused a particular production value. It proves that the updater permits that substitution. Exact string matching is insufficient when the alias list contains different models.

Follow-up **[C, repository record]**: I read `.claude/agent-memory/leaderboard-updater.md`. Its September 23 entry explicitly records keeping Opus 5's 1493 when renaming the listing to Opus 5.5, and Grok 4.6's 1456 when renaming it to Grok 4.7. This corroborates predecessor borrowing in the documented manual update, separately from the reproduced scripted risk. I did not reconstruct deployment history.

### 2.2 Override precedence differs from the review's initial description [C]

`update_models` uses: explicit `manual_overrides` for this invocation, otherwise fetched score, otherwise retain existing value. Stored curated values are not permanently protected from a subsequent successful fetch. `arena.py` rejects stale sources, which can preserve existing values; that is distinct from a persistent override policy. Correct `CLAUDE.md` and methodology wording to describe the actual behavior, unless a separately specified policy changes it.

Category provenance also needs care: `update_category_leaders` can select leaders using overall Elo order among curator-labelled strengths and has provider-specific keyword fallbacks. The method is therefore a mixture of editorial inputs and automation. Label attribution alone does not describe the full path.

### 2.3 Source uncertainty and date [C, primary source]

The [Arena text board](https://arena.ai/leaderboard/text), fetched September 25, displays **September 13, 2026** as its board date. Selected exact source rows:

| Source model | Score and interval as displayed |
|---|---|
| `claude-fable-5.1-max` | 1498 ±8 |
| `muse-spark-1.3-max` | 1493 ±9 |
| `gemini-3.1-pro-preview` | 1487 ±3 |
| `qwen3.8-max` | 1481 ±6 |

The first two intervals overlap. This supports caution about their five-point score gap; it does not establish equivalence or a universal ten-point significance rule. I did not verify exact Opus 5.5/Grok 4.7 intervals. Do not transplant intervals from older rows with matching scores. Fetch date, board date, model version and inference configuration all matter.

## 3. Corrections to the existing plans

1. **Scoring (`scoring-transparency.md`, `purpose.md`).** Full-set normalization stabilizes scores when only hard filters change. It does not make different tasks or future data snapshots comparable. Pin scoring version, a content-based snapshot identifier covering models and categories, and resolved category/weights. Describe scores as ordering aids under that specific configuration.
2. **Uncertainty (`purpose.md`, `graphics-and-look.md`).** Remove the blanket “under ~10 Elo is noise” assertion. A tilde or rounded number changes presentation, not uncertainty. Use intervals for the exact source record, or say unavailable.
3. **Collaboration (`collaboration.md`).** Twenty jobs can be an editorial display gate, not a threshold that establishes superior performance. For illustration, 18/20 passes gives 90%, with a calculated 95% Wilson interval of **69.9%–97.2%**, assuming independent Bernoulli trials. [NIST method](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm). Marketplace task selection, repeat operators, verifier choice and self-reported identities remain confounders at any count. Show descriptive outcomes with denominators, failures, pending/excluded counts and dates. Comparative collaboration claims need matched tasks, a single-model baseline, comparable budgets, and a declared analysis; intervals alone cannot correct a biased sample.
4. **Observability (`observability.md`).** Generic `undici`, `axios` and `node-fetch` clients do not identify autonomous agents. Keep unknown/programmatic clients separate from declared agent clients, and label declarations as unverified. Redirect requests can include crawlers, previews and retries; they are not confirmed clicks or completed activation. If app activation is the decision metric, the app must report that event under an agreed attribution definition. Until then, say it is unmeasured.
5. **Priorities (`README.md`).** Keep the OG repair early. Promote model/source identity and provenance ahead of “make the numbers honest” visual work. Treat telemetry as descriptive evidence, not a prerequisite to making any provisional product decision. Do not ask cmc to settle every formatting and naming detail before implementation can start.

## 4. Decisions for cmc

Decision status (2026-09-25): Fable relayed cmc's instruction in room message 286: “Let's go with the recommendations already shown in the table.” H1–H3 are recorded as adopted on that basis; the instruction was received through the room, not directly in this session. The exact pilot workload and success criterion remain to be specified. This records the decision without requesting duplicate confirmation.

- **H1 — Initial audience/workload.** Recommended: test one developer workflow the operator can supply reproducible evidence for. Select the workload before expanding the catalogue or adding more discovery surfaces. [O]
- **H2 — Evidence integrity.** Recommended: no cross-generation or product-tier score substitution; keep an exact source identity and explicit stale/missing state. This applies equally to every vendor. [O]
- **H3 — Success criterion.** Recommended: an initial four-week pilot with a stated decision to continue, revise or stop. Agree a modest evidence target in advance; small participant counts provide qualitative direction, not market validation. [O]

## 5. Implementation sequence for a cold session

### A. Preserve model identity and provenance (high priority)

Implementation owner: `elo-provenance.md` (Sonnet, track 6). The following are requirements for that plan, not a parallel implementation. If borrowed scores are excluded from ranking, implement that exclusion in the scoring path and normalization population; a badge or boolean alone does not exclude them. Missing-score ordering and eligibility must be explicit and tested.

The adopted E3 recommendation retires the stale scripted fetch path for now and records agent-curated observations. Consequently, the fetcher repair steps below are conditional on retaining or reviving that path; they do not require rebuilding a retired component. Identity, provenance, missing-data and ranking requirements apply to the active curated path immediately when implemented.

1. Read `scripts/arena.py`, `scripts/update_leaderboard.py`, `scripts/test_arena.py`, `data/models.json`, `data/types.ts` and their consumers. Identify the exact current upstream model/configuration each listing represents. Do not infer equivalence from similar names or equal scores.
2. Restrict active aliases to verified spellings of that model/configuration. Keep historical mappings separate for historical data. Missing current records must not fall through to previous generations or different tiers.
3. Carry a structured observation through fetching and updating: source URL/type, board, upstream model ID/configuration, source date, retrieval time, score, optional interval/votes, and explicit status. Carry manual override reason, date and author separately. Unknown fields remain unknown; do not manufacture metadata for old values.
4. Decide the internal schema in conjunction with `claims-guard.md`. A provenance sidecar keyed by directory ID is one incremental option. Preserve stable family IDs needed by `app-fit.md`, while treating model version and measurement identity as separate fields. Validate mismatches and missing entries.
5. Keep last-known data only with visible status. A newly named model cannot inherit the previous model's last-known value. If the current numeric-only schema cannot express missing evidence, stage a documented schema/API migration before enabling those updates. Do not silently coerce missing values to zero.
6. Update API types/OpenAPI and methodology together. Any public nullable score or eligibility change needs documented caller behavior and coverage. Correct the current override description; do not implement permanent pinning accidentally.

Acceptance: fixtures containing only old Opus or Flash records cannot update the current Opus/Pro listing; legitimate spelling aliases still work; per-run manual override wins; valid current fetch wins when no explicit override exists; source/model/date survive to the exposed record; unavailable intervals remain unavailable. Test the existing Python suite and affected TypeScript/API contracts. No live data refresh is needed to prove these properties.

### B. Finish the corrections through their existing owners

Apply section 3 to the scoring, methodology, graphics, collaboration and observability plans. Implement those changes through their existing tracks. Add meaningful checks for score invariance under filters with a fixed snapshot/task; snapshot changes when categories change; unknown clients remain unknown; outcome displays carry denominators. Avoid duplicated implementations in this track.

### C. Test the proposed product value (after H1/H3)

1. Produce three dated decision briefs for the chosen workflow using the existing article pipeline. Each states the task, constraints, exact models/configurations, evidence, recommendation, strongest alternative, and when to abstain. Reuse the existing article schema unless a concrete rendering requirement needs a new field.
2. Include complete workload cost assumptions where relevant: input and output tokens, repeats/retries and tool/runtime costs. Avoid describing input price alone as workload cost efficiency.
3. Ask a small consented group to use the briefs for real decisions and record what was missing or changed their choice. This plan does not authorize contacting people or publishing transcripts; those actions follow cmc's instructions and the existing publication process.
4. Review the evidence after the agreed period. Separate request volume from verified use and app activation. Publish the operator's continue/revise/stop decision internally before expanding scope.

Acceptance: each brief has traceable evidence and limitations, three alternatives are not merely the same generic leaderboard rewritten, and the pilot ends with a recorded decision. No claim of unique market position or statistical superiority follows from the pilot alone.

## 6. Files and remaining limits

Planned integrity work: `scripts/arena.py`, `scripts/update_leaderboard.py`, `scripts/test_arena.py`, data/provenance schema and loaders, affected model/API types and OpenAPI, relevant tests, `CLAUDE.md` and methodology. Pilot: `data/articles.json` through the normal pipeline, plus an internal evidence record. Confirm exact schema and consumers before editing.

This session changed only this review document. The `Makefile` change is unrelated. No commits, deployments, paid calls, app database reads or benchmark runs were made. Existing reviewers' claimed live-site failures were not re-tested here. The local resolver fixture and Wilson calculation were run; historical update causes and actual user demand remain unverified.
