import { buildLlmsTxt, buildLlmsFullTxt } from '../lib/llms-txt';
import { getModels, getArticles, getSiteConfig, formatElo, formatUsdPerMillion, formatContextWindow } from '../data';
import { isRated } from '../data/recommend';
import { GET as llmsGET } from '../app/llms.txt/route';
import { GET as llmsFullGET } from '../app/llms-full.txt/route';

const txt = buildLlmsTxt();
const full = buildLlmsFullTxt();

describe('llms.txt', () => {
  test('starts with the H1 and a one-line summary that carries the data date', () => {
    expect(txt.startsWith('# Hello, AI\n')).toBe(true);
    expect(txt).toMatch(/^> .*Updated weekly \(\d{4}-\d{2}-\d{2}\)/m);
    expect(txt).toContain(getSiteConfig().lastUpdated);
  });

  test('links the API surface (at least four helloai.com/api URLs)', () => {
    expect((txt.match(/https:\/\/helloai\.com\/api\//g) ?? []).length).toBeGreaterThanOrEqual(4);
    for (const p of ['/api/openapi.json', '/api/status', '/api/models', '/api/recommend']) expect(txt).toContain(p);
  });

  test('names every tracked model with provider, Elo and prices', () => {
    for (const m of getModels()) {
      expect(txt).toContain(m.name);
      expect(txt).toContain(m.provider);
    }
  });

  test('a model without its own Elo is labelled "not yet rated", never shown as a plain score', () => {
    for (const m of getModels()) {
      const line = txt.split('\n').find((l) => l.includes(m.name))!;
      if (!isRated(m)) expect(line).toMatch(/not yet rated/i);
      else expect(line).toContain(formatElo(m).score);
    }
  });

  test('prices and context read cleanly (no doubled units)', () => {
    expect(txt).not.toMatch(/\/M\/M/);
    expect(txt).not.toMatch(/ctx context/);
    for (const m of getModels()) {
      const line = txt.split('\n').find((l) => l.includes(m.name))!;
      expect(line).toContain(`${formatUsdPerMillion(m.cost_per_million_tokens)} in`);
      expect(line).toContain(`${formatUsdPerMillion(m.cost_per_million_tokens_output)} out`);
      expect(line).toContain(`${formatContextWindow(m.context_window)}`);
    }
  });

  test('lists every article with its date and URL', () => {
    for (const a of getArticles()) {
      expect(txt).toContain(`https://helloai.com/articles/${a.slug}`);
      expect(txt).toContain(a.date);
    }
  });

  test('says what score means and where Elo comes from, without claiming benchmarks it does not have', () => {
    expect(txt).toMatch(/ordering aid, not a quality measure/i);
    expect(txt).toMatch(/LMArena/);
    expect(txt).not.toMatch(/real benchmarks|\bGPT\b/);
  });

  test('points to the app as the operator\'s own product and does not advertise an MCP URL', () => {
    expect(txt).toContain('https://app.helloai.com');
    expect(txt).toMatch(/our own product|run by the same team/i);
    // The app's MCP server is tenant-scoped behind a token: there is no anonymous endpoint to advertise.
    expect(txt).not.toMatch(/api\/v1\/mcp/);
  });

  test('has no placeholder or draft text', () => {
    expect(txt).not.toMatch(/TODO|TBD|\[confirm|<[^>]+>/);
  });
});

describe('llms-full.txt', () => {
  test('contains the llms.txt content and every article paragraph', () => {
    expect(full.startsWith('# Hello, AI\n')).toBe(true);
    for (const a of getArticles()) {
      expect(full).toContain(a.title);
      for (const p of a.content) expect(full).toContain(p);
    }
  });
});

describe('routes', () => {
  test.each([
    ['/llms.txt', llmsGET, buildLlmsTxt],
    ['/llms-full.txt', llmsFullGET, buildLlmsFullTxt],
  ] as const)('%s serves plain text, cacheable for an hour, rendered from data', async (_path, handler, build) => {
    const res = await handler();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('cache-control')).toMatch(/public, max-age=3600/);
    expect(await res.text()).toBe(build());
  });
});
