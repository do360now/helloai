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
