import { NextRequest, NextResponse } from 'next/server';
import { getModels, getCategories, getSiteConfig } from '@/data';
import { scoreAndRank } from '@/data/recommend';
import { toRecommendationDTO, type RecommendResponseBody } from '@/data/api-types';
import { apiHeaders, parseRecommendParams, publicUnlessParameterized } from '@/lib/api';

// SOL-002 / SOL-005: input sanitization + cache-key safety. Validation lives
// in parseRecommendParams (lib/api.ts), shared with the Pro route so the two
// contracts can't drift. When any query string is present, the response is
// marked Cache-Control: private, no-store so a poisoned URL can never be
// cached and served to another user; the unparameterized endpoint (common
// case) stays cacheable for 5 min.

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const { searchParams } = req.nextUrl;
  const HEADERS = apiHeaders(origin, publicUnlessParameterized(searchParams));

  const parsed = parseRecommendParams(searchParams, { defaultLimit: 3 });
  if (!parsed.ok) {
    return NextResponse.json(parsed.body, { status: 400, headers: HEADERS });
  }
  const { task, maxCost, minContext, provider: providerParam } = parsed.params;
  const limit = parsed.params.limit ?? 3;

  const models = getModels();
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
