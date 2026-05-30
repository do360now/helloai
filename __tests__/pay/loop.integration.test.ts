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
