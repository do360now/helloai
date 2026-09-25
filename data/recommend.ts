import type { Model, Category } from './types';

export interface ScoreBreakdown {
  task: number;
  elo: number;
  cost: number;
  context: number;
}

export interface Recommendation {
  model: Model;
  score: number;
  reasons: string[];
  /** Weighted contribution of each component; the parts add up to `score` (within rounding). */
  breakdown: ScoreBreakdown;
  /** How much of the score came from curated labels (leader / strength), i.e. breakdown.task. */
  label_effect: number;
}

// Weighted-score configuration. Values are pinned here (not env-driven) so the
// ranking is deterministic and reproducible. __tests__/recommend.test.ts locks
// these exact numbers — any change is a conscious decision reviewed against the
// test expectations.
//
// With a matched task, the task match dominates (40%) followed by Elo (35%),
// then cost efficiency (15%) and context size (10%).
// With no task, the task weight redistributes to Elo (55%), cost (25%), context (20%).
export const SCORING_WEIGHTS = {
  withTask: { task: 0.40, elo: 0.35, cost: 0.15, context: 0.10 },
  withoutTask: { task: 0.00, elo: 0.55, cost: 0.25, context: 0.20 },
} as const;

// Which models may be ranked. A model is RATED when its Elo is the model's OWN Arena score (its
// elo_source slug matches the listed model) and is neither missing nor stale. A borrowed
// (predecessor's), missing or stale score must not rank, and must not move anyone else's
// normalization: docs/review/elo-provenance.md, decision 1 (labelled and excluded).
// Flip includeBorrowed to change the policy in ONE place; __tests__/recommend.test.ts proves it matters.
export const RATING_POLICY = { includeBorrowed: false };

export type UnratedReason = 'borrowed_score' | 'missing_score' | 'stale_score';

export function unratedReason(m: Model): UnratedReason | null {
  const s = m.elo_source;
  if (!s || s.status === 'missing') return 'missing_score';
  if (s.status === 'stale') return 'stale_score';
  if (!s.matches_listed_model && !RATING_POLICY.includeBorrowed) return 'borrowed_score';
  return null;
}

export const isRated = (m: Model): boolean => unratedReason(m) === null;

export interface UnratedModel {
  model: Model;
  reason: UnratedReason;
  arena_model?: string;
}

const fmt2 = (n: number) => `+${n.toFixed(2)}`;

/**
 * The "why this rank" line: where each part of the score came from. The curator part is named for what
 * it was (a pick = the category leader, a strength = a listed strength) so a reader can see that the top
 * result may come from curation and not from Elo. Wording per docs/review/purpose.md.
 */
export function formatWhyRank(b: ScoreBreakdown, taskMatched: boolean): string {
  const parts: string[] = [];
  if (taskMatched) {
    const isPick = Math.abs(b.task - SCORING_WEIGHTS.withTask.task) < 0.005;
    const isStrength = b.task > 0 && !isPick;
    parts.push(`${isStrength ? 'Curator-rated strength' : "Curator's pick"} ${fmt2(b.task)}`);
  }
  parts.push(`Elo ${fmt2(b.elo)}`, `cost ${fmt2(b.cost)}`, `context ${fmt2(b.context)}`);
  return parts.join(' · ');
}

export function categoryTaskKeyword(cat: Category): string {
  return cat.name.split(' ')[0].toLowerCase();
}

// Match a free-text task to a category. Two-clause fallback:
//   1. category name contains the task string (e.g. "reasoning" → "Hard Reasoning
//      & Science"), OR
//   2. task string contains the first word of the category name (e.g. "hard" →
//      "Hard Reasoning & Science"). The first word is used because category
//      names are multi-word and users typically type only the distinguishing
//      token. The `firstWord.length > 0` guard protects against categories
//      whose name has no space (already a single token) or is empty.
// Order matters: clause 1 is the precise match, clause 2 is the loose fallback.
export function findMatchingCategory(task: string, categories: Category[]): Category | null {
  const t = task.toLowerCase().trim();
  if (!t) return null;
  // A one- or two-letter fragment ("a", "re") would substring-match some category and look like a
  // confident task match, so clause 1 needs at least 3 characters.
  return (
    (t.length >= 3 ? categories.find((c) => c.name.toLowerCase().includes(t)) : undefined) ??
    categories.find((c) => {
      const firstWord = c.name.toLowerCase().split(' ')[0];
      return firstWord.length > 0 && t.includes(firstWord);
    }) ??
    null
  );
}

