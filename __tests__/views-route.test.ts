import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/views/route';
import { GET as STREAM } from '@/app/api/views/stream/route';
import { MAX_PER_OWNER, resetViewsForTests } from '@/lib/views-store';

const BROWSER = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const post = (body: unknown, xff = '198.51.100.1') =>
  POST(new NextRequest('http://localhost/api/views', { method: 'POST', body: JSON.stringify(body), headers: { 'x-forwarded-for': xff, 'user-agent': BROWSER } }));

beforeEach(() => resetViewsForTests());
afterAll(() => resetViewsForTests());

test('POST counts once per IP and returns stats', async () => {
  expect((await (await post({ slug: 'home' })).json()).total).toBe(1);
  expect((await (await post({ slug: 'home' })).json()).total).toBe(1);
  expect((await (await post({ slug: 'home' }, '198.51.100.2')).json()).total).toBe(2);
});
test('POST rejects unknown slugs and bad bodies', async () => {
  expect((await post({ slug: 'x' })).status).toBe(404);
  expect((await post({ slug: 1 })).status).toBe(404);
  const bad = await POST(new NextRequest('http://localhost/api/views', { method: 'POST', body: 'nope' }));
  expect(bad.status).toBe(400);
});
test('GET by slug and by batch', async () => {
  await post({ slug: 'home' });
  const one = await GET(new NextRequest('http://localhost/api/views?slug=home'));
  expect((await one.json()).views).toBe(1);
  const many = await GET(new NextRequest('http://localhost/api/views?slugs=home,bogus'));
  expect((await many.json()).stats).toEqual({ home: 1 });
  expect((await GET(new NextRequest('http://localhost/api/views?slug=bogus'))).status).toBe(404);
});
test('stream sends an initial stats event and stops on abort', async () => {
  const ac = new AbortController();
  const res = await STREAM(new NextRequest('http://localhost/api/views/stream?slug=home&presence=1', { headers: { 'x-forwarded-for': '198.51.100.8', 'user-agent': BROWSER }, signal: ac.signal }));
  expect(res.headers.get('content-type')).toBe('text/event-stream');
  const reader = res.body!.getReader();
  let text = '';
  while (!text.includes('event: stats')) text += new TextDecoder().decode((await reader.read()).value);
  expect(text).toContain('"viewing":1');
  ac.abort();
  const { getStats } = await import('@/lib/views-store');
  expect(getStats('home').viewing).toBe(0);
});
test('presence needs a browser UA (403); a watcher does not', async () => {
  const curl = { headers: { 'user-agent': 'curl/8.5' } };
  expect((await STREAM(new NextRequest('http://localhost/api/views/stream?slug=home&presence=1', curl))).status).toBe(403);
  const ac = new AbortController();
  const ok = await STREAM(new NextRequest('http://localhost/api/views/stream?slug=home', { ...curl, signal: ac.signal }));
  expect(ok.status).toBe(200);
  ac.abort();
});
test('stream returns 503, not a broken 200, when one client holds too many', async () => {
  const acs: AbortController[] = [];
  const open = () => {
    const ac = new AbortController();
    acs.push(ac);
    return STREAM(new NextRequest('http://localhost/api/views/stream?slug=home&presence=1', { headers: { 'x-forwarded-for': '198.51.100.9', 'user-agent': BROWSER }, signal: ac.signal }));
  };
  for (let i = 0; i < MAX_PER_OWNER; i++) expect((await open()).status).toBe(200);
  expect((await open()).status).toBe(503);
  acs.forEach((a) => a.abort());
});
test('stream 404s on unknown slug', async () => {
  const res = await STREAM(new NextRequest('http://localhost/api/views/stream?slug=nope'));
  expect(res.status).toBe(404);
});
