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
