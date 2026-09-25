/**
 * /api/recommend with unrated (borrowed) models, against a FIXTURE roster in which claude and grok are borrowed.
 * The live data may or may not have borrowed models on a given day; these tests must not care.
 */
import { NextRequest } from 'next/server';

jest.mock('@/data', () => {
  const actual = jest.requireActual('@/data');
  const { withBorrowed } = jest.requireActual('./helpers/roster');
  return { ...actual, getModels: () => withBorrowed(actual.getModels(), ['claude', 'grok']) };
});

import { GET as recommendGET } from '@/app/api/recommend/route';

const req = (url: string) => new NextRequest(`http://localhost${url}`);
type U = { reason: string; arena_model?: string; elo_source?: { matches_listed_model: boolean; arena_model: string }; model: { id: string } };

describe('GET /api/recommend with borrowed models', () => {
  it('lists them separately with a reason and the Arena slug, and never ranks them', async () => {
    const body = await (await recommendGET(req('/api/recommend?limit=10'))).json();
    const ranked = body.recommendations.map((r: { model: { id: string } }) => r.model.id);
    expect(ranked).not.toContain('claude');
    expect(ranked).not.toContain('grok');
    expect(body.unrated.map((u: U) => u.model.id).sort()).toEqual(['claude', 'grok']);
    const claude = body.unrated.find((u: U) => u.model.id === 'claude') as U;
    expect(claude.reason).toBe('borrowed_score');
    expect(claude.arena_model).toBe('claude-predecessor-slug');
    expect(claude.elo_source!.matches_listed_model).toBe(false);
    expect(claude.model).not.toHaveProperty('desc');
    // A caller reading model.elo must not get a predecessor's number as this model's score.
    expect(claude.model).not.toHaveProperty('elo');
    expect(body.notes).toEqual(expect.any(Array));
  });

  it('a filter that leaves only an unrated model returns 200 with an empty ranking, not a fake rank', async () => {
    const res = await recommendGET(req('/api/recommend?provider=xai'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recommendations).toEqual([]);
    expect(body.unrated.map((u: U) => u.model.id)).toEqual(['grok']);
  });
});
