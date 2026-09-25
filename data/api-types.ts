import type { Model } from './types';

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
  model: RecommendModelDTO;
}

// Project a scored recommendation to its public DTO form at a given rank.
// Centralized so /api/recommend and any future consumer serialize identically.
export function toRecommendationDTO(
  rec: { model: Model; score: number; reasons: string[] },
  rank: number
): RecommendationDTO {
  const m = rec.model;
  return {
    rank,
    score: rec.score,
    reasons: rec.reasons,
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
  model: RecommendModelDTO;
}

export function toUnratedDTO(u: { model: Model; reason: UnratedDTO['reason']; arena_model?: string }): UnratedDTO {
  return {
    reason: u.reason,
    ...(u.arena_model ? { arena_model: u.arena_model } : {}),
    model: toRecommendationDTO({ model: u.model, score: 0, reasons: [] }, 0).model,
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
  filters_applied: string[];
  models_considered: number;
  models_excluded: number;
  matched_category: string | null;
  last_updated: string;
}
