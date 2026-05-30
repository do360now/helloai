import { getModels, getCategories, getSiteConfig } from '@/data';
import { scoreAndRank } from '@/data/recommend';
import { getConfig } from './config';
import { getLightningBackend } from './lightning';
import { sha256OfHex } from './hash';
import { appendEarning, hasPaymentHash } from './ledger';

export interface ProResult {
  status: number;
  body: unknown;
  receiptHeader?: string;
}

export async function serveProRecommend(input: {
  preimage: string | null;
  callerId: string;
  params: URLSearchParams;
}): Promise<ProResult> {
  const cfg = getConfig();
  const backend = getLightningBackend();
  const { preimage, callerId, params } = input;

  if (!preimage) {
    const inv = await backend.createInvoice(cfg.proPriceSats, 'helloai pro/recommend', 300);
    return {
      status: 402,
      body: {
        error: 'Payment required',
        payment: {
          invoice: inv.bolt11,
          payment_hash: inv.paymentHash,
          amount_sats: inv.amountSats,
          expires_at: inv.expiresAt,
        },
        hint: 'Pay the invoice, then retry with header X-Preimage: <64-hex>',
      },
    };
  }

  if (!/^[0-9a-fA-F]{64}$/.test(preimage)) {
    return { status: 400, body: { error: 'Invalid X-Preimage', details: 'must be 64 hex chars (32 bytes)' } };
  }

  const pre = preimage.toLowerCase();
  const paymentHash = sha256OfHex(pre);
  const st = await backend.lookupInvoice(paymentHash);
  if (!st.known || !st.settled) {
    return { status: 402, body: { error: 'Payment not settled', details: 'no settled invoice matches this preimage' } };
  }
  if ((st.amountPaidSats ?? 0) < cfg.proPriceSats) {
    return { status: 402, body: { error: 'Underpaid', details: `paid ${st.amountPaidSats}, required ${cfg.proPriceSats}` } };
  }
  if (hasPaymentHash(paymentHash)) {
    return { status: 409, body: { error: 'Receipt already used', details: 'this payment was already redeemed' } };
  }

  const entry = appendEarning({
    endpoint: '/api/pro/recommend',
    callerId,
    paymentHash,
    preimage: pre,
    amountSats: st.amountPaidSats!,
  });

  const models = getModels();
  const categories = getCategories();
  const site = getSiteConfig();
  const { recommendations, excluded, matchedCategory } = scoreAndRank(models, categories, {
    task: params.get('task'),
    maxCost: params.get('max_cost') ? parseFloat(params.get('max_cost')!) : null,
    minContext: params.get('min_context') ? parseInt(params.get('min_context')!, 10) : null,
    provider: params.get('provider'),
  });
  const full = recommendations.map(({ model, score, reasons }, i) => ({ rank: i + 1, score, reasons, model }));

  return {
    status: 200,
    receiptHeader: `seq=${entry.seq};payment_hash=${entry.paymentHash};amount_sats=${entry.amountSats}`,
    body: {
      tier: 'pro',
      recommendations: full,
      models_considered: models.length,
      models_excluded: excluded,
      matched_category: matchedCategory?.name ?? null,
      receipt: { seq: entry.seq, payment_hash: entry.paymentHash, amount_sats: entry.amountSats },
      last_updated: site.lastUpdated,
    },
  };
}
