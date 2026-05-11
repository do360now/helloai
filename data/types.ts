export interface SiteConfig {
  name: string;
  tagline: string;
  author: string;
  authorUrl: string;
  githubUrl: string;
  cmcUrl: string;
  lastUpdated: string;
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
  title: string;
  excerpt: string;
  date: string;
  category: string;
  readTime: string;
  content: string[];
}

export interface LocalModel {
  model: string;
  avg_score: number;
  pass_rate: number;
  passed: number;
  total: number;
  response_time: number;
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
}
