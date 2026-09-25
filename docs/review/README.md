# helloai.com review: index of plans (2026-09-25)

Output of the `helloai-review` hub room: Opus 5.5 (2a), Fable 5.1 (b9) and Sonnet 5 (7e). Each plan is written so a cold session can execute it without the room transcript: problem, evidence, decisions for cmc, steps, tests, acceptance checks, files touched, and what was not checked.

**Read this first: no reviewer here is neutral.** Three of the reviewers are Claude models judging a site that ranks Claude models first, run by an operator whose agent fleet runs on Claude and Grok. Reviewer opinions are input. The decisions below are cmc's. Evidence tags used in the plans: **[C]** confirmed (code read, live request, or reproduced), **[U]** unverified, **[O]** opinion.

## The six findings that matter most

1. **Every social share of helloai.com has no image.** Both OG image routes return 502 in production. Root cause and a tested 3-line fix are in `graphics-and-look.md`. Lowest effort, most visible.
2. **"Unbiased" is an intent, not something a reader can verify.** One hand-set "leader" label moves Fable 5.1 from 4th to 1st for `task=coding` (reproduced on the shipped TypeScript). The frontier table is a curated pick (about one flagship per provider), not LMArena's top N, and that rule is written only inside article prose. Metadata copy names GPT (not tracked) and "real benchmarks" (not ingested). The rule also looks **unevenly applied** (per the updating agent's notes, not re-checked on arena.ai): GPT-6 Astra is held out for lacking two weeks of its own text Elo, while Opus 5.5 and Grok 4.7 are listed with a predecessor's score. That favours the two vendors whose models run the operator's pipeline. Remedy proposed: one written rule applied evenly (`purpose.md` D5, `elo-provenance.md`), not "list any specific model".
3. **We can't tell whether anyone uses the site or the API.** No analytics; the API logs only AI-flagged alerts, and the in-memory history is lost on restart. Strategy questions (agents vs humans, paid endpoint, app funnel) can't be answered from evidence yet.
4. **The two sites share a brand and an animation file, not data.** `AgentSocial.tsx` is copy-pasted between repos; the planned link where the directory feeds the marketplace (I01) is mostly unbuilt.
5. **The paid endpoint sells the free output** and can't measure demand because it is undiscoverable.
6. **The Elo numbers have no recorded provenance, and two are borrowed.** The scripted LMArena path is dead (its sources are 13 and 16 months stale and the freshness guard refuses them), so Elos are hand-curated from arena.ai. Per the updating agent's own notes, the Opus 5.5 card shows Opus 5's score and the Grok 4.7 card shows Grok 4.6's. Not re-checked on arena.ai. See `elo-provenance.md`.

## Plans

