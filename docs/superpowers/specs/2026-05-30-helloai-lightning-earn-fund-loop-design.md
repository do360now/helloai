# helloai Lightning Earn→Verify→Fund Loop — v1 Design

**Date:** 2026-05-30
**Status:** Approved (design) — pending spec review
**Repo:** `helloai` (TS / Next.js 16)
**Author:** brainstormed with Claude

---

## 1. Purpose

Prove, end-to-end and with **zero real-money risk**, the core mechanic of an AI-agent
economy loop: an autonomous buyer pays for a service, the payment is **cryptographically
verifiable**, and the verified proceeds flow toward Bitcoin accumulation **only through an
explicit human approval**.

This is a Proof of Concept. It deliberately optimizes for proving the *trust mechanics*
(verification + human-gated agency) over revenue scale. The earn engine is intentionally
tiny; the verification ledger and funding gate are the point.

The design directly embodies the thesis that the scarce resources in an agent economy are
**trust/verification** and **human judgment** — not information or execution. The agent
*proposes* irreversible actions; the human *disposes*.

## 2. Scope

### In scope (v1)
- A paid premium API endpoint on helloai guarded by HTTP `402 Payment Required`.
- Lightning-style invoice issuance + settlement check behind a `LightningBackend` interface.
- A **`MockLightningBackend`** (deterministic, in-memory) as the v1 implementation.
- A tamper-evident, hash-linked, signed **verification ledger** of earnings.
- A **funding gate** that generates sweep *proposals* and executes them **only on explicit
  human approval** (mock sweep in v1).
- A **buyer-agent demo script** that performs the full round trip (and doubles as an
  integration test).
- Full unit + integration test coverage.

### Out of scope (explicitly — later sub-projects)
- A real Lightning node (Core Lightning / LND), real channels, mainnet.
- Connecting the funding gate to the real BTC accumulation wallet or the
  `CMC_KRAKEN_BIT_TRADE` / `CMC_BITVAVO_BIT_TRADE` repos.
- API keys, per-caller quotas, rate limiting, multi-tenant billing.
- Fiat payment rails.

### Hard safety lines (non-negotiable for every version)
- No code path auto-executes a real-value transfer. The sweep is reachable **only** from an
  explicit, separate human action. A test asserts this.
- Mainnet is gated behind a `MAINNET_ENABLED=false` flag that v1 never sets true.

## 3. Architecture

```
   [buyer agent]                    helloai (Next.js)                 LightningBackend
   ─────────────                    ─────────────────                 ────────────────
   GET /api/pro/recommend  ───────▶  402 Payment Required
                                     + BOLT11 invoice  ◀──────────────  createInvoice()
   pay invoice  ───────────────────────────────────────────────────▶  (settles)
   GET .../recommend (+X-Preimage) ▶ verify settlement  ◀────────────  lookupInvoice()
                                     sha256(preimage)==payment_hash?
                                     amount matches?
                                     append SIGNED ledger entry
                                     serve premium payload + receipt
                                          │
                                          ▼
                                   ─── FUNDING GATE ───
                                   unswept sats ≥ threshold?
                                   write proposal {amount, dest, range, id}
                                   surface to human  ──▶  approve <id> (human)
                                                          └─▶ paySweep()  [mock]
                                                              mark range swept
```

Everything in helloai codes against the `LightningBackend` interface; no module references a
specific node implementation.

## 4. Components

Each component has one job, a defined interface, and is testable in isolation.

### 4.1 `LightningBackend` interface
**Job:** abstract the payment substrate so the loop is node-agnostic.

```ts
interface Invoice { bolt11: string; paymentHash: string; amountSats: number; expiresAt: number; }
interface InvoiceStatus { settled: boolean; preimage?: string; amountPaidSats?: number; settledAt?: number; }

interface LightningBackend {
  createInvoice(amountSats: number, memo: string, expirySecs: number): Promise<Invoice>;
  lookupInvoice(paymentHash: string): Promise<InvoiceStatus>;
  getBalanceSats(): Promise<number>;
  paySweep(onchainAddress: string, amountSats: number): Promise<{ txid: string }>;
}
```

**`MockLightningBackend` (v1):** in-memory map of invoices. `createInvoice` generates a random
32-byte preimage, sets `paymentHash = sha256(preimage)`, returns a synthetic `bolt11` string.
A test/demo helper `settle(paymentHash)` marks it paid and exposes the preimage (simulating a
paying counterparty). `paySweep` records a simulated txid and decrements balance. Deterministic
under a seeded RNG for tests.

**Depends on:** nothing (pure, in-process). Later `CoreLightningBackend` depends on a CLNRest
endpoint.

### 4.2 Premium endpoint — `GET /api/pro/recommend`
**Job:** sell an enriched recommendation payload, guarded by 402.

- **Premium payload:** full ranked model list with scores + rationale (vs. the free
  `/api/recommend` top-3). Reuses existing `scoreAndRank` from `@/data/recommend`.
- **Unpaid request** (no/invalid `X-Preimage`): respond `402` with JSON
  `{ invoice: bolt11, payment_hash, amount_sats, quote_id, expires_at }`. Persist a pending
  quote: `quote_id → { payment_hash, endpoint, params, amount_sats, created_at }`.
- **Paid request** (`X-Preimage: <hex>` header, optionally with `quote_id`): look up the quote
  / invoice, call `lookupInvoice`, then verify **all** of: invoice settled,
  `sha256(preimage) == payment_hash`, `amountPaidSats >= amount_sats`, not expired. On success:
  write a ledger entry (§4.3), then return the premium payload plus an `X-Receipt` header
  echoing `{ seq, payment_hash, amount_sats }`. On any failure: `402` (re-quote) or `409`.

