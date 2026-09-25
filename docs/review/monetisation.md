# Review: Monetisation and sustainability (track 7e)

Owner: Opus 5.5 (hub session helloai-2a). Review room: `helloai-review`, 2026-09-25.
Related: `purpose.md` (neutrality and disclosure), `app-fit.md` (two paywalls, one brand), `collaboration.md` (measured signals),
`observability.md` (demand measurement), `client-ip-and-rate-limit.md` (signing-key facts), `docs/pay-loop.md`,
`docs/pro-metrics-spec.md`, `docs/pro-demand-report-spec.md`.

Tags: **[C]** confirmed by reading code or a live request, **[U]** unverified, **[O]** opinion.

---

**Scope (2026-09-25, cmc via Fable, relayed; pending cmc's direct confirmation):** this repo plans helloai.com changes only.
app.helloai.com is a *reference* for decisions. Any work in `~/git/helloai-marketplace` is listed under "Handoff" and isn't a step here.

## 1. Problem

helloai.com has a working Lightning paywall with nothing worth paying for behind it, a second payment stack in the sister app,
and no measurement of whether anyone wants either. Its trust promise ("No ads, no affiliate links") also rules out the
usual ways a directory makes money. That's a strength, but it needs a sustainability story that doesn't erode it.

## 2. Evidence

### 2.1 The paid endpoint sells the free output [C]
- `GET https://helloai.com/api/pro/recommend?task=coding` returns **402** live (checked 2026-09-25). It isn't listed in
  `/api/openapi.json` (0 matches for `/api/pro`) or in `/api/status`, which is undiscoverable on purpose (per the 2026-05-31 strategy).
- `lib/pay/pro_service.ts` calls the **same** `scoreAndRank` as the free endpoint. The only difference is `defaultLimit: null` (no row cap).
  The free `/api/recommend` allows `limit` up to 10, and there are **6** models. So today a paid call returns what a free call returns. The paid route's only difference is "no default cap of 3"
  (free route defaults to 3: `app/api/recommend/route.ts:24`; paid route slices only when `limit` is given:
  `lib/pay/pro_service.ts:97-103`. Sonnet confirmed.)
- The 2026-05-31 thesis was that `/api/pro` should gate **measured cost-to-complete** from agenteval. That artifact never landed
  (`collaboration.md` §2.1), so there's nothing premium to gate.

### 2.2 Demand is unmeasured in practice [C]
- `lib/pay/metrics.ts` writes a durable `[pro-metrics]` stdout line per pro request, and `scripts/pro_demand_report.py` exists to aggregate it.
- Nobody in this review can read production logs (Sonnet's `az webapp log download` was denied by its permission layer; `observability.md`).
  **[U]** whether any `quote` events exist since the endpoint shipped at 2.14.28.
- Since the endpoint is undiscoverable, near-zero demand would be expected whether or not the product is wanted. The experiment
  can't answer its own question. **[O]**

### 2.3 Two payment stacks under one brand [C]
- Directory: custom 402 + `X-Preimage`, an HMAC hash-linked JSONL ledger, mock backend only, and a human-gated sweep (`docs/pay-loop.md`).
  The ledger and pro-metrics files are on **ephemeral container storage** (Sonnet).
- App: owner-decided **2.5% platform fee (100-sat minimum)**, L402 direct-task endpoint first, LNbits → Phoenixd/Alby → Voltage
  (`~/git/helloai-marketplace/docs/implementation/revenue-roadmap-2026-09-15.md`, §1 decisions 1–3).
- The app's roadmap is decided, staged and persisted on Postgres. The directory's isn't.

### 2.4 Costs [U]
Not checked: Azure App Service plan cost, LLM spend for the weekly pipeline (Grok + Opus article-writer), GPU cluster
power. Without these there's no break-even target. cmc should fill in one line each.

## 3. Decisions needed (cmc)

**Status: adopted 2026-09-25.** Relayed by Fable (hub session b9) in `helloai-review` as cmc's words: "Let's go with the recommendations already shown in the table." **cmc: please confirm directly; this was not given in the Opus session.**
- M1 → money flows only through app.helloai.com.
- M2 → (a) freeze `/api/pro/recommend` to 410 (before the scoring changes).
- M3 → adopt the neutrality rules; label the app links as the operator's own product.
- M4 → the directory is funded as the marketplace's reach channel, stated openly. **The running-cost figures (§2.4) are still cmc's to supply.**

The options and reasoning are kept below for the record.


**M1. Where does money flow?** Recommended: **only through app.helloai.com.** The directory stays free and neutral, and it's the
marketplace's reach channel (which the app's launch plan already assumes; `app-fit.md` §2.5). Don't build real Lightning in this repo.

**M2. What happens to `/api/pro/recommend`?** Options:
- (a) **Freeze** (recommended): keep the code and tests, and have the route return `410 Gone` with a pointer to the app (or remove
  the route and keep `lib/pay` for reference). There's no premium content to sell, and the duplicate ledger is on ephemeral storage.
- (b) Keep it as is. It costs little, but it's misleading if anyone finds it (they'd pay for the free output).
- (c) Make it real: needs premium content first (Phase B of `collaboration.md`, or agenteval results), durable storage and a real backend.
  Not before M1 is settled.

