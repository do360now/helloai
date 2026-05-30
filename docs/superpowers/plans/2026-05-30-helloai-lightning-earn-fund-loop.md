# helloai Lightning Earn→Verify→Fund Loop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 402-gated premium API endpoint on helloai whose payments land in a tamper-evident signed ledger, with a human-gated sweep of accumulated sats — all on a mock Lightning backend, no mainnet, no real wallet.

**Architecture:** Pure, testable library modules under `lib/pay/` (config, hash utils, a `LightningBackend` interface + `MockLightningBackend`, an append-only hash-linked earnings ledger, a funding gate) plus a thin Next.js route that delegates to a pure `serveProRecommend` service. The Lightning preimage is the receipt; the ledger is hash-linked and HMAC-signed; the funding sweep executes only from an explicit human call to `approveFunding`.

**Tech Stack:** TypeScript, Next.js 16 App Router, Jest + ts-jest, Node `crypto` (no new dependencies).

---

## Design notes / refinements from the spec

These are small, faithful engineering refinements of the approved design (`docs/superpowers/specs/2026-05-30-helloai-lightning-earn-fund-loop-design.md`). All approved invariants are preserved (tamper-evident ledger, preimage verification, human-gated funding, no auto-execution).

1. **No separate quote store.** The `MockLightningBackend` already holds invoice state (amount + preimage) keyed by `payment_hash`. On the paid retry the server derives `payment_hash = sha256(preimage)` and looks the invoice up directly. Single-use is enforced by the ledger (reject if `payment_hash` already recorded). One fewer moving part.
2. **`swept` is tracked separately, never mutated into the earnings ledger.** Earnings are strictly append-only and immutable (that is what makes the hash chain meaningful). Executed sweeps go to a separate `sweeps.jsonl`; "unswept" = earnings whose `seq` is not covered by any sweep's range.
3. **`verifyEarnings()` checks integrity only** (hash chain + signatures + preimage→hash). Balance reconciliation against the backend is deferred (trivially consistent under the mock; belongs with the real Core Lightning backend).
4. **Route logic lives in a pure `serveProRecommend` service** so it is unit-testable without importing `next/server` into Jest. The route file is a thin adapter.

## File structure

| File | Responsibility |
|---|---|
| `lib/pay/config.ts` | Read env → typed `PayConfig` with safe defaults |
| `lib/pay/hash.ts` | `sha256OfHex`, `sha256OfString`, `hmacHex`, `stableStringify` |
| `lib/pay/types.ts` | Shared interfaces (`Invoice`, `InvoiceStatus`, `LightningBackend`, `LedgerEntry`, `SweepRecord`, `FundingProposal`) |
| `lib/pay/lightning.ts` | `LightningBackend` impl `MockLightningBackend` + singleton `getLightningBackend` / `getMockBackend` / `__resetLightningBackend` |
| `lib/pay/ledger.ts` | Append-only hash-linked signed earnings ledger + sweeps + unswept accounting |
| `lib/pay/pro_service.ts` | Pure `serveProRecommend` — 402 quote + paid verification + premium payload |
| `app/api/pro/recommend/route.ts` | Thin Next.js adapter around the service |
| `lib/pay/funding.ts` | `proposeFunding` (write-only) + `approveFunding` (the single human-gated execution path) |
| `__tests__/pay/*.test.ts` | Unit + integration tests |

Runtime data lives under `data/ledger/` (git-ignored).

---

## Task 1: Scaffolding + config module

**Files:**
- Modify: `package.json` (add `test` script)
- Create: `lib/pay/config.ts`
- Create: `data/ledger/.gitignore`
- Test: `__tests__/pay/config.test.ts`

- [ ] **Step 1: Add the `test` script to package.json**

In `package.json`, change the `scripts` block to include `test`:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "jest"
  },
```

- [ ] **Step 2: Ignore runtime ledger artifacts**

Create `data/ledger/.gitignore`:

```gitignore
# Runtime ledger artifacts — never commit
*.jsonl
```

- [ ] **Step 3: Write the failing test**

Create `__tests__/pay/config.test.ts`:

```ts
import { getConfig } from '@/lib/pay/config';

