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

  test('verifyEarnings detects front-truncation (non-contiguous seq)', () => {
    addEarning(100); // seq 0
    addEarning(200); // seq 1
    const path = join(dir, 'earnings.jsonl');
    const lines = readFileSync(path, 'utf8').trim().split('\n');
    // Drop the genesis line, leaving the seq-1 entry at index 0.
    writeFileSync(path, lines[1] + '\n');
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
