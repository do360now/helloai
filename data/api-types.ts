import type { Model } from './types';

// DTO for the model subset serialized in /api/recommend responses. Kept narrow
// (no desc/color/strengths) so the public recommend payload stays lean. The Pro
// endpoint returns the full Model instead — see app/api/pro/recommend.
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
  filters_applied: string[];
  models_considered: number;
  models_excluded: number;
  matched_category: string | null;
  last_updated: string;
}