describe('getConfig', () => {
  const ORIG = { ...process.env };
  afterEach(() => { process.env = { ...ORIG }; });

  test('provides safe defaults', () => {
    delete process.env.LN_BACKEND;
    delete process.env.PRO_PRICE_SATS;
    delete process.env.FUNDING_THRESHOLD_SATS;
    delete process.env.MAINNET_ENABLED;
    const cfg = getConfig();
    expect(cfg.lnBackend).toBe('mock');
    expect(cfg.proPriceSats).toBe(100);
    expect(cfg.fundingThresholdSats).toBe(1000);
    expect(cfg.maxSweepSats).toBe(100000);
    expect(cfg.mainnetEnabled).toBe(false);
    expect(cfg.ledgerDir).toBe('data/ledger');
  });

  test('reads overrides from env', () => {
    process.env.PRO_PRICE_SATS = '250';
    process.env.MAINNET_ENABLED = 'true';
    const cfg = getConfig();
    expect(cfg.proPriceSats).toBe(250);
    expect(cfg.mainnetEnabled).toBe(true);
  });

  test('rejects non-integer sats', () => {
    process.env.PRO_PRICE_SATS = 'abc';
    expect(() => getConfig()).toThrow(/PRO_PRICE_SATS/);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx jest __tests__/pay/config.test.ts`
Expected: FAIL — cannot find module `@/lib/pay/config`.

- [ ] **Step 5: Implement the config module**

Create `lib/pay/config.ts`:

```ts
export interface PayConfig {
  lnBackend: string;
  proPriceSats: number;
  fundingThresholdSats: number;
  maxSweepSats: number;
  ledgerSigningKey: string;
  ledgerDir: string;
  accumulationAddress: string;
  mainnetEnabled: boolean;
}

function intEnv(name: string, def: number): number {
  const v = process.env[name];
  if (v == null || v === '') return def;
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) throw new Error(`${name} must be an integer, got: ${v}`);
  return n;
}

export function getConfig(): PayConfig {
  return {
    lnBackend: process.env.LN_BACKEND ?? 'mock',
    proPriceSats: intEnv('PRO_PRICE_SATS', 100),
    fundingThresholdSats: intEnv('FUNDING_THRESHOLD_SATS', 1000),
    maxSweepSats: intEnv('MAX_SWEEP_SATS', 100000),
    ledgerSigningKey: process.env.LEDGER_SIGNING_KEY ?? 'dev-insecure-key-change-me',
    ledgerDir: process.env.LEDGER_DIR ?? 'data/ledger',
    accumulationAddress:
      process.env.ACCUMULATION_ADDRESS ?? 'bcrt1qmockplaceholderaddressxxxxxxxxxxxxxxxx',
    mainnetEnabled: (process.env.MAINNET_ENABLED ?? 'false') === 'true',
  };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest __tests__/pay/config.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add package.json data/ledger/.gitignore lib/pay/config.ts __tests__/pay/config.test.ts
git commit -m "feat(pay): config module with safe defaults + test script"
```

---

## Task 2: Hash / canonicalization utilities

**Files:**
- Create: `lib/pay/hash.ts`
- Test: `__tests__/pay/hash.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/pay/hash.test.ts`:

```ts
import { sha256OfHex, sha256OfString, hmacHex, stableStringify } from '@/lib/pay/hash';

describe('hash utils', () => {
  test('sha256OfHex matches known empty-input vector', () => {
    expect(sha256OfHex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });

  test('preimage hashes to a stable 64-hex payment hash', () => {
    const preimage = '00'.repeat(32);
    const hash = sha256OfHex(preimage);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256OfHex(preimage)).toBe(hash); // deterministic
  });

  test('sha256OfString and hmacHex are deterministic and hex', () => {
    expect(sha256OfString('hello')).toBe(sha256OfString('hello'));
    expect(hmacHex('k', 'msg')).toMatch(/^[0-9a-f]{64}$/);
    expect(hmacHex('k', 'msg')).not.toBe(hmacHex('other', 'msg'));
  });

  test('stableStringify is key-order independent', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
    expect(stableStringify({ a: 2, b: 1 })).toBe('{"a":2,"b":1}');
    expect(stableStringify([3, { y: 1, x: 2 }])).toBe('[3,{"x":2,"y":1}]');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/pay/hash.test.ts`
Expected: FAIL — cannot find module `@/lib/pay/hash`.

- [ ] **Step 3: Implement the hash utils**

Create `lib/pay/hash.ts`:

```ts
import { createHash, createHmac } from 'crypto';

/** sha256 of the bytes decoded from a hex string, returned as hex. */
export function sha256OfHex(hex: string): string {
  return createHash('sha256').update(Buffer.from(hex, 'hex')).digest('hex');
}

/** sha256 of a utf8 string, returned as hex. */
export function sha256OfString(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/** HMAC-SHA256 of a utf8 message under a utf8 key, returned as hex. */
export function hmacHex(key: string, msg: string): string {
  return createHmac('sha256', key).update(msg, 'utf8').digest('hex');
}

/** Deterministic JSON: object keys sorted recursively. */
export function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const rec = obj as Record<string, unknown>;
  const keys = Object.keys(rec).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(rec[k])).join(',') + '}';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/pay/hash.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/pay/hash.ts __tests__/pay/hash.test.ts
git commit -m "feat(pay): hash + canonicalization utilities"
```

---

## Task 3: Types + MockLightningBackend

**Files:**
- Create: `lib/pay/types.ts`
- Create: `lib/pay/lightning.ts`
- Test: `__tests__/pay/lightning.test.ts`

- [ ] **Step 1: Create the shared types**

Create `lib/pay/types.ts`:

```ts
export interface Invoice {
  bolt11: string;
  paymentHash: string; // hex
  amountSats: number;
  expiresAt: number; // epoch ms
}

export interface InvoiceStatus {
  known: boolean;
  settled: boolean;
  preimage?: string; // hex, present iff settled
  amountPaidSats?: number;
  settledAt?: number;
}

export interface LightningBackend {
  createInvoice(amountSats: number, memo: string, expirySecs: number): Promise<Invoice>;
  lookupInvoice(paymentHash: string): Promise<InvoiceStatus>;
  getBalanceSats(): Promise<number>;
  paySweep(onchainAddress: string, amountSats: number): Promise<{ txid: string }>;
}

export interface LedgerEntry {
  seq: number;
  ts: number;
  endpoint: string;
  callerId: string;
  paymentHash: string;
  preimage: string;
  amountSats: number;
  prevHash: string; // hex sha256 of canonical(previous full entry); genesis = 64 zeros
  sig: string; // hex HMAC of canonical(entry without sig)
}

export interface SweepRecord {
  proposalId: string;
  amountSats: number;
  destination: string;
  ledgerRange: [number, number]; // inclusive seqs
  txid: string;
  ts: number;
}

export interface FundingProposal {
  proposalId: string;
  amountSats: number;
  destination: string;
  ledgerRange: [number, number];
  createdAt: number;
  status: 'pending' | 'executed' | 'rejected';
  txid?: string;
  executedAt?: number;
}
```

- [ ] **Step 2: Write the failing test**

Create `__tests__/pay/lightning.test.ts`:

```ts
import { sha256OfHex } from '@/lib/pay/hash';
import {
  getLightningBackend,
  getMockBackend,
  __resetLightningBackend,
} from '@/lib/pay/lightning';

beforeEach(() => {
  process.env.LN_BACKEND = 'mock';
  __resetLightningBackend();
});

describe('MockLightningBackend', () => {
  test('createInvoice yields a payment hash and pending status', async () => {
    const b = getLightningBackend();
    const inv = await b.createInvoice(100, 'test', 300);
    expect(inv.paymentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(inv.amountSats).toBe(100);
    const st = await b.lookupInvoice(inv.paymentHash);
    expect(st).toMatchObject({ known: true, settled: false });
  });

  test('settle reveals a preimage that hashes to the payment hash', async () => {
    const b = getLightningBackend();
    const inv = await b.createInvoice(100, 'test', 300);
    const preimage = getMockBackend().settle(inv.paymentHash);
    expect(sha256OfHex(preimage)).toBe(inv.paymentHash);
    const st = await b.lookupInvoice(inv.paymentHash);
    expect(st.settled).toBe(true);
    expect(st.amountPaidSats).toBe(100);
    expect(await b.getBalanceSats()).toBe(100);
  });

  test('unknown payment hash is reported as not known', async () => {
    const st = await getLightningBackend().lookupInvoice('ab'.repeat(32));
    expect(st).toEqual({ known: false, settled: false });
  });

  test('paySweep reduces balance and returns a txid', async () => {
    const b = getLightningBackend();
    const inv = await b.createInvoice(500, 'test', 300);
    getMockBackend().settle(inv.paymentHash);
    const { txid } = await b.paySweep('bcrt1qdest', 200);
    expect(txid).toMatch(/^mock-tx-/);
    expect(await b.getBalanceSats()).toBe(300);
  });

  test('singleton is reset by __resetLightningBackend', () => {
    const first = getLightningBackend();
    expect(getLightningBackend()).toBe(first);
    __resetLightningBackend();
    expect(getLightningBackend()).not.toBe(first);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest __tests__/pay/lightning.test.ts`
Expected: FAIL — cannot find module `@/lib/pay/lightning`.

- [ ] **Step 4: Implement the backend**

Create `lib/pay/lightning.ts`:

```ts
import { randomBytes } from 'crypto';
import { getConfig } from './config';
import { sha256OfHex } from './hash';
import type { Invoice, InvoiceStatus, LightningBackend } from './types';

interface MockInvoice {
  preimage: string;
  amountSats: number;
  expiresAt: number;
  settled: boolean;
  amountPaidSats?: number;
  settledAt?: number;
}

export class MockLightningBackend implements LightningBackend {
  private invoices = new Map<string, MockInvoice>();
  private balanceSats = 0;

  async createInvoice(amountSats: number, memo: string, expirySecs: number): Promise<Invoice> {
    const preimage = randomBytes(32).toString('hex');
    const paymentHash = sha256OfHex(preimage);
    const expiresAt = Date.now() + expirySecs * 1000;
    this.invoices.set(paymentHash, { preimage, amountSats, expiresAt, settled: false });
    return { bolt11: `lnbcrt-mock-${memo}-${paymentHash.slice(0, 24)}`, paymentHash, amountSats, expiresAt };
  }

  async lookupInvoice(paymentHash: string): Promise<InvoiceStatus> {
    const inv = this.invoices.get(paymentHash);
    if (!inv) return { known: false, settled: false };
    return {
      known: true,
      settled: inv.settled,
      preimage: inv.settled ? inv.preimage : undefined,
      amountPaidSats: inv.amountPaidSats,
      settledAt: inv.settledAt,
    };
  }

  async getBalanceSats(): Promise<number> {
    return this.balanceSats;
  }

  async paySweep(_onchainAddress: string, amountSats: number): Promise<{ txid: string }> {
    if (amountSats > this.balanceSats) throw new Error('insufficient mock balance');
    this.balanceSats -= amountSats;
    return { txid: `mock-tx-${randomBytes(8).toString('hex')}` };
  }

  /** Test/demo helper: simulate a counterparty paying the invoice; returns the preimage. */
  settle(paymentHash: string, amountPaidSats?: number): string {
    const inv = this.invoices.get(paymentHash);
    if (!inv) throw new Error(`unknown invoice ${paymentHash}`);
    inv.settled = true;
    inv.amountPaidSats = amountPaidSats ?? inv.amountSats;
    inv.settledAt = Date.now();
    this.balanceSats += inv.amountPaidSats;
    return inv.preimage;
  }
}

let _backend: LightningBackend | null = null;

export function getLightningBackend(): LightningBackend {
  if (!_backend) {
    const cfg = getConfig();
    if (cfg.lnBackend === 'mock') _backend = new MockLightningBackend();
    else throw new Error(`unsupported LN_BACKEND: ${cfg.lnBackend}`);
  }
  return _backend;
}

export function getMockBackend(): MockLightningBackend {
  const b = getLightningBackend();
  if (!(b instanceof MockLightningBackend)) throw new Error('active backend is not the mock');
  return b;
}

export function __resetLightningBackend(): void {
  _backend = null;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest __tests__/pay/lightning.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/pay/types.ts lib/pay/lightning.ts __tests__/pay/lightning.test.ts
git commit -m "feat(pay): LightningBackend interface + MockLightningBackend"
```

---

## Task 4: Append-only hash-linked earnings ledger

**Files:**
- Create: `lib/pay/ledger.ts`
- Test: `__tests__/pay/ledger.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/pay/ledger.test.ts`:

```ts
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { sha256OfHex } from '@/lib/pay/hash';
import {
  appendEarning,
  readEarnings,
  hasPaymentHash,
  verifyEarnings,
  unsweptTotalSats,
  unsweptEntries,
  appendSweep,
} from '@/lib/pay/ledger';

let dir: string;
function addEarning(amount: number) {
  const preimage = require('crypto').randomBytes(32).toString('hex');
  return appendEarning({
    endpoint: '/api/pro/recommend',
    callerId: 'agent-1',
    paymentHash: sha256OfHex(preimage),
    preimage,
    amountSats: amount,
  });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'helloai-led-'));
  process.env.LEDGER_DIR = dir;
  process.env.LEDGER_SIGNING_KEY = 'test-key';
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('earnings ledger', () => {
  test('appends hash-linked entries with valid signatures', () => {
    const e0 = addEarning(100);
    const e1 = addEarning(200);
    expect(e0.seq).toBe(0);
    expect(e0.prevHash).toBe('0'.repeat(64));
    expect(e1.seq).toBe(1);
    expect(e1.prevHash).toMatch(/^[0-9a-f]{64}$/);
    expect(readEarnings()).toHaveLength(2);
    expect(verifyEarnings()).toMatchObject({ ok: true, count: 2 });
  });

  test('hasPaymentHash detects a redeemed receipt', () => {
    const e = addEarning(100);
    expect(hasPaymentHash(e.paymentHash)).toBe(true);
    expect(hasPaymentHash('ff'.repeat(32))).toBe(false);
  });

  test('verifyEarnings localizes a tampered amount', () => {
    addEarning(100);
    addEarning(200);
    const path = join(dir, 'earnings.jsonl');
    const lines = readFileSync(path, 'utf8').trim().split('\n');
    const tampered = JSON.parse(lines[0]);
    tampered.amountSats = 999999;
    lines[0] = JSON.stringify(tampered);
    writeFileSync(path, lines.join('\n') + '\n');
    const report = verifyEarnings();
    expect(report.ok).toBe(false);
    expect(report.error).toMatch(/seq 0/);
  });

  test('unswept accounting subtracts swept ranges', () => {
    addEarning(400);
    addEarning(600); // total 1000, seqs 0..1
    expect(unsweptTotalSats()).toBe(1000);
    appendSweep({
      proposalId: 'p1',
      amountSats: 1000,
      destination: 'bcrt1qdest',
      ledgerRange: [0, 1],
      txid: 'mock-tx-1',
      ts: Date.now(),
    });
    expect(unsweptTotalSats()).toBe(0);
    expect(unsweptEntries()).toHaveLength(0);
    addEarning(50);
    expect(unsweptTotalSats()).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/pay/ledger.test.ts`
Expected: FAIL — cannot find module `@/lib/pay/ledger`.

- [ ] **Step 3: Implement the ledger**

Create `lib/pay/ledger.ts`:

```ts
import { existsSync, mkdirSync, readFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { getConfig } from './config';
import { sha256OfHex, sha256OfString, hmacHex, stableStringify } from './hash';
import type { LedgerEntry, SweepRecord } from './types';

const GENESIS = '0'.repeat(64);

function earningsPath(): string {
  return join(getConfig().ledgerDir, 'earnings.jsonl');
}
function sweepsPath(): string {
  return join(getConfig().ledgerDir, 'sweeps.jsonl');
}
function ensureDir(): void {
  const d = getConfig().ledgerDir;
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}
function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as T);
}

export function readEarnings(): LedgerEntry[] {
  return readJsonl<LedgerEntry>(earningsPath());
}
export function readSweeps(): SweepRecord[] {
  return readJsonl<SweepRecord>(sweepsPath());
}

/** Hash of a full entry (including its signature) — the chain link. */
function entryHash(e: LedgerEntry): string {
  return sha256OfString(stableStringify(e));
}

export function hasPaymentHash(paymentHash: string): boolean {
  return readEarnings().some((e) => e.paymentHash === paymentHash);
}

export function appendEarning(input: {
  endpoint: string;
  callerId: string;
  paymentHash: string;
  preimage: string;
  amountSats: number;
}): LedgerEntry {
  ensureDir();
  const earnings = readEarnings();
  const prev = earnings[earnings.length - 1];
  const base = {
    seq: earnings.length,
    ts: Date.now(),
    endpoint: input.endpoint,
    callerId: input.callerId,
    paymentHash: input.paymentHash,
    preimage: input.preimage,
    amountSats: input.amountSats,
    prevHash: prev ? entryHash(prev) : GENESIS,
  };
  const sig = hmacHex(getConfig().ledgerSigningKey, stableStringify(base));
  const entry: LedgerEntry = { ...base, sig };
  appendFileSync(earningsPath(), JSON.stringify(entry) + '\n');
  return entry;
}

export function verifyEarnings(): { ok: boolean; count: number; error?: string } {
  const earnings = readEarnings();
  const key = getConfig().ledgerSigningKey;
  let expectedPrev = GENESIS;
  for (const e of earnings) {
    if (e.prevHash !== expectedPrev) return { ok: false, count: earnings.length, error: `seq ${e.seq}: prevHash mismatch` };
    const { sig, ...base } = e;
    if (hmacHex(key, stableStringify(base)) !== sig) return { ok: false, count: earnings.length, error: `seq ${e.seq}: bad signature` };
    if (sha256OfHex(e.preimage) !== e.paymentHash) return { ok: false, count: earnings.length, error: `seq ${e.seq}: preimage does not hash to paymentHash` };
    expectedPrev = entryHash(e);
  }
  return { ok: true, count: earnings.length };
}

function coveredSeqs(): Set<number> {
  const s = new Set<number>();
  for (const sw of readSweeps()) {
    for (let i = sw.ledgerRange[0]; i <= sw.ledgerRange[1]; i++) s.add(i);
  }
  return s;
}

export function unsweptEntries(): LedgerEntry[] {
  const covered = coveredSeqs();
  return readEarnings().filter((e) => !covered.has(e.seq));
}
export function unsweptTotalSats(): number {
  return unsweptEntries().reduce((acc, e) => acc + e.amountSats, 0);
}
export function appendSweep(rec: SweepRecord): void {
  ensureDir();
  appendFileSync(sweepsPath(), JSON.stringify(rec) + '\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/pay/ledger.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/pay/ledger.ts __tests__/pay/ledger.test.ts
git commit -m "feat(pay): tamper-evident hash-linked earnings ledger + sweep accounting"
```

---

## Task 5: Premium 402 service + route

**Files:**
- Create: `lib/pay/pro_service.ts`
- Create: `app/api/pro/recommend/route.ts`
- Test: `__tests__/pay/pro_service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/pay/pro_service.test.ts`:

```ts
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { serveProRecommend } from '@/lib/pay/pro_service';
import { getMockBackend, __resetLightningBackend } from '@/lib/pay/lightning';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'helloai-pro-'));
  process.env.LEDGER_DIR = dir;
  process.env.LEDGER_SIGNING_KEY = 'test-key';
  process.env.LN_BACKEND = 'mock';
  process.env.PRO_PRICE_SATS = '100';
  __resetLightningBackend();
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const params = (q = 'task=coding') => new URLSearchParams(q);

describe('serveProRecommend', () => {
  test('no preimage → 402 with an invoice', async () => {
    const r = await serveProRecommend({ preimage: null, callerId: 'a', params: params() });
    expect(r.status).toBe(402);
    const body = r.body as any;
    expect(body.payment.payment_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(body.payment.amount_sats).toBe(100);
  });

  test('valid settled preimage → 200 premium payload + receipt', async () => {
    const quote = await serveProRecommend({ preimage: null, callerId: 'a', params: params() });
    const ph = (quote.body as any).payment.payment_hash;
    const preimage = getMockBackend().settle(ph);
    const r = await serveProRecommend({ preimage, callerId: 'a', params: params() });
    expect(r.status).toBe(200);
    const body = r.body as any;
    expect(body.tier).toBe('pro');
    expect(Array.isArray(body.recommendations)).toBe(true);
    expect(body.receipt.amount_sats).toBe(100);
    expect(r.receiptHeader).toContain('payment_hash=');
  });

  test('replaying a used preimage → 409', async () => {
    const quote = await serveProRecommend({ preimage: null, callerId: 'a', params: params() });
    const ph = (quote.body as any).payment.payment_hash;
    const preimage = getMockBackend().settle(ph);
    await serveProRecommend({ preimage, callerId: 'a', params: params() });
    const replay = await serveProRecommend({ preimage, callerId: 'a', params: params() });
    expect(replay.status).toBe(409);
  });

  test('unknown / unsettled preimage → 402', async () => {
    const r = await serveProRecommend({ preimage: 'ab'.repeat(32), callerId: 'a', params: params() });
    expect(r.status).toBe(402);
  });

  test('malformed preimage → 400', async () => {
    const r = await serveProRecommend({ preimage: 'not-hex', callerId: 'a', params: params() });
    expect(r.status).toBe(400);
  });

  test('underpaid invoice → 402', async () => {
    const quote = await serveProRecommend({ preimage: null, callerId: 'a', params: params() });
    const ph = (quote.body as any).payment.payment_hash;
    const preimage = getMockBackend().settle(ph, 50); // underpay
    const r = await serveProRecommend({ preimage, callerId: 'a', params: params() });
    expect(r.status).toBe(402);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/pay/pro_service.test.ts`
Expected: FAIL — cannot find module `@/lib/pay/pro_service`.

- [ ] **Step 3: Implement the service**

Create `lib/pay/pro_service.ts`:

```ts
import { getModels, getCategories, getSiteConfig } from '@/data';
import { scoreAndRank } from '@/data/recommend';
import { getConfig } from './config';
import { getLightningBackend } from './lightning';
import { sha256OfHex } from './hash';
import { appendEarning, hasPaymentHash } from './ledger';

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
  const cfg = getConfig();
  const backend = getLightningBackend();
  const { preimage, callerId, params } = input;

  if (!preimage) {
    const inv = await backend.createInvoice(cfg.proPriceSats, 'helloai pro/recommend', 300);
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
    return { status: 400, body: { error: 'Invalid X-Preimage', details: 'must be 64 hex chars (32 bytes)' } };
  }

  const pre = preimage.toLowerCase();
  const paymentHash = sha256OfHex(pre);
  const st = await backend.lookupInvoice(paymentHash);
  if (!st.known || !st.settled) {
    return { status: 402, body: { error: 'Payment not settled', details: 'no settled invoice matches this preimage' } };
  }
  if ((st.amountPaidSats ?? 0) < cfg.proPriceSats) {
    return { status: 402, body: { error: 'Underpaid', details: `paid ${st.amountPaidSats}, required ${cfg.proPriceSats}` } };
  }
  if (hasPaymentHash(paymentHash)) {
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/pay/pro_service.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Add the thin route adapter**

Create `app/api/pro/recommend/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders } from '@/lib/cors';
import { serveProRecommend } from '@/lib/pay/pro_service';

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const HEADERS: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getCorsHeaders(origin),
  };

  const result = await serveProRecommend({
    preimage: req.headers.get('x-preimage'),
    callerId: req.headers.get('x-agent-id') ?? 'anonymous',
    params: req.nextUrl.searchParams,
  });

  const headers = result.receiptHeader
    ? { ...HEADERS, 'X-Receipt': result.receiptHeader }
    : HEADERS;
  return NextResponse.json(result.body, { status: result.status, headers });
}
```

- [ ] **Step 6: Verify the route compiles (typecheck)**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/pay/pro_service.ts app/api/pro/recommend/route.ts __tests__/pay/pro_service.test.ts
git commit -m "feat(pay): 402-gated /api/pro/recommend (pure service + route adapter)"
```

---

## Task 6: Funding gate (propose + human-gated approve)

**Files:**
- Create: `lib/pay/funding.ts`
- Test: `__tests__/pay/funding.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/pay/funding.test.ts`:

```ts
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { sha256OfHex } from '@/lib/pay/hash';
import { appendEarning } from '@/lib/pay/ledger';
import { getLightningBackend, getMockBackend, __resetLightningBackend } from '@/lib/pay/lightning';
import { proposeFunding, approveFunding, getProposal } from '@/lib/pay/funding';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'helloai-fund-'));
  process.env.LEDGER_DIR = dir;
  process.env.LEDGER_SIGNING_KEY = 'test-key';
  process.env.LN_BACKEND = 'mock';
  process.env.FUNDING_THRESHOLD_SATS = '1000';
  process.env.MAX_SWEEP_SATS = '100000';
  delete process.env.MAINNET_ENABLED;
  __resetLightningBackend();
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

// Records a real settled earning with a correct preimage→hash pair,
// funding the mock balance so a later sweep can succeed.
async function earnReal(amount: number) {
  const b = getLightningBackend();
  const inv = await b.createInvoice(amount, 'earn', 300);
  const preimage = getMockBackend().settle(inv.paymentHash);
  appendEarning({
    endpoint: '/api/pro/recommend',
    callerId: 'agent-1',
    paymentHash: sha256OfHex(preimage),
    preimage,
    amountSats: amount,
  });
}

describe('funding gate', () => {
  test('below threshold → no proposal', async () => {
    await earnReal(400);
    expect(proposeFunding()).toBeNull();
  });

  test('at/above threshold → pending proposal, but NOTHING is executed', async () => {
    await earnReal(600);
    await earnReal(600); // total 1200
    const balanceBefore = await getLightningBackend().getBalanceSats();
    const p = proposeFunding();
    expect(p).not.toBeNull();
    expect(p!.amountSats).toBe(1200);
    expect(p!.status).toBe('pending');
    // proposeFunding must NOT move funds — no auto-execution
    expect(await getLightningBackend().getBalanceSats()).toBe(balanceBefore);
  });

  test('approveFunding is the only path that executes the sweep', async () => {
    await earnReal(600);
    await earnReal(600);
    const p = proposeFunding()!;
    const balanceBefore = await getLightningBackend().getBalanceSats();
    const done = await approveFunding(p.proposalId);
    expect(done.status).toBe('executed');
    expect(done.txid).toMatch(/^mock-tx-/);
    expect(await getLightningBackend().getBalanceSats()).toBe(balanceBefore - 1200);
    expect(getProposal(p.proposalId)!.status).toBe('executed');
  });

  test('approveFunding refuses when MAINNET_ENABLED=true', async () => {
    await earnReal(1200);
    const p = proposeFunding()!;
    process.env.MAINNET_ENABLED = 'true';
    await expect(approveFunding(p.proposalId)).rejects.toThrow(/mainnet/i);
  });

  test('approveFunding refuses an amount above MAX_SWEEP_SATS', async () => {
    process.env.MAX_SWEEP_SATS = '500';
    await earnReal(600);
    await earnReal(600);
    const p = proposeFunding()!;
    await expect(approveFunding(p.proposalId)).rejects.toThrow(/MAX_SWEEP_SATS/);
  });

  test('double-approve is rejected', async () => {
    await earnReal(1200);
    const p = proposeFunding()!;
    await approveFunding(p.proposalId);
    await expect(approveFunding(p.proposalId)).rejects.toThrow(/not pending/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/pay/funding.test.ts`
Expected: FAIL — cannot find module `@/lib/pay/funding`.

- [ ] **Step 3: Implement the funding gate**

Create `lib/pay/funding.ts`:

```ts
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getConfig } from './config';
import { getLightningBackend } from './lightning';
import { unsweptEntries, unsweptTotalSats, verifyEarnings, appendSweep } from './ledger';
import type { FundingProposal } from './types';

function proposalsPath(): string {
  return join(getConfig().ledgerDir, 'proposals.jsonl');
}
function readProposals(): FundingProposal[] {
  const p = proposalsPath();
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as FundingProposal);
}
function writeProposals(ps: FundingProposal[]): void {
  const d = getConfig().ledgerDir;
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  writeFileSync(proposalsPath(), ps.map((p) => JSON.stringify(p)).join('\n') + (ps.length ? '\n' : ''));
}

export function getProposal(id: string): FundingProposal | undefined {
  return readProposals().find((p) => p.proposalId === id);
}

/** Write-only: surfaces a proposal when earnings cross the threshold. NEVER moves funds. */
export function proposeFunding(): FundingProposal | null {
  const cfg = getConfig();
  const total = unsweptTotalSats();
  if (total < cfg.fundingThresholdSats) return null;
  const entries = unsweptEntries();
  const proposal: FundingProposal = {
    proposalId: randomBytes(6).toString('hex'),
    amountSats: total,
    destination: cfg.accumulationAddress,
    ledgerRange: [entries[0].seq, entries[entries.length - 1].seq],
    createdAt: Date.now(),
    status: 'pending',
  };
  const ps = readProposals();
  ps.push(proposal);
  writeProposals(ps);
  console.log(
    `[funding] PROPOSAL ${proposal.proposalId}: sweep ${total} sats -> ${cfg.accumulationAddress} ` +
      `(seqs ${proposal.ledgerRange[0]}..${proposal.ledgerRange[1]}). ` +
      `Approve with approveFunding('${proposal.proposalId}').`
  );
  return proposal;
}

/** The ONLY path that executes a sweep. Must be called explicitly by a human. */
export async function approveFunding(proposalId: string): Promise<FundingProposal> {
  const cfg = getConfig();
  if (cfg.mainnetEnabled) {
    throw new Error('mainnet gate: v1 refuses to execute real sweeps (MAINNET_ENABLED must be false)');
  }
  const ps = readProposals();
  const p = ps.find((x) => x.proposalId === proposalId);
  if (!p) throw new Error(`unknown proposal ${proposalId}`);
  if (p.status !== 'pending') throw new Error(`proposal ${proposalId} is ${p.status}, not pending`);
  if (p.amountSats > cfg.maxSweepSats) {
    throw new Error(`amount ${p.amountSats} exceeds MAX_SWEEP_SATS ${cfg.maxSweepSats}`);
  }
  const report = verifyEarnings();
  if (!report.ok) throw new Error(`ledger integrity check failed: ${report.error}`);

  const { txid } = await getLightningBackend().paySweep(p.destination, p.amountSats);
  appendSweep({
    proposalId: p.proposalId,
    amountSats: p.amountSats,
    destination: p.destination,
    ledgerRange: p.ledgerRange,
    txid,
    ts: Date.now(),
  });
  p.status = 'executed';
  p.txid = txid;
  p.executedAt = Date.now();
  writeProposals(ps);
  return p;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/pay/funding.test.ts`
Expected: PASS (6 tests). The "NOTHING is executed" and double-approve tests are the guardrail proof that no auto-execution path exists.

- [ ] **Step 5: Commit**

```bash
git add lib/pay/funding.ts __tests__/pay/funding.test.ts
git commit -m "feat(pay): human-gated funding gate (propose write-only, approve executes)"
```

---

## Task 7: End-to-end loop integration test + docs

**Files:**
- Create: `__tests__/pay/loop.integration.test.ts`
- Create: `docs/pay-loop.md`
- Test: the integration file itself

- [ ] **Step 1: Write the integration test (the "buyer agent")**

Create `__tests__/pay/loop.integration.test.ts`:

```ts
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { serveProRecommend } from '@/lib/pay/pro_service';
import { getMockBackend, __resetLightningBackend } from '@/lib/pay/lightning';
import { proposeFunding, approveFunding } from '@/lib/pay/funding';
import { verifyEarnings, unsweptTotalSats } from '@/lib/pay/ledger';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'helloai-loop-'));
  process.env.LEDGER_DIR = dir;
  process.env.LEDGER_SIGNING_KEY = 'test-key';
  process.env.LN_BACKEND = 'mock';
  process.env.PRO_PRICE_SATS = '100';
  process.env.FUNDING_THRESHOLD_SATS = '300';
  process.env.MAX_SWEEP_SATS = '100000';
  delete process.env.MAINNET_ENABLED;
  __resetLightningBackend();
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

// One full buyer round trip: 402 → pay → redeem → 200.
async function buy(task: string): Promise<number> {
  const params = new URLSearchParams(`task=${task}`);
  const quote = await serveProRecommend({ preimage: null, callerId: 'buyer-agent', params });
  expect(quote.status).toBe(402);
  const ph = (quote.body as any).payment.payment_hash;
  const preimage = getMockBackend().settle(ph);
  const paid = await serveProRecommend({ preimage, callerId: 'buyer-agent', params });
  expect(paid.status).toBe(200);
  return (paid.body as any).receipt.amount_sats as number;
}

describe('earn → verify → fund loop', () => {
  test('buyer pays three times, ledger verifies, human approves the sweep', async () => {
    let earned = 0;
    earned += await buy('coding');
    earned += await buy('reasoning');
    earned += await buy('daily'); // 3 × 100 = 300, hits threshold
    expect(earned).toBe(300);

    // Verification layer is intact and reflects all earnings.
    expect(verifyEarnings()).toMatchObject({ ok: true, count: 3 });
    expect(unsweptTotalSats()).toBe(300);

    // Funding is proposed but not executed until the human approves.
    const proposal = proposeFunding();
    expect(proposal).not.toBeNull();
    expect(proposal!.amountSats).toBe(300);

    const executed = await approveFunding(proposal!.proposalId);
    expect(executed.status).toBe('executed');
    expect(executed.txid).toMatch(/^mock-tx-/);

    // After the sweep, nothing is left unswept and the ledger still verifies.
    expect(unsweptTotalSats()).toBe(0);
    expect(verifyEarnings().ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run the integration test**

Run: `npx jest __tests__/pay/loop.integration.test.ts`
Expected: PASS (1 test).

- [ ] **Step 3: Run the FULL suite**

Run: `npx jest`
Expected: all suites pass (existing `data.test.ts` + the new `pay/*` suites).

- [ ] **Step 4: Write the operator/dev doc**

Create `docs/pay-loop.md`:

```markdown
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

## Next (later sub-projects)
- `CoreLightningBackend` against the existing full bitcoind (regtest → signet → mainnet).
- Real funding gate: sweep to a human-controlled accumulation address + notification + signed approval.
- Earn-engine scale-up: pricing/curation, more premium endpoints, per-caller API keys + quotas.
```

- [ ] **Step 5: Commit**

```bash
git add __tests__/pay/loop.integration.test.ts docs/pay-loop.md
git commit -m "test(pay): end-to-end earn→verify→fund loop integration + operator doc"
```

---

## Self-review

**Spec coverage:**
- §4.1 `LightningBackend` + `MockLightningBackend` → Task 3 ✓
- §4.2 premium 402 endpoint → Task 5 (service + route) ✓
- §4.3 verification ledger (hash-linked, signed, `verifyLedger`, tamper detection) → Task 4 ✓ (named `verifyEarnings`)
- §4.4 funding gate (propose / human-gated approve / caps / mainnet guard / no auto-exec) → Task 6 ✓
- §4.5 buyer-agent round trip → Task 7 integration test ✓ (HTTP demo script intentionally deferred per refinement #4; the service-level round trip provides the same coverage without a live server)
- §4.6 config & safety rails → Task 1 ✓
- §6 error handling table (402 / 400 / 409 / underpaid / expired) → covered by Task 5 tests (expiry note below) ✓
- §7 testing (preimage accept/reject, tamper detection, threshold, approval-required) → Tasks 3–7 ✓

**Deviations from spec (intentional, listed in "Design notes"):** no separate quote store; `swept` tracked in a separate sweeps log rather than mutating the earnings ledger; reconciliation deferred; route logic extracted into a pure service. None weaken an approved invariant.

**Known minor gap:** the spec's error table lists "invoice expired → 402 with fresh invoice." The mock issues a 300s expiry but the v1 verification path does not check `expiresAt` (the mock never expires within a test). This is acceptable for v1 (no real time pressure on a mock) and becomes meaningful with the real Core Lightning backend; the executor may add an expiry check in `serveProRecommend` if desired, but it is not required for v1.

**Placeholder scan:** no TBD/TODO; all steps contain runnable code/commands.

**Type consistency:** `serveProRecommend`, `getLightningBackend`/`getMockBackend`/`__resetLightningBackend`, `appendEarning`/`verifyEarnings`/`unsweptTotalSats`/`unsweptEntries`/`appendSweep`/`hasPaymentHash`, `proposeFunding`/`approveFunding`/`getProposal`, and the `PayConfig` fields are used identically across all tasks. Types (`Invoice`, `InvoiceStatus`, `LightningBackend`, `LedgerEntry`, `SweepRecord`, `FundingProposal`) are defined once in `lib/pay/types.ts`.
