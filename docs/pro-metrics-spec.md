# Implementation spec: demand instrumentation for `/api/pro/recommend`

**Author:** Opus (advisor) · **Executor:** Sonnet or Haiku · **Status:** ready to implement

## Goal

Record one structured event per `/api/pro/recommend` request so we can answer the only
question that matters before investing in a real Lightning backend: **is anyone actually
using the paid endpoint, and how far do they get?** (quote only, or do they attempt to
redeem?)

This is observability, not a feature. It must be **lightweight, non-throwing, and never log
secrets**. Do not change the request/response behaviour of the endpoint in any way.

## Design decisions (do not deviate)

1. **Two sinks, both best-effort:**
   - **stdout** — one JSON line prefixed `[pro-metrics] ` per request. This is the *durable*
     signal in production: the Azure container filesystem is ephemeral, but stdout is captured
     by the platform log stream. Greppable prefix so we can filter later.
   - **file** — best-effort append to `${ledgerDir}/pro-requests.jsonl` (same dir as the
     earnings ledger). Primarily for local/dev analysis; may be lost on container restart, which
     is fine.
2. **Never throws.** Both sinks are wrapped in `try/catch`. Observability must never break the
   paid path. A failed write is swallowed silently.
3. **Never logs the preimage.** The event carries `paymentHash` (derived, public) where known —
   *never* the preimage (the bearer secret). This is a hard rule; the test enforces it.
4. **No new dependencies. No manifest changes.** The endpoint stays undiscoverable (absent from
   `openapi.json` and `/api/status`) — that is intentional. Do not add it.
5. **Config via env, read at call time** (so tests and prod can toggle without rebuild):
   - `PRO_METRICS_STDOUT` (default `"true"`) — set `"false"` to silence stdout.
   - `PRO_METRICS_FILE` (default `"true"`) — set `"false"` to disable the file sink.
   Read these directly from `process.env` in `metrics.ts` (do **not** add them to `PayConfig` /
   the strict `intEnv` validation — they are observability toggles, not money-path config).

## Files to change

Three edits + one new test. Full contents below — copy them as-is.

### 1. `lib/pay/types.ts` — append these two exports at the end of the file

```ts
export type ProOutcome =
  | 'quote'            // 402 + invoice issued (no payment presented)
  | 'invalid_preimage' // 400 malformed X-Preimage
  | 'unsettled'        // 402 no settled invoice matches the preimage
  | 'underpaid'        // 402 paid less than the price
  | 'replay'           // 409 receipt already used
  | 'redeemed';        // 200 success

export interface ProRequestEvent {
  ts: number;            // epoch ms, stamped by recordProRequest
  outcome: ProOutcome;
  status: number;        // HTTP status returned to the caller
  callerId: string;      // self-reported X-Agent-Id (opaque), 'anonymous' if absent
  task: string | null;
  maxCost: string | null;
  minContext: string | null;
  provider: string | null;
  paymentHash?: string;  // present once a preimage maps to an invoice; NEVER the preimage
  amountSats?: number;   // paid amount (underpaid) or earned amount (redeemed)
  latencyMs: number;     // total handler time
}
```

### 2. `lib/pay/metrics.ts` — NEW FILE, full contents

```ts
import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { getConfig } from './config';
import type { ProRequestEvent } from './types';

const STDOUT_PREFIX = '[pro-metrics]';

function stdoutEnabled(): boolean {
  return (process.env.PRO_METRICS_STDOUT ?? 'true') !== 'false';
}
function fileEnabled(): boolean {
  return (process.env.PRO_METRICS_FILE ?? 'true') !== 'false';
}
function metricsPath(): string {
  return join(getConfig().ledgerDir, 'pro-requests.jsonl');
}

/**
 * Record one /api/pro/recommend request for demand instrumentation.
 * Best-effort and non-throwing — observability must never break the request path.
 * NEVER pass a preimage into this function; only the derived paymentHash.
 */
export function recordProRequest(event: Omit<ProRequestEvent, 'ts'>): void {
  const full: ProRequestEvent = { ts: Date.now(), ...event };
  const line = JSON.stringify(full);

  try {
    if (stdoutEnabled()) console.log(`${STDOUT_PREFIX} ${line}`);
  } catch {
    /* never throw from observability */
  }

  try {
    if (fileEnabled()) {
      const dir = getConfig().ledgerDir;
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(metricsPath(), line + '\n');
    }
  } catch {
    /* best effort: read-only / ephemeral container FS, etc. */
  }
}
```