export function scoreAndRank(
  models: Model[],
  categories: Category[],
  opts: {
    task?: string | null;
    maxCost?: number | null;
    minContext?: number | null;
    provider?: string | null;
  }
): {
  recommendations: Recommendation[];
  excluded: number;
  matchedCategory: Category | null;
  /** Filtered-in models that cannot be ranked (borrowed, missing or stale Elo), shown outside the ranking. */
  unrated: UnratedModel[];
  /** Human-readable explanations, e.g. an unrated category leader. */
  notes: string[];
} {
  const { task, maxCost, minContext, provider } = opts;

  const matchedCategory = task ? findMatchingCategory(task, categories) : null;

  // Hard filters — models failing any active filter are excluded entirely.
  // NOTE: cost_per_million_tokens_output (output price) is intentionally NOT
  // used as a filter or scoring signal here. It is surfaced in API responses
  // for caller information only. Cost efficiency is scored on the input price
  // (cost_per_million_tokens) to keep the ranking stable and predictable.
  const candidates = models.filter((m) => {
    if (maxCost !== null && maxCost !== undefined && m.cost_per_million_tokens > maxCost) return false;
    if (minContext !== null && minContext !== undefined && m.context_window < minContext) return false;
    if (provider && !m.provider.toLowerCase().includes(provider.toLowerCase())) return false;
    return true;
  });

  const excluded = models.length - candidates.length;

  // Split off models that may not be ranked. Only RATED candidates are ranked, and only they
  // set the Elo min/max used to normalize everyone else (a borrowed score can move nobody).
  const rated = candidates.filter(isRated);
  const unrated: UnratedModel[] = candidates
    .filter((m) => !isRated(m))
    .map((m) => ({ model: m, reason: unratedReason(m)!, ...(m.elo_source?.arena_model ? { arena_model: m.elo_source.arena_model } : {}) }));
  const notes: string[] = [];
  if (matchedCategory && candidates.some((m) => m.name === matchedCategory.leader) && !rated.some((m) => m.name === matchedCategory.leader)) {
    notes.push(`The ${matchedCategory.name} leader (${matchedCategory.leader}) is not yet rated, so no model gets the leader bonus.`);
  }

  // Empty-rated guard: without this, Math.min(...[]) → Infinity and
  // Math.max(...[]) → -Infinity would produce NaN scores. Returning early keeps
  // the normalization below well-defined.
  if (rated.length === 0) return { recommendations: [], excluded, matchedCategory, unrated, notes };

  const hasTask = matchedCategory !== null;
  const weights = hasTask ? SCORING_WEIGHTS.withTask : SCORING_WEIGHTS.withoutTask;

  // Elo extrema come from RATED candidates only. Cost and context are the model's own
  // fields, so they keep using every filtered-in model.
  // Normalization basis: ALL tracked models, not the filtered candidates. Filters only remove rows, so a
  // model's component scores never depend on which other models pass (scoring-transparency.md, decision 1).
  // Elo extrema still come from RATED models only, so a borrowed score cannot set the floor or ceiling.
  const elos = models.filter(isRated).map((m) => m.elo);
  const costs = models.map((m) => m.cost_per_million_tokens);
  const contexts = models.map((m) => m.context_window);

  const minElo = Math.min(...elos), maxElo = Math.max(...elos);
  const minCost = Math.min(...costs), maxCostAll = Math.max(...costs);
  const minCtx = Math.min(...contexts), maxCtx = Math.max(...contexts);

  const recommendations: Recommendation[] = rated.map((m) => {
    const reasons: string[] = [];

    let taskScore = 0;
    if (hasTask && matchedCategory) {
      if (m.name === matchedCategory.leader) {
        taskScore = 1.0;
        reasons.push(`Curator's pick for ${matchedCategory.name}`);
      } else if (m.strengths.includes(matchedCategory.name)) {
        taskScore = 0.5;
        reasons.push(`Curator-rated strength in ${matchedCategory.name}`);
      }
    }

    // When all candidates share a value, min === max and the division would
    // be 0/0 → NaN; the explicit equality check returns a uniform 1.0 instead.
    const eloScore = maxElo === minElo ? 1 : (m.elo - minElo) / (maxElo - minElo);
    if (m.elo === maxElo) reasons.push(`Highest Elo (${m.elo})`);
    else reasons.push(`Elo ${m.elo}`);

    const costScore = maxCostAll === minCost ? 1 : (maxCostAll - m.cost_per_million_tokens) / (maxCostAll - minCost);
    if (m.cost_per_million_tokens === minCost) reasons.push(`Most cost-efficient ($${m.cost_per_million_tokens}/M)`);

    const ctxScore = maxCtx === minCtx ? 1 : (m.context_window - minCtx) / (maxCtx - minCtx);
    if (m.context_window === maxCtx) reasons.push(`Largest context (${(m.context_window / 1000).toFixed(0)}k tokens)`);

    const parts = {
      task: weights.task * taskScore,
      elo: weights.elo * eloScore,
      cost: weights.cost * costScore,
      context: weights.context * ctxScore,
    };
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const score = round2(parts.task + parts.elo + parts.cost + parts.context);
    const breakdown = { task: round2(parts.task), elo: round2(parts.elo), cost: round2(parts.cost), context: round2(parts.context) };

    return { model: m, score, reasons, breakdown, label_effect: breakdown.task };
  });

  recommendations.sort((a, b) => b.score - a.score);
  return { recommendations, excluded, matchedCategory, unrated, notes };
}
