import type { SiteConfig, Model, Category, Article, OpenWeightModel, Claim } from './types';

import siteData from './site.json';
import modelsData from './models.json';
import categoriesData from './categories.json';
import articlesData from './articles.json';
import openWeightModelsData from './open_weight_models.json';
import claimsData from './claims.json';

export const getSiteConfig = (): SiteConfig => siteData;
// JSON imports widen the elo_source string unions (board, set_by) to `string`, so cast; the
// allowed values are enforced by __tests__/elo-provenance.test.ts.
export const getModels = (): Model[] => modelsData as Model[];
// JSON imports widen the string unions; __tests__/claims.test.ts enforces the allowed values.
export const getClaims = (): Claim[] => claimsData as Claim[];
export const getCategories = (): Category[] => categoriesData;
export const getArticles = (): Article[] => articlesData;

export const HOMEPAGE_ARTICLE_COUNT = 3;

export const getHomepageArticles = (): Article[] =>
  getArticles().slice(0, HOMEPAGE_ARTICLE_COUNT);

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

export interface FormattedElo {
  /** What to print next to the number: "1498 ± 8", or just "1493". Never a tilde, never rounded. */
  score: string;
  /** A short honest note to show beside it, or null when the score needs none. */
  note: string | null;
  /** rated = the model's own score; borrowed = a predecessor's; missing/stale = no usable score. */
  state: 'rated' | 'borrowed' | 'missing' | 'stale';
  /** The measured configuration (for example "max"), shown beside an OWN score. null otherwise. */
  config: string | null;
  /** The exact Arena slug the number belongs to, for a hover title so the identity is traceable. */
  arenaModel: string | null;
}

// One place decides how an Elo is shown, so cards, rows and the methodology page agree.
export function formatElo(m: Model): FormattedElo {
  const s = m.elo_source;
  if (!s || s.status === 'missing') {
    return { score: String(m.elo), note: 'No current score from the source.', state: 'missing', config: null, arenaModel: s?.arena_model ?? null };
  }
  if (s.status === 'stale') {
    return { score: String(m.elo), note: `Score is stale (snapshot ${s.snapshot_date}).`, state: 'stale', config: null, arenaModel: s.arena_model };
  }
  if (!s.matches_listed_model) {
    return {
      score: String(m.elo),
      note: `Not yet rated. This is a predecessor's score (${s.arena_model}).`,
      state: 'borrowed',
      config: null, // the predecessor's configuration is not this model's; the note names the slug
      arenaModel: s.arena_model,
    };
  }
  if (s.ci_low !== undefined && s.ci_high !== undefined) {
    const below = m.elo - s.ci_low;
    const above = s.ci_high - m.elo;
    // "±" only when the interval really is symmetric (within rounding); otherwise print the range.
    if (Math.abs(above - below) <= 1) {
      return { score: `${m.elo} ± ${Math.round((s.ci_high - s.ci_low) / 2)}`, note: null, state: 'rated', config: s.config ?? null, arenaModel: s.arena_model };
    }
    return { score: `${m.elo} [${s.ci_low}–${s.ci_high}]`, note: null, state: 'rated', config: s.config ?? null, arenaModel: s.arena_model };
  }
  return { score: String(m.elo), note: 'Interval not available from source.', state: 'rated', config: s.config ?? null, arenaModel: s.arena_model };
}

/**
 * The date line for the Elo table. One snapshot date is printed once; when rows come from different
 * snapshots the label is a range and says so, so an older row never looks newer than it is.
 */
export function boardDateLabel(models: Model[]): { text: string; mixed: boolean } {
  const dates = [...new Set(models.map((m) => m.elo_source?.snapshot_date).filter((d): d is string => !!d))].sort();
  if (dates.length === 0) return { text: '', mixed: false };
  if (dates.length === 1) return { text: formatDate(dates[0]), mixed: false };
  return {
    text: `${formatDate(dates[0])} to ${formatDate(dates[dates.length - 1])} (mixed snapshots; each row shows its own date)`,
    mixed: true,
  };
}

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
