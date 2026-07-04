import { NextRequest, NextResponse } from 'next/server';
import { getModels, getCategories, getSiteConfig } from '@/data';
import { scoreAndRank } from '@/data/recommend';
import { toRecommendationDTO, type RecommendResponseBody } from '@/data/api-types';
import { apiHeaders } from '@/lib/api';
import { sanitizeTask } from '@/lib/sanitize';

// SOL-002 / SOL-005: input sanitization + cache-key safety. sanitizeTask() is
// shared with the Pro route via lib/sanitize.ts. When any user-supplied query
// param is present, the response is marked Cache-Control: private, no-store so
// a poisoned URL can never be cached and served to another user; the
// unparameterized endpoint (common case) stays cacheable for 5 min.

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const { searchParams } = req.nextUrl;

  const taskRaw = searchParams.get('task');
  // sanitizeTask returns null for absent OR sanitized-to-empty input, so a
  // `task=<>` (all-stripped) request is treated as the no-task path, not echoed.
  const task = sanitizeTask(taskRaw);
  const maxCostParam = searchParams.get('max_cost');
  const minContextParam = searchParams.get('min_context');
  const providerParam = searchParams.get('provider');
  const limitParam = searchParams.get('limit');

  // SOL-005: if any filter param is present, do not cache. The unparameterized
  // endpoint (no query string at all) stays public+cacheable.
  const isParameterized =
    taskRaw !== null ||
    maxCostParam !== null ||
    minContextParam !== null ||
    providerParam !== null ||
    limitParam !== null;

  const CACHE_CONTROL = isParameterized
    ? 'private, no-store'
    : 'public, s-maxage=300, stale-while-revalidate=600';
  const HEADERS = apiHeaders(origin, CACHE_CONTROL);

  const maxCost = maxCostParam ? parseFloat(maxCostParam) : null;
  const minContext = minContextParam ? parseInt(minContextParam) : null;
  // limit: default 3. If supplied, must be an integer in 1–10 — reject with
  // 400 instead of silently clamping, so callers learn their input was wrong.
  let limit = 3;
  if (limitParam !== null) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 10) {
      return NextResponse.json(
        { error: 'Invalid parameter', details: 'limit must be an integer between 1 and 10' },
        { status: 400, headers: HEADERS }
      );
    }
    limit = parsed;
  }

  if (maxCostParam && (isNaN(maxCost!) || maxCost! <= 0)) {
    return NextResponse.json(
      { error: 'Invalid parameter', details: 'max_cost must be a positive number' },
      { status: 400, headers: HEADERS }
    );
  }
  if (minContextParam && (isNaN(minContext!) || minContext! <= 0)) {
    return NextResponse.json(
      { error: 'Invalid parameter', details: 'min_context must be a positive integer' },
      { status: 400, headers: HEADERS }
    );
  }

  // Validate provider parameter against known providers
  const models = getModels();
  const allProviders = [...new Set(models.map((m) => m.provider.toLowerCase()))];
  if (providerParam && !allProviders.includes(providerParam.toLowerCase())) {
    return NextResponse.json(
      {
        error: 'Invalid parameter',
        details: `provider must be one of: ${allProviders.join(', ')}`,
        valid_providers: allProviders,
      },
      { status: 400, headers: HEADERS }
    );
  }
  const categories = getCategories();
  const config = getSiteConfig();

  const { recommendations, excluded, matchedCategory } = scoreAndRank(models, categories, {
    task,
    maxCost,
    minContext,
    provider: providerParam,
  });

  if (recommendations.length === 0) {
    return NextResponse.json(
      {
        error: 'No models match filters',
        details: 'Try relaxing your constraints.',
        valid_tasks: categories.map((c) => c.name),
      },
      { status: 404, headers: HEADERS }
    );
  }

  const filtersApplied = [
    task && `task=${task}`,
    maxCost !== null && `max_cost=${maxCost}`,
    minContext !== null && `min_context=${minContext}`,
    providerParam && `provider=${providerParam}`,
  ].filter(Boolean) as string[];

  const output = recommendations.slice(0, limit).map((rec, i) => toRecommendationDTO(rec, i + 1));

  const body: RecommendResponseBody = {
    query: { task, max_cost: maxCost, min_context: minContext, provider: providerParam ?? null, limit },
    recommendations: output,
    filters_applied: filtersApplied,
    models_considered: models.length,
    models_excluded: excluded,
    matched_category: matchedCategory?.name ?? null,
    last_updated: config.lastUpdated,
  };

  return NextResponse.json(body, { headers: HEADERS });
}