| Plan | Track | Author | Value | Effort | Needs decision | Depends on |
|---|---|---|---|---|---|---|
| [`graphics-and-look.md`](graphics-and-look.md) | 4 look | Fable | High (step 1), medium (rest) | Step 1: 30 min. Rest: days | G1 to G4, hero needs D1 | D1 for hero step |
| [`seo-and-discoverability.md`](seo-and-discoverability.md) | 7b | Fable | Medium | 1 day | S1 to S3 | OG fix first; copy fix from `purpose.md` step 1 |
| [`purpose.md`](purpose.md) | 1 + 7d | Opus | Highest (trust) | Step 1: 1 hour. Methodology page: 1 to 2 days | D1 to D5 (D4 is cmc's own words) | D5 before the page ships |
| [`observability.md`](observability.md) | 7g | Sonnet | Highest (unblocks evidence) | 1 to 2 days | 3 (where counts live, click redirect, hashed IP) | none |
| [`scoring-transparency.md`](scoring-transparency.md) | 5b | Sonnet | High | 1 day | 3 (normalization basis, 0.40 weight, output price) | Sequence after the `/api/pro` freeze (`monetisation.md` step 2), or update its tests together |
| [`claims-guard.md`](claims-guard.md) | 6 | Sonnet | Medium | 1 day | 3 (numbers in prose, listing policy N and M, vendor claims) | Copy fix (`purpose.md` step 1) and D5 |
| [`competitive-landscape.md`](competitive-landscape.md) | 7h | Astra (OpenAI GPT-6, interested party) | High (strategy) | Half a day to select and design the pilot; a few days for three briefs; a four-week observation window | H1 to H3 | Source identity repair (`elo-provenance.md`) should precede ranking polish |
| [`elo-provenance.md`](elo-provenance.md) | 6 Elo | Sonnet | High | 1 day (plus a human check of each Arena number) | 3 (borrowed-score policy, which board, retire or repair `arena.py`) | Pairs with `purpose.md` D5 and `graphics-and-look.md` G2 |
| [`client-ip-and-rate-limit.md`](client-ip-and-rate-limit.md) | 7f | Sonnet | Medium | Step 0: 10 min. Rest: 1 day | 2 (proxy hops, longer blocks) | Step 0 measurement before code |
| [`app-fit.md`](app-fit.md) | 2 | Opus | High | Days, spans two repos | A1 to A3 | A1 before steps 3 to 6; app repo steps need a separate session |
| [`monetisation.md`](monetisation.md) | 7e | Opus | Medium | Step 1 and 2: hours | M1 to M4 | D4 for disclosure text |
| [`collaboration.md`](collaboration.md) | 3 | Opus | Medium, long-term | Phase A: days. B and C: weeks | C1 to C3 | Phase B needs `app-fit.md` steps 3 and 4 |

Not covered yet: the security backlog owner actions (`docs/security-backlog.md` items 1 to 4, dated 2026-07-04, not re-verified today).

## Suggested order

**Wave 0. This week, no product decision needed**
1. OG image fix (`graphics-and-look.md` step 1, diff in `assets/og-image-display-flex.diff`). It also removes the "GPT" pill from the home OG image. Apply it **before** any tagline change to the same two files (`purpose.md` step 4), or the new copy ships into a route that still returns 502.
2. One-line label that the app links are the operator's own product (`monetisation.md` step 1, wording only; final text after D4).
3. Copy that is plainly wrong: "GPT", "real benchmarks", `ai-plugin.json` text (`purpose.md` step 1; it does not touch the OG image files).
4. Client-IP step 0 measurement (`client-ip-and-rate-limit.md`).

**Wave 1. Start measuring and start disclosing** (needs cmc's short answers)
5. Observability (`observability.md`). Everything strategic is [U] until this has run for a few weeks.
6. cmc writes D4 (affiliations) and D5 (listing rule), then the `/methodology` page (`purpose.md` step 2) and the disclosure that the app links are the operator's own product (`monetisation.md` step 1).
7. Freeze `/api/pro/recommend` to 410 (`monetisation.md` step 2, after M2).
8. Remove the stale `/concepts/agent-social` duplicate with a redirect (`app-fit.md` step 1, after A3).

**Wave 2. Make the numbers honest**
9. **Source identity repair first** (`elo-provenance.md`: exact Arena identity, no cross-version or cross-tier substitution, recorded interval and snapshot), then scoring transparency (`scoring-transparency.md`), then `claims-guard.md`. Repair of the evidence comes before polish of the ranking (Astra).
10. `llms.txt`, MCP pointer, structured data (`seo-and-discoverability.md`).
11. Elo display, de-duplicated homepage, mobile order (`graphics-and-look.md` steps 3 to 4).
12. Rate-limit and client-IP code (after step 0 findings).

**Wave 3. After D1 and A1 are decided, and after data exists**
13. One-headline hero (`graphics-and-look.md` step 2, `purpose.md` steps 4 to 5).
14. Directory ids as the shared vocabulary with the app, the app-side adapter, an AgentSocial drift check (`app-fit.md` steps 2 to 6).
15. Field reports, then measured job outcomes, then pairings (`collaboration.md`). Never before there is a sample size.
16. Design tokens (`graphics-and-look.md` step 5).

## Decisions cmc must make (all in one place)

| ID | Question | Recommendation in the plan |
|---|---|---|
| D1 | Directory first, or front door to the app? | Directory first |
| D2 | Replace "unbiased" | "transparent" |
| D3 | Keep the 0.40 weight on hand-set task labels? | Keep and disclose; revisit later |
| D4 | Affiliation statement | cmc writes it, never a placeholder |
| D5 | Listing rule for the table | One sentence in `site.json → listing_policy`, shown on `/methodology` |
| A1 to A3 | App relationship; how to handle the two AgentSocial copies; delete the concept page | Separate apps with a real data link; keep both AgentSocial copies and make drift visible; delete with a redirect |
| C1 to C3 | Show collaboration; which measured signal; transcript approval | As evidence, not ranking; job outcomes; cmc approves each transcript |
| M1 to M4 | Money flows only via the app; freeze pro; neutrality rules; running cost | Yes; freeze; adopt; state openly |
| G1 to G4 | OG scope; Elo display; card duplication; mobile order | Minimal fix; show the source interval on a model's own score, "interval not available" otherwise, borrowed scores labelled and never with an interval (rounding/tilde withdrawn after Astra's challenge); keep rows; one order |
| S1 to S3 | Keep `ai-plugin.json`; MCP point or duplicate; concept page | Keep and fix; point at the app; follow A3 |
| O1 to O3 | (observability) Where counts live; click redirect; hashed IPs | Stdout only; first-party `/go/`; daily-salted hash |
| B1 to B3 | (scoring) Normalize on all models; task weight; output price | Full set; unchanged here; out of scope |
| K1 to K3 | (claims) Numbers in prose; listing policy values; vendor claims | Registry, no numbers in prose; 14 days, votes to be set; labelled and dated |
| H1 to H3 | (competitive) Initial workload; evidence integrity (same as D5 policy, applied to every vendor); pilot success criterion | One real developer workflow; no cross-version or cross-tier substitution; four-week pilot with a stated decision |
| P1, P2 | (client IP) Trusted proxy hops; longer blocks | Measure first; keep the fixed window |
| E1 to E3 | (Elo provenance) Model without its own score; which board is "the" Elo; scripted path | Labelled and excluded from ranking (`isRated`/`unrated`), same rule as D5; text-overall only for the headline number; retire `arena.py` now, document agent-curated Elo with a recorded snapshot |

(The O, B, K and P ids are shorthand used only in this index; inside those plans the decisions are numbered 1, 2, 3.)

## Decisions taken

**2026-09-25, cmc, in the review session (Fable's, hub `helloai-review`): "Let's go with the recommendations already shown in the table."**
Every row above is adopted as recommended, as the recommendation stands in the owning plan on this date. Three qualifications:

1. **D4 and D5 are adopted as a shape, not as text.** The affiliation statement (D4) and the listing rule sentence for `site.json → listing_policy` (D5) must still be written by cmc in their own words before `/methodology` ships. No reviewer drafts either.
2. **D5 includes the borrowed-score policy** merged into it by `purpose.md` and `elo-provenance.md` decision 1: borrowed scores are labelled and excluded from ranking (`isRated` false, returned in `unrated`). Consequence, stated in `purpose.md` D5: Opus 5.5 and Grok 4.7 show as unranked today until they have an Arena score of their own.
3. **G2 is adopted in its revised form** (this table's row was updated to match): intervals from the source when the score is the model's own, otherwise a visible "not available" note, never a rounded or tilde figure.

Execution follows the suggested order above. Wave 0 needs nothing further from cmc.

**Scope clarification, cmc, 2026-09-25 (same session):** "For this repo let's just focus on helloai.com related changes, and leave any work for app.helloai.com for `~/git/helloai-marketplace`." app.helloai.com is a reference for decisions about helloai.com, not a work target of this review. Plans with app-side steps (`app-fit.md`, `collaboration.md` Phase B, `monetisation.md`, `seo-and-discoverability.md` step 3.0) keep only their helloai.com side here; app-side steps are listed as a handoff for the marketplace repo, not planned or executed from this repo.

## Cross-plan items (agreed in the room)

- **One `METHODOLOGY_URL` constant** in `data/index.ts`, imported by `/api/status`, OpenAPI, `llms.txt` and the footer, so the four never disagree (`purpose.md` step 2, `seo-and-discoverability.md` step 2).
- **Hero (settled in the room):** keep the AgentSocial scene as the hero visual and change only the words: h1 = the D2 tagline, one subline, one primary CTA. The app stays as the small link under the scene, labelled as the operator's product (`purpose.md` steps 4 to 5, `graphics-and-look.md` step 2). An evidence section only arrives with `collaboration.md` Phase B at n >= 20.
- **AgentSocial** stays in both repos (directory hero and app welcome); `app-fit.md` step 6 adds cross-reference comments and a whitespace-stripped diff command so drift is visible. Scene placement no longer depends on A2.
- **MCP URL (checked live by Fable, 2026-09-25):** the app's MCP endpoint is tenant-scoped behind a per-user token. `GET /api/v1/mcp` returns 405, a JSON-RPC `POST` returns 404, `/mcp` and `/.well-known/mcp.json` return 404. So there is no anonymous MCP endpoint to advertise from helloai.com. `mcp.json` should point at a docs page explaining how to get a tenant URL, not at the bare endpoint (`seo-and-discoverability.md` step 3, step 0). App-side task: publish a public MCP discovery page (`app-fit.md`).
- **Redirect code** for `/concepts/agent-social`: one permanent redirect in `next.config.mjs` (`app-fit.md` step 1 and `seo-and-discoverability.md` S3 describe the same change; do it once).
- **"Why this rank" line:** lives in `ModelFilter` and reaches `ModelCard` as a prop (`scoring-transparency.md` step 4, `graphics-and-look.md` step 3).

## Known gaps in this review

- Production logs were not read (permission denied), so **no traffic numbers exist**. Agent usage is unmeasured.
- The 77% ARC-AGI-2 figure for Gemini has no source and was not verified.
- Whether Azure overwrites `X-Forwarded-For`, and whether production sets `LEDGER_SIGNING_KEY`, are untested [U].
- The app's MCP connector (`claude.ai HelloAi-MCP-Server`, tenant URL `app.helloai.com/api/v1/mcp/t/<token>`) failed to connect at session start in both the Opus and Sonnet sessions (405, `CLIENT_HTTP_NOT_IMPLEMENTED`). Probably an app-side bug, separate from discovery. [U] whether it works from Claude Code's own `claude mcp add --transport http` client. Not investigated further.
- No Lighthouse run; screenshots were taken with headless Chromium against the live site on 2026-09-25.
- `docs/security-backlog.md` items were not re-verified today.
- Competitive landscape was reviewed by Astra (`competitive-landscape.md`, an interested party, primary sources dated 2026-09-25). Its URLs were not independently re-fetched by the other reviewers.

## Housekeeping

- Nothing in `docs/review/` is committed yet. The working tree also holds an unrelated uncommitted `Makefile` change that belongs to cmc; do not include it in a review commit.
- Plans edit `.claude/` files only where noted. Any change to agent frontmatter needs the integrity hash recomputed (`CLAUDE.md`).
