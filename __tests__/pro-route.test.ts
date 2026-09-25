/**
 * /api/pro/recommend is frozen (docs/review/monetisation.md, step 2, M2 = a):
 * money flows only through app.helloai.com. lib/pay/* and its tests are kept.
 */
import { NextRequest } from 'next/server';
import { GET, OPTIONS } from '@/app/api/pro/recommend/route';

const req = (url: string, headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost${url}`, { headers });

describe('/api/pro/recommend (frozen)', () => {
  it('returns 410 gone with a pointer to the app', async () => {
    const res = await GET(req('/api/pro/recommend?task=coding'));
    expect(res.status).toBe(410);
    await expect(res.json()).resolves.toEqual({ error: 'gone', see: 'https://app.helloai.com' });
  });

  it('returns 410 even when a preimage header is sent (no payment path is reachable)', async () => {
    const res = await GET(req('/api/pro/recommend?task=coding', { 'x-preimage': 'deadbeef', 'x-agent-id': 'a' }));
    expect(res.status).toBe(410);
  });

  it('never returns a Lightning invoice (402) any more', async () => {
    const res = await GET(req('/api/pro/recommend'));
    expect(res.status).not.toBe(402);
    expect(res.headers.get('x-receipt')).toBeNull();
  });

  it('still answers CORS preflight', () => {
    expect(OPTIONS(req('/api/pro/recommend')).status).toBe(204);
  });
});
