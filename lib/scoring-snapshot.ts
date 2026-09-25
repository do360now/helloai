import { createHash } from 'node:crypto';
import type { Model, Category } from '@/data/types';
import { SCORING_VERSION as VERSION, isRated } from '@/data/recommend';

/** Re-exported so callers import the version and the snapshot from one place; it lives next to the weights. */
export const SCORING_VERSION = VERSION;
export const normalizationBasis = 'all_tracked_models';

// Canonical JSON: object keys sorted recursively, so reordering keys never changes the hash.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * A short fingerprint of the SCORING INPUTS only: per model its id, rated status, Elo (only when rated, since
 * an unrated Elo cannot move anyone), input price, context window and strengths; per category its name and
 * leader; and the scoring version. Prose (desc, tag, insight), colours, provenance dates and the data date are
 * deliberately excluded, so the weekly update does not change the snapshot unless a score could change. Two
 * responses with the same snapshot, version and resolved task are comparable.
 */
export function snapshotHash(models: Model[], categories: Category[]): string {
  const inputs = {
    version: VERSION,
    models: models.map((m) => ({
      id: m.id,
      rated: isRated(m),
      elo: isRated(m) ? m.elo : null,
      cost: m.cost_per_million_tokens,
      context: m.context_window,
      strengths: [...m.strengths].sort(),
    })),
    categories: categories.map((c) => ({ name: c.name, leader: c.leader })),
  };
  return `sha256:${createHash('sha256').update(canonical(inputs)).digest('hex').slice(0, 12)}`;
}
