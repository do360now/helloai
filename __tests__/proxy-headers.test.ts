import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

const call = (p: string, ip: string) =>
  proxy(new NextRequest(`http://localhost${p}`, { headers: { 'x-forwarded-for': ip, 'user-agent': 'curl/8.5' } }));

describe('X-Robots-Tag on the API', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  test.each(['/api/models', '/api/recommend?task=coding', '/api/status', '/api/openapi.json'])(
    '%s is served with noindex so search engines skip the JSON but agents can still fetch it',
    (p) => {
      expect(call(p, '198.51.100.31').headers.get('x-robots-tag')).toBe('noindex');
    }
  );

  test('a rate-limited response is also noindex', () => {
    let last = call('/api/models', '198.51.100.32');
    for (let i = 0; i < 102; i++) last = call('/api/models', '198.51.100.32');
    expect(last.status).toBe(429);
    expect(last.headers.get('x-robots-tag')).toBe('noindex');
  });

  test('pages are never given noindex by the proxy', () => {
    expect(call('/', '198.51.100.33').headers.get('x-robots-tag')).toBeNull();
    expect(call('/articles', '198.51.100.33').headers.get('x-robots-tag')).toBeNull();
  });
});

describe('/api/views is site-internal', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  test('never spends the API rate budget, is not counted in usage, and stays noindex', async () => {
    const { usageSnapshot } = await import('@/lib/api-metrics');
    const before = usageSnapshot().total;
    let last = call('/api/views', '198.51.100.41');
    for (let i = 0; i < 150; i++) last = call('/api/views/stream?slug=home', '198.51.100.41');
    expect(last.status).toBe(200);
    expect(last.headers.get('x-robots-tag')).toBe('noindex');
    expect(usageSnapshot().total).toBe(before);
    expect(call('/api/models', '198.51.100.41').status).toBe(200); // budget untouched
  });
});
