import { apiHeaders, parseRecommendParams, publicUnlessParameterized } from '@/lib/api';

const parse = (q: string, defaultLimit: number | null = 3) =>
  parseRecommendParams(new URLSearchParams(q), { defaultLimit });

describe('parseRecommendParams', () => {
  test('no params → defaults', () => {
    const r = parse('');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.params).toEqual({ task: null, maxCost: null, minContext: null, provider: null, limit: 3 });
    }
  });

  test('valid params parse', () => {
    const r = parse('task=coding&max_cost=10.5&min_context=1000000&limit=2');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.params.maxCost).toBe(10.5);
      expect(r.params.minContext).toBe(1000000);
      expect(r.params.limit).toBe(2);
    }
  });

  // parseInt prefix-parsing regression: 1e6 must not become 1.
  test('min_context in scientific notation → 400, not context_window >= 1', () => {
    const r = parse('min_context=1e6');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.body.details).toMatch(/min_context/);
  });

  // parseInt prefix-parsing regression: 2.9 must not become 2.
  test.each(['2.9', '3abc', '-1', '0', '11'])('limit=%s → 400', (v) => {
    expect(parse(`limit=${v}`).ok).toBe(false);
  });

  // An empty value is "absent", not an error (pre-validation behavior).
  test('empty-string params are treated as absent', () => {
    const r = parse('limit=&max_cost=&min_context=&provider=');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.params.limit).toBe(3);
  });

  test('max_cost must be fully numeric and positive', () => {
    expect(parse('max_cost=10abc').ok).toBe(false);
    expect(parse('max_cost=0').ok).toBe(false);
    expect(parse('max_cost=abc').ok).toBe(false);
  });

  test('unknown provider → 400 with valid_providers', () => {
    const r = parse('provider=NoSuchProvider');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.body.valid_providers).toBeDefined();
  });

  test('known provider passes case-insensitively', () => {
    const r = parse('provider=Anthropic');
    expect(r.ok).toBe(true);
  });

  test('defaultLimit null is preserved (Pro: no cap)', () => {
    const r = parse('task=coding', null);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.params.limit).toBeNull();
  });

  test('task is sanitized (XSS scaffolding stripped, empty → null)', () => {
    const r = parse('task=%3C%3E');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.params.task).toBeNull();
  });
});

describe('publicUnlessParameterized', () => {
  test('no query string → public directive', () => {
    expect(publicUnlessParameterized(new URLSearchParams(''))).toMatch(/^public/);
  });

  // The whole query string decides, so an unknown/typo'd param can never be
  // shared-cached (SOL-005) — no allowlist of known params to forget updating.
  test.each(['task=coding', 'tsak=coding', 'anything=at-all'])(
    'any param (%s) → private, no-store',
    (q) => {
      expect(publicUnlessParameterized(new URLSearchParams(q))).toBe('private, no-store');
    }
  );
});

describe('apiHeaders', () => {
  test('omitted cacheControl → explicit private, no-store (never heuristic caching)', () => {
    expect(apiHeaders(null)['Cache-Control']).toBe('private, no-store');
  });

  test('explicit cacheControl is passed through', () => {
    expect(apiHeaders(null, 'public, s-maxage=300')['Cache-Control']).toBe('public, s-maxage=300');
  });

  // CORS headers echo the request Origin, so cached responses must vary on it.
  test('always sets Vary: Origin', () => {
    expect(apiHeaders('https://helloai.com')['Vary']).toBe('Origin');
    expect(apiHeaders(null)['Vary']).toBe('Origin');
  });

  test('allowed origin is echoed in ACAO', () => {
    expect(apiHeaders('https://www.helloai.com')['Access-Control-Allow-Origin']).toBe(
      'https://www.helloai.com'
    );
  });
});
