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

export type ProOutcome =
  | 'quote'            // 402 + invoice issued (no payment presented)
  | 'invalid_input'    // 400 malformed query parameter (validated before payment)
  | 'invalid_preimage' // 400 malformed X-Preimage
  | 'unsettled'        // 402 no settled invoice matches the preimage
  | 'underpaid'        // 402 paid less than the price
  | 'replay'           // 409 receipt already used
  | 'redeemed';        // 200 success

export interface ProRequestEvent {
  ts: number;            // epoch ms, stamped by recordProRequest
  outcome: ProOutcome;
  status: number;        // HTTP status returned to the caller
  callerId: string;      // self-reported X-Agent-Id (opaque), 'anonymous' if absent
  task: string | null;
  maxCost: string | null;
  minContext: string | null;
  provider: string | null;
  paymentHash?: string;  // present once a preimage maps to an invoice; NEVER the preimage
  amountSats?: number;   // paid amount (underpaid) or earned amount (redeemed)
  latencyMs: number;     // total handler time
}
