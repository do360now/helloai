/**
 * Data integrity tests for HelloAi
 * Run with: npx jest (after adding jest to devDependencies)
 *
 * These validate the JSON data files that power the site.
 * When Python scripts update the data, these tests catch
 * structural issues before they hit production.
 */

import { getSiteConfig, getModels, getCategories, getArticles, getArticleBySlug, getHomepageArticles, HOMEPAGE_ARTICLE_COUNT } from '../data';

describe('Site Config', () => {
  const config = getSiteConfig();

  test('has all required fields', () => {
    expect(config.name).toBeTruthy();
    expect(config.tagline).toBeTruthy();
    expect(config.author).toBeTruthy();
    expect(config.authorUrl).toMatch(/^https?:\/\//);
    expect(config.githubUrl).toMatch(/^https?:\/\//);
    expect(config.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('Models', () => {
  const models = getModels();

  test('has at least one model', () => {
    expect(models.length).toBeGreaterThan(0);
  });

  test('each model has required fields', () => {
    for (const m of models) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(m.provider).toBeTruthy();
      expect(m.url).toMatch(/^https?:\/\//);
      expect(m.tag).toBeTruthy();
      expect(m.desc).toBeTruthy();
      expect(m.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(typeof m.elo).toBe('number');
      expect(m.elo).toBeGreaterThan(0);
    }
  });

  test('model IDs are unique', () => {
    const ids = models.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('models are sorted by Elo descending', () => {
    for (let i = 1; i < models.length; i++) {
      expect(models[i - 1].elo).toBeGreaterThanOrEqual(models[i].elo);
    }
  });
});

describe('Categories', () => {
  const categories = getCategories();

  test('has at least one category', () => {
    expect(categories.length).toBeGreaterThan(0);
  });

  test('each category has required fields', () => {
    for (const c of categories) {
      expect(c.name).toBeTruthy();
      expect(c.leader).toBeTruthy();
      expect(c.insight).toBeTruthy();
      expect(c.icon).toBeTruthy();
      expect(c.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('Articles', () => {
  const articles = getArticles();

  test('has at least one article', () => {
    expect(articles.length).toBeGreaterThan(0);
  });

  test('each article has required fields', () => {
    for (const a of articles) {
      expect(a.slug).toMatch(/^[a-z0-9-]+$/);
      expect(a.title).toBeTruthy();
      expect(a.excerpt).toBeTruthy();
      expect(a.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(a.category).toBeTruthy();
      expect(a.readTime).toBeTruthy();
      expect(a.content.length).toBeGreaterThan(0);
    }
  });

  test('slugs are unique', () => {
    const slugs = articles.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test('getArticleBySlug returns correct article', () => {
    const first = articles[0];
    const found = getArticleBySlug(first.slug);
    expect(found).toBeDefined();
    expect(found?.title).toBe(first.title);
  });

  test('getArticleBySlug returns undefined for missing slug', () => {
    expect(getArticleBySlug('nonexistent-slug')).toBeUndefined();
  });

  test('articles are sorted by date descending', () => {
    for (let i = 1; i < articles.length; i++) {
      expect(articles[i - 1].date >= articles[i].date).toBe(true);
    }
  });

  test('HOMEPAGE_ARTICLE_COUNT is 3', () => {
    expect(HOMEPAGE_ARTICLE_COUNT).toBe(3);
  });

  test('getHomepageArticles returns the newest three', () => {
    const home = getHomepageArticles();
    const all = getArticles();
    expect(home).toHaveLength(Math.min(3, all.length));
    expect(home.map((a) => a.slug)).toEqual(all.slice(0, 3).map((a) => a.slug));
  });
});

describe('Article ↔ Model drift', () => {
  const models = getModels();
  const articles = getArticles();

  // Concatenate every article's title, excerpt, and content into one searchable blob per model lookup.
  const articleCorpus = articles
    .map((a) => [a.title, a.excerpt, ...a.content].join('\n'))
    .join('\n');

  test('every current model name appears in at least one article', () => {
    const missing = models.filter((m) => !articleCorpus.includes(m.name));
    if (missing.length > 0) {
      const names = missing.map((m) => m.name).join(', ');
      throw new Error(
        `Models present in models.json but not referenced in any article — write an announcement article or remove the model: ${names}`
      );
    }
    expect(missing).toEqual([]);
  });
});

describe('Cross-file integrity (Category ↔ Model)', () => {
  const models = getModels();
  const categories = getCategories();
  const modelNames = new Set(models.map((m) => m.name));
  const categoryNames = new Set(categories.map((c) => c.name));

  test('every category leader matches an existing model name', () => {
    const orphans = categories.filter((c) => !modelNames.has(c.leader));
    if (orphans.length > 0) {
      const detail = orphans.map((c) => `${c.name} → leader "${c.leader}"`).join('; ');
      throw new Error(
        `Category leader(s) reference a model name not present in models.json: ${detail}`
      );
    }
    expect(orphans).toEqual([]);
  });

  test('every model strength matches an existing category name', () => {
    const offenders: string[] = [];
    for (const m of models) {
      for (const s of m.strengths) {
        if (!categoryNames.has(s)) {
          offenders.push(`${m.name} → strength "${s}"`);
        }
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        `Model strengths reference category names not present in categories.json: ${offenders.join('; ')}`
      );
    }
    expect(offenders).toEqual([]);
  });
});

describe('Public copy names only tracked models', () => {
  // Families the ai-plugin.json list must cover (every tracked family).
  const FAMILIES = ['Claude', 'Gemini', 'Grok', 'Qwen', 'Muse Spark'];
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

  const layout = read('app/layout.tsx');
  const metadataBlock = layout.slice(layout.indexOf('export const metadata'), layout.indexOf('export default function'));
  const plugin = JSON.parse(read('public/.well-known/ai-plugin.json'));
  const copies: Record<string, string> = {
    'layout.tsx metadata': metadataBlock,
    'ai-plugin.json description_for_model': plugin.description_for_model,
  };

  // Names actually listed in the copy: "Compare A, B and C with ..." (layout) and "(A, B, Meta C)" (plugin).
  const listed = (text: string, re: RegExp) =>
    (text.match(re)?.[1] ?? '')
      .split(/,\s*|\s+and\s+/)
      .map((t) => t.replace(/^Meta\s+/, '').trim())
      .filter(Boolean);
  const listedNames: Record<string, string[]> = {
    'layout.tsx openGraph': listed(metadataBlock, /'Compare ([^']+?) with weekly/),
    'layout.tsx description': listed(metadataBlock, /leading AI models — ([^—]+?) — with/),
    'ai-plugin.json': listed(plugin.description_for_model, /frontier AI models \(([^)]+)\)/),
  };

  test.each(Object.keys(listedNames))('%s lists at least one name', (key) => {
    expect(listedNames[key].length).toBeGreaterThan(0);
  });

  test.each(Object.keys(listedNames))('every name listed in %s is tracked in models.json', (key) => {
    const names = getModels().map((m) => m.name);
    for (const f of listedNames[key]) {
      expect(names.some((n) => n.includes(f))).toBe(true);
    }
  });

  test.each(Object.keys(copies))('%s does not name an untracked GPT', (key) => {
    expect(copies[key]).not.toMatch(/\bGPT\b/);
  });

  test.each(Object.keys(copies))('%s does not claim "real benchmarks"', (key) => {
    expect(copies[key]).not.toMatch(/real benchmarks/i);
  });

  test('the ai-plugin.json model list names every tracked family', () => {
    for (const f of FAMILIES) {
      expect(plugin.description_for_model).toContain(f);
    }
  });
});
