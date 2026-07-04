import { getCorsHeaders } from '@/lib/cors';
import { getModels } from '@/data';
import { sanitizeTask } from '@/lib/sanitize';

// Standard JSON response headers: Content-Type + CORS + Cache-Control.
// Cache-Control is ALWAYS set: omitting the header would leave caching to
// intermediary heuristics, so "no cacheControl passed" means the safe default
// 'private, no-store' (relied on by the paid /api/pro/recommend endpoint,
// which must never be cached).
//
// Replaces the per-route HEADERS boilerplate that duplicated Content-Type and
// getCorsHeaders() across every route handler.
export function apiHeaders(
  origin: string | null,
  cacheControl?: string | null
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...getCorsHeaders(origin),
    'Cache-Control': cacheControl || 'private, no-store',
  };
}

// SOL-005 cache-key safety for routes that are publicly cacheable only when
// called with no query string. Decided from the whole query string — not an
// allowlist of known params — so a param added later can never silently
// reopen shared caching.
export function publicUnlessParameterized(
  searchParams: URLSearchParams,
  publicDirective = 'public, s-maxage=300, stale-while-revalidate=600'
): string {
  return searchParams.size > 0 ? 'private, no-store' : publicDirective;
}

// Providers derive from static models.json — computed once, not per request.
const KNOWN_PROVIDERS = [...new Set(getModels().map((m) => m.provider.toLowerCase()))];

// Full-string numeric formats. parseInt/parseFloat prefix-parsing would turn
// min_context=1e6 into 1 and limit=2.9 into 2 — silently wrong results, so
// the whole value must be numeric before it is parsed.
const INT_RE = /^\d+$/;
const DECIMAL_RE = /^\d+(\.\d+)?$/;

export interface RecommendParams {
  task: string | null;
  maxCost: number | null;
  minContext: number | null;
  provider: string | null;
  limit: number | null;
}

export type RecommendParamsResult =
  | { ok: true; params: RecommendParams }
  | { ok: false; body: { error: string; details: string; valid_providers?: string[] } };

// Strict parser for the /api/recommend query contract, shared by the public
// route and the Pro service (lib/pay/pro_service.ts) so their validation can
// never drift. An empty value (`?limit=`) is treated as absent, same as an
// omitted param. `defaultLimit: null` means "no cap" (the Pro perk).
export function parseRecommendParams(
  searchParams: URLSearchParams,
  opts: { defaultLimit: number | null }
): RecommendParamsResult {
  const get = (key: string): string | null => {
    const v = searchParams.get(key);
    return v === null || v === '' ? null : v;
  };
  const invalid = (
    details: string,
    extra?: { valid_providers: string[] }
  ): RecommendParamsResult => ({
    ok: false,
    body: { error: 'Invalid parameter', details, ...extra },
  });

  // sanitizeTask returns null for absent OR sanitized-to-empty input, so a
  // `task=<>` (all-stripped) request is treated as the no-task path, not echoed.
  const task = sanitizeTask(get('task'));
  const maxCostParam = get('max_cost');
  const minContextParam = get('min_context');
  const provider = get('provider');
  const limitParam = get('limit');

  let limit = opts.defaultLimit;
  if (limitParam !== null) {
    const parsed = INT_RE.test(limitParam) ? parseInt(limitParam, 10) : NaN;
    if (isNaN(parsed) || parsed < 1 || parsed > 10) {
      return invalid('limit must be an integer between 1 and 10');
    }
    limit = parsed;
  }

  let maxCost: number | null = null;
  if (maxCostParam !== null) {
    maxCost = DECIMAL_RE.test(maxCostParam) ? parseFloat(maxCostParam) : NaN;
    if (isNaN(maxCost) || maxCost <= 0) {
      return invalid('max_cost must be a positive number');
    }
  }

  let minContext: number | null = null;
  if (minContextParam !== null) {
    minContext = INT_RE.test(minContextParam) ? parseInt(minContextParam, 10) : NaN;
    if (isNaN(minContext) || minContext <= 0) {
      return invalid('min_context must be a positive integer');
    }
  }

  if (provider !== null && !KNOWN_PROVIDERS.includes(provider.toLowerCase())) {
    return invalid(`provider must be one of: ${KNOWN_PROVIDERS.join(', ')}`, {
      valid_providers: KNOWN_PROVIDERS,
    });
  }

  return { ok: true, params: { task, maxCost, minContext, provider, limit } };
}
