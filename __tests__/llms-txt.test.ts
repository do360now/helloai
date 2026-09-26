import { buildLlmsTxt, buildLlmsFullTxt } from '../lib/llms-txt';
import type { Model } from '../data/types';
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
    // Scoped to the header and notes: article titles may legitimately name other vendors' models (e.g. "GPT-6 Astra").
    const header = txt.split('## Models tracked')[0];
    expect(header).not.toMatch(/real benchmarks|\bGPT\b/);
  });

  test('points to the app as the operator\'s own product and does not advertise an MCP URL', () => {
    expect(txt).toContain('https://app.helloai.com');
    expect(txt).toMatch(/our own product|run by the same team/i);
    // The app's MCP server is tenant-scoped behind a token: there is no anonymous endpoint to advertise.
    expect(txt).not.toMatch(/api\/v1\/mcp/);
  });

  test('has no placeholder or draft text', () => {
    const header = txt.split('## Articles')[0]; // article titles are free text
    expect(header).not.toMatch(/TODO|TBD|\[confirm|<[^>]+>/);
  });
});

describe('llms.txt disclosures (cmc, 2026-09-26)', () => {
  test('carries the affiliation statement verbatim from site.json, in a Disclosures section', () => {
    const affiliations = getSiteConfig().affiliations!;
    expect(affiliations.length).toBeGreaterThan(40);
    expect(txt).toContain('## Disclosures');
    expect(txt).toContain(affiliations);
    // The section sits before the models and articles, where an agent reads it first.
    expect(txt.indexOf('## Disclosures')).toBeLessThan(txt.indexOf('## Models tracked'));
    expect(full).toContain(affiliations);
  });

  test('is read from the data, so an edit to site.json shows up without touching the code', () => {
    expect(buildLlmsTxt(undefined, 'A different statement of affiliations.')).toContain('A different statement of affiliations.');
  });

  test('does not include the listing policy (only the affiliation text was requested)', () => {
    expect(txt).not.toContain(getSiteConfig().listing_policy!);
  });
});

describe('llms.txt states other than "borrowed"', () => {
  const base = getModels().find((m) => m.id === 'fable')!;
  const withSource = (src: Partial<NonNullable<Model['elo_source']>>): Model => ({ ...base, elo_source: { ...base.elo_source!, ...src } });

  test('a stale or missing score is described as stale or missing, never as a predecessor\'s score', () => {
    const stale = buildLlmsTxt([withSource({ status: 'stale' })]);
    const line = stale.split('\n').find((l) => l.includes(base.name))!;
    expect(line).toMatch(/stale/i);
    expect(line).not.toMatch(/predecessor/i);
    const missing = buildLlmsTxt([withSource({ status: 'missing' })]);
    expect(missing.split('\n').find((l) => l.includes(base.name))!).not.toMatch(/predecessor/i);
  });

  test('a borrowed score is still labelled as a predecessor\'s', () => {
    const borrowed = buildLlmsTxt([withSource({ matches_listed_model: false, arena_model: 'x-predecessor' })]);
    expect(borrowed.split('\n').find((l) => l.includes(base.name))!).toMatch(/not yet rated.*predecessor/i);
  });

  test('the notes line does not claim every unrated model is a new one', () => {
    expect(txt).not.toMatch(/have no Elo of their own yet/);
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
