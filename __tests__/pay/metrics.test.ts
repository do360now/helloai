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
    // /dev/null is a character device — creating a subdir inside it fails immediately (ENOTDIR)
    process.env.LEDGER_DIR = '/dev/null/cannot-write';
    expect(() =>
      recordProRequest({ ...baseEvent, outcome: 'quote', status: 402 }),
    ).not.toThrow();
  });
});
