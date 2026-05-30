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
