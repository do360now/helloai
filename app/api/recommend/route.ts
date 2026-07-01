import { NextRequest, NextResponse } from 'next/server';
import { getModels, getCategories, getSiteConfig } from '@/data';
import { scoreAndRank } from '@/data/recommend';
import { getCorsHeaders } from '@/lib/cors';

// ---------------------------------------------------------------------------
// SOL-002 / SOL-005: input sanitization + cache-key safety.
//
// Prior state: the raw `task` query param was reflected verbatim into the JSON
// response body (`query.task`). While no client sink renders it unescaped today
// (both dangerouslySetInnerHTML sinks are JSON.stringify of owner-authored
// schema.org data), reflecting user input is a latent XSS / cache-poisoning
// chain. Two controls:
//   1. sanitizeTask() — strip control chars, angle brackets, quotes; cap length.
//   2. When any user-supplied query param is present, mark the response
//      Cache-Control: private, no-store so a poisoned URL can never be cached
//      and served to another user. The unparameterized /api/recommend (the
//      common case) stays cacheable for 5 min, preserving the perf win.
// ---------------------------------------------------------------------------

const MAX_TASK_LEN = 64;

function sanitizeTask(raw: string | null): string | null {
  if (raw === null) return null;
  // Strip < > " ' & and control chars — breaks HTML/JSON injection scaffolding.
  // Keep alphanumerics, spaces, hyphens, underscores, basic punctuation.
  const cleaned = raw
    .replace(/[<>"'&]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, MAX_TASK_LEN);
  return cleaned.length > 0 ? cleaned : null;
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const { searchParams } = req.nextUrl;

  const taskRaw = searchParams.get('task');
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

  const HEADERS = {
    'Content-Type': 'application/json',
    'Cache-Control': isParameterized
      ? 'private, no-store'
      : 'public, s-maxage=300, stale-while-revalidate=600',
    ...getCorsHeaders(origin),
  };

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