**M3. Neutrality guardrails, written down.** Recommended rules for `/methodology` (`purpose.md` step 2):
- No payment, credit, sponsorship or referral fee affects `models.json`, `categories.json` leaders, the listing rule or `scoreAndRank`.
- Any sponsorship (if ever) is labelled and physically separate from rankings, and no sponsor can be a tracked provider.
- Links to app.helloai.com (which earns the 2.5% fee) are **disclosed as the operator's own product** wherever they appear.
  That last one applies today: the hero's app CTAs link to a revenue-earning product of the same operator. **[O]**

**M4. Sustainability target.** cmc states monthly running cost (§2.4) and whether the directory must pay for itself, or is funded
as the marketplace's marketing. Recommended: the latter, stated openly on `/methodology` ("helloai.com is funded by its operator,
who also runs app.helloai.com").

## 4. Implementation plan

### Step 1: Disclose the operator's own product (no dependency beyond D4 in `purpose.md`)
- `/methodology` (from `purpose.md` step 2) gets a "Funding" section: who pays for the site, that app.helloai.com is the operator's
  product and charges a platform fee, and the M3 rules verbatim.
- `app/components/Hero.tsx` and the nav/footer app links (`app-fit.md` step 2): add a short visible label, e.g. "our app ↗"
  or a tooltip "HelloAI Marketplace, run by the same team". Fable's track 4 owns the visuals.

### Step 2: Freeze the directory paywall (after M2 = a)
**Sequencing:** do this **before** `scoring-transparency.md` changes what `scoreAndRank` returns, so the pro-route tests don't have to move with it.
- `app/api/pro/recommend/route.ts`: return `410` with JSON `{ "error": "gone", "see": "https://app.helloai.com" }`. Keep
  `lib/pay/*` and its tests unchanged, so the work isn't lost.
- Update `__tests__/pro-route.test.ts` to expect 410. Leave `__tests__/pay/*` alone.
- `docs/pay-loop.md`: add a status line at the top: "Frozen 2026-MM-DD: payments go through app.helloai.com (see docs/review/monetisation.md)".
- Before freezing, if cmc has log access, run `make az_logs | grep '\[pro-metrics\]' | python3 scripts/pro_demand_report.py -`
  once and paste the weekly funnel into this doc. That records what the experiment showed, even if it's zero.

### Step 3: Measure the funnel that matters
- Depends on `observability.md` step 5 (`/go/app` first-party redirect). The weekly report adds one line: outbound clicks to the app.
- helloai.com side: every app link carries the `from` value defined in `observability.md` (its `/go/` redirect and handoff section); one parameter name, owned there.
- Counting what those visitors do in the app is handoff H-M1 (below). Until it exists, helloai.com can report only `redirect_requests`,
  and those aren't activations (Astra).

### Step 4 (later): Premium data, if any
Only after `collaboration.md` Phase B produces a measured per-model signal with n ≥ threshold. Even then, prefer selling it
**inside the app** (where payments, identity and durable storage already exist) and keep the directory's summary free.

## 4b. Handoff to `~/git/helloai-marketplace` (out of scope for this repo)
- **H-M1.** Count rooms created / jobs posted with the `from` value from `observability.md` (activations, not visits), and expose an aggregate to the operator.
- The app's fee, L402 and Lightning stack stay entirely in that repo (M1). Nothing in this plan changes them.

## 5. Acceptance checks
- `/methodology` has a Funding section and the M3 rules. The app links are labelled as the operator's own product.
- `curl -s -o /dev/null -w '%{http_code}' https://helloai.com/api/pro/recommend` returns `410` (after M2 = a).
- `npx jest` passes, with `pro-route.test.ts` updated and `pay/*` unchanged.
- This doc's §2.2 records the result of one `pro_demand_report.py` run, or states that nobody had log access.

## 6. Files touched
`app/methodology/page.tsx` (from `purpose.md`), `app/components/Hero.tsx`, `app/components/Nav.tsx`, `app/page.tsx` (Footer),
`app/api/pro/recommend/route.ts`, `__tests__/pro-route.test.ts`, `docs/pay-loop.md`.

## 7. Not checked
- Production `[pro-metrics]` events (no log access in this review).
- Running costs (§2.4).
- The app's revenue to date (mock payments only, per its README).
