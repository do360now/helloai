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
 * A short fingerprint of the SCORING INPUTS only: per model its id, name, rated status, Elo (only when rated,
 * since an unrated Elo cannot move anyone), input price, context window and strengths; per category its name,
 * leader and the model id that leader resolves to; and the scoring version. Order-independent. Prose (desc, tag, insight), colours, provenance dates and the data date are
 * deliberately excluded, so the weekly update does not change the snapshot unless a score could change. Two
 * responses with the same snapshot, version and resolved task are comparable.
 */
export function snapshotHash(models: Model[], categories: Category[]): string {
  const byId = [...models].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const idByName = new Map(models.map((m) => [m.name, m.id]));
  const inputs = {
    version: VERSION,
    // Sorted, so reordering models.json or categories.json (the weekly update sometimes does) is not a change.
    models: byId.map((m) => ({
      id: m.id,
      // Scoring matches leaders and strengths on the model NAME, so a rename changes what a model scores.
      name: m.name,
      rated: isRated(m),
      elo: isRated(m) ? m.elo : null,
      cost: m.cost_per_million_tokens,
      context: m.context_window,
      strengths: [...m.strengths].sort(),
    })),
    categories: [...categories]
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      // The leader is hashed both as written and as the model id it resolves to (null when no model has that name).
      .map((c) => ({ name: c.name, leader: c.leader, leader_id: idByName.get(c.leader) ?? null })),
  };
  return `sha256:${createHash('sha256').update(canonical(inputs)).digest('hex').slice(0, 12)}`;
}
