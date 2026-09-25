import { createHash } from 'node:crypto';
import type { Model, Category } from '@/data/types';

/** Bump when the weights or the normalization basis change (scoring-transparency.md). */
export const SCORING_VERSION = 1;
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
 * A short fingerprint of the data a score was computed from (models, categories and the data date),
 * so two responses can be compared: same snapshot + same version + same resolved task = comparable scores.
 */
export function snapshotHash(models: Model[], categories: Category[], dataLastUpdated: string): string {
  const digest = createHash('sha256').update(canonical({ models, categories, dataLastUpdated })).digest('hex');
  return `sha256:${digest.slice(0, 12)}`;
}