**Depends on:** `LightningBackend`, ledger, quote store.

### 4.3 Verification ledger
**Job:** be the tamper-evident record of earnings — the trust artifact.

- **Storage:** append-only JSONL file (`data/ledger/earnings.jsonl`) for v1 (simple, inspectable,
  diffable). SQLite is a later option if volume demands it.
- **Entry:**
  `{ seq, ts, endpoint, caller_id, payment_hash, preimage, amount_sats, prev_hash, sig }`
  where `prev_hash = sha256(canonical(previous_entry))` (hash-linked chain) and
  `sig = HMAC-SHA256(LEDGER_SIGNING_KEY, canonical(entry_without_sig))`.
- **`verifyLedger()`:** recompute the hash chain from genesis, re-check every
  `sha256(preimage) == payment_hash`, re-verify every `sig`, and reconcile
  `sum(amount_sats unswept) == getBalanceSats()` (within the mock's accounting). Returns a
  structured report; any break is located precisely.

**Depends on:** filesystem, signing key, `LightningBackend.getBalanceSats`.

### 4.4 Funding gate
**Job:** convert verified, accumulated sats into a BTC-accumulation transfer — **human-gated**.

- **Proposal generation** (`proposeFunding()`): if `unswept_sats ≥ FUNDING_THRESHOLD_SATS`,
  write a proposal `{ proposal_id, amount_sats, destination, ledger_range: [from_seq, to_seq],
  created_at, status: "pending" }` to `data/ledger/proposals.jsonl` and surface it (stdout +
  file; notification hook later). **Does not execute.**
- **Approval** (`approveFunding(proposal_id)`): a *separate, human-initiated* command. Loads the
  proposal, re-runs `verifyLedger()` over the covered range, enforces caps
  (`amount_sats ≤ MAX_SWEEP_SATS`, `MAINNET_ENABLED` respected), calls
  `paySweep(destination, amount_sats)`, then marks the proposal `executed` and the ledger range
  swept. In v1 `destination` is a placeholder/regtest address and the sweep is simulated.
- **Guarantee:** `paySweep` is called from exactly one place — `approveFunding` — and there is
  no scheduler/loop that calls `approveFunding`. A test asserts no auto-execution path exists.

**Depends on:** ledger, `LightningBackend.paySweep`, config caps.

### 4.5 Buyer-agent demo
**Job:** prove the earn+verify round trip automatically; serve as integration test.

A script (`scripts/buyer-agent.ts`) that, against a running dev server: GETs the premium
endpoint, receives `402`, settles the invoice via the backend, retries with `X-Preimage`,
and asserts a `200` premium payload + `X-Receipt`. This is the "paying agent" — the role Claude
can occupy in a live demo.

### 4.6 Config & safety rails
Env-driven (`.env`): `LN_BACKEND=mock`, `PRO_PRICE_SATS`, `FUNDING_THRESHOLD_SATS`,
`MAX_SWEEP_SATS`, `LEDGER_SIGNING_KEY`, `MAINNET_ENABLED=false`. Sane caps enforced centrally.

## 5. Data flow

1. Buyer GETs `/api/pro/recommend` → server issues invoice, stores quote, returns `402`.
2. Buyer pays (mock settle) → preimage now exists.
3. Buyer re-GETs with `X-Preimage` → server verifies settlement + preimage + amount → appends
   signed, hash-linked ledger entry → returns premium payload + receipt.
4. `proposeFunding()` (manual or cron-able) sees threshold crossed → writes a pending proposal,
   surfaces it.
5. Human runs `approveFunding(id)` → ledger re-verified → `paySweep` (mock) → proposal executed,
   ledger range marked swept.

## 6. Error handling

| Condition | Response |
|---|---|
| No/invalid preimage | `402` with fresh invoice |
| Preimage doesn't hash to payment_hash | `402` (reject, re-quote), log anomaly |
| Underpaid / wrong amount | `402` (reject), log anomaly |
| Invoice expired | `402` with fresh invoice |
| Quote not found | `409` |
| Ledger chain/sig broken at `verifyLedger` | hard fail; block any funding approval |
| Proposal amount > `MAX_SWEEP_SATS` | refuse to generate/approve |
| `MAINNET_ENABLED` true in v1 | refuse to start (v1 invariant) |

## 7. Testing

- **Unit:** invoice issuance; 402 contract shape; preimage verification (accept valid; reject
  wrong preimage, wrong amount, expired); ledger append + hash-chain integrity + tamper
  detection (mutate an entry → `verifyLedger` localizes the break); signature verification;
  funding-gate threshold logic; **assertion that execution requires approval and no
  auto-execution path exists**; cap enforcement.
- **Integration:** buyer-agent round trip end-to-end against the dev server.
- Conventions follow the existing helloai Jest setup.

## 8. Roadmap (post-v1 sub-projects, each its own spec)

1. **`CoreLightningBackend`** — Core Lightning backed by the existing full bitcoind, regtest →
   signet → mainnet. Same interface; the loop code is unchanged.
2. **Real funding gate** — sweep destination = a real accumulation address; integrate with the
   BTC stack the human controls. Approval surfaced via a real notification + signed approval.
3. **Earn engine scale-up** — pricing/curation (Claude as analyst), more premium endpoints,
   per-caller API keys + quotas.

## 9. Where the human and the agent fit

- **Claude:** builds the system; can act as pricing/curation analyst and as the demo buyer
  agent. Has **no** independent spend authority over real value at any version.
- **Human (you):** sets policy (price, thresholds, caps), reviews proposals, and is the sole
  party who can approve an irreversible transfer. Sovereignty stays at the top of the stack.
