export interface SiteConfig {
  name: string;
  tagline: string;
  author: string;
  authorUrl: string;
  githubUrl: string;
  cmcUrl: string;
  lastUpdated: string;
  /** D4: who is behind the site and any vendor relationships. Written by the operator. */
  affiliations?: string;
  /** D5: which models get a slot and how unrated models are shown. Written by the operator. */
  listing_policy?: string;
}

/**
 * Where a model's `elo` comes from. `elo` stays the number everything reads; this says what it is.
 * A score whose Arena slug is a predecessor of the listed model has matches_listed_model=false and
 * must never carry that predecessor's interval or votes.
 */
export interface EloSource {
  board: 'text_overall' | 'webdev' | 'other';
  /** Exact Arena slug the number belongs to, e.g. 'claude-opus-5-high'. */
  arena_model: string;
  matches_listed_model: boolean;
  /** Measured configuration, e.g. 'max' or 'high'. Omit when the slug has none. */
  config?: string;
  ci_low?: number;
  ci_high?: number;
  votes?: number;
  /** YYYY-MM-DD of the Arena snapshot. Stays honest even when the board stops publishing. */
  snapshot_date: string;
  /** YYYY-MM-DD when we last looked at the board. The freshness test applies to this, not to snapshot_date. */
  checked_date: string;
  source_url: string;
  set_by: 'override' | 'fetched' | 'agent_curated';
  /** Set to 'missing' or 'stale' when no usable score exists; treated as unrated. */
  status?: 'ok' | 'missing' | 'stale';
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  url: string;
  tag: string;
  desc: string;
  color: string;
  elo: number;
  cost_per_million_tokens: number;
  cost_per_million_tokens_output: number;
  context_window: number;
  strengths: string[];
  /** Provenance of `elo`. Every listed model carries one (enforced by __tests__/elo-provenance.test.ts). */
  elo_source?: EloSource;
}

export interface Category {
  name: string;
  leader: string;
  insight: string;
  icon: string;
  color: string;
}

export interface Article {
  slug: string;
  /** Optional YYYY-MM-DD of the last substantive edit, used for JSON-LD dateModified. Falls back to `date`. */
  updated?: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  readTime: string;
  content: string[];
}

export interface OpenWeightModel {
  id: string;
  name: string;
  provider: string;
  url: string;
  tag: string;
  desc: string;
  color: string;
  elo: number;
  context_window: number;
  strengths: string[];
  params_b: number;         // total parameters in billions
  vram_gb: number;          // minimum VRAM (GB) for recommended quantization
  quantization: string[];   // available quant formats, e.g. ["Q4_K_M", "Q8_0"]
  tokens_per_sec: number;   // throughput on reference_hardware
  reference_hardware: string; // hardware used for tokens_per_sec benchmark
  license: string;          // e.g. "Apache 2.0", "Meta Llama 3 License"
  bench_source?: {
    type: 'first-party';    // absent field = vendor/community-reported numbers
    date: string;           // YYYY-MM-DD the tokens_per_sec was measured
  };
}

/**
 * A hand-written claim in prose (a percentage or a named benchmark), registered so it can be
 * checked. `unverified` means someone found a candidate source but nobody has opened and confirmed
 * it yet. See docs/review/claims-guard.md and __tests__/claims.test.ts.
 */
export interface Claim {
  id: string;
  /** Exact text as it appears in the prose (models.json desc or categories.json insight). */
  text: string;
  /** Model name or category name whose prose contains the text. */
  subject: string;
  kind: 'vendor-reported' | 'independent' | 'first-party';
  verification: 'unverified' | 'confirmed';
  source_url: string | null;
  /** YYYY-MM-DD the claim was made or published. */
  as_of: string | null;
  /** YYYY-MM-DD a person actually opened the source and confirmed it. null while unverified. */
  checked_at: string | null;
  /** True for claims that can change (rankings, prices, Arena numbers): only these expire. Launch-dated figures do not. */
  perishable?: boolean;
  /** YYYY-MM-DD a candidate source was found (search), not yet confirmed. */
  found_at?: string;
  note?: string;
}
