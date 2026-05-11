/**
 * Data integrity tests for HelloAi
 * Run with: npx jest (after adding jest to devDependencies)
 *
 * These validate the JSON data files that power the site.
 * When Python scripts update the data, these tests catch
 * structural issues before they hit production.
 */

import { getSiteConfig, getModels, getCategories, getArticles, getArticleBySlug } from '../data';

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
