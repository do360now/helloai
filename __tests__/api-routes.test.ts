/**
 * Route-handler coverage for /api/models, /api/recommend, /api/status.
 *
 * Prior to this file, only the extracted param parser (parseRecommendParams,
 * see api-params.test.ts) had direct tests — the GET handlers that wire it
 * together (filtering, DTO shaping, 404 no-match path, response headers)
 * had zero coverage. Body-shape assertions below match what the handlers
 * actually return (confirmed by reading app/api/{models,recommend,status}/route.ts),
 * not the illustrative brief.
 */
import { NextRequest } from 'next/server';
import { GET as modelsGET, OPTIONS as modelsOPTIONS } from '@/app/api/models/route';
import { GET as recommendGET, OPTIONS as recommendOPTIONS } from '@/app/api/recommend/route';
import { GET as statusGET, OPTIONS as statusOPTIONS } from '@/app/api/status/route';
import { getModels } from '@/data';

const req = (url: string) => new NextRequest(`http://localhost${url}`);

describe('GET /api/models', () => {
  it('returns every model with a count and last_updated', async () => {
    const res = await modelsGET(req('/api/models'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(getModels().length);
    expect(body.models).toHaveLength(getModels().length);
    expect(typeof body.last_updated).toBe('string');
  });

  it('filters by provider (case-insensitive, substring match)', async () => {
    const res = await modelsGET(req('/api/models?provider=anthropic'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBeGreaterThan(0);
    expect(body.count).toBeLessThan(getModels().length);
    expect(
      (body.models as Array<{ provider: string }>).every(
        (m) => m.provider.toLowerCase().includes('anthropic')
      )
    ).toBe(true);
  });

  it('unknown provider returns 200 with an empty (not 404) list', async () => {
    // /api/models has no hard-filter validation like /api/recommend — an
    // unmatched provider substring just yields zero results, still a 200.
    const res = await modelsGET(req('/api/models?provider=nosuchprovider'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(0);
    expect(body.models).toEqual([]);
  });

  it('OPTIONS returns 204', () => {
    const res = modelsOPTIONS(req('/api/models'));
    expect(res.status).toBe(204);
  });
});

describe('GET /api/recommend', () => {
  it('returns ranked recommendations for a matched task', async () => {
    const res = await recommendGET(req('/api/recommend?task=coding'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matched_category).toBe('Coding & Engineering');
    expect(body.recommendations.length).toBeGreaterThan(0);
    expect(body.recommendations.length).toBeLessThanOrEqual(3); // default limit
    expect(body.query).toMatchObject({ task: 'coding', limit: 3 });
    expect(body.models_considered).toBe(getModels().length);
    // Recommendations are ranked 1..N and each carries a lean model DTO.
    expect(body.recommendations[0].rank).toBe(1);
    expect(body.recommendations[0].model).toHaveProperty('id');
    expect(body.recommendations[0].model).not.toHaveProperty('desc');
  });

  it('returns 404 when filters exclude every model', async () => {
    const res = await recommendGET(req('/api/recommend?max_cost=0.000001'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('No models match filters');
    expect(Array.isArray(body.valid_tasks)).toBe(true);
  });

  it('rejects a non-numeric max_cost with 400 (parser is strict, not silently ignoring)', async () => {
    const res = await recommendGET(req('/api/recommend?max_cost=not-a-number'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid parameter');
    expect(body.details).toMatch(/max_cost/);
  });

  it('rejects an unknown provider with 400 and a valid_providers list', async () => {
    const res = await recommendGET(req('/api/recommend?provider=NoSuchProvider'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(Array.isArray(body.valid_providers)).toBe(true);
  });

  it('respects an explicit limit within [1,10]', async () => {
    const res = await recommendGET(req('/api/recommend?limit=1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recommendations).toHaveLength(1);
    expect(body.query.limit).toBe(1);
  });

  it('OPTIONS returns 204', () => {
    const res = recommendOPTIONS(req('/api/recommend'));
    expect(res.status).toBe(204);
  });
});

describe('GET /api/status', () => {
  it('reports ok with a version field and the endpoint manifest', async () => {
    const res = await statusGET(req('/api/status'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.version).toBeDefined();
    expect(body.models_count).toBe(getModels().length);
    expect(Array.isArray(body.endpoints)).toBe(true);
    expect(body.endpoints.map((e: { path: string }) => e.path)).toEqual(
      expect.arrayContaining(['/api/models', '/api/recommend', '/api/status'])
    );
  });

  it('OPTIONS returns 204', () => {
    const res = statusOPTIONS(req('/api/status'));
    expect(res.status).toBe(204);
  });
});
