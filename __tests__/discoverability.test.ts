import fs from 'fs';
import path from 'path';
import { GET as statusGET } from '../app/api/status/route';
import { GET as openapiGET } from '../app/api/openapi.json/route';
import { NextRequest } from 'next/server';
import sitemap from '../app/sitemap';
import { getSiteConfig, getArticles } from '../data';
import { websiteGraph, articleJsonLd } from '../lib/structured-data';

const read = (p: string) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', p), 'utf8'));
const plugin = read('public/.well-known/ai-plugin.json');
const req = (u: string) => new NextRequest(`http://localhost${u}`);

describe('mcp.json is held back (cmc, 2026-09-26)', () => {
  test('is not published while there is no MCP server to list', () => {
    // The app's MCP server is per-account behind a token and has no public discovery URL. A file that says
    // "nothing here" adds nothing, so it stays out until there is a server. Add it, with tests, when there is one.
    expect(fs.existsSync(path.join(__dirname, '..', 'public/.well-known/mcp.json'))).toBe(false);
  });

  test('nothing points at it', () => {
    const files = ['public/.well-known/ai-plugin.json', 'app/api/status/route.ts', 'app/api/openapi.json/route.ts', 'lib/llms-txt.ts'];
    for (const f of files) expect(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).not.toMatch(/\.well-known\/mcp\.json/);
  });
});

describe('the same links everywhere', () => {
  test('/api/status.related, the OpenAPI spec and ai-plugin.json agree on the URLs', async () => {
    const status = await (await statusGET(req('/api/status'))).json();
    const byName = Object.fromEntries(status.related.map((r: { name: string; url: string }) => [r.name, r.url]));
    expect(byName.llms_txt).toBe('https://helloai.com/llms.txt');
    expect(byName.openapi).toBe('https://helloai.com/api/openapi.json');
    expect(plugin.api.url).toBe(byName.openapi);
    expect(plugin.llms_txt_url).toBe(byName.llms_txt);
    expect(byName.marketplace).toBe('https://app.helloai.com');
    const marketplace = status.related.find((r: { name: string }) => r.name === 'marketplace');
    expect(marketplace.note).toMatch(/operator's own product|same team/i);
  });

  test('/api/openapi.json externalDocs points at llms.txt', async () => {
    const spec = await (await openapiGET(req('/api/openapi.json'))).json();
    expect(spec.externalDocs.url).toBe('https://helloai.com/llms.txt');
  });
});

describe('sitemap', () => {
  test('the home and articles index use the data date, not the build time', () => {
    const entries = sitemap();
    const expected = new Date(getSiteConfig().lastUpdated).getTime();
    for (const e of entries.filter((x) => x.url === 'https://helloai.com' || x.url === 'https://helloai.com/articles')) {
      expect(new Date(e.lastModified as Date).getTime()).toBe(expected);
    }
  });

  test('still lists every article and never the retired concept page', () => {
    const urls = sitemap().map((e) => e.url);
    for (const a of getArticles()) expect(urls).toContain(`https://helloai.com/articles/${a.slug}`);
    expect(urls.join(' ')).not.toContain('concepts');
  });
});

describe('structured data', () => {
  const graph = websiteGraph();
  type Node = { '@type': string; '@id': string; logo: string; url: string; publisher: { '@id': string } };
  const nodes = graph['@graph'] as unknown as Node[];
  const org = nodes.find((n) => n['@type'] === 'Organization')!;
  const site = nodes.find((n) => n['@type'] === 'WebSite')!;

  test('the home page graph has an Organization with an absolute logo, referenced by the WebSite', () => {
    expect(graph['@context']).toBe('https://schema.org');
    expect(org.logo).toMatch(/^https:\/\/helloai\.com\/.+/);
    expect(org.url).toBe('https://helloai.com');
    expect(site.publisher['@id']).toBe(org['@id']);
  });

  test('the description does not name untracked models or claim benchmarks', () => {
    expect(JSON.stringify(graph)).not.toMatch(/\bGPT\b|real benchmarks/);
  });

  test('an article has image, publisher logo, and dateModified from `updated` when present', () => {
    const a = getArticles()[0];
    const plain = articleJsonLd(a);
    expect(plain.image).toBe(`https://helloai.com/articles/${a.slug}/opengraph-image`);
    expect(plain.publisher.logo['@type']).toBe('ImageObject');
    expect(plain.publisher.logo.url).toBe(org.logo);
    expect(plain.datePublished).toBe(a.date);
    expect(plain.dateModified).toBe(a.date);
    const edited = articleJsonLd({ ...a, updated: '2099-01-02' });
    expect(edited.dateModified).toBe('2099-01-02');
    expect(edited.datePublished).toBe(a.date);
  });
});
