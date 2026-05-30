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