### 3. `lib/pay/pro_service.ts` — full updated contents

Changes only: import `recordProRequest`; capture `startedAt` + a shared `meta` object; add one
`recordProRequest(...)` call immediately before each `return`. **No behavioural change.**

```ts
import { getModels, getCategories, getSiteConfig } from '@/data';
import { scoreAndRank } from '@/data/recommend';
import { getConfig } from './config';
import { getLightningBackend } from './lightning';
import { sha256OfHex } from './hash';
import { appendEarning, hasPaymentHash } from './ledger';
import { recordProRequest } from './metrics';

export interface ProResult {
  status: number;
  body: unknown;
  receiptHeader?: string;
}

export async function serveProRecommend(input: {
  preimage: string | null;
  callerId: string;
  params: URLSearchParams;
}): Promise<ProResult> {
  const startedAt = Date.now();
  const cfg = getConfig();
  const backend = getLightningBackend();
  const { preimage, callerId, params } = input;

  // Fields shared by every metrics record for this request.
  const meta = {
    callerId,
    task: params.get('task'),
    maxCost: params.get('max_cost'),
    minContext: params.get('min_context'),
    provider: params.get('provider'),
  };

  if (!preimage) {
    const inv = await backend.createInvoice(cfg.proPriceSats, 'helloai pro/recommend', 300);
    recordProRequest({ ...meta, outcome: 'quote', status: 402, paymentHash: inv.paymentHash, latencyMs: Date.now() - startedAt });
    return {
      status: 402,
      body: {
        error: 'Payment required',
        payment: {
          invoice: inv.bolt11,
          payment_hash: inv.paymentHash,
          amount_sats: inv.amountSats,
          expires_at: inv.expiresAt,
        },
        hint: 'Pay the invoice, then retry with header X-Preimage: <64-hex>',
      },
    };
  }

  if (!/^[0-9a-fA-F]{64}$/.test(preimage)) {
    recordProRequest({ ...meta, outcome: 'invalid_preimage', status: 400, latencyMs: Date.now() - startedAt });
    return { status: 400, body: { error: 'Invalid X-Preimage', details: 'must be 64 hex chars (32 bytes)' } };
  }

  const pre = preimage.toLowerCase();
  const paymentHash = sha256OfHex(pre);
  const st = await backend.lookupInvoice(paymentHash);
  if (!st.known || !st.settled) {
    recordProRequest({ ...meta, outcome: 'unsettled', status: 402, paymentHash, latencyMs: Date.now() - startedAt });
    return { status: 402, body: { error: 'Payment not settled', details: 'no settled invoice matches this preimage' } };
  }
  if ((st.amountPaidSats ?? 0) < cfg.proPriceSats) {
    recordProRequest({ ...meta, outcome: 'underpaid', status: 402, paymentHash, amountSats: st.amountPaidSats ?? 0, latencyMs: Date.now() - startedAt });
    return { status: 402, body: { error: 'Underpaid', details: `paid ${st.amountPaidSats}, required ${cfg.proPriceSats}` } };
  }
  if (hasPaymentHash(paymentHash)) {
    recordProRequest({ ...meta, outcome: 'replay', status: 409, paymentHash, latencyMs: Date.now() - startedAt });
    return { status: 409, body: { error: 'Receipt already used', details: 'this payment was already redeemed' } };
  }

  const entry = appendEarning({
    endpoint: '/api/pro/recommend',
    callerId,
    paymentHash,
    preimage: pre,
    amountSats: st.amountPaidSats!,
  });

  const models = getModels();
  const categories = getCategories();
  const site = getSiteConfig();
  const { recommendations, excluded, matchedCategory } = scoreAndRank(models, categories, {
    task: params.get('task'),
    maxCost: params.get('max_cost') ? parseFloat(params.get('max_cost')!) : null,
    minContext: params.get('min_context') ? parseInt(params.get('min_context')!, 10) : null,
    provider: params.get('provider'),
  });
  const full = recommendations.map(({ model, score, reasons }, i) => ({ rank: i + 1, score, reasons, model }));

  recordProRequest({ ...meta, outcome: 'redeemed', status: 200, paymentHash, amountSats: entry.amountSats, latencyMs: Date.now() - startedAt });

  return {
    status: 200,
    receiptHeader: `seq=${entry.seq};payment_hash=${entry.paymentHash};amount_sats=${entry.amountSats}`,
    body: {
      tier: 'pro',
      recommendations: full,
      models_considered: models.length,
      models_excluded: excluded,
      matched_category: matchedCategory?.name ?? null,
      receipt: { seq: entry.seq, payment_hash: entry.paymentHash, amount_sats: entry.amountSats },
      last_updated: site.lastUpdated,
    },
  };
}
```

