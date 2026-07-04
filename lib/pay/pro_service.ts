import { getModels, getCategories, getSiteConfig } from '@/data';
import { scoreAndRank } from '@/data/recommend';
import { sanitizeTask } from '@/lib/sanitize';
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
  // request. Same SOL-002/SOL-005 sanitization + provider/numeric guards as
  // the public route; limit is optional (omitted → return all recommendations,
  // preserving the Pro perk).
  const task = sanitizeTask(params.get('task'));
  const maxCostParam = params.get('max_cost');
  const minContextParam = params.get('min_context');
  const providerParam = params.get('provider');
  const limitParam = params.get('limit');

  const maxCost = maxCostParam ? parseFloat(maxCostParam) : null;
  const minContext = minContextParam ? parseInt(minContextParam, 10) : null;
  let limit: number | null = null;
  if (limitParam !== null) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 10) {
      recordProRequest({ ...meta, outcome: 'invalid_input', status: 400, latencyMs: Date.now() - startedAt });
      return { status: 400, body: { error: 'Invalid parameter', details: 'limit must be an integer between 1 and 10' } };
    }
    limit = parsed;
  }
  if (maxCostParam && (isNaN(maxCost!) || maxCost! <= 0)) {
    recordProRequest({ ...meta, outcome: 'invalid_input', status: 400, latencyMs: Date.now() - startedAt });
    return { status: 400, body: { error: 'Invalid parameter', details: 'max_cost must be a positive number' } };
  }
  if (minContextParam && (isNaN(minContext!) || minContext! <= 0)) {
    recordProRequest({ ...meta, outcome: 'invalid_input', status: 400, latencyMs: Date.now() - startedAt });
    return { status: 400, body: { error: 'Invalid parameter', details: 'min_context must be a positive integer' } };
  }
  const knownProviders = [...new Set(getModels().map((m) => m.provider.toLowerCase()))];
  if (providerParam && !knownProviders.includes(providerParam.toLowerCase())) {
    recordProRequest({ ...meta, outcome: 'invalid_input', status: 400, latencyMs: Date.now() - startedAt });
    return {
      status: 400,
      body: { error: 'Invalid parameter', details: `provider must be one of: ${knownProviders.join(', ')}`, valid_providers: knownProviders },
    };
  }

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
