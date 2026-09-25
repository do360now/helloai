import { NextRequest } from 'next/server';
import { GET } from '@/app/go/[dest]/route';

const call = (dest: string, qs = '') =>
  GET(new NextRequest(`http://localhost/go/${dest}${qs}`), { params: Promise.resolve({ dest }) });

describe('GET /go/[dest]', () => {
  let spy: jest.SpyInstance;
  beforeEach(() => { spy = jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => spy.mockRestore());

  it('redirects a known destination to its allow-listed URL', async () => {
    const res = await call('app', '?from=hero-cta');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://app.helloai.com/');
  });

  it('returns 404 for an unknown destination and never redirects to request input', async () => {
    const res = await call('https%3A%2F%2Fevil.example', '?to=https://evil.example');
    expect(res.status).toBe(404);
    expect(res.headers.get('location')).toBeNull();
  });

  it('drops a malformed from value instead of reflecting it', async () => {
    await call('app', '?from=<script>alert(1)</script>');
    const line = spy.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('[go-metrics] '))!;
    expect(line).not.toContain('script');
    expect(JSON.parse(line.slice('[go-metrics] '.length)).from).toBeNull();
  });

  it('logs dest and a clean from', async () => {
    await call('channels', '?from=concepts');
    const line = spy.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('[go-metrics] '))!;
    const json = JSON.parse(line.slice('[go-metrics] '.length));
    expect(json.dest).toBe('channels');
    expect(json.from).toBe('concepts');
  });

  it('is never cached, so counts are not undercounted by an intermediary', async () => {
    const res = await call('app');
    expect(res.headers.get('cache-control')).toMatch(/no-store/);
  });

  it('logs the UA class so bot and preview hits can be filtered later', async () => {
    await GET(
      new NextRequest('http://localhost/go/app', { headers: { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' } }),
      { params: Promise.resolve({ dest: 'app' }) }
    );
    const line = spy.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('[go-metrics] '))!;
    expect(JSON.parse(line.slice('[go-metrics] '.length)).ua).toBe('search_bot');
  });
});
