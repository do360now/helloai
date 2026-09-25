import fs from 'fs';
import path from 'path';
import { GET as statusGET } from '../app/api/status/route';
import { GET as openapiGET } from '../app/api/openapi.json/route';
import { NextRequest } from 'next/server';
import sitemap from '../app/sitemap';
import { getSiteConfig, getArticles } from '../data';
import { websiteGraph, articleJsonLd } from '../lib/structured-data';

const read = (p: string) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', p), 'utf8'));
const mcp = read('public/.well-known/mcp.json');
const plugin = read('public/.well-known/ai-plugin.json');
const req = (u: string) => new NextRequest(`http://localhost${u}`);

describe('mcp.json', () => {
  test('is honest: no server entry while the app has no public MCP discovery URL, and says so', () => {
    expect(mcp.servers).toBeUndefined();
    expect(mcp._note).toMatch(/no ratified|tenant|token/i);
  });

  test('points at the HTTP API and llms.txt', () => {
    expect(mcp.http_api.openapi).toBe('https://helloai.com/api/openapi.json');
    expect(mcp.http_api.llms_txt).toBe('https://helloai.com/llms.txt');
  });
});

describe('the same links everywhere', () => {
  test('/api/status.related, mcp.json and ai-plugin.json agree on the URLs', async () => {
    const status = await (await statusGET(req('/api/status'))).json();
    const byName = Object.fromEntries(status.related.map((r: { name: string; url: string }) => [r.name, r.url]));
    expect(byName.llms_txt).toBe(mcp.http_api.llms_txt);
    expect(byName.openapi).toBe(mcp.http_api.openapi);
    expect(plugin.llms_txt_url).toBe(mcp.http_api.llms_txt);
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
