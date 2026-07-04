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

  // Input validation parity with public /api/recommend (SOL-002/SOL-005 class).
  // These must be rejected BEFORE payment, so no quote is issued for bad input.
  test('invalid limit → 400 before payment (no quote issued)', async () => {
    const r = await serveProRecommend({ preimage: null, callerId: 'a', params: params('task=coding&limit=99') });
    expect(r.status).toBe(400);
    expect((r.body as any).error).toMatch(/Invalid parameter/);
  });

  test('non-numeric max_cost → 400 before payment', async () => {
    const r = await serveProRecommend({ preimage: null, callerId: 'a', params: params('task=coding&max_cost=abc') });
    expect(r.status).toBe(400);
  });

  // parseInt prefix-parsing regressions: these previously slipped through as
  // 2 and 1 respectively; the shared parser must reject them outright.
  test('non-integer limit (2.9) → 400 before payment', async () => {
    const r = await serveProRecommend({ preimage: null, callerId: 'a', params: params('task=coding&limit=2.9') });
    expect(r.status).toBe(400);
  });

  test('scientific-notation min_context (1e6) → 400 before payment', async () => {
    const r = await serveProRecommend({ preimage: null, callerId: 'a', params: params('task=coding&min_context=1e6') });
    expect(r.status).toBe(400);
  });

  test('empty limit value is treated as absent, not invalid', async () => {
    const r = await serveProRecommend({ preimage: null, callerId: 'a', params: params('task=coding&limit=') });
    expect(r.status).toBe(402); // quote issued — input was acceptable
  });

  test('unknown provider → 400 before payment', async () => {
    const r = await serveProRecommend({ preimage: null, callerId: 'a', params: params('task=coding&provider=NoSuchProvider') });
    expect(r.status).toBe(400);
    expect((r.body as any).valid_providers).toBeDefined();
  });

  test('sanitizes task before scoring (XSS scaffolding stripped)', async () => {
    const quote = await serveProRecommend({ preimage: null, callerId: 'a', params: params('task=<script>coding</script>') });
    const ph = (quote.body as any).payment.payment_hash;
    const preimage = getMockBackend().settle(ph);
    const r = await serveProRecommend({ preimage, callerId: 'a', params: params('task=<script>coding</script>') });
    expect(r.status).toBe(200);
    // The sanitized task 'scriptcoding' / 'coding' no longer reflects raw <> chars;
    // matched_category still resolves because 'coding' survives sanitization.
    const body = r.body as any;
    expect(body.matched_category).toBe('Coding & Engineering');
  });

  test('valid limit caps the number of recommendations', async () => {
    const quote = await serveProRecommend({ preimage: null, callerId: 'a', params: params('task=coding&limit=2') });
    const ph = (quote.body as any).payment.payment_hash;
    const preimage = getMockBackend().settle(ph);
    const r = await serveProRecommend({ preimage, callerId: 'a', params: params('task=coding&limit=2') });
    expect(r.status).toBe(200);
    expect((r.body as any).recommendations.length).toBeLessThanOrEqual(2);
  });
});
