import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
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
