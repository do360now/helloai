import type { Model, EloSource } from './types';

// DTO for the model subset serialized in /api/recommend responses. Kept narrow
// (no desc/color/strengths) so the public recommend payload stays lean. The (now
// frozen, 410) Pro endpoint used to return the full Model — see app/api/pro/recommend.
export interface RecommendModelDTO {
  id: string;
  name: string;
  provider: string;
  url: string;
  tag: string;
  elo: number;
  cost_per_million_tokens: number;
  cost_per_million_tokens_output: number;
  context_window: number;
}

export interface RecommendationDTO {
  rank: number;
  score: number;
  reasons: string[];
  /** Weighted contribution of each component; the parts add up to `score` within rounding. */
  breakdown: { task: number; elo: number; cost: number; context: number };
  /** How much of `score` came from curated labels (the leader / strength), i.e. breakdown.task. */
  label_effect: number;
  model: RecommendModelDTO;
}

// Project a scored recommendation to its public DTO form at a given rank.
// Centralized so /api/recommend and any future consumer serialize identically.
export function toRecommendationDTO(
  rec: { model: Model; score: number; reasons: string[]; breakdown?: RecommendationDTO['breakdown']; label_effect?: number },
  rank: number
): RecommendationDTO {
  const m = rec.model;
  return {
    rank,
    score: rec.score,
    reasons: rec.reasons,
    breakdown: rec.breakdown ?? { task: 0, elo: 0, cost: 0, context: 0 },
    label_effect: rec.label_effect ?? 0,
    model: {
      id: m.id,
      name: m.name,
      provider: m.provider,
      url: m.url,
      tag: m.tag,
      elo: m.elo,
      cost_per_million_tokens: m.cost_per_million_tokens,
      cost_per_million_tokens_output: m.cost_per_million_tokens_output,
      context_window: m.context_window,
    },
  };
}

// A filtered-in model that cannot be ranked because its Elo is borrowed (a predecessor's), missing
// or stale. Reported outside the ranking so callers can still see it, labelled.
export interface UnratedDTO {
  reason: 'borrowed_score' | 'missing_score' | 'stale_score';
  /** The Arena slug the stored Elo actually belongs to, when known. */
  arena_model?: string;
  /** Full provenance. The stored number is deliberately NOT exposed as `model.elo`. */
  elo_source?: EloSource;
  /** No `elo`: for an unrated model that number is a predecessor's, missing or stale. */
  model: Omit<RecommendModelDTO, 'elo'>;
}

export function toUnratedDTO(u: { model: Model; reason: UnratedDTO['reason']; arena_model?: string }): UnratedDTO {
  return {
    reason: u.reason,
    ...(u.arena_model ? { arena_model: u.arena_model } : {}),
    ...(u.model.elo_source ? { elo_source: u.model.elo_source } : {}),
    model: Object.fromEntries(
      Object.entries(toRecommendationDTO({ model: u.model, score: 0, reasons: [] }, 0).model).filter(([k]) => k !== 'elo')
    ) as Omit<RecommendModelDTO, 'elo'>,
  };
}

// Shape of the GET /api/recommend response body. Shared so the route handler
// and tests agree on the contract.
export interface RecommendResponseBody {
  query: {
    task: string | null;
    max_cost: number | null;
    min_context: number | null;
    provider: string | null;
    limit: number;
  };
  recommendations: RecommendationDTO[];
  /** Models that pass the filters but cannot be ranked (borrowed, missing or stale Elo). */
  unrated: UnratedDTO[];
  /** Plain-language explanations, e.g. an unrated category leader. */
  notes: string[];
  meta: {
    scoring: {
      version: number;
      /** The weight set actually used for this call (it depends on whether a task resolved). */
      weights: { task: number; elo: number; cost: number; context: number };
      normalization: 'all_tracked_models';
      /** Fingerprint of models.json + categories.json + the data date. */
      snapshot: string;
      data_last_updated: string;
      matched_category: string | null;
    };
  };
  filters_applied: string[];
  models_considered: number;
  models_excluded: number;
  matched_category: string | null;
  last_updated: string;
}
