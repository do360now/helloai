import type { Model } from '../../data/types';

/**
 * A copy of the roster in which the given model ids carry a BORROWED score (a predecessor's), whatever the
 * live data says today. Tests about unrated behaviour use this fixture so they never depend on which
 * models happen to be borrowed this week: the day the updater records a model's own score, these must
 * stay green and only tests about the real data should change.
 */
export function withBorrowed(models: Model[], ids: string[]): Model[] {
  return (JSON.parse(JSON.stringify(models)) as Model[]).map((m) => {
    if (!ids.includes(m.id)) return m;
    const src = { ...m.elo_source! };
    delete src.ci_low;
    delete src.ci_high;
    delete src.votes;
    return { ...m, elo_source: { ...src, matches_listed_model: false, arena_model: `${m.id}-predecessor-slug` } };
  });
}

/** Ids whose stored Elo is not the model's own, according to the live data. */
export const borrowedIds = (models: Model[]): string[] =>
  models.filter((m) => m.elo_source && !m.elo_source.matches_listed_model).map((m) => m.id).sort();
