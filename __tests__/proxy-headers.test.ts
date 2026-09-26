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
