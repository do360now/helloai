import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getConfig } from './config';
import { getLightningBackend } from './lightning';
import { unsweptEntries, unsweptTotalSats, verifyEarnings, appendSweep, readSweeps } from './ledger';
import type { FundingProposal } from './types';

function proposalsPath(): string {
  return join(getConfig().ledgerDir, 'proposals.jsonl');
}
function readProposals(): FundingProposal[] {
  const p = proposalsPath();
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as FundingProposal);
}
function writeProposals(ps: FundingProposal[]): void {
  const d = getConfig().ledgerDir;
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  writeFileSync(proposalsPath(), ps.map((p) => JSON.stringify(p)).join('\n') + (ps.length ? '\n' : ''));
}

export function getProposal(id: string): FundingProposal | undefined {
  return readProposals().find((p) => p.proposalId === id);
}

/** Write-only: surfaces a proposal when earnings cross the threshold. NEVER moves funds. */
export function proposeFunding(): FundingProposal | null {
  const cfg = getConfig();
  const total = unsweptTotalSats();
  if (total < cfg.fundingThresholdSats) return null;
  const entries = unsweptEntries();
  const proposal: FundingProposal = {
    proposalId: randomBytes(6).toString('hex'),
    amountSats: total,
    destination: cfg.accumulationAddress,
    ledgerRange: [entries[0].seq, entries[entries.length - 1].seq],
    createdAt: Date.now(),
    status: 'pending',
  };
  const ps = readProposals();
  ps.push(proposal);
  writeProposals(ps);
  console.log(
    `[funding] PROPOSAL ${proposal.proposalId}: sweep ${total} sats -> ${cfg.accumulationAddress} ` +
      `(seqs ${proposal.ledgerRange[0]}..${proposal.ledgerRange[1]}). ` +
      `Approve with approveFunding('${proposal.proposalId}').`
  );
  return proposal;
}

/** The ONLY path that executes a sweep. Must be called explicitly by a human. */
export async function approveFunding(proposalId: string): Promise<FundingProposal> {
  const cfg = getConfig();
  if (cfg.mainnetEnabled) {
    throw new Error('mainnet gate: v1 refuses to execute real sweeps (MAINNET_ENABLED must be false)');
  }
  const ps = readProposals();
  const p = ps.find((x) => x.proposalId === proposalId);
  if (!p) throw new Error(`unknown proposal ${proposalId}`);
  if (p.status !== 'pending') throw new Error(`proposal ${proposalId} is ${p.status}, not pending`);
  if (readSweeps().some((s) => s.proposalId === p.proposalId)) {
    throw new Error(`proposal ${proposalId} already has a recorded sweep`);
  }
  if (p.amountSats > cfg.maxSweepSats) {
    throw new Error(`amount ${p.amountSats} exceeds MAX_SWEEP_SATS ${cfg.maxSweepSats}`);
  }
  const report = verifyEarnings();
  if (!report.ok) throw new Error(`ledger integrity check failed: ${report.error}`);

  const { txid } = await getLightningBackend().paySweep(p.destination, p.amountSats);
  appendSweep({
    proposalId: p.proposalId,
    amountSats: p.amountSats,
    destination: p.destination,
    ledgerRange: p.ledgerRange,
    txid,
    ts: Date.now(),
  });
  p.status = 'executed';
  p.txid = txid;
  p.executedAt = Date.now();
  writeProposals(ps);
  return p;
}
