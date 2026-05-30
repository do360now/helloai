# Pay Loop (v1, mock Lightning)

A proof-of-concept earn→verify→fund loop on a mock Lightning backend. No mainnet,
no real wallet, no auto-execution of value transfers.

## Flow
1. An agent calls `GET /api/pro/recommend` with no payment → `402` + a (mock) Lightning invoice.
2. The agent pays; the preimage is the receipt.
3. The agent retries with header `X-Preimage: <64-hex>` → `200` premium payload + an
   `X-Receipt` header. The payment is recorded in a tamper-evident, hash-linked, HMAC-signed
   ledger (`data/ledger/earnings.jsonl`).
4. When unswept earnings reach `FUNDING_THRESHOLD_SATS`, `proposeFunding()` writes a pending
   proposal. **It never moves funds.**
5. A human runs `approveFunding(proposalId)` — the only path that calls `paySweep`. It
   re-verifies the ledger, enforces `MAX_SWEEP_SATS`, refuses if `MAINNET_ENABLED=true`, then
   records the sweep (`data/ledger/sweeps.jsonl`).

## Config (env)
| Var | Default | Meaning |
|---|---|---|
| `LN_BACKEND` | `mock` | Backend implementation (only `mock` in v1) |
| `PRO_PRICE_SATS` | `100` | Price per premium call |
| `FUNDING_THRESHOLD_SATS` | `1000` | Earnings needed before a sweep is proposed |
| `MAX_SWEEP_SATS` | `100000` | Hard cap on a single sweep |
| `LEDGER_SIGNING_KEY` | `dev-insecure-key-change-me` | HMAC key for ledger signatures |
| `LEDGER_DIR` | `data/ledger` | Where ledger files live (git-ignored) |
| `MAINNET_ENABLED` | `false` | v1 invariant: must stay false |

## Tests
`npx jest __tests__/pay` — unit + the end-to-end loop integration test.

## Hardening backlog (before mainnet / before any concurrent or networked exposure)
These are deliberately OUT OF SCOPE for the v1 mock POC and were surfaced during code review.
They must be addressed before a real Lightning backend, before `approveFunding` is reachable
from any concurrent surface (API route / webhook / cron), or before `MAINNET_ENABLED=true`:

- **Funding concurrency:** `approveFunding` has a read-modify-write race; two concurrent calls
  could both pass the `status === 'pending'` guard and double-sweep. Add a file lock / mutex /
  DB transaction before exposing it to any concurrent caller. (CLI single-operator use is safe.)
- **Duplicate proposals:** `proposeFunding` does not detect an existing pending proposal over
  the same ledger range; approving two would double-sweep at the backend. De-duplicate by range.
- **Atomic sweep commit:** `approveFunding` writes `sweeps.jsonl` then the proposal status
  separately; a crash between them leaves the proposal `pending` with a sweep already sent.
  v1 adds an idempotency guard (refuses if a sweep record for the proposal already exists), but
  a real backend should make the sweep + status update a single atomic transaction.
- **Sign proposals:** `proposals.jsonl` is unsigned (unlike the earnings ledger). A server-side
  file write could redirect the sweep destination or amount. HMAC-sign proposals like earnings.
- **Ledger tail-truncation:** `verifyEarnings` catches reordering, gaps, and front-truncation
  (seq contiguity) but not deletion of the most recent entries. Add a signed head-pointer
  (persisted last-seq) for append-only completeness.
- **Signing-key guard:** the default `LEDGER_SIGNING_KEY` (`dev-insecure-key-change-me`) must be
  rejected at startup when `MAINNET_ENABLED=true` or `LN_BACKEND != 'mock'`.
- **Accumulation address guard:** the placeholder `ACCUMULATION_ADDRESS` must be rejected at
  startup when `LN_BACKEND != 'mock'`, so a real sweep can never target a garbage address.
- **Sweep-range validation:** `appendSweep` should validate `ledgerRange[0] <= ledgerRange[1]`
  and that the range falls within existing earnings.
- **Test depth:** add middle-entry tamper, ledger-truncation, and `paySweep` overdraw negative
  tests; tighten `pro_service` assertions (exact `X-Receipt` format, recommendation element shape).

## Next (later sub-projects)
- `CoreLightningBackend` against the existing full bitcoind (regtest → signet → mainnet).
- Real funding gate: sweep to a human-controlled accumulation address + notification + signed approval.
- Earn-engine scale-up: pricing/curation, more premium endpoints, per-caller API keys + quotas.
