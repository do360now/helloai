import { getModels, getCategories, getSiteConfig } from '@/data';
import { scoreAndRank } from '@/data/recommend';
import { parseRecommendParams } from '@/lib/api';
import { getConfig } from './config';
import { getLightningBackend } from './lightning';
import { sha256OfHex } from './hash';
import { appendEarning, hasPaymentHash } from './ledger';
import { recordProRequest } from './metrics';

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
  const startedAt = Date.now();
  const cfg = getConfig();
  const backend = getLightningBackend();
  const { preimage, callerId, params } = input;

  // Fields shared by every metrics record for this request.
  const meta = {
    callerId,
    task: params.get('task'),
    maxCost: params.get('max_cost'),
    minContext: params.get('min_context'),
    provider: params.get('provider'),
  };

  // --- Input validation (parity with public /api/recommend) -----------------
  // Validated BEFORE payment so a caller is never charged for a malformed
  // request. parseRecommendParams (lib/api.ts) is the same parser the public
  // route uses, so the two contracts cannot drift; limit is optional here
  // (omitted → return all recommendations, preserving the Pro perk).
  const parsed = parseRecommendParams(params, { defaultLimit: null });
  if (!parsed.ok) {
    recordProRequest({ ...meta, outcome: 'invalid_input', status: 400, latencyMs: Date.now() - startedAt });
    return { status: 400, body: parsed.body };
  }
  const { task, maxCost, minContext, provider: providerParam, limit } = parsed.params;

  if (!preimage) {
    const inv = await backend.createInvoice(cfg.proPriceSats, 'helloai pro/recommend', 300);
    recordProRequest({ ...meta, outcome: 'quote', status: 402, paymentHash: inv.paymentHash, latencyMs: Date.now() - startedAt });
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
    recordProRequest({ ...meta, outcome: 'invalid_preimage', status: 400, latencyMs: Date.now() - startedAt });
    return { status: 400, body: { error: 'Invalid X-Preimage', details: 'must be 64 hex chars (32 bytes)' } };
  }

  const pre = preimage.toLowerCase();
  const paymentHash = sha256OfHex(pre);
  const st = await backend.lookupInvoice(paymentHash);
  if (!st.known || !st.settled) {
    recordProRequest({ ...meta, outcome: 'unsettled', status: 402, paymentHash, latencyMs: Date.now() - startedAt });
    return { status: 402, body: { error: 'Payment not settled', details: 'no settled invoice matches this preimage' } };
  }
  if ((st.amountPaidSats ?? 0) < cfg.proPriceSats) {
    recordProRequest({ ...meta, outcome: 'underpaid', status: 402, paymentHash, amountSats: st.amountPaidSats ?? 0, latencyMs: Date.now() - startedAt });
    return { status: 402, body: { error: 'Underpaid', details: `paid ${st.amountPaidSats}, required ${cfg.proPriceSats}` } };
  }
  if (hasPaymentHash(paymentHash)) {
    recordProRequest({ ...meta, outcome: 'replay', status: 409, paymentHash, latencyMs: Date.now() - startedAt });
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
    task,
    maxCost,
    minContext,
    provider: providerParam,
  });
  const ranked = limit !== null ? recommendations.slice(0, limit) : recommendations;
  const full = ranked.map(({ model, score, reasons }, i) => ({ rank: i + 1, score, reasons, model }));

  recordProRequest({ ...meta, outcome: 'redeemed', status: 200, paymentHash, amountSats: entry.amountSats, latencyMs: Date.now() - startedAt });

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
