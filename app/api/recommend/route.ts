import { NextRequest, NextResponse } from 'next/server';
import { getModels, getCategories, getSiteConfig } from '@/data';
import { scoreAndRank } from '@/data/recommend';
import { getCorsHeaders } from '@/lib/cors';

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const HEADERS = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    ...getCorsHeaders(origin),
  };
  const { searchParams } = req.nextUrl;

  const task = searchParams.get('task');
  const maxCostParam = searchParams.get('max_cost');
  const minContextParam = searchParams.get('min_context');
  const providerParam = searchParams.get('provider');
  const limitParam = searchParams.get('limit');

  const maxCost = maxCostParam ? parseFloat(maxCostParam) : null;
  const minContext = minContextParam ? parseInt(minContextParam) : null;
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam), 1), 10) : 3;

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

  const output = recommendations.slice(0, limit).map(({ model, score, reasons }, i) => ({
    rank: i + 1,
    score,
    reasons,
    model: {
      id: model.id,
      name: model.name,
      provider: model.provider,
      url: model.url,
      tag: model.tag,
      elo: model.elo,
      cost_per_million_tokens: model.cost_per_million_tokens,
      cost_per_million_tokens_output: model.cost_per_million_tokens_output,
      context_window: model.context_window,
    },
  }));

  return NextResponse.json(
    {
      query: { task, max_cost: maxCost, min_context: minContext, provider: providerParam ?? null, limit },
      recommendations: output,
      filters_applied: filtersApplied,
      models_considered: models.length,
      models_excluded: excluded,
      matched_category: matchedCategory?.name ?? null,
      last_updated: config.lastUpdated,
    },
    { headers: HEADERS }
  );
}