### 4. `__tests__/pay/metrics.test.ts` — NEW FILE, full contents

```ts
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { recordProRequest } from '@/lib/pay/metrics';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'helloai-metrics-'));
  process.env.LEDGER_DIR = dir;
  process.env.PRO_METRICS_STDOUT = 'false'; // keep test output clean
  delete process.env.PRO_METRICS_FILE;
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function readLines(): any[] {
  const p = join(dir, 'pro-requests.jsonl');
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

const baseEvent = {
  callerId: 'buyer-agent',
  task: 'coding',
  maxCost: null,
  minContext: null,
  provider: null,
  latencyMs: 3,
};

describe('recordProRequest', () => {
  test('appends a parseable JSONL line and stamps ts', () => {
    recordProRequest({ ...baseEvent, outcome: 'quote', status: 402, paymentHash: 'ab'.repeat(32) });
    const lines = readLines();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ callerId: 'buyer-agent', outcome: 'quote', status: 402 });
    expect(typeof lines[0].ts).toBe('number');
  });

  test('never writes a preimage field', () => {
    recordProRequest({ ...baseEvent, outcome: 'redeemed', status: 200, paymentHash: 'cd'.repeat(32), amountSats: 100 });
    expect(readLines()[0]).not.toHaveProperty('preimage');
  });

  test('PRO_METRICS_FILE=false disables the file sink', () => {
    process.env.PRO_METRICS_FILE = 'false';
    recordProRequest({ ...baseEvent, outcome: 'quote', status: 402 });
    expect(readLines()).toHaveLength(0);
  });

  test('does not throw when the ledger dir is unwritable', () => {
    process.env.LEDGER_DIR = '/proc/nonexistent/cannot-write';
    expect(() =>
      recordProRequest({ ...baseEvent, outcome: 'quote', status: 402 }),
    ).not.toThrow();
  });
});
```

## Optional (nice-to-have, only if quick)

Add one assertion to `__tests__/pay/loop.integration.test.ts` proving the service emits a
`redeemed` metrics line on a successful buy: set `process.env.PRO_METRICS_FILE = 'true'` and
`PRO_METRICS_STDOUT = 'false'` in its `beforeEach`, then after a `buy()` assert that
`${dir}/pro-requests.jsonl` contains a line with `outcome: 'redeemed'`. Skip if it complicates
the existing test.

## Validation (must all pass before done)

```bash
npx jest __tests__/pay        # all pay tests, incl. new metrics.test.ts — expect green
npx tsc --noEmit              # strict typecheck — expect clean
npm run build                 # production build — expect exit 0
```

Do **not** deploy. Leave the change as a working-tree diff for review. Do not commit unless
asked; if asked, commit ONLY the four files above (`lib/pay/types.ts`, `lib/pay/metrics.ts`,
`lib/pay/pro_service.ts`, `__tests__/pay/metrics.test.ts`) — never `scripts/arena.py` or
`.claude/state/leaderboard-changes.jsonl`.

## Out of scope (do not do)

- No real Lightning backend, no dev-settle route.
- No changes to `openapi.json` or `/api/status` (endpoint stays undiscoverable).
- No reading/aggregating the logs yet — that's a later step once data accumulates.
- No new npm dependencies.

## After it ships (ops note for Clement, not the executor)

In production the **stdout `[pro-metrics]` lines are the signal** — pull them from the Azure
log stream (`make az_logs`) or wire App Insights. The `pro-requests.jsonl` file is ephemeral in
the container. Give it a few weeks; if `quote` events are non-zero and especially if any
`unsettled`/`invalid_preimage` redeem *attempts* show up, that's real pull and the trigger to
reconsider the real Lightning backend.
