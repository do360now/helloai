import { getModels } from '@/data';

// Walk the spec collecting every value stored under a given key.
function findByKey(obj: unknown, key: string, out: unknown[] = []): unknown[] {
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (k === key) out.push(v);
      findByKey(v, key, out);
    }
  }
  return out;
}

describe('OpenAPI spec stays consistent with live data', () => {
  let spec: unknown;

  beforeAll(async () => {
    const route = await import('@/app/api/openapi.json/route');
    // GET may or may not take a request arg — check the signature in route.ts.
    const { NextRequest } = await import('next/server');
    const res = await route.GET(new NextRequest('http://localhost/api/openapi.json'));
    spec = await res.json();
  });

  it('does not use the retired "Highest Elo rating" reason format', () => {
    expect(JSON.stringify(spec)).not.toContain('Highest Elo rating');
  });

  it('every count example matches the live model count', () => {
    const countSchemas = findByKey(spec, 'count').filter(
      (c): c is { example?: unknown } =>
        typeof c === 'object' && c !== null && 'example' in c
    );
    expect(countSchemas.length).toBeGreaterThan(0);
    for (const c of countSchemas) {
      expect(c.example).toBe(getModels().length);
    }
  });
});
