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
