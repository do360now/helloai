import type { SiteConfig, Model, Category, Article, OpenWeightModel } from './types';

import siteData from './site.json';
import modelsData from './models.json';
import categoriesData from './categories.json';
import articlesData from './articles.json';
import openWeightModelsData from './open_weight_models.json';

export const getSiteConfig = (): SiteConfig => siteData;
export const getModels = (): Model[] => modelsData;
export const getCategories = (): Category[] => categoriesData;
export const getArticles = (): Article[] => articlesData;
// JSON imports widen "first-party" to string; the jest data suite enforces the literal value.
export const getOpenWeightModels = (): OpenWeightModel[] =>
  openWeightModelsData as OpenWeightModel[];

export const getArticleBySlug = (slug: string): Article | undefined =>
  articlesData.find((a: Article) => a.slug === slug);

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00Z');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export function formatUsdPerMillion(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.round(n * 100) / 100;
  const body = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `$${body}/M`;
}

export function formatContextWindow(tokens: number): string {
  if (!Number.isFinite(tokens) || tokens <= 0) return '—';
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    const body = Number.isInteger(m) ? String(m) : String(Math.round(m * 10) / 10);
    return `${body}M ctx`;
  }
  if (tokens >= 1_000) {
    return `${Math.round(tokens / 1_000)}K ctx`;
  }
  return `${tokens} ctx`;
}
