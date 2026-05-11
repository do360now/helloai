import type { Model, Category } from './types';

export interface Recommendation {
  model: Model;
  score: number;
  reasons: string[];
}

export function findMatchingCategory(task: string, categories: Category[]): Category | null {
  const t = task.toLowerCase().trim();
  if (!t) return null;
  return (
    categories.find((c) => c.name.toLowerCase().includes(t)) ??
    categories.find((c) => t.includes(c.name.toLowerCase().split(' ')[0])) ??
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
): { recommendations: Recommendation[]; excluded: number; matchedCategory: Category | null } {
  const { task, maxCost, minContext, provider } = opts;

  const matchedCategory = task ? findMatchingCategory(task, categories) : null;

  // Hard filters
  let candidates = models.filter((m) => {
    if (maxCost !== null && maxCost !== undefined && m.cost_per_million_tokens > maxCost) return false;
    if (minContext !== null && minContext !== undefined && m.context_window < minContext) return false;
    if (provider && !m.provider.toLowerCase().includes(provider.toLowerCase())) return false;
    return true;
  });

  const excluded = models.length - candidates.length;

  if (candidates.length === 0) return { recommendations: [], excluded, matchedCategory };

  const hasTask = matchedCategory !== null;
  const weights = hasTask
    ? { task: 0.40, elo: 0.35, cost: 0.15, context: 0.10 }
    : { task: 0.00, elo: 0.55, cost: 0.25, context: 0.20 };

  const elos = candidates.map((m) => m.elo);
  const costs = candidates.map((m) => m.cost_per_million_tokens);
  const contexts = candidates.map((m) => m.context_window);

  const minElo = Math.min(...elos), maxElo = Math.max(...elos);
  const minCost = Math.min(...costs), maxCost2 = Math.max(...costs);
  const minCtx = Math.min(...contexts), maxCtx = Math.max(...contexts);

  const recommendations: Recommendation[] = candidates.map((m) => {
    const reasons: string[] = [];

    let taskScore = 0;
    if (hasTask && matchedCategory) {
      if (m.name === matchedCategory.leader) {
        taskScore = 1.0;
        reasons.push(`Category leader for ${matchedCategory.name}`);
      } else if (m.strengths.includes(matchedCategory.name)) {
        taskScore = 0.5;
        reasons.push(`Strong in ${matchedCategory.name}`);
      }
    }

    const eloScore = maxElo === minElo ? 1 : (m.elo - minElo) / (maxElo - minElo);
    if (m.elo === maxElo) reasons.push(`Highest Elo (${m.elo})`);
    else reasons.push(`Elo ${m.elo}`);

    const costScore = maxCost2 === minCost ? 1 : (maxCost2 - m.cost_per_million_tokens) / (maxCost2 - minCost);
    if (m.cost_per_million_tokens === minCost) reasons.push(`Most cost-efficient ($${m.cost_per_million_tokens}/M)`);

    const ctxScore = maxCtx === minCtx ? 1 : (m.context_window - minCtx) / (maxCtx - minCtx);
    if (m.context_window === maxCtx) reasons.push(`Largest context (${(m.context_window / 1000).toFixed(0)}k tokens)`);

    const score = Math.round(
      (weights.task * taskScore + weights.elo * eloScore + weights.cost * costScore + weights.context * ctxScore) * 100
    ) / 100;

    return { model: m, score, reasons };
  });

  recommendations.sort((a, b) => b.score - a.score);
  return { recommendations, excluded, matchedCategory };
}
